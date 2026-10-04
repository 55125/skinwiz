#!/usr/bin/env python3
"""
SPL document titles for every FDA set id in the catalog, from the DailyMed XML
cache that fetch_dailymed_spl.py fills (no network).

openFDA's brand_name is often just the brand ("Dove", "Degree", "Cream"); the
SPL title carries the product and variant name ("Dove Advanced Care Invisible
Sheer Cool 48H Antiperspirant"). review_product_merges.py uses it so scent and
shade variants filed under one brand-only name are not merged.

    DAILYMED_CACHE_DIR=/path/to/cache python3 build_spl_titles.py

Writes output/spl_titles.csv (setid, title). Set ids missing from the cache
are left out; rerun after fetch_dailymed_spl.py to fill them.
"""
from __future__ import annotations

import csv
import html
import os
import re
import sys

from dailymed_spl import OUT_DIR, catalog_setids, read_cached_xml

TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.S | re.I)


def clean_title(raw: str) -> str:
    t = re.sub(r"<[^>]+>", " ", raw)
    t = html.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


def main() -> None:
    setids = catalog_setids()
    rows = []
    missing = 0
    for setid in sorted(setids):
        xml = read_cached_xml(setid)
        if xml is None:
            missing += 1
            continue
        m = TITLE_RE.search(xml if isinstance(xml, str) else xml.decode("utf-8", "replace"))
        title = clean_title(m.group(1)) if m else ""
        if title:
            rows.append({"setid": setid, "title": title})
    path = os.path.join(OUT_DIR, "spl_titles.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["setid", "title"])
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} titles written to {path}; {missing} set ids not in the cache", file=sys.stderr)


if __name__ == "__main__":
    main()
