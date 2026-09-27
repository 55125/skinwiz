#!/usr/bin/env python3
"""
Compare openFDA drug-label catalog completeness across candidate launch
niches (project.md §11, open decision #1: acne+sun vs eczema/barrier+seb-derm).

For each niche's constituent OTC monograph "purpose" categories, pulls from
the openFDA label API:
  - total label count (raw signal; multiple label revisions per product
    inflate this, but consistently across niches, so still comparable)
  - distinct brand_name count (proxy for product-catalog breadth)
  - distinct openfda.substance_name count (proxy for active-ingredient
    diversity to build the Phase 1 evidence-grading table around)

No API key needed (openFDA's public rate limit is generous enough for a
one-off niche comparison). Writes niche_completeness.json + a summary
printed to stdout.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request

BASE = "https://api.fda.gov/drug/label.json"

NICHES = {
    "acne_sun": {
        "label": "Acne + sun protection",
        "purposes": ["Acne treatment", "Sunscreen"],
    },
    "eczema_sebderm": {
        "label": "Eczema/barrier + seb derm",
        "purposes": ["Skin protectant", "Anti-itch", "Antidandruff"],
    },
}


def _get(params: dict) -> dict:
    url = f"{BASE}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "skinwiz-niche-analysis/0.1"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def total_for_purpose(purpose: str) -> int:
    data = _get({"search": f'purpose:"{purpose}"', "limit": 1})
    return data.get("meta", {}).get("results", {}).get("total", 0)


def distinct_count(purpose: str, field: str) -> tuple[int, bool]:
    """Returns (distinct term count up to 1000, capped_flag)."""
    data = _get({"search": f'purpose:"{purpose}"', "count": f"{field}.exact", "limit": 1000})
    results = data.get("results", [])
    return len(results), len(results) >= 1000


def analyze_purpose(purpose: str) -> dict:
    total = total_for_purpose(purpose)
    time.sleep(0.3)
    brand_count, brand_capped = distinct_count(purpose, "openfda.brand_name")
    time.sleep(0.3)
    substance_count, substance_capped = distinct_count(purpose, "openfda.substance_name")
    time.sleep(0.3)
    return {
        "purpose": purpose,
        "total_labels": total,
        "distinct_brands": brand_count,
        "distinct_brands_capped": brand_capped,
        "distinct_substances": substance_count,
        "distinct_substances_capped": substance_capped,
    }


def main() -> None:
    report = {}
    for niche_key, niche in NICHES.items():
        print(f"Analyzing {niche['label']}...", file=sys.stderr)
        purpose_results = []
        for purpose in niche["purposes"]:
            print(f"  purpose={purpose!r}", file=sys.stderr)
            purpose_results.append(analyze_purpose(purpose))
        report[niche_key] = {
            "label": niche["label"],
            "purposes": purpose_results,
            "total_labels_sum": sum(p["total_labels"] for p in purpose_results),
            "distinct_brands_sum": sum(p["distinct_brands"] for p in purpose_results),
            "distinct_substances_sum": sum(p["distinct_substances"] for p in purpose_results),
        }

    with open("output/niche_completeness.json", "w") as f:
        json.dump(report, f, indent=2)

    print("\n=== Summary ===")
    for niche_key, r in report.items():
        print(f"\n{r['label']} ({niche_key}):")
        print(f"  total labels (all purposes): {r['total_labels_sum']}")
        print(f"  distinct brands (all purposes, may double-count combo products): {r['distinct_brands_sum']}")
        print(f"  distinct active substances: {r['distinct_substances_sum']}")
        for p in r["purposes"]:
            cap_note = " (capped at 1000, true count higher)" if p["distinct_brands_capped"] else ""
            print(f"    - {p['purpose']}: {p['total_labels']} labels, {p['distinct_brands']} brands{cap_note}, {p['distinct_substances']} substances")

    print("\nFull detail -> output/niche_completeness.json")


if __name__ == "__main__":
    main()
