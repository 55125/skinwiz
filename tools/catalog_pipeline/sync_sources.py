#!/usr/bin/env python3
"""
Ask each bulk source what it has now and add what the catalog doesn't.

    python3 sync_sources.py                 # report only
    python3 sync_sources.py --apply         # also append the new rows
    python3 sync_sources.py --sources obf,brands
    python3 sync_sources.py --apply --sources brands --brands cosrx,skinfix

Part of the weekly search-gap check. Each builder runs from a throwaway folder
(they all write to a relative output/), and only rows with an id no catalog has
yet are appended, so existing rows and photos never change here. Refreshing or
removing a row stays a separate, deliberate rebuild. "gone" in the report
counts ids the source no longer returns. For openFDA most of those are still in
the NDC directory: openFDA's label record just lost its link to the NDC (see
output/openfda_gone_2026-11-08.csv), so the report says how many.

Brand crawls skip pages the catalog already has (a full crawl is ~800 pages and
as many photo downloads). A new product's photo follows the project's order:
Open Beauty Facts' photo for that barcode if it has one, hotlinked, otherwise
the brand's, self-hosted.

Curated rows (curated_products.csv) are hand-picked and not polled here.

Run from tools/catalog_pipeline with Pillow installed (requirements.txt).
"""
from __future__ import annotations

import csv
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "output")
BRAND_IMAGE_DIR = os.path.join(HERE, "..", "..", "app", "public", "product-images", "brand-direct")

# Every catalog seed.ts reads. An id in any of them is not new.
ALL_CATALOGS = ["curated", "acne_sun", "dailymed_resolved", "hair_care", "cosmetic", "brand_direct"]
# source name -> (builder, catalog it writes)
BUILDERS = {
    "openfda": ("build_acne_sun_catalog.py", "acne_sun"),
    "obf": ("build_cosmetic_catalog.py", "cosmetic"),
    "hair-care": ("build_hair_care_catalog.py", "hair_care"),
}
SOURCES = [*BUILDERS, "brands"]


def catalog_path(name: str, out_dir: str = OUT_DIR) -> str:
    return os.path.join(out_dir, f"{name}_catalog.csv")


def read_rows(path: str) -> list[dict]:
    if not os.path.exists(path):
        return []
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def is_kit(row: dict) -> bool:
    """A set whose page joins each product's list ("... Body Wash Ingredients:
    Water, ..."). Older brands in the crawler predate its bundle filter."""
    return row.get("source") == "brand_direct" and re.search(r"\bIngredients:", row.get("active_ingredient_text") or "", re.I) is not None


def new_rows(fresh: list[dict], known_ids: set[str], known_labels: set[str] = frozenset()) -> list[dict]:
    """The rows whose id isn't known yet, first row per id, like seed.ts. A
    drug whose label (SPL set id) is already listed is the same product under
    a new NDC (ZO Skin Health renumbered its sunshades), so it isn't new."""
    seen = set(known_ids)
    rows = []
    for row in fresh:
        if row["product_ndc"] and row["product_ndc"] not in seen and not is_kit(row) and row.get("spl_set_id", "") not in known_labels:
            seen.add(row["product_ndc"])
            rows.append(row)
    return rows


def in_ndc_directory(product_ndcs: list[str]) -> int:
    """How many of these product NDCs the FDA's NDC directory still lists."""
    found = 0
    for i in range(0, len(product_ndcs), 25):
        query = " OR ".join(f'product_ndc:"{n}"' for n in product_ndcs[i:i + 25])
        url = "https://api.fda.gov/drug/ndc.json?" + urllib.parse.urlencode({"search": query, "limit": 100})
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "activelyskin-catalog-pipeline/0.1"}), timeout=40) as resp:
                found += len(json.loads(resp.read()).get("results", []))
        except urllib.error.HTTPError as exc:
            if exc.code != 404:
                raise
    return found


