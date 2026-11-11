#!/usr/bin/env python3
"""
FDA dosage forms (CREAM, LOTION, SPRAY, ...) for DailyMed-resolved products,
whose catalog rows carry none (dailymed_resolved_catalog.csv has a form for
about 1% of rows). The dupe finder needs a form to match "same kind of
product" (app/src/lib/dupe-rules.ts dupeForm), and without one it falls back
to texture words in the name, which most sunscreen names lack.

Reads the SPL XML cache from fetch_dailymed_spl.py, fetching (politely, same
limiter) any set id it doesn't have yet. Per product, the form of the
manufactured product whose NDC matches the row; else, when the label's
products all share one form, that form.

Output (committed): output/dailymed_dosage_forms.csv
  product_id, setid, dosage_form
app/src/db/seed.ts fills a product's dosage_form from it when the catalog
row has none.

    python3 fetch_dailymed_forms.py
"""
from __future__ import annotations

import csv
import os
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from dailymed_spl import BASE, OUT_DIR, RateLimiter, http_get, read_cached_xml, write_cached_xml
from spl_parse import parse_xml, product_forms

OUT = os.path.join(OUT_DIR, "dailymed_dosage_forms.csv")
RATE = 4.5
WORKERS = 8


def _ndc_key(ndc: str) -> str:
    return "-".join(p.lstrip("0") or "0" for p in ndc.split("-"))


def targets() -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    seen: set[str] = set()
    with open(os.path.join(OUT_DIR, "dailymed_resolved_catalog.csv"), newline="") as f:
        for row in csv.DictReader(f):
            pid = row["product_ndc"]
            sid = (row.get("spl_set_id") or "").strip()
            if not pid or not sid or pid in seen:
                continue
            seen.add(pid)
            if not (row.get("dosage_form") or "").strip():
                out.append((pid, sid))
    return out


def form_for(product_id: str, root) -> tuple[str, str]:
    forms = product_forms(root)
    match = next((f for n, f in forms if n and _ndc_key(n) == _ndc_key(product_id)), None)
    if match:
        return match, "ndc"
    distinct = {f for _, f in forms}
    if len(distinct) == 1:
        return distinct.pop(), "single"
    return "", "ambiguous" if distinct else "none"


def main() -> None:
    todo = targets()
    print(f"{len(todo)} DailyMed products without a dosage form", file=sys.stderr)
    limiter = RateLimiter(RATE)

    def xml_for(setid: str) -> str | None:
        xml = read_cached_xml(setid)
        if xml is not None:
            return xml
        body = http_get(f"{BASE}/{setid}.xml", limiter)
        if body is None:
            return None
        write_cached_xml(setid, body)
        return body.decode("utf-8", errors="replace")

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        # One fetch per set id: several products can share a label.
        setids = sorted({s for _, s in todo})
        xmls = dict(zip(setids, pool.map(xml_for, setids)))

    stats: Counter = Counter()
    rows: list[dict] = []
    for pid, sid in todo:
        xml = xmls.get(sid)
        if xml is None:
            stats["missing"] += 1
            continue
        try:
            form, how = form_for(pid, parse_xml(xml))
        except Exception:
            stats["bad_xml"] += 1
            continue
        stats[how] += 1
        if form:
            rows.append({"product_id": pid, "setid": sid, "dosage_form": form})
    rows.sort(key=lambda r: r["product_id"])
    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["product_id", "setid", "dosage_form"])
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} forms ({dict(stats)}) -> {OUT}", file=sys.stderr)
    print(Counter(r["dosage_form"] for r in rows).most_common(25), file=sys.stderr)


if __name__ == "__main__":
    main()
