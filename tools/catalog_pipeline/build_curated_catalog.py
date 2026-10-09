#!/usr/bin/env python3
"""
Hand-picked products the bulk catalog passes miss, one reviewed row each.

Persona testing (2026-10-08) searched for well-known products and found
nothing: Jergens Ultra Healing, Paula's Choice 2% BHA, Supergoop Unseen,
PanOxyl's benzoyl peroxide washes, Nizoral, Hero Mighty Patch, and a
Lubriderm row whose name was literally "English". Each was missed for its own
reason (a brand site the crawler doesn't cover, an NDA OTC the monograph
queries never fetch, an SPL listing newer than the last openFDA pull, no
tracked active at all), so rather than widen every bulk pass this file holds
them as an explicit, reviewable list.

Input:  curated_products.csv (hand-edited; one row per product, with a
        `note` saying where the data came from and anything unusual)
Output: output/curated_catalog.csv, same columns as brand_direct_catalog.csv,
        which app/src/db/seed.ts reads FIRST, so a curated row also replaces
        a bulk row with the same id (that is how the "English" Lubriderm row
        is fixed without editing a generated file).

Two kinds of row:
  cosmetic  The ingredient list and photo come from the manufacturer's own
            product page (`source_url`), so the row is source="brand_direct",
            the same trust tier as build_brand_direct_catalog.py. The list is
            copied into the input file by hand, because these pages differ too
            much to scrape generically (Shopify metafields, a client-rendered
            Paula's Choice tab, a Contentful blob on Lubriderm). `active_ids`
            may be left blank (matched with the brand-direct matcher) or set
            by hand. A cosmetic with no tracked active still lists; the seed
            allows that for this file only.
  third_party  A cosmetic whose manufacturer publishes no ingredient list
            (Curel Itch Defense). The list comes from independent ingredient
            databases that agree with each other; `source_url` holds them,
            space-separated. source="third_party", verified=false, and the
            product page says where the list came from.
  drug      Everything comes from the DailyMed SPL for `spl_set_id`: actives
            and strengths, the product's structured inactive list, purpose
            and uses. source="dailymed". Package photos then come through the
            usual DailyMed media pass (dailymed_spl.SOURCES lists this file).

Product ids follow the catalog's barcode-keyed identity: the NDC product code
for drugs, the retail UPC/EAN as 13 digits (OBF's form) or the brand's own SKU
for cosmetics.

Run from tools/catalog_pipeline with Pillow installed (requirements.txt).
"""
from __future__ import annotations

import csv
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

from build_brand_direct_catalog import Image, _get_bytes, _resize_if_needed, matched_active_ids
from dailymed_spl import BASE, OUT_DIR, RateLimiter, http_get, read_cached_xml, write_cached_xml
from spl_parse import effective_time, inactive_section_text, parse_xml, product_inactive_lists

HERE = os.path.dirname(os.path.abspath(__file__))
INPUT = os.path.join(HERE, "curated_products.csv")
OUT = os.path.join(OUT_DIR, "curated_catalog.csv")
IMAGE_DIR = os.path.join(HERE, "..", "..", "app", "public", "product-images", "brand-direct")
IMAGE_URL_PREFIX = "/product-images/brand-direct"

NICHES = {"acne", "sunscreen", "antifungal", "antidandruff", "anti-itch", "skin-protectant", "antiperspirant", "brightening-texture"}

FIELDNAMES = [
    "product_ndc", "niche", "brand_name", "manufacturer_name", "substance_name",
    "active_ingredient_text", "active_ingredients_structured", "dosage_form", "route",
    "marketing_category", "product_type", "finished", "listing_expiration_date",
    "package_ndcs", "purpose_text", "indications_and_usage", "inactive_ingredient_text",
    "spl_set_id", "effective_time", "source", "verified", "source_url", "image_url",
]

limiter = RateLimiter(4)


def _json(url: str) -> dict:
    body = http_get(url, limiter)
    return json.loads(body) if body else {}


def spl_xml(setid: str) -> str:
    xml = read_cached_xml(setid)
    if xml is None:
        body = http_get(f"{BASE}/{setid}.xml", limiter)
        if body is None:
            raise SystemExit(f"SPL {setid} not found on DailyMed")
        write_cached_xml(setid, body)
        xml = body.decode("utf-8", errors="replace")
    return xml


def _ndc_key(ndc: str) -> str:
    return "-".join(p.lstrip("0") or "0" for p in ndc.split("-"))


def _openfda_label(setid: str) -> dict:
    url = "https://api.fda.gov/drug/label.json?" + urllib.parse.urlencode({"search": f'set_id:"{setid}"', "limit": 1})
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "activelyskin-catalog-pipeline/0.1"})
        with urllib.request.urlopen(req, timeout=40) as resp:
            results = json.loads(resp.read()).get("results", [])
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise
        results = []
    return results[0] if results else {}


def _first(rec: dict, field: str) -> str:
    return re.sub(r"\s+", " ", " ".join(rec.get(field) or [])).strip()


