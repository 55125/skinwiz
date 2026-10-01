#!/usr/bin/env python3
"""
Expand the acne+sun catalog by resolving product_ndc for the label records
build_acne_sun_catalog.py couldn't link (13,719 of them — see that file's
docstring for why openFDA's own label->NDC harmonization misses ~67%).

DailyMed's own packaging API resolves a real, non-trivial fraction of that
gap: a 49-record sample resolved 16/49 (32.7%) before writing this at
scale. Same two-endpoint-tradeoff shape as the original catalog build,
just with DailyMed standing in for openFDA's product_ndc — DailyMed's SPL
packaging.json gives product_ndc + brand + active-ingredient strength
directly (no separate NDC-directory join needed for those fields), then
the existing enrich_with_ndc_directory() from build_acne_sun_catalog.py
still runs against the resolved NDCs for dosage_form/marketing status,
same as the original build.

The other 67% of that 32.7% miss rate isn't a bug to chase further here —
those set_ids return a genuinely empty packaging.json even though the
DailyMed HTML page for them renders a real title, meaning the structured
API just doesn't have current data for that specific SPL version. Treat
this script as closing part of the gap, not all of it.
"""
from __future__ import annotations

import csv
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, ".")
from build_acne_sun_catalog import enrich_with_ndc_directory, write_csv  # noqa: E402

DAILYMED_BASE = "https://dailymed.nlm.nih.gov/dailymed/services/v2/spls"
UNMATCHED_CSV = "output/acne_sun_unmatched.csv"
EXISTING_CATALOG_CSV = "output/acne_sun_catalog.csv"
OUTPUT_CSV = "output/dailymed_resolved_catalog.csv"
# NLM publishes no rate limit for DailyMed; 4 workers with a per-request
# pause keeps this to a few requests/second instead of an unthrottled burst.
WORKERS = 4
REQUEST_PAUSE = 0.25

# Same synonym list as tools/affiliate_feeds/match_catalog.py and
# app/src/db/actives.ts — kept as an independent copy per this repo's
# existing pattern (each tool owns its own copy rather than importing
# across the Python/TypeScript boundary).
ACNE_ACTIVES = ["salicylic acid", "benzoyl peroxide", "sulfur", "sulphur", "adapalene", "azelaic acid"]
SUNSCREEN_ACTIVES = [
    "zinc oxide", "titanium dioxide", "avobenzone", "butyl methoxydibenzoylmethane",
    "octisalate", "ethylhexyl salicylate", "octocrylene", "homosalate",
    "octinoxate", "ethylhexyl methoxycinnamate", "octyl methoxycinnamate",
    "oxybenzone", "ensulizole", "phenylbenzimidazole sulfonic acid", "meradimate",
]


def matches_niche(text: str, niche: str) -> bool:
    lowered = text.lower()
    actives = ACNE_ACTIVES if niche == "acne" else SUNSCREEN_ACTIVES
    return any(a in lowered for a in actives)


def _get(url: str, retries: int = 3) -> dict | None:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "activelyskin-catalog-pipeline/0.1"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return None
            if attempt == retries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
        except Exception:
            if attempt == retries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def parse_manufacturer(title: str) -> str | None:
    match = re.search(r"\[([^\]]+)\]\s*$", title or "")
    return match.group(1) if match else None


def resolve_one(row: dict) -> list[dict]:
    setid = row["spl_set_id"]
    time.sleep(REQUEST_PAUSE)
    data = _get(f"{DAILYMED_BASE}/{setid}/packaging.json")
    if not data:
        return []
    products = data.get("data", {}).get("products", [])
    if not products:
        return []

    title = data["data"].get("title", "")
    manufacturer = parse_manufacturer(title)
    out = []
    for product in products:
        product_ndc = product.get("product_code")
        if not product_ndc:
            continue
        actives_text = "; ".join(
            f"{a.get('name', '')} {a.get('strength', '')}".strip() for a in product.get("active_ingredients", [])
        )
        combined_text = f"{actives_text} {product.get('product_name_generic', '')}"
        if not matches_niche(combined_text, row["niche"]):
            continue
        out.append({
            "product_ndc": product_ndc,
            "niche": row["niche"],
            "brand_name": (product.get("product_name") or "").strip() or "(unnamed product)",
            "manufacturer_name": manufacturer or "",
            "substance_name": ";".join(a.get("name", "") for a in product.get("active_ingredients", [])),
            "route": "",
            "spl_set_id": setid,
            "effective_time": row.get("effective_time", ""),
            "active_ingredient_text": actives_text,
            "purpose_text": row.get("purpose_text", ""),
            "indications_and_usage": "",
            "inactive_ingredient_text": "",
        })
    return out


def main() -> None:
    with open(UNMATCHED_CSV, newline="") as f:
        unmatched_rows = list(csv.DictReader(f))
    unmatched_rows = [r for r in unmatched_rows if r.get("spl_set_id")]
    print(f"{len(unmatched_rows)} unmatched records with a set_id to try", file=sys.stderr)

    with open(EXISTING_CATALOG_CSV, newline="") as f:
        existing_ndcs = {r["product_ndc"] for r in csv.DictReader(f)}

    resolved_rows: list[dict] = []
    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(resolve_one, row): row for row in unmatched_rows}
        for future in as_completed(futures):
            done += 1
            if done % 500 == 0:
                print(f"  {done}/{len(unmatched_rows)} checked, {len(resolved_rows)} resolved so far", file=sys.stderr)
            try:
                resolved_rows.extend(future.result())
            except Exception as exc:
                print(f"  error: {exc}", file=sys.stderr)

    # Dedupe against the existing catalog and within this batch (latest effective_time wins).
    best: dict[str, dict] = {}
    for row in resolved_rows:
        ndc = row["product_ndc"]
        if ndc in existing_ndcs:
            continue
        existing = best.get(ndc)
        if existing is None or row["effective_time"] > existing["effective_time"]:
            best[ndc] = row
    deduped = list(best.values())
    print(f"\n{len(resolved_rows)} raw resolutions -> {len(deduped)} new distinct products "
          f"(after dedup + excluding {len(existing_ndcs)} already in the catalog)", file=sys.stderr)

    print("Enriching with NDC directory (dosage_form, marketing status)...", file=sys.stderr)
    enrich_with_ndc_directory(deduped)

    fieldnames = [
        "product_ndc", "niche", "brand_name", "manufacturer_name", "substance_name",
        "active_ingredient_text", "active_ingredients_structured", "dosage_form", "route",
        "marketing_category", "product_type", "finished", "listing_expiration_date",
        "package_ndcs", "purpose_text", "indications_and_usage", "inactive_ingredient_text",
        "spl_set_id", "effective_time",
    ]
    write_csv(OUTPUT_CSV, deduped, fieldnames)

    by_niche: dict[str, int] = {}
    for row in deduped:
        by_niche[row["niche"]] = by_niche.get(row["niche"], 0) + 1
    print(f"\n{OUTPUT_CSV}: {len(deduped)} new products ({by_niche})")


if __name__ == "__main__":
    main()
