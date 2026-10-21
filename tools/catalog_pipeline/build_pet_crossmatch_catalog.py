#!/usr/bin/env python3
"""
Pet products known only through the hand-curated ingredient cross-match
(pet_ingredient_crossmatch.csv): targets that are in none of the three pet
catalogs, mostly brand pages without an ingredient list (Davis grooming,
Burt's Bees, Hartz) whose list was found on a retailer's product page.
Standard library only, no network.

    python3 build_pet_crossmatch_catalog.py

Output (committed, read by app/src/db/seed-pets.ts as data source
"third_party"): output/pet_crossmatch_catalog.csv, one row per target.
Rows for targets already in a catalog are left to the seed, which fills
their empty fields instead; so are targets matched to a DailyMed label or
EPA registration, which are the same product as that catalog row. Concerns come from pet_parse.pet_concerns over
the product name and actives, with the GROOMING fallback. Nothing is
inferred: a field the cross-match didn't find stays empty.
"""
from __future__ import annotations

import csv
import os

from pet_parse import GROOMING, PET_CONCERN_IDS, pet_concerns

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
FIELDS = ["id", "brand", "product_name", "species", "concern_ids", "active_ingredient_text", "ingredient_text",
          "source_url", "ingredient_source_url"]


def catalog_ids() -> set[str]:
    ids: set[str] = set()
    for name, key in [("pet_catalog.csv", "product_ndc"), ("pet_brand_catalog.csv", "id")]:
        with open(os.path.join(OUT, name), newline="") as f:
            ids |= {r[key] for r in csv.DictReader(f)}
    with open(os.path.join(OUT, "pet_epa_catalog.csv"), newline="") as f:
        ids |= {f"epa-{r['epa_reg_no']}" for r in csv.DictReader(f)}
    return ids


def main() -> None:
    known = catalog_ids()
    with open(os.path.join(HERE, "pet_ingredient_crossmatch.csv"), newline="") as f:
        matches = [r for r in csv.DictReader(f) if r["target_id"] not in known and r["value"].strip()]
    # A target matched to a DailyMed label or an EPA registration is that
    # product, already listed under its NDC or epa-<reg no> id.
    listed = {m["target_id"] for m in matches if m["source_type"] == "dailymed" or "EPA Reg. No." in m["match_evidence"]}
    # Only an inactive list, no actives: half a label would read as the whole
    # product (a botanical spot-on whose oils are the actives), so leave it out.
    fields: dict[str, set[str]] = {}
    for m in matches:
        fields.setdefault(m["target_id"], set()).add(m["field"])
    partial = {t for t, f in fields.items() if f == {"inactive_ingredient_text"}}
    matches = [m for m in matches if m["target_id"] not in listed | partial]
    rows: dict[str, dict] = {}
    for m in matches:
        r = rows.setdefault(m["target_id"], {k: "" for k in FIELDS} | {
            "id": m["target_id"], "brand": m["brand"], "product_name": m["product_name"], "species": m["species"],
            "source_url": m["target_url"], "ingredient_source_url": m["source_url"],
        })
        key = "active_ingredient_text" if m["field"] == "active_ingredient_text" else "ingredient_text"
        if not r[key]:
            r[key] = " ".join(m["value"].split())
    # The same formula under two sizes or listings: keep the first.
    seen: set[tuple[str, str]] = set()
    out = []
    for r in rows.values():
        k = (r["brand"].lower(), (r["active_ingredient_text"] + r["ingredient_text"]).lower())
        if k in seen:
            continue
        seen.add(k)
        concerns = [c for c in pet_concerns([r["active_ingredient_text"]], r["product_name"]) if c in PET_CONCERN_IDS]
        r["concern_ids"] = ";".join(concerns or [GROOMING])
        out.append(r)
    out.sort(key=lambda r: (r["brand"].lower(), r["product_name"].lower()))
    with open(os.path.join(OUT, "pet_crossmatch_catalog.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(out)
    print(f"{len(out)} cross-match-only products ({len(rows) - len(out)} duplicate formulas dropped)")


if __name__ == "__main__":
    main()
