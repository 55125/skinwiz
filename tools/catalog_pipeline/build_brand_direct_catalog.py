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

Started with The Ordinary (chosen because it's the exact brand the gap
was first found against — zero real entries existed for it before this).
Added CeraVe second: also server-rendered and robots.txt-allowed, but a
messier site than The Ordinary's — its product-listing grids are
client-rendered (Vue.js), so its full catalog isn't discoverable via
static sitemap/HTML the way The Ordinary's is; only 9 product URLs were
reachable this way (see README_cosmetic.md for the accepted gap and what
a full crawl would need). Its ingredient-list markup and product-identity
field also differ from The Ordinary's, hence the per-brand `parser` key
and extractor function below rather than one shared extractor.
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
# A real ingredient list is at most a few hundred words. Guards against the
# exact bug found while building this: a boundary regex that (on some pages
# only) matched 50,000+ characters of unrelated page content instead of the
# ingredient list. If a future page-structure change reintroduces something
# like it, this rejects the row instead of silently storing garbage.
MAX_INGREDIENT_TEXT_LEN = 3000

BRANDS = {
    "the_ordinary": {
        "brand_name": "The Ordinary",
        "sitemap_url": "https://theordinary.com/sitemap-en_US.xml",
        "url_pattern": re.compile(r"https://theordinary\.com/en-us/[a-z0-9-]+\.html"),
        "parser": "the_ordinary",
    },
    "cerave": {
        "brand_name": "CeraVe",
        "sitemap_url": "https://a82962.sitemaphosting.com/4034207/sitemap.xml",
        # Real product pages are exactly /skincare/{category}/{subcategory}/{slug} —
        # category hub pages (fewer segments) are excluded by this depth match.
        "url_pattern": re.compile(r"https://www\.cerave\.com/skincare/[a-z0-9-]+/[a-z0-9-]+/[a-z0-9-]+"),
        "parser": "cerave",
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


def find_product_json_ld(html: str) -> dict | None:
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL):
        try:
            # strict=False: CeraVe's Product JSON-LD embeds literal control
            # characters (real newlines) inside string values, which fails
            # strict JSON parsing — confirmed by hand before adding this.
            data = json.loads(block.strip(), strict=False)
        except json.JSONDecodeError:
            continue
        if data.get("@type") == "Product":
            return data
    return None


def extract_product_the_ordinary(html: str, url: str) -> dict | None:
    product_data = find_product_json_ld(html)
    if not product_data:
        return None

    ingredients_match = re.search(r'data-original-ingredients="([^"]*)"', html)
    if not ingredients_match:
        return None
    ingredients_text = ingredients_match.group(1)
    if len(ingredients_text) > MAX_INGREDIENT_TEXT_LEN:
        print(f"  skipping {url}: extracted ingredient text implausibly long ({len(ingredients_text)} chars)", file=sys.stderr)
        return None

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


def extract_product_cerave(html: str, url: str) -> dict | None:
    product_data = find_product_json_ld(html)
    if not product_data:
        return None

    # Bug found by hand-inspecting a rendered page before trusting this at
    # scale: originally cut at the first "<br" after the ingredients block,
    # but that tag's distance from the block varies wildly by page -- on
    # one product the nearest "<br" was 88,752 characters away (elsewhere
    # on the page entirely), so the "ingredient text" swept up nearly the
    # whole document. The reliable boundary is the block's own closing
    # "</div>"; a "please be aware ingredients are updated" disclaimer and
    # inline "<a href>" links to ingredient-detail pages both still land
    # inside that div on other products, so those are stripped explicitly
    # rather than relied on to be outside the boundary.
    ingredients_match = re.search(r'keyIngredients-details__content">(.*?)</div>', html, re.DOTALL)
    if not ingredients_match:
        return None
    ingredients_text = re.sub(r"<[^>]+>", " ", ingredients_match.group(1))
    ingredients_text = re.split(r"please be aware", ingredients_text, flags=re.IGNORECASE)[0]
    ingredients_text = re.sub(r"\s+", " ", ingredients_text).strip(" ,.")
    if not ingredients_text:
        return None
    if len(ingredients_text) > MAX_INGREDIENT_TEXT_LEN:
        print(f"  skipping {url}: extracted ingredient text implausibly long ({len(ingredients_text)} chars)", file=sys.stderr)
        return None

    active_ids = matched_active_ids(ingredients_text)
    if not active_ids:
        return None

    # No single unambiguous barcode: pages embed multiple (this product's
    # own, plus related-product carousel items), and JSON-LD here has no
    # sku/mpn field. The canonical URL is CeraVe's own stable identifier
    # for this product instead — still satisfies the "one distinct id per
    # product" principle even though it isn't a GS1 barcode.
    product_id = product_data.get("@id") or url

    return {
        "product_ndc": product_id,
        "brand_name": product_data.get("name", "").strip() or "(unnamed product)",
        "manufacturer_name": "CeraVe",
        "active_ingredient_text": ingredients_text,
        "active_ingredients_structured": ";".join(active_ids),
        "source_url": url,
    }


EXTRACTORS = {
    "the_ordinary": extract_product_the_ordinary,
    "cerave": extract_product_cerave,
}


def main() -> None:
    rows: list[dict] = []

    for key, brand in BRANDS.items():
        extractor = EXTRACTORS[brand["parser"]]
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
                product = extractor(html, url)
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
