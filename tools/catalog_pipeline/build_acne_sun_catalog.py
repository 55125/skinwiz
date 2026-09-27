#!/usr/bin/env python3
"""
Build the acne+sun OTC drug catalog from openFDA (project.md §6, MVP build
order step 1).

Two-stage pipeline, because the two openFDA endpoints don't compose cleanly:

  1. `/drug/label.json` is the only endpoint with a `purpose` field (the
     actual Drug Facts "Purpose" line), so it's the only reliable way to
     scope to "Acne treatment" / "Sunscreen" specifically. But its
     `openfda.product_ndc` cross-reference is only populated on ~35-40% of
     records (confirmed by sampling before writing this) — the rest have an
     empty `openfda` block and can't be resolved to a clean product id.
  2. `/drug/ndc.json` (the NDC directory) has clean product_ndc, brand_name,
     dosage_form, and marketing dates for every record — but has no
     `purpose` field, so filtering it directly by active-ingredient name
     would also catch every OTHER use of that ingredient (e.g. salicylic
     acid also treats warts, dandruff, calluses — not just acne).

So: scope by purpose on the label endpoint first, keep only the subset with
a resolvable product_ndc, dedupe to one row per product (latest label
wins), then batch-enrich those specific product_ndcs against the NDC
directory for dosage_form/marketing status. Records without a resolvable
NDC are kept in a separate "unmatched" file rather than dropped silently.
"""
from __future__ import annotations

import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date

LABEL_BASE = "https://api.fda.gov/drug/label.json"
NDC_BASE = "https://api.fda.gov/drug/ndc.json"
PAGE_LIMIT = 1000
NDC_BATCH_SIZE = 50
SLEEP = 0.25

PURPOSES = {
    "acne": "Acne treatment",
    "sunscreen": "Sunscreen",
}


def _get(url: str, retries: int = 3) -> dict:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "skinwiz-catalog-pipeline/0.1"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return {"results": []}
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))
    return {"results": []}


def fetch_all_labels(purpose: str) -> list[dict]:
    first = _get(f"{LABEL_BASE}?{urllib.parse.urlencode({'search': f'purpose:\"{purpose}\"', 'limit': 1})}")
    total = first.get("meta", {}).get("results", {}).get("total", 0)
    print(f"  {purpose}: {total} total label records", file=sys.stderr)

    records: list[dict] = []
    skip = 0
    while skip < total:
        params = {"search": f'purpose:"{purpose}"', "limit": PAGE_LIMIT, "skip": skip}
        data = _get(f"{LABEL_BASE}?{urllib.parse.urlencode(params)}")
        batch = data.get("results", [])
        if not batch:
            break
        records.extend(batch)
        skip += PAGE_LIMIT
        print(f"    fetched {min(skip, total)}/{total}", file=sys.stderr)
        time.sleep(SLEEP)
    return records


def label_to_row(record: dict, niche: str) -> dict | None:
    openfda = record.get("openfda", {})
    product_ndcs = openfda.get("product_ndc", [])
    if not product_ndcs:
        return None
    return {
        "product_ndc": product_ndcs[0],
        "niche": niche,
        "brand_name": (openfda.get("brand_name") or [""])[0],
        "manufacturer_name": (openfda.get("manufacturer_name") or [""])[0],
        "substance_name": ";".join(openfda.get("substance_name", [])),
        "route": ";".join(openfda.get("route", [])),
        "spl_set_id": record.get("set_id", ""),
        "effective_time": record.get("effective_time", ""),
        "active_ingredient_text": " | ".join(record.get("active_ingredient", [])),
        "purpose_text": " | ".join(record.get("purpose", [])),
        "indications_and_usage": " | ".join(record.get("indications_and_usage", [])),
        "inactive_ingredient_text": " | ".join(record.get("inactive_ingredient", [])),
    }


def unmatched_row(record: dict, niche: str) -> dict:
    return {
        "niche": niche,
        "generic_name_freetext": (record.get("openfda", {}).get("generic_name") or [""])[0],
        "spl_set_id": record.get("set_id", ""),
        "effective_time": record.get("effective_time", ""),
        "active_ingredient_text": " | ".join(record.get("active_ingredient", [])),
        "purpose_text": " | ".join(record.get("purpose", [])),
    }


def dedupe_latest(rows: list[dict]) -> list[dict]:
    best: dict[str, dict] = {}
    for row in rows:
        key = row["product_ndc"]
        existing = best.get(key)
        if existing is None or row["effective_time"] > existing["effective_time"]:
            best[key] = row
    return list(best.values())


