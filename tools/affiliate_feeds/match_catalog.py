#!/usr/bin/env python3
"""
Join affiliate feed rows (normalized via affiliate_schema.py) against the
openFDA acne+sun catalog, so each catalog product ends up with a real
price/image/buy-link.

Matching strategy: exact GTIN/UPC when the feed provides one, otherwise
fuzzy title/brand text matching. See README.md for why UPC-first isn't as
reliable a plan as project.md §6 originally assumed, and why fuzzy text +
a manual-review tier is the real v1 design.

Token-set (Jaccard) overlap, not difflib.SequenceMatcher — tried
SequenceMatcher first and it mismatched 2 of 9 real test products (e.g.
matched a reworded "CeraVe ... Face Wash with Salicylic Acid" title to an
unrelated "Defense Acne Care 2% Salicylic Acid" product, scoring it higher
than the actual CeraVe product) because it's a character-sequence ratio,
not word-aware, so reordered/reworded retail titles tank it even when they
share the same key words. Jaccard on tokens fixed both misses in testing.
"""
from __future__ import annotations

import csv
import json
import re

import affiliate_schema

CATALOG_PATH = "../catalog_pipeline/output/acne_sun_catalog.csv"

# Below this similarity score, don't auto-link — queue for manual review.
# Chosen empirically against the mock feed's deliberately reworded retailer
# titles (see generate_mock_feeds.py); re-tune once real feed data exists.
AUTO_MATCH_THRESHOLD = 0.30


def load_catalog() -> list[dict]:
    return list(csv.DictReader(open(CATALOG_PATH)))


def tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def load_feed(path: str, network: str) -> list[affiliate_schema.NormalizedProduct]:
    adapter = affiliate_schema.ADAPTERS[network]
    with open(path, newline="") as f:
        return [adapter(row) for row in csv.DictReader(f)]


def similarity(a: str, b: str) -> float:
    tokens_a, tokens_b = tokenize(a), tokenize(b)
    if not tokens_a or not tokens_b:
        return 0.0
    return len(tokens_a & tokens_b) / len(tokens_a | tokens_b)


KNOWN_ACTIVES = [
    "salicylic acid", "benzoyl peroxide", "adapalene", "sulfur", "azelaic acid",
    "octisalate", "zinc oxide", "avobenzone", "octocrylene", "homosalate",
    "titanium dioxide", "octinoxate", "oxybenzone", "ensulizole",
]


def mentioned_actives(text: str) -> set[str]:
    lowered = text.lower()
    return {active for active in KNOWN_ACTIVES if active in lowered}


def best_catalog_match(product: affiliate_schema.NormalizedProduct, catalog: list[dict]) -> tuple[dict | None, float]:
    if product.gtin_or_upc:
        exact = next((c for c in catalog if c.get("upc") == product.gtin_or_upc), None)
        if exact:
            return exact, 1.0

    # First-pass title matching alone produced real wrong matches in testing
    # (e.g. one CeraVe salicylic-acid cleanser matched to a different CeraVe
    # benzoyl-peroxide product just on title overlap) — different brand SKUs
    # share a lot of boilerplate wording ("Acne", "Cleanser", "Foaming").
    # Requiring active-ingredient agreement first, when the feed text names
    # one, removes that whole failure mode instead of just raising the
    # similarity bar (which doesn't distinguish same-brand same-wording SKUs).
    feed_actives = mentioned_actives(f"{product.title} {product.description}")
    candidates = catalog
    if feed_actives:
        filtered = [
            row for row in catalog
            if mentioned_actives(row.get("active_ingredients_structured", "")) & feed_actives
        ]
        if filtered:
            candidates = filtered

    best_row, best_score = None, 0.0
    for row in candidates:
        score = similarity(product.title, row["brand_name"])
        # brand-name agreement is a strong independent signal beyond raw title
        # similarity — a feed title can be reworded but the brand rarely is
        if product.brand and product.brand.lower() in row["brand_name"].lower():
            score += 0.15
        if score > best_score:
            best_row, best_score = row, score
    return best_row, best_score


def main() -> None:
    catalog = load_catalog()
    feeds = [
        ("awin", "mock_feeds/awin_sample_feed.csv"),
        ("cj", "mock_feeds/cj_sample_feed.csv"),
        ("impact", "mock_feeds/impact_sample_feed.csv"),
    ]

    matched_rows = []
    needs_review = []

    for network, path in feeds:
        for product in load_feed(path, network):
            row, score = best_catalog_match(product, catalog)
            record = {
                "network": product.network,
                "external_id": product.external_id,
                "feed_title": product.title,
                "feed_brand": product.brand,
                "price": product.price,
                "currency": product.currency,
                "buy_url": product.buy_url,
                "image_url": product.image_url,
                "match_score": round(score, 3),
                "matched_product_ndc": row["product_ndc"] if row else "",
                "matched_brand_name": row["brand_name"] if row else "",
                "matched_active_ingredients": row["active_ingredients_structured"] if row else "",
            }
            (matched_rows if score >= AUTO_MATCH_THRESHOLD else needs_review).append(record)

    fieldnames = [
        "network", "external_id", "feed_title", "feed_brand", "price", "currency",
        "buy_url", "image_url", "match_score", "matched_product_ndc",
        "matched_brand_name", "matched_active_ingredients",
    ]
    with open("output/matched_catalog.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(matched_rows)

    with open("output/needs_review.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(needs_review)

    summary = {
        "auto_matched": len(matched_rows),
        "needs_manual_review": len(needs_review),
        "auto_match_threshold": AUTO_MATCH_THRESHOLD,
    }
    with open("output/match_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(json.dumps(summary, indent=2))
    print("\nauto-matched -> output/matched_catalog.csv")
    print("needs review -> output/needs_review.csv")


if __name__ == "__main__":
    main()
