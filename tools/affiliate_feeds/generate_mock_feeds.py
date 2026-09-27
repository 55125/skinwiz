#!/usr/bin/env python3
"""
Generate SYNTHETIC Awin- and CJ-format product feeds from a sample of our
real acne+sun catalog, for testing the matching pipeline before any real
affiliate account exists.

These are NOT real feed downloads — there is no live affiliate account to
pull from yet (see README.md). Prices, GTINs, image/buy URLs, and retailer
titles below are fabricated. Only the underlying product identity (brand,
active ingredient) is drawn from the real openFDA-sourced catalog, and
retailer-style titles are deliberately reworded (the way a real retailer's
feed title would differ from the FDA drug-facts brand_name) so the fuzzy
matcher in match_catalog.py has something realistic to solve.
"""
from __future__ import annotations

import csv
import random

random.seed(7)

CATALOG_PATH = "../catalog_pipeline/output/acne_sun_catalog.csv"

# (catalog brand_name substring to find, retailer-style title rewrite, size)
RETAILER_TITLE_OVERRIDES = [
    ("CeraVe Developed with Dermatologists Acne Control Cleanser", "CeraVe Acne Control Face Wash with Salicylic Acid", "5 fl oz"),
    ("Differin 10% BPO Acne Treatment", "Differin Benzoyl Peroxide 10% Acne Treatment Gel", "2.5 oz"),
    ("Neutrogena Adapalene 0.1% Acne Treatment", "Neutrogena On-The-Spot Acne Treatment with Adapalene 0.1%", "0.5 oz"),
    ("CeraVe Acne Foaming CreamWash", "CeraVe Acne Foaming Cream Cleanser", "5 oz"),
    ("Neutrogena Body Clear Body Wash", "Neutrogena Body Clear Acne Body Wash", "8.5 fl oz"),
    ("Aveeno CLEAR COMPLEXION foaming cleanser", "Aveeno Clear Complexion Foaming Cleanser", "5 fl oz"),
    ("Neutrogena Oil-Free Acne Wash Daily Scrub", "Neutrogena Oil-Free Acne Face Scrub", "4.2 oz"),
    ("CeraVe Acne Clay-to-Foam Cleanser", "CeraVe Acne Clay to Foam Face Cleanser", "5 oz"),
    ("Cetaphil Gentle Clear Triple-Action Acne Serum", "Cetaphil Gentle Clear Acne Serum", "1.35 fl oz"),
]


def load_catalog_sample() -> list[dict]:
    rows = list(csv.DictReader(open(CATALOG_PATH)))
    by_brand = {r["brand_name"]: r for r in rows}
    sample = []
    for needle, retail_title, size in RETAILER_TITLE_OVERRIDES:
        match = next((r for b, r in by_brand.items() if needle in b), None)
        if match:
            sample.append((match, retail_title, size))
    return sample


def write_awin_feed(sample: list[tuple[dict, str, str]], path: str) -> None:
    fields = [
        "aw_product_id", "product_name", "brand_name", "description",
        "search_price", "currency", "aw_image_url", "aw_deep_link",
        "ean", "merchant_category", "in_stock",
    ]
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for i, (catalog_row, retail_title, size) in enumerate(sample):
            writer.writerow({
                "aw_product_id": f"AWIN{1000+i}",
                "product_name": f"{retail_title}, {size}",
                "brand_name": catalog_row["brand_name"].split()[0],
                "description": f"{retail_title} featuring {catalog_row['active_ingredients_structured']}",
                "search_price": f"{random.uniform(6.99, 24.99):.2f}",
                "currency": "USD",
                "aw_image_url": f"https://example-cdn.invalid/awin/{1000+i}.jpg",
                "aw_deep_link": f"https://www.awin1.com/cread.php?awinmid=1234&awinaffid=5678&clickref=&p=product%2F{1000+i}",
                "ean": "",  # deliberately empty — most drugstore OTC feeds don't populate GTIN cleanly
                "merchant_category": "Skin Care > Acne Treatment",
                "in_stock": "true",
            })


def write_cj_feed(sample: list[tuple[dict, str, str]], path: str) -> None:
    fields = [
        "catalog-id", "name", "manufacturer", "description", "price",
        "currency", "image-url", "buy-url", "upc", "advertiser-category", "in-stock",
    ]
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for i, (catalog_row, retail_title, size) in enumerate(sample):
            writer.writerow({
                "catalog-id": f"CJ{2000+i}",
                "name": f"{retail_title} ({size})",
                "manufacturer": catalog_row["brand_name"].split()[0],
                "description": catalog_row["active_ingredients_structured"],
                "price": f"{random.uniform(6.99, 24.99):.2f}",
                "currency": "USD",
                "image-url": f"https://example-cdn.invalid/cj/{2000+i}.jpg",
                "buy-url": f"https://www.tkqlhce.com/click-1234567-{2000+i}",
                "upc": "",
                "advertiser-category": "Health & Beauty > Skin Care",
                "in-stock": "Y",
            })


def write_impact_feed(sample: list[tuple[dict, str, str]], path: str) -> None:
    fields = [
        "CatalogItemId", "Name", "Manufacturer", "Description", "CurrentPrice",
        "Currency", "ImageUrl", "Url", "Gtin", "Category", "StockAvailability",
    ]
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for i, (catalog_row, retail_title, size) in enumerate(sample):
            writer.writerow({
                "CatalogItemId": f"IMPACT{3000+i}",
                "Name": f"{retail_title} - {size}",
                "Manufacturer": catalog_row["brand_name"].split()[0],
                "Description": f"{retail_title} with {catalog_row['active_ingredients_structured']}",
                "CurrentPrice": f"{random.uniform(6.99, 24.99):.2f}",
                "Currency": "USD",
                "ImageUrl": f"https://example-cdn.invalid/impact/{3000+i}.jpg",
                "Url": f"https://www.target.com/p/-/A-{3000+i}",
                "Gtin": "",
                "Category": "Health > Skin Care > Acne Treatment",
                "StockAvailability": "InStock",
            })


def main() -> None:
    sample = load_catalog_sample()
    print(f"Matched {len(sample)}/{len(RETAILER_TITLE_OVERRIDES)} override rows against the real catalog")
    write_awin_feed(sample, "mock_feeds/awin_sample_feed.csv")
    write_cj_feed(sample, "mock_feeds/cj_sample_feed.csv")
    write_impact_feed(sample, "mock_feeds/impact_sample_feed.csv")
    print("Wrote mock_feeds/awin_sample_feed.csv, cj_sample_feed.csv, impact_sample_feed.csv")


if __name__ == "__main__":
    main()