def drug_row(spec: dict) -> dict:
    setid = spec["spl_set_id"]
    ndc = spec["product_id"]
    packaging = _json(f"{BASE}/{setid}/packaging.json").get("data", {})
    products = packaging.get("products", [])
    package_ndcs = [p["ndc"] for prod in products for p in prod.get("packaging", []) if _ndc_key(p["ndc"].rsplit("-", 1)[0]) == _ndc_key(ndc)]
    if not package_ndcs:
        raise SystemExit(f"{ndc}: no package of that product in SPL {setid}")
    actives = next((prod.get("active_ingredients", []) for prod in products if prod.get("packaging")), [])

    root = parse_xml(spl_xml(setid))
    lists = [p for p in product_inactive_lists(root) if p.inactive]
    match = next((p for p in lists if p.ndc and _ndc_key(p.ndc) == _ndc_key(ndc)), lists[0] if len(lists) == 1 else None)
    inactive = ", ".join(name for name, _ in match.inactive) if match else inactive_section_text(root)

    label = _openfda_label(setid)
    # The Drug Facts line ("Avobenzone 3%, ...") is what seed.ts parses
    # strengths from when the structured column is empty -- used instead of
    # the SPL's structured strengths, which a labeler can get wrong (see the
    # Unseen SPF 50 note in curated_products.csv).
    # seed.ts's parseStrengths splits segments on ";" only, so a
    # comma-joined line would give every active the last one's percent.
    active_text = re.sub(r"%\s*,\s*", "%; ", _first(label, "active_ingredient")) or "; ".join(f"{a['name']} {a['strength']}" for a in actives)
    return {
        "product_ndc": ndc,
        "niche": spec["niche"],
        "brand_name": spec["brand_name"],
        "manufacturer_name": spec["manufacturer_name"],
        "substance_name": ";".join(a["name"].upper() for a in actives),
        "active_ingredient_text": active_text,
        "active_ingredients_structured": "",
        "package_ndcs": ";".join(package_ndcs),
        "purpose_text": _first(label, "purpose"),
        "indications_and_usage": _first(label, "indications_and_usage"),
        "inactive_ingredient_text": inactive,
        "spl_set_id": setid,
        "effective_time": effective_time(root),
        "source": "dailymed",
        "verified": "true",
    }


def download_image(url: str, product_id: str) -> str:
    """Like build_brand_direct_catalog.download_image, but names the file by
    what the bytes actually are (a CDN's ".webp?fm=jpg" URL serves a JPEG)."""
    data = _get_bytes(url)
    if not data:
        print(f"  failed to download image for {product_id}: {url}", file=sys.stderr)
        return ""
    ext = "jpg"
    if Image is not None:
        fmt = (Image.open(io.BytesIO(data)).format or "JPEG").lower()
        ext = {"jpeg": "jpg"}.get(fmt, fmt)
    data = _resize_if_needed(data, ext)
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", product_id).strip("-").lower()[:80]
    os.makedirs(IMAGE_DIR, exist_ok=True)
    with open(os.path.join(IMAGE_DIR, f"{slug}.{ext}"), "wb") as f:
        f.write(data)
    return f"{IMAGE_URL_PREFIX}/{slug}.{ext}"


def cosmetic_row(spec: dict) -> dict:
    ingredients = spec["ingredients"].strip()
    active_ids = [a for a in spec["active_ids"].split(";") if a] or matched_active_ids(ingredients)
    return {
        "product_ndc": spec["product_id"],
        "niche": spec["niche"],
        "brand_name": spec["brand_name"],
        "manufacturer_name": spec["manufacturer_name"],
        "active_ingredient_text": ingredients,
        "active_ingredients_structured": ";".join(active_ids),
        # A brand that publishes no ingredient list can still be listed from
        # independent ingredient databases, as source="third_party",
        # unverified, never passed off as the brand's own data. Its
        # source_url names those databases and is not a "Buy directly" link
        # (seed.ts only keeps source_url for brand_direct rows).
        "source": "third_party" if spec["kind"] == "third_party" else "brand_direct",
        "verified": "false" if spec["kind"] == "third_party" else "true",
        "source_url": spec["source_url"],
        "image_url": download_image(spec["image_source_url"], spec["product_id"]) if spec["image_source_url"] else "",
    }


def main() -> None:
    if Image is None:
        print("WARNING: Pillow not installed -- images will NOT be resized (see requirements.txt).", file=sys.stderr)
    with open(INPUT, newline="") as f:
        specs = list(csv.DictReader(f))
    ids = [s["product_id"] for s in specs]
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate product_id in curated_products.csv")

    rows = []
    for spec in specs:
        if spec["niche"] not in NICHES:
            raise SystemExit(f"{spec['product_id']}: unknown niche {spec['niche']!r}")
        row = drug_row(spec) if spec["kind"] == "drug" else cosmetic_row(spec)
        rows.append({k: row.get(k, "") for k in FIELDNAMES})
        print(f"  {row['product_ndc']}: {row['brand_name']} [{row.get('active_ingredients_structured') or row.get('substance_name') or 'no tracked active'}]", file=sys.stderr)

    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDNAMES)
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} curated products -> {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