def append_rows(path: str, rows: list[dict]) -> None:
    """Appends in the file's own column order and line ending, so a diff shows
    the added lines and nothing else."""
    with open(path, "rb") as f:
        head = f.read(65536)
    with open(path, newline="") as f:
        fieldnames = next(csv.reader(f))
    with open(path, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore", lineterminator="\r\n" if b"\r\n" in head else "\n")
        writer.writerows(rows)


def open_source_image(product_id: str, get) -> str:
    """Open Beauty Facts' front photo for a barcode, or "". `get` is the
    builder's polite fetch, which returns the body or None."""
    if not re.fullmatch(r"\d{8,14}", product_id):
        return ""
    body = get(f"https://world.openbeautyfacts.org/api/v2/product/{product_id}.json?fields=image_front_url")
    try:
        return (json.loads(body).get("product") or {}).get("image_front_url") or "" if body else ""
    except ValueError:
        return ""


def crawl_new_brand_pages(stage: str, only: list[str] | None = None):
    """Runs build_brand_direct_catalog.py for pages the catalog doesn't have,
    one brand at a time (it only writes its CSV at the end, so a stopped run
    loses just the current brand). Yields (brand name, rows)."""
    sys.path.insert(0, HERE)
    import build_brand_direct_catalog as brands

    if brands.Image is None:
        raise SystemExit("Pillow isn't installed, so new photos wouldn't be resized (see requirements.txt).")
    fetch_catalog, get, download = brands.fetch_shopify_catalog, brands._get, brands.download_image
    all_brands = brands.BRANDS
    unknown = set(only or []) - set(all_brands)
    if unknown:
        raise SystemExit(f"Unknown brand(s): {', '.join(sorted(unknown))}. Known: {', '.join(all_brands)}")

    for key, brand in all_brands.items():
        if only and key not in only:
            continue
        known_urls = {r["source_url"] for name in ALL_CATALOGS for r in read_rows(catalog_path(name)) if r.get("source_url")}

        def unseen_products(domain: str) -> list[dict]:
            return [p for p in fetch_catalog(domain) if f"https://{domain}/products/{p.get('handle')}" not in known_urls]

        brands.BRANDS = {key: brand}
        brands.fetch_shopify_catalog = unseen_products
        brands._get = lambda url, *a, **k: None if url in known_urls else get(url, *a, **k)
        brands.download_image = lambda url, pid: open_source_image(pid, get) or download(url, pid)
        brands.IMAGE_DIR = os.path.join(stage, "images")
        os.makedirs(brands.IMAGE_DIR, exist_ok=True)
        cwd = os.getcwd()
        os.chdir(stage)
        try:
            brands.main()
        finally:
            os.chdir(cwd)
        yield brand["brand_name"], read_rows(catalog_path("brand_direct", os.path.join(stage, "output")))


def copy_new_photos(stage: str, rows: list[dict]) -> None:
    for row in rows:
        url = row.get("image_url") or ""
        if url.startswith("/product-images/brand-direct/"):
            shutil.copy(os.path.join(stage, "images", os.path.basename(url)), BRAND_IMAGE_DIR)


def main() -> None:
    apply = "--apply" in sys.argv
    wanted = sys.argv[sys.argv.index("--sources") + 1].split(",") if "--sources" in sys.argv else SOURCES
    only_brands = sys.argv[sys.argv.index("--brands") + 1].split(",") if "--brands" in sys.argv else None
    unknown = set(wanted) - set(SOURCES)
    if unknown:
        sys.exit(f"Unknown source(s): {', '.join(sorted(unknown))}")

    known = [r for name in ALL_CATALOGS for r in read_rows(catalog_path(name))]
    known_ids = {r["product_ndc"] for r in known}
    known_labels = {r["spl_set_id"] for r in known if r.get("spl_set_id")}
    failed = []

    def record(label: str, catalog: str, fresh: list[dict], gone: list[str] | None, stage: str) -> None:
        added = new_rows(fresh, known_ids, known_labels)
        known_ids.update(r["product_ndc"] for r in added)
        summary = f"  {label}: {len(fresh)} returned, {len(added)} new"
        if gone is not None:
            summary += f", {len(gone)} gone"
            if gone and catalog == "acne_sun":
                summary += f" ({in_ndc_directory(gone)} still in the NDC directory)"
        print(summary, flush=True)
        for row in added[:40]:
            print(f"  + {row['product_ndc']}: {row.get('manufacturer_name', '')} | {row['brand_name']} [{row['niche']}]")
        if len(added) > 40:
            print(f"  ... and {len(added) - 40} more")
        if apply and added:
            if catalog == "brand_direct":
                copy_new_photos(stage, added)
            append_rows(catalog_path(catalog), added)

    with tempfile.TemporaryDirectory(prefix="catalog-sync-") as stage:
        os.makedirs(os.path.join(stage, "output"))
        for source in wanted:
            print(f"== {source}", flush=True)
            if source == "brands":
                try:
                    for name, fresh in crawl_new_brand_pages(stage, only_brands):
                        record(name, "brand_direct", fresh, None, stage)
                except Exception as exc:
                    print(f"  FAILED: {exc}")
                    failed.append(source)
                continue
            builder, catalog = BUILDERS[source]
            done = subprocess.run([sys.executable, os.path.join(HERE, builder)], cwd=stage, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
            if done.returncode:
                print(f"  FAILED: {done.stderr.strip().splitlines()[-1] if done.stderr.strip() else done.returncode}")
                failed.append(source)
                continue
            fresh = read_rows(catalog_path(catalog, os.path.join(stage, "output")))
            ids = {r["product_ndc"] for r in fresh}
            record(source, catalog, fresh, [r["product_ndc"] for r in read_rows(catalog_path(catalog)) if r["product_ndc"] not in ids], stage)
    if failed:
        sys.exit(f"Failed: {', '.join(failed)}")


if __name__ == "__main__":
    main()
