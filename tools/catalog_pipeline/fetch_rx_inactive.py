#!/usr/bin/env python3
"""
Inactive-ingredient (vehicle) lists for the topical prescription rows in
output/rx_catalog.csv, for the clinician "Prescribe-safe finder"
(/clinic-tools/vehicle-finder). Parsed from the SPL XML cached by
fetch_dailymed_spl.py (run `fetch_dailymed_spl.py --only-source rx` first;
no requests here).

Same per-product rules as fetch_dailymed_inactive.py (rows_for): the
structured IACT list of the manufactured product whose NDC matches, else a
single-product label's list, plus the free-text Inactive Ingredients section
when the label has one. Prescription labels usually list the vehicle in the
DESCRIPTION section instead, so the IACT list is what this mostly reads.

Output: output/rx_inactive_ingredients.csv, the same columns as
dailymed_inactive_ingredients.csv. The seed loads it into rx_vehicles, a
table of its own, so prescription rows still never get ingredient pages,
avoid-list matching in consumer listings, or free-from flags.

    python3 fetch_rx_inactive.py
"""
from __future__ import annotations

import csv
import os
import sys
from collections import Counter

from dailymed_spl import OUT_DIR, read_cached_xml
from fetch_dailymed_inactive import rows_for
from spl_parse import parse_xml

RX_CSV = os.path.join(OUT_DIR, "rx_catalog.csv")
OUT = os.path.join(OUT_DIR, "rx_inactive_ingredients.csv")


def main() -> None:
    stats: Counter = Counter()
    rows: list[dict] = []
    seen: set[str] = set()
    with open(RX_CSV, newline="") as f:
        for row in csv.DictReader(f):
            pid = row["product_ndc"]
            sid = (row.get("spl_set_id") or "").strip()
            if not pid or not sid or pid in seen or row.get("route") == "ORAL":
                continue
            seen.add(pid)
            xml = read_cached_xml(sid)
            if xml is None:
                stats["not_cached"] += 1
                continue
            try:
                root = parse_xml(xml)
            except Exception:
                stats["bad_xml"] += 1
                continue
            out, how = rows_for(pid, sid, root)
            stats[how] += 1
            rows.extend(out)
    rows.sort(key=lambda r: (r["product_id"], r["position"]))
    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["product_id", "setid", "position", "raw_name", "unii", "source"])
        w.writeheader()
        w.writerows(rows)
    print(f"{len(seen)} topical Rx products: {dict(stats)}; {len(rows)} rows -> {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
