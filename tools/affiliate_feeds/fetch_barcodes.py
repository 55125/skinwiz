#!/usr/bin/env python3
"""
Collect retail barcodes for every catalog product, as lookup keys for a
barcode-based product API (Sovrn Commerce's price-comparison API takes
UPC/EAN/GTIN). Output: output/product_barcodes.csv, one row per
(product_id, barcode), committed so the lookup job and production both use
the same file -- the app's DB is rebuilt from CSVs on every deploy, so
anything stored only in a local DB would never reach production.

Sources, in confidence order (the `source` column):

  openfda_upc   The UPC openFDA lists on the drug label's `openfda` block.
                Present on only part of the catalog: labels whose openfda
                cross-reference is missing have no UPC there.
  ndc_derived   Built from the package NDC: US drug packaging commonly
                encodes "3" + the 10-digit NDC + a UPC-A check digit. Big
                consumer brands (Dove, Neutrogena...) often use their own
                GS1 codes instead: checked against 40 OTC labels that list
                both, the derived code matched the real UPC on only 3. So
                it's a last-resort candidate, tried only when a product has
                no openfda_upc -- a wrong one finds nothing in a barcode
                lookup, since the "3" prefix is reserved for drug codes.
  obf_id        Open Beauty Facts products are keyed by their barcode.

Brand-direct products have no barcode here; the lookup job uses their
source product-page URL instead.

Requests are batched (50 ids per openFDA query) and paced well under
openFDA's unauthenticated limit (240/min, 1,000/day) -- a full run is
~400 requests. Re-runnable: it rebuilds the CSV from scratch.
"""
from __future__ import annotations

import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

CATALOGS = {
    "fda": [
        "../catalog_pipeline/output/acne_sun_catalog.csv",
        "../catalog_pipeline/output/dailymed_resolved_catalog.csv",
    ],
    "obf": ["../catalog_pipeline/output/cosmetic_catalog.csv"],
}
OUTPUT_PATH = "output/product_barcodes.csv"
LABEL_URL = "https://api.fda.gov/drug/label.json"
NDC_URL = "https://api.fda.gov/drug/ndc.json"
BATCH = 50
SLEEP_S = 0.6


def fetch(url: str, field: str, values: list[str]) -> list[dict]:
    query = " OR ".join(f'{field}:"{v}"' for v in values)
    full = f"{url}?search={urllib.parse.quote(query)}&limit={len(values) * 2}"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(full, timeout=60) as resp:
                return json.load(resp).get("results", [])
        except urllib.error.HTTPError as e:
            if e.code == 404:  # openFDA's "no matches"
                return []
            if e.code == 429 or e.code >= 500:
                time.sleep(5 * (attempt + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            time.sleep(5 * (attempt + 1))
    print(f"  giving up on a batch of {len(values)} ({field})", file=sys.stderr)
    return []


def upc_from_package_ndc(package_ndc: str) -> str | None:
    digits = package_ndc.replace("-", "")
    if len(digits) != 10 or not digits.isdigit():
        return None
    body = "3" + digits
    odd = sum(int(d) for d in body[0::2])
    even = sum(int(d) for d in body[1::2])
    return body + str((10 - (odd * 3 + even) % 10) % 10)


def batches(items: list[str]):
    for i in range(0, len(items), BATCH):
        yield items[i : i + BATCH]


def main() -> None:
    fda: dict[str, dict] = {}  # product_ndc -> {set_id, package_ndcs}
    for path in CATALOGS["fda"]:
        for row in csv.DictReader(open(path)):
            if not row["product_ndc"] or row["product_ndc"] in fda:
                continue
            fda[row["product_ndc"]] = {
                "set_id": row["spl_set_id"],
                "package_ndcs": set(filter(None, row["package_ndcs"].split(";"))),
            }
    by_set: dict[str, list[str]] = {}
    for ndc, info in fda.items():
        by_set.setdefault(info["set_id"], []).append(ndc)

    rows: set[tuple[str, str, str, str]] = set()

    set_ids = sorted(s for s in by_set if s)
    print(f"{len(fda)} FDA products, {len(set_ids)} labels; querying openFDA labels...")
    for n, chunk in enumerate(batches(set_ids), 1):
        for label in fetch(LABEL_URL, "set_id", chunk):
            of = label.get("openfda", {})
            for ndc in by_set.get(label.get("set_id", ""), []):
                for upc in of.get("upc", []):
                    rows.add((ndc, fda[ndc]["set_id"], upc, "openfda_upc"))
                fda[ndc]["package_ndcs"].update(
                    p for p in of.get("package_ndc", []) if p.startswith(ndc + "-")
                )
        if n % 20 == 0:
            print(f"  {n * BATCH}/{len(set_ids)} labels")
        time.sleep(SLEEP_S)

    missing = sorted(ndc for ndc, info in fda.items() if not info["package_ndcs"])
    print(f"{len(missing)} products without package NDCs; querying the NDC directory...")
    for chunk in batches(missing):
        for prod in fetch(NDC_URL, "product_ndc", chunk):
            ndc = prod.get("product_ndc")
            if ndc in fda:
                fda[ndc]["package_ndcs"].update(p["package_ndc"] for p in prod.get("packaging", []) if p.get("package_ndc"))
        time.sleep(SLEEP_S)

    for ndc, info in fda.items():
        for pkg in info["package_ndcs"]:
            upc = upc_from_package_ndc(pkg)
            if upc:
                rows.add((ndc, info["set_id"], upc, "ndc_derived"))

    for path in CATALOGS["obf"]:
        for row in csv.DictReader(open(path)):
            code = row["product_ndc"]
            if code.isdigit() and 8 <= len(code) <= 14:
                rows.add((code, row["spl_set_id"], code, "obf_id"))

    # A barcode found in openFDA wins over the same digits derived from an NDC.
    best: dict[tuple[str, str], tuple[str, str, str, str]] = {}
    rank = {"openfda_upc": 0, "obf_id": 1, "ndc_derived": 2}
    for r in rows:
        key = (r[0], r[2])
        if key not in best or rank[r[3]] < rank[best[key][3]]:
            best[key] = r

    with open(OUTPUT_PATH, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["product_id", "spl_set_id", "barcode", "source"])
        w.writerows(sorted(best.values()))

    products_with = {r[0] for r in best.values()}
    by_source: dict[str, set[str]] = {}
    for r in best.values():
        by_source.setdefault(r[3], set()).add(r[0])
    summary = {
        "fda_products": len(fda),
        "products_with_any_barcode": len(products_with),
        "products_by_source": {k: len(v) for k, v in sorted(by_source.items())},
        "barcode_rows": len(best),
    }
    json.dump(summary, open("output/barcode_summary.json", "w"), indent=2)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
