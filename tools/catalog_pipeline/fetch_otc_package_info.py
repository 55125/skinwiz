#!/usr/bin/env python3
"""
Package descriptions and marketing category for every OTC drug row in the
catalog, from the openFDA NDC directory.

    python3 fetch_otc_package_info.py

The catalog builders keep only package NDC codes (`package_ndcs`), not the
NDC directory's human package description ("1 TUBE in 1 CARTON / 45 g in 1
TUBE"), which is what price-per-ounce needs (app/src/lib/equivalence.ts
parsePackageDescription). And dailymed_resolved_catalog.csv has
marketing_category for ~1% of rows. Rather than rewrite those large CSVs,
this writes one small side file the seed joins on product_ndc:

Input:  output/acne_sun_catalog.csv, output/dailymed_resolved_catalog.csv
Output: output/otc_package_info.csv
        product_ndc, marketing_category, product_type, package_descriptions

package_descriptions joins every package's description with " | ", in the
directory's order. Rows the NDC directory doesn't list (most DailyMed-
resolved NDCs, see README) are simply absent: unknown, not guessed.

100 NDCs per query; ~155 requests for the full catalog.
"""
from __future__ import annotations

import csv
import os
import sys
import time
import urllib.parse

from build_rx_catalog import _get  # same retrying GET, same OPENFDA_API_KEY handling

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "output")
INPUTS = ["acne_sun_catalog.csv", "dailymed_resolved_catalog.csv"]
OUT = os.path.join(OUT_DIR, "otc_package_info.csv")
NDC_BASE = "https://api.fda.gov/drug/ndc.json"
BATCH = 100
SLEEP = 0.3


def main() -> None:
    ndcs: list[str] = []
    seen: set[str] = set()
    for name in INPUTS:
        with open(os.path.join(OUT_DIR, name), newline="") as f:
            for row in csv.DictReader(f):
                ndc = (row.get("product_ndc") or "").strip()
                if ndc and ndc not in seen:
                    seen.add(ndc)
                    ndcs.append(ndc)
    print(f"{len(ndcs)} product NDCs", file=sys.stderr)

    found: dict[str, dict] = {}
    for i in range(0, len(ndcs), BATCH):
        chunk = ndcs[i : i + BATCH]
        clause = " ".join(f'"{n}"' for n in chunk)
        params = {"search": f"product_ndc:({clause})", "limit": BATCH}
        for rec in _get(f"{NDC_BASE}?{urllib.parse.urlencode(params)}").get("results", []):
            ndc = rec.get("product_ndc")
            if ndc not in seen:
                continue
            found[ndc] = {
                "product_ndc": ndc,
                "marketing_category": rec.get("marketing_category", ""),
                "product_type": rec.get("product_type", ""),
                "package_descriptions": " | ".join(
                    " ".join((p.get("description") or "").split()) for p in rec.get("packaging", []) or []
                ),
            }
        if (i // BATCH) % 20 == 0:
            print(f"  {min(i + BATCH, len(ndcs))}/{len(ndcs)} queried, {len(found)} found", file=sys.stderr)
        time.sleep(SLEEP)

    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["product_ndc", "marketing_category", "product_type", "package_descriptions"])
        w.writeheader()
        for ndc in ndcs:
            if ndc in found:
                w.writerow(found[ndc])
    print(f"wrote {len(found)} of {len(ndcs)} NDCs to {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
