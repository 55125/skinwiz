#!/usr/bin/env python3
"""
Hair care products (shampoos, conditioners, masks, leave-ins, styling) from
Open Beauty Facts, for the Hair Care concern (niche `hair-care`).

    python3 build_hair_care_catalog.py

Michael chose OBF bulk as the first hair care source (2026-10-21). The point
of these rows is the ingredient list: patch-tested patients checking
shampoos and conditioners against an avoid list (cocamidopropyl betaine,
MI/MCI, fragrance, formaldehyde releasers). So unlike build_cosmetic_catalog.py
a row doesn't need a tracked cosmetic active; it needs a usable ingredient
list. Same trust tier as that script: source=open_beauty_facts,
verified=false, the app's "Community-sourced" badge, and the same junk
filter (`is_junk`).

Fetched by OBF category, not by ingredient tag. OBF is global; rows are kept
only when the product is tagged as sold in an English-speaking market or its
listed language is English, so the catalog doesn't fill with lists the
avoid-list matcher can't read. Medicated dandruff shampoos come from the
openFDA pass (Dandruff & Seborrheic Dermatitis), not from here.

Output: output/hair_care_catalog.csv, the cosmetic catalog's columns.
app/src/db/seed.ts reads it before cosmetic_catalog.csv, so a shampoo the
ingredient-tag pass filed under Dry Skin (for its panthenol) is listed under
Hair Care instead.
"""
from __future__ import annotations

import csv
import json
import sys
import time
import urllib.parse

from build_cosmetic_catalog import OBF_BASE, PAGE_SIZE, SLEEP, _get, is_junk, matched_active_ids

# OBF category tags. Check each against a live count before relying on it
# (a dead tag just returns 0 and is reported below).
CATEGORIES = [
    "en:shampoos",
    "en:hair-conditioners",
    "en:hair-masks",
    "en:hair-care",
    "en:hair-styling-products",
    "en:hair-oils",
]

ENGLISH_MARKETS = {"en:united-states", "en:canada", "en:united-kingdom", "en:ireland", "en:australia", "en:new-zealand"}

OUT = "output/hair_care_catalog.csv"

FIELDNAMES = [
    "product_ndc", "niche", "brand_name", "manufacturer_name", "substance_name",
    "active_ingredient_text", "active_ingredients_structured", "dosage_form", "route",
    "marketing_category", "product_type", "finished", "listing_expiration_date",
    "package_ndcs", "purpose_text", "indications_and_usage", "inactive_ingredient_text",
    "spl_set_id", "effective_time", "source", "verified", "image_url",
]


def fetch_category(tag: str) -> list[dict]:
    products: list[dict] = []
    page = 1
    while True:
        params = {
            "categories_tags": tag,
            "page": page,
            "page_size": PAGE_SIZE,
            "fields": "code,product_name,brands,ingredients_text,ingredients_text_en,completeness,image_front_url,lang,countries_tags",
        }
        data = _get(f"{OBF_BASE}?{urllib.parse.urlencode(params)}")
        batch = data.get("products", [])
        if not batch:
            break
        products.extend(batch)
        if page * PAGE_SIZE >= data.get("count", 0):
            break
        page += 1
        time.sleep(SLEEP)
    return products


def english_ingredients(p: dict) -> str | None:
    """The product's English ingredient list, or None when it has none we can read."""
    en = (p.get("ingredients_text_en") or "").strip()
    if en:
        return en
    in_market = bool(ENGLISH_MARKETS & set(p.get("countries_tags") or []))
    if p.get("lang") == "en" or in_market:
        return (p.get("ingredients_text") or "").strip() or None
    return None


def to_row(p: dict) -> dict | None:
    ingredients = english_ingredients(p)
    if not ingredients:
        return None
    if is_junk({**p, "ingredients_text": ingredients}):
        return None
    row = {k: "" for k in FIELDNAMES}
    row.update({
        "product_ndc": p["code"],
        "niche": "hair-care",
        "brand_name": p["product_name"].strip(),
        "manufacturer_name": p["brands"].strip(),
        "active_ingredient_text": ingredients,
        "active_ingredients_structured": ";".join(matched_active_ids(ingredients)),
        "source": "open_beauty_facts",
        "verified": "false",
        "image_url": p.get("image_front_url") or "",
    })
    return row


def main() -> None:
    by_code: dict[str, dict] = {}
    raw_counts: dict[str, int] = {}
    not_english = 0
    for tag in CATEGORIES:
        print(f"Fetching OBF category '{tag}'...", file=sys.stderr)
        products = fetch_category(tag)
        raw_counts[tag] = len(products)
        for p in products:
            code = p.get("code")
            if not code or code in by_code:
                continue
            if english_ingredients(p) is None:
                not_english += 1
                continue
            row = to_row(p)
            if row:
                by_code[code] = row

    rows = list(by_code.values())
    with open(OUT, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
    print(f"raw results by category: {json.dumps(raw_counts, indent=2)}")
    print(f"skipped {not_english} with no English ingredient list")
    print(f"{len(rows)} hair care products -> {OUT}")


if __name__ == "__main__":
    main()
