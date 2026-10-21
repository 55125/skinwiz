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
import re
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
    # Checked live 2026-10-21: the six above all return results, but styling
    # (7) and oils (10) are thin. en:hair-products is the parent tag
    # (2,451); the subcategories below are ones it actually uses. Dyes stay
    # in: PPD is a classic patch-test allergen.
    "en:hair-products",
    "en:2-in-1-shampoos",
    "en:hair-sprays",
    "en:hair-gel",
    "en:dry-shampoos",
    "en:hair-dyes",
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


# OBF serves at most 10 pages of 100 to an anonymous client (page 11 is a
# 401), so a tag with more than 1,000 products is fetched in English slices
# instead: products with English text, plus each English-speaking market.
# Those are the only products english_ingredients keeps anyway.
MAX_RESULTS = 1000
ENGLISH_SLICES = [{"languages_tags": "en:english"}] + [{"countries_tags": c} for c in sorted(ENGLISH_MARKETS)]


def fetch_pages(filters: dict) -> tuple[list[dict], int]:
    products: list[dict] = []
    page = 1
    count = 0
    while True:
        params = {
            **filters,
            "page": page,
            "page_size": PAGE_SIZE,
            "fields": "code,product_name,brands,ingredients_text,ingredients_text_en,completeness,image_front_url,lang,countries_tags",
        }
        data = _get(f"{OBF_BASE}?{urllib.parse.urlencode(params)}")
        count = data.get("count", 0)
        batch = data.get("products", [])
        if not batch:
            break
        products.extend(batch)
        if page * PAGE_SIZE >= min(count, MAX_RESULTS):
            break
        page += 1
        time.sleep(SLEEP)
    return products, count


def fetch_category(tag: str) -> list[dict]:
    products, count = fetch_pages({"categories_tags": tag})
    if count <= MAX_RESULTS:
        return products
    by_code = {p.get("code"): p for p in products}
    for extra in ENGLISH_SLICES:
        print(f"  {tag}: {count} > {MAX_RESULTS}, slice {extra}", file=sys.stderr)
        sliced, sliced_count = fetch_pages({"categories_tags": tag, **extra})
        if sliced_count > MAX_RESULTS:
            print(f"  warning: slice {extra} has {sliced_count}, only {MAX_RESULTS} fetched", file=sys.stderr)
        for p in sliced:
            by_code.setdefault(p.get("code"), p)
    return list(by_code.values())


def english_ingredients(p: dict) -> str | None:
    """The product's English ingredient list, or None when it has none we can read."""
    en = (p.get("ingredients_text_en") or "").strip()
    if en:
        return en
    in_market = bool(ENGLISH_MARKETS & set(p.get("countries_tags") or []))
    if p.get("lang") == "en" or in_market:
        return (p.get("ingredients_text") or "").strip() or None
    return None


# Body washes and shower gels that OBF files under hair categories. A combined
# "hair & body" wash or "3in1 shower, shampoo" stays: its name says hair.
BODY_ONLY = re.compile(r"body wash|shower gel|gel douche|duschgel|douchegel", re.I)
SAYS_HAIR = re.compile(r"shampoo|shampoing|hair|cabello|haar|cheveux|conditioner", re.I)


def is_body_only(name: str) -> bool:
    return bool(BODY_ONLY.search(name)) and not SAYS_HAIR.search(name)


def to_row(p: dict) -> dict | None:
    ingredients = english_ingredients(p)
    if not ingredients:
        return None
    if is_body_only(p.get("product_name") or ""):
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
