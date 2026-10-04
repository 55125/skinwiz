#!/usr/bin/env python3
"""
Decide every pair in output/product_merge_flagged.csv with the documented
rules in product_merge_review.py, and write the decision columns back:

  decision              merge | keep_separate | reformulated | needs_owner
  decided_canonical_id  for merge rows: the listed product the pair folds into
                        (the canonical of its whole merge group, auto merges
                        included, by product_merge.canonical_key)
  reviewer_notes        "<rule id>: <reason>"

The seed applies merge rows from this file on top of product_merges.csv
(app/src/db/product-merges.ts); nothing else in it is applied. Rerun after
build_product_merges.py (which rewrites the flagged file with empty
decision columns):

    python3 build_product_merges.py --no-jev
    python3 review_product_merges.py

Reads the seeded app DB like build_product_merges.py does.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from collections import Counter

from build_product_merges import DB_DEFAULT, OUT, load_products
from product_merge import UnionFind, canonical_key
from product_merge_review import RULES, decide, shade_split_ids

csv.field_size_limit(10**9)

FLAGGED = os.path.join(OUT, "product_merge_flagged.csv")
MERGES = os.path.join(OUT, "product_merges.csv")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=DB_DEFAULT)
    args = ap.parse_args()

    prods = load_products(args.db)
    with open(FLAGGED, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        cols = list(reader.fieldnames or [])
        rows = list(reader)
    with open(MERGES, newline="", encoding="utf-8") as f:
        auto = list(csv.DictReader(f))

    decided: dict[tuple[str, str], tuple[str, str, str]] = {}
    shade_split = shade_split_ids(prods)

    def decision(x: str, y: str) -> tuple[str, str, str]:
        k = (x, y) if x < y else (y, x)
        if k not in decided:
            decided[k] = decide(prods[k[0]], prods[k[1]], shade_split)
        return decided[k]

    for r in rows:
        d, rule, note = decision(r["id_a"], r["id_b"])
        r["decision"], r["reviewer_notes"], r["decided_canonical_id"] = d, f"{rule}: {note}", ""

    # Merges are transitive, so a merge row is only applied when every product
    # it would join is one the rules would merge with every product on the
    # other side; otherwise it goes to the owner (R9). Strongest rules first.
    uf = UnionFind()
    members: dict[str, list[str]] = {}

    def comp(x: str) -> list[str]:
        return members.get(uf.find(x), [x])

    def join(x: str, y: str) -> None:
        cx, cy = comp(x), comp(y)
        uf.union(x, y)
        members[uf.find(x)] = cx + cy

    for m in auto:
        if uf.find(m["duplicate_id"]) != uf.find(m["canonical_id"]):
            join(m["duplicate_id"], m["canonical_id"])
    order = list(RULES)
    for r in sorted((r for r in rows if r["decision"] == "merge"),
                    key=lambda r: (order.index(r["reviewer_notes"].split(":")[0]), r["id_a"], r["id_b"])):
        a, b = r["id_a"], r["id_b"]
        if uf.find(a) == uf.find(b):
            continue
        clash = next(((x, y) for x in comp(a) for y in comp(b) if decision(x, y)[0] != "merge"), None)
        if clash is None:
            join(a, b)
            continue
        x, y = clash
        d, rule, why = decision(x, y)
        # a family split into shades / scents by the SPL evidence: a listing
        # whose own variant is unknown cannot be assigned to one of them
        r["decision"] = "keep_separate" if why.startswith(("SPL artwork", "SPL title variant")) else "needs_owner"
        r["reviewer_notes"] = (f"R9-chain-conflict: this pair matches ({r['reviewer_notes'].split(':')[0]}), but merging "
                               f"it would also join {x} \"{prods[x].brand_name}\" with {y} \"{prods[y].brand_name}\", "
                               f"which {rule} keeps apart ({d}: {why[:80]})")

    rules = Counter(r["reviewer_notes"].split(":")[0] for r in rows)
    groups = {}
    for g in uf.groups():
        canon = min((prods[x] for x in g), key=canonical_key)
        for x in g:
            groups[x] = canon.id
    for r in rows:
        if r["decision"] == "merge":
            r["decided_canonical_id"] = groups[r["id_a"]]

    with open(FLAGGED, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)

    decisions = Counter(r["decision"] for r in rows)
    summary = {
        "flagged_pairs": len(rows),
        "decisions": dict(sorted(decisions.items())),
        "rules": {k: rules[k] for k in RULES if rules[k]},
        "final_merge_groups": len(set(groups.values())),
        "products_removed_from_listings": len(groups) - len(set(groups.values())),
        "listed_products_after": len(prods) - (len(groups) - len(set(groups.values()))),
    }
    with open(os.path.join(OUT, "product_merge_review_summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        f.write("\n")
    print(json.dumps(summary, indent=2), file=sys.stderr)


if __name__ == "__main__":
    main()