def enrich_with_ndc_directory(rows: list[dict]) -> None:
    """Mutates rows in place, adding dosage_form/marketing_category/etc from the NDC directory."""
    ndcs = [r["product_ndc"] for r in rows]
    ndc_info: dict[str, dict] = {}
    for i in range(0, len(ndcs), NDC_BATCH_SIZE):
        batch = ndcs[i : i + NDC_BATCH_SIZE]
        clause = " ".join(f'"{n}"' for n in batch)
        params = {"search": f"product_ndc:({clause})", "limit": NDC_BATCH_SIZE}
        data = _get(f"{NDC_BASE}?{urllib.parse.urlencode(params)}")
        for rec in data.get("results", []):
            ndc_info[rec["product_ndc"]] = rec
        print(f"    NDC directory enrichment {min(i + NDC_BATCH_SIZE, len(ndcs))}/{len(ndcs)}", file=sys.stderr)
        time.sleep(SLEEP)

    for row in rows:
        info = ndc_info.get(row["product_ndc"])
        if not info:
            row.update({
                "dosage_form": "", "marketing_category": "", "product_type": "",
                "finished": "", "listing_expiration_date": "", "active_ingredients_structured": "",
                "package_ndcs": "",
            })
            continue
        active_structured = "; ".join(
            f"{a.get('name', '')} {a.get('strength', '')}".strip()
            for a in info.get("active_ingredients", [])
        )
        packages = ";".join(p.get("package_ndc", "") for p in info.get("packaging", []))
        row.update({
            "dosage_form": info.get("dosage_form", ""),
            "marketing_category": info.get("marketing_category", ""),
            "product_type": info.get("product_type", ""),
            "finished": info.get("finished", ""),
            "listing_expiration_date": info.get("listing_expiration_date", ""),
            "active_ingredients_structured": active_structured,
            "package_ndcs": packages,
        })


def write_csv(path: str, rows: list[dict], fieldnames: list[str]) -> None:
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main() -> None:
    matched_rows: list[dict] = []
    unmatched_rows: list[dict] = []

    for niche, purpose in PURPOSES.items():
        print(f"Fetching {purpose}...", file=sys.stderr)
        records = fetch_all_labels(purpose)
        for record in records:
            row = label_to_row(record, niche)
            if row:
                matched_rows.append(row)
            else:
                unmatched_rows.append(unmatched_row(record, niche))

    print(f"\n{len(matched_rows)} label records with a resolvable product_ndc, "
          f"{len(unmatched_rows)} without", file=sys.stderr)

    deduped = dedupe_latest(matched_rows)
    print(f"{len(deduped)} distinct products after dedup", file=sys.stderr)

    print("Enriching with NDC directory (dosage_form, marketing status)...", file=sys.stderr)
    enrich_with_ndc_directory(deduped)

    fieldnames = [
        "product_ndc", "niche", "brand_name", "manufacturer_name", "substance_name",
        "active_ingredient_text", "active_ingredients_structured", "dosage_form", "route",
        "marketing_category", "product_type", "finished", "listing_expiration_date",
        "package_ndcs", "purpose_text", "indications_and_usage", "inactive_ingredient_text",
        "spl_set_id", "effective_time",
    ]
    write_csv("output/acne_sun_catalog.csv", deduped, fieldnames)

    unmatched_fieldnames = ["niche", "generic_name_freetext", "spl_set_id", "effective_time", "active_ingredient_text", "purpose_text"]
    write_csv("output/acne_sun_unmatched.csv", unmatched_rows, unmatched_fieldnames)

    by_niche = {}
    for row in deduped:
        by_niche.setdefault(row["niche"], 0)
        by_niche[row["niche"]] += 1

    today_str = date.today().strftime("%Y%m%d")
    summary = {
        "matched_products": len(deduped),
        "unmatched_label_records": len(unmatched_rows),
        "by_niche": by_niche,
        # listing_expiration_date is an annual NDC-listing recertification
        # deadline, not a discontinuation flag — an expired listing usually
        # but not always means the labeler stopped selling it. Rough proxy only.
        "expired_listing_estimate": sum(
            1 for r in deduped if r.get("listing_expiration_date") and r["listing_expiration_date"] < today_str
        ),
    }
    with open("output/catalog_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\ncatalog -> output/acne_sun_catalog.csv ({len(deduped)} rows)")
    print(f"unmatched -> output/acne_sun_unmatched.csv ({len(unmatched_rows)} rows)")
    print(f"summary -> output/catalog_summary.json: {json.dumps(summary, indent=2)}")


if __name__ == "__main__":
    main()
