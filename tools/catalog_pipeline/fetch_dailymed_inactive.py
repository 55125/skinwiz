#!/usr/bin/env python3
"""
Full inactive-ingredient lists for the FDA products that don't have a usable one:
every DailyMed-resolved product (that pass only kept actives) and any openFDA
product whose label had no Inactive Ingredients text, or text with no
separators to split on ("Water Glycerin Dimethicone ..."). Parsed from the SPL XML
cached by fetch_dailymed_spl.py (run that first; no requests here).

Source preference, per product:
  1. the structured <ingredient classCode="IACT"> list of the manufactured
     product whose NDC matches the catalog row (label order, with UNII);
  2. if the label has a single product (or the NDC isn't in the XML), that
     product's IACT list;
  3. otherwise only the free-text "Inactive Ingredients" section (LOINC
     51727-6), for the seed to split like any label text.
The section text, when the label has one, is always written too (one row,
position 0, source section_text): the seed builds the ordered ingredient list
from the IACT names but runs the allergen / free-from matching over both,
since registry names don't always use the label's (INCI) wording.

Output (committed): output/dailymed_inactive_ingredients.csv
  product_id, setid, position, raw_name, unii, source (iact | section_text)

app/src/db/seed.ts turns these into product_ingredients rows (is_active=0)
through the same normalization as the openFDA inactive lists, and feeds the
joined list to the allergen / free-from computations.
"""
from __future__ import annotations

import csv
import os
import re
import sys
from collections import Counter

from dailymed_spl import OUT_DIR, read_cached_xml
from spl_parse import inactive_section_text, parse_xml, product_inactive_lists

OUT = os.path.join(OUT_DIR, "dailymed_inactive_ingredients.csv")


def targets() -> list[tuple[str, str]]:
    """(product_id, setid) for catalog rows lacking an inactive list."""
    out: list[tuple[str, str]] = []
    seen: set[str] = set()
    for name in ("acne_sun_catalog.csv", "dailymed_resolved_catalog.csv"):
        with open(os.path.join(OUT_DIR, name), newline="") as f:
            for row in csv.DictReader(f):
                pid = row["product_ndc"]
                sid = (row.get("spl_set_id") or "").strip()
                if not pid or not sid or pid in seen:
                    continue
                seen.add(pid)  # the seed keeps the first row per NDC too
                if is_thin(row.get("inactive_ingredient_text") or ""):
                    out.append((pid, sid))
    return out


SEPARATORS = re.compile(r"[,;，·•]")


def is_thin(text: str) -> bool:
    """No list, or one with no separators to split on ("Water Glycerin Dimethicone ...").
    Same rule as isThinIngredientText in app/src/db/spl-inactive.ts."""
    return not SEPARATORS.search(text)


def _ndc_key(ndc: str) -> str:
    # "49967-0138" and "49967-138" are the same product code
    parts = ndc.split("-")
    return "-".join(p.lstrip("0") or "0" for p in parts)


def rows_for(product_id: str, setid: str, root) -> tuple[list[dict], str]:
    products = [p for p in product_inactive_lists(root) if p.inactive]
    match = next((p for p in products if p.ndc and _ndc_key(p.ndc) == _ndc_key(product_id)), None)
    how = "ndc"
    if match is None and products:
        # One product (or several with identical lists): unambiguous.
        distinct = {tuple(n for n, _ in p.inactive) for p in products}
        if len(distinct) == 1:
            match, how = products[0], "single"
    text = inactive_section_text(root)
    # The label's own wording rides along even when the structured list
    # exists: substance-registry names ("VITAMIN A PALMITATE", "IMIDUREA")
    # don't always use the label/INCI words the allergen matcher keys on.
    text_row = [{"product_id": product_id, "setid": setid, "position": 0, "raw_name": text, "unii": "", "source": "section_text"}] if text else []
    if match is not None:
        return text_row + [
            {"product_id": product_id, "setid": setid, "position": i + 1, "raw_name": name, "unii": unii, "source": "iact"}
            for i, (name, unii) in enumerate(match.inactive)
        ], how
    if text_row:
        return text_row, "section"
    return [], "none"


def main() -> None:
    todo = targets()
    print(f"{len(todo)} catalog products without an inactive list", file=sys.stderr)
    stats: Counter = Counter()
    rows: list[dict] = []
    for product_id, setid in todo:
        xml = read_cached_xml(setid)
        if xml is None:
            stats["not_cached"] += 1
            continue
        try:
            root = parse_xml(xml)
        except Exception:
            stats["bad_xml"] += 1
            continue
        out, how = rows_for(product_id, setid, root)
        stats[how] += 1
        rows.extend(out)
    rows.sort(key=lambda r: (r["product_id"], r["position"]))
    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["product_id", "setid", "position", "raw_name", "unii", "source"])
        w.writeheader()
        w.writerows(rows)
    covered = len({r["product_id"] for r in rows})
    print(f"{covered} products gained a list ({dict(stats)}); {len(rows)} rows -> {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
