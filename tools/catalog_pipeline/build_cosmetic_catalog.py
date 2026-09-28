#!/usr/bin/env python3
"""
Build a cosmetic-ingredient product catalog from Open Beauty Facts (OBF) —
the layer project.md's original data plan called for ("Top 200-500 cosmetic
INCI lists... Open Beauty Facts... weak US coverage") to cover actives like
niacinamide that have no FDA drug-monograph status and are therefore
invisible to build_acne_sun_catalog.py (that pipeline only sees products
with a Drug Facts panel).

This is a DIFFERENT trust tier than the openFDA/DailyMed catalog, by
design, not oversight: OBF is crowd-sourced (anyone can submit/edit), and
spot-checking before writing this found real junk in it (a "TESTBRAND" /
"TEST Regression Cream" entry came back in a plain niacinamide search) and
thin coverage (The Ordinary has 40+ real SKUs; OBF has 14, some of which
are junk like a product literally named "www.THEORDINARY.COM"). Every row
this script produces is written with source="open_beauty_facts" and
verified=False so the app can render an unmistakable "community-sourced,
unverified" badge — see app/src/db/schema.ts's products.dataSource/verified
comment. Contrast with the openFDA/DailyMed rows, which get verified=True
because they're derived from what the manufacturer legally filed with the
FDA, not what a random contributor typed in.

Product identity: keyed by OBF's own barcode (`code`), same principle as
using product_ndc for the drug catalog -- one row per distinct barcode, so
a repackaged/reformulated relaunch (which almost always gets a new
barcode) becomes a new row rather than overwriting the old one. A brand
silently changing its formula without a new barcode won't be caught; that
was a deliberate accepted gap, not an oversight -- see the project
conversation log for the reasoning (packaging-appearance change is the
practical proxy for "different product," and formula changes without any
packaging change are rare).
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

OBF_BASE = "https://world.openbeautyfacts.org/api/v2/search"
PAGE_SIZE = 100
SLEEP = 0.3

# (OBF ingredients_tag, canonical active id, substring(s) to confirm match
# in ingredients_text -- OBF's tag search is occasionally over-broad, so
# every candidate is re-checked against the actual ingredient text.)
COSMETIC_ACTIVES = {
    "niacinamide": ("niacinamide", ["niacinamide"]),
    "azelaic-acid": ("azelaic-acid", ["azelaic acid"]),
    "ascorbic-acid": ("vitamin-c", ["ascorbic acid"]),
    "hyaluronic-acid": ("hyaluronic-acid", ["hyaluronic acid", "sodium hyaluronate"]),
    "sodium-hyaluronate": ("hyaluronic-acid", ["hyaluronic acid", "sodium hyaluronate"]),
    "retinol": ("retinol-cosmetic", ["retinol"]),
    "ceramide-np": ("ceramides", ["ceramide"]),
    # Added 2026-09-27 closing the same class of gap niacinamide/vitamin C
    # closed originally -- real, heavily-searched cosmetic actives with no
    # FDA drug-monograph status. Every tag below was confirmed against a
    # live OBF count before being added (no guessed/dead tags).
    "palmitoyl-pentapeptide-4": ("peptides", ["palmitoyl pentapeptide", "palmitoyl tripeptide", "palmitoyl hexapeptide"]),
    "copper-tripeptide-1": ("peptides", ["copper tripeptide", "copper peptide"]),
    "acetyl-hexapeptide-8": ("peptides", ["acetyl hexapeptide"]),
    "bakuchiol": ("bakuchiol", ["bakuchiol"]),
    "tranexamic-acid": ("tranexamic-acid", ["tranexamic acid"]),
    "centella-asiatica": ("centella-asiatica", ["centella asiatica"]),
    "centella-asiatica-extract": ("centella-asiatica", ["centella asiatica"]),
    "panthenol": ("panthenol", ["panthenol", "dexpanthenol"]),
    "dexpanthenol": ("panthenol", ["panthenol", "dexpanthenol"]),
    "kojic-acid": ("kojic-acid", ["kojic acid"]),
    "mandelic-acid": ("mandelic-acid", ["mandelic acid"]),
    "lactic-acid": ("lactic-acid", ["lactic acid"]),
}

JUNK_PATTERN = re.compile(r"\btest\b", re.IGNORECASE)


def _get(url: str, retries: int = 3) -> dict | None:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "skinwiz-catalog-pipeline/0.1"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read())
        except Exception:
            if attempt == retries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def fetch_tag(tag: str) -> list[dict]:
    products: list[dict] = []
    page = 1
    while True:
        params = {
            "ingredients_tags": tag,
            "page": page,
            "page_size": PAGE_SIZE,
            "fields": "code,product_name,brands,ingredients_text,completeness,image_front_url",
        }
        data = _get(f"{OBF_BASE}?{urllib.parse.urlencode(params)}")
        if not data:
            break
        batch = data.get("products", [])
        if not batch:
            break
        products.extend(batch)
        if page * PAGE_SIZE >= data.get("count", 0):
            break
        page += 1
        time.sleep(SLEEP)
    return products


def is_junk(product: dict) -> bool:
    name = product.get("product_name") or ""
    brand = product.get("brands") or ""
    ingredients = product.get("ingredients_text") or ""
    if JUNK_PATTERN.search(name) or JUNK_PATTERN.search(brand):
        return True
    if not name.strip() or not brand.strip():
        return True
    if len(ingredients) < 15:
        return True
    try:
        completeness = float(product.get("completeness") or 0)
    except (TypeError, ValueError):
        completeness = 0
    if completeness < 0.2:
        return True
    return False


# Which real-world concern a tracked cosmetic active is the better fit for.
# Every cosmetic active defaulted to Brightening & Texture as a launch-day
# catch-all, but that's wrong for barrier/hydration ingredients -- ceramides,
# squalane, panthenol, centella asiatica, and hyaluronic acid are moisturizing
# and barrier-repair ingredients first, brightening only incidentally, and a
# CeraVe-style ceramide moisturizer showing up under "Brightening & Texture"
# instead of "Dry Skin & Eczema" is a real mistagging, not a rounding error.
NICHE_LEANS_SKIN_PROTECTANT = {"ceramides", "squalane", "panthenol", "centella-asiatica", "hyaluronic-acid"}


def pick_niche(active_ids: list[str]) -> str:
    """A product's niche is decided by which of its matched actives are the
    majority -- e.g. a niacinamide+ceramide combo (a common real formulation)
    still reads as brightening if niacinamide-family actives dominate, but
    dry-skin/eczema if the barrier/hydration actives above dominate. Ties
    default to Brightening & Texture, the original catch-all niche."""
    protectant_votes = sum(1 for a in active_ids if a in NICHE_LEANS_SKIN_PROTECTANT)
    return "skin-protectant" if protectant_votes > len(active_ids) - protectant_votes else "brightening-texture"


def matched_active_ids(ingredients_text: str) -> list[str]:
    lowered = ingredients_text.lower()
    seen = set()
    matched = []
    for _, (active_id, needles) in COSMETIC_ACTIVES.items():
        if active_id in seen:
            continue
        if any(n in lowered for n in needles):
            matched.append(active_id)
            seen.add(active_id)
    return matched


def main() -> None:
    by_barcode: dict[str, dict] = {}

    for tag in COSMETIC_ACTIVES:
        print(f"Fetching OBF products tagged '{tag}'...", file=sys.stderr)
        products = fetch_tag(tag)
        print(f"  {len(products)} raw results", file=sys.stderr)
        for p in products:
            code = p.get("code")
            if not code or code in by_barcode:
                continue
            if is_junk(p):
                continue
            active_ids = matched_active_ids(p.get("ingredients_text") or "")
            if not active_ids:
                continue
            by_barcode[code] = {
                "product_ndc": code,  # same column name as the drug catalog for seed.ts compatibility
                "niche": pick_niche(active_ids),
                "brand_name": p["product_name"].strip(),
                "manufacturer_name": p["brands"].strip(),
                "active_ingredient_text": p.get("ingredients_text", "")[:500],
                "active_ingredients_structured": ";".join(active_ids),
                "dosage_form": "",
                "route": "",
                "marketing_category": "",
                "product_type": "",
                "finished": "",
                "listing_expiration_date": "",
                "package_ndcs": "",
                "purpose_text": "",
                "indications_and_usage": "",
                "inactive_ingredient_text": "",
                "spl_set_id": "",
                "effective_time": "",
                "source": "open_beauty_facts",
                "verified": "false",
                "image_url": p.get("image_front_url") or "",
            }

    rows = list(by_barcode.values())
    fieldnames = [
        "product_ndc", "niche", "brand_name", "manufacturer_name", "substance_name",
        "active_ingredient_text", "active_ingredients_structured", "dosage_form", "route",
        "marketing_category", "product_type", "finished", "listing_expiration_date",
        "package_ndcs", "purpose_text", "indications_and_usage", "inactive_ingredient_text",
        "spl_set_id", "effective_time", "source", "verified", "image_url",
    ]
    with open("output/cosmetic_catalog.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            row.setdefault("substance_name", "")
            writer.writerow(row)

    by_active: dict[str, int] = {}
    for row in rows:
        for aid in row["active_ingredients_structured"].split(";"):
            by_active[aid] = by_active.get(aid, 0) + 1

    print(f"\n{len(rows)} distinct products (by barcode) after junk filtering")
    print(f"by active: {json.dumps(by_active, indent=2)}")
    print("output/cosmetic_catalog.csv written")


if __name__ == "__main__":
    main()
