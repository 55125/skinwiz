#!/usr/bin/env python3
"""
Adds the high-confidence layer discussed alongside build_cosmetic_catalog.py:
products sourced directly from a brand's own published ingredient-list
pages, rather than the crowd-edited Open Beauty Facts. This is what closes
the gap OBF's own thinness left open — e.g. The Ordinary has 40+ real SKUs
but only 14 (some junk) in Open Beauty Facts.

Trust tier: distinct from both the FDA-sourced catalog and the OBF layer.
It's the manufacturer's own claim (real, legally-exposed if wrong — most
markets require accurate INCI labeling), so it's meaningfully more
trustworthy than crowd-sourced data, but it isn't an FDA filing either.
source="brand_direct" — see app/src/db/schema.ts's products.dataSource
comment and the app's three-tier badge logic (product-card.tsx,
product/[id]/page.tsx) for how this is kept visually distinct from both
other tiers, not blended into either.

Product identity: the manufacturer's own SKU code (from each page's
schema.org Product JSON-LD `sku`/`mpn`), same barcode-keyed-identity
principle as the rest of the catalog — a relaunch under a new SKU becomes
a new row.

Currently one brand (The Ordinary) as a proof of concept — chosen because
it's the exact brand the gap was first found against (zero real entries
existed for it before this), robots.txt allows its product pages, and its
pages are server-rendered (no JS execution needed to read the ingredient
list). Adding another brand means adding one BRANDS entry, matching each
site's own JSON-LD + ingredient-list markup.
"""
from __future__ import annotations

import csv
import json
import re
import sys
import time
import urllib.error
import urllib.request

SLEEP = 0.4

BRANDS = {
    "the_ordinary": {
        "brand_name": "The Ordinary",
        "sitemap_url": "https://theordinary.com/sitemap-en_US.xml",
        "url_pattern": re.compile(r"https://theordinary\.com/en-us/[a-z0-9-]+\.html"),
    },
}

# Same canonical active ids as app/src/db/actives.ts's cosmetic definitions,
# plus a few more real actives found in The Ordinary's actual catalog while
# building this (alpha arbutin, glycolic acid, squalane) — kept as a
# separate small addition here rather than expanding scope further.
COSMETIC_ACTIVES = {
    "niacinamide": ["niacinamide"],
    "azelaic-acid": ["azelaic acid"],
    "vitamin-c": ["ascorbic acid", "ascorbyl glucoside", "ascorbyl tetraisopalmitate"],
    "hyaluronic-acid": ["hyaluronic acid", "sodium hyaluronate"],
    "retinol-cosmetic": ["retinol"],
    "ceramides": ["ceramide"],
    "alpha-arbutin": ["alpha arbutin", "alpha-arbutin"],
    "glycolic-acid": ["glycolic acid"],
    "squalane": ["squalane"],
}


def _get(url: str, retries: int = 3) -> str | None:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (skinwiz-catalog-pipeline/0.1)"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read().decode("utf-8", errors="replace")
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


def matched_active_ids(ingredients_text: str) -> list[str]:
    lowered = ingredients_text.lower()
    return [aid for aid, needles in COSMETIC_ACTIVES.items() if any(n in lowered for n in needles)]


def extract_product(html: str, url: str) -> dict | None:
    ld_json_blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
    product_data = None
    for block in ld_json_blocks:
        try:
            data = json.loads(block.strip())
        except json.JSONDecodeError:
            continue
        if data.get("@type") == "Product":
            product_data = data
            break
    if not product_data:
        return None

    ingredients_match = re.search(r'data-original-ingredients="([^"]*)"', html)
    if not ingredients_match:
        return None
    ingredients_text = ingredients_match.group(1)

    active_ids = matched_active_ids(ingredients_text)
    if not active_ids:
        return None

    sku = product_data.get("sku") or product_data.get("mpn")
    if not sku:
        return None

    return {
        "product_ndc": sku,
        "brand_name": product_data.get("name", "").strip() or "(unnamed product)",
        "manufacturer_name": (product_data.get("brand") or {}).get("name", ""),
        "active_ingredient_text": ingredients_text,
        "active_ingredients_structured": ";".join(active_ids),
        "source_url": url,
    }


def main() -> None:
    rows: list[dict] = []

    for key, brand in BRANDS.items():
        print(f"Fetching sitemap for {brand['brand_name']}...", file=sys.stderr)
        sitemap_xml = _get(brand["sitemap_url"])
        if not sitemap_xml:
            print(f"  failed to fetch sitemap for {key}, skipping", file=sys.stderr)
            continue
        urls = sorted(set(brand["url_pattern"].findall(sitemap_xml)))
        print(f"  {len(urls)} product URLs found", file=sys.stderr)

        for i, url in enumerate(urls, 1):
            html = _get(url)
            if html:
                product = extract_product(html, url)
                if product:
                    product["manufacturer_name"] = product["manufacturer_name"] or brand["brand_name"]
                    rows.append(product)
            if i % 20 == 0:
                print(f"  {i}/{len(urls)} pages checked, {len(rows)} matched so far", file=sys.stderr)
            time.sleep(SLEEP)

    fieldnames = [
        "product_ndc", "niche", "brand_name", "manufacturer_name", "substance_name",
        "active_ingredient_text", "active_ingredients_structured", "dosage_form", "route",
        "marketing_category", "product_type", "finished", "listing_expiration_date",
        "package_ndcs", "purpose_text", "indications_and_usage", "inactive_ingredient_text",
        "spl_set_id", "effective_time", "source", "verified", "source_url",
    ]
    with open("output/brand_direct_catalog.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            row["niche"] = "brightening-texture"
            row["source"] = "brand_direct"
            row["verified"] = "true"
            for field in fieldnames:
                row.setdefault(field, "")
            writer.writerow(row)

    by_active: dict[str, int] = {}
    for row in rows:
        for aid in row["active_ingredients_structured"].split(";"):
            by_active[aid] = by_active.get(aid, 0) + 1

    print(f"\n{len(rows)} products matched (brand-direct, verified)")
    print(f"by active: {json.dumps(by_active, indent=2)}")
    print("output/brand_direct_catalog.csv written")


if __name__ == "__main__":
    main()
