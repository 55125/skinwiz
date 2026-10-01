#!/usr/bin/env python3
"""
Fetch the Drug Facts "how to use" sections for every OTC product in the
catalog, for the regimen feature's per-product directions.

The catalog builders only keep `purpose`/`indications_and_usage` from each
openFDA label. This pass goes back to `/drug/label.json` by SPL set id --
the same label each catalog row already links to -- and keeps the sections
a person needs to use the product as labeled:

  directions  <- dosage_and_administration (the Drug Facts "Directions")
  warnings, do_not_use, when_using, stop_use, ask_doctor

Text is stored as the label states it (only a leading section heading like
"Directions" is trimmed); the app shows it verbatim as "From the FDA label".

Input:  output/acne_sun_catalog.csv, output/dailymed_resolved_catalog.csv
        (the two catalogs whose rows carry spl_set_id)
Output: output/label_sections.csv, one row per set id found

Set ids are queried 40 at a time (OR'd in one search) to stay well inside
openFDA's unauthenticated rate limit; OPENFDA_API_KEY raises it if set.
"""
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "output")
INPUTS = ["acne_sun_catalog.csv", "dailymed_resolved_catalog.csv"]
OUT = os.path.join(OUT_DIR, "label_sections.csv")
BATCH = 40
SLEEP = 0.3

SECTIONS = {
    "directions": "dosage_and_administration",
    "warnings": "warnings",
    "do_not_use": "do_not_use",
    "when_using": "when_using",
    "stop_use": "stop_use",
    "ask_doctor": "ask_doctor",
}
HEADING = re.compile(
    r"^\s*(directions|dosage and administration|warnings?|do not use|when using this product|stop use and ask a doctor if|ask a doctor before use if you have|ask a doctor before use)\s*[:.\-]?\s*",
    re.I,
)


def _get(url: str, retries: int = 4) -> dict:
    api_key = os.environ.get("OPENFDA_API_KEY")
    if api_key:
        url = f"{url}&api_key={urllib.parse.quote(api_key)}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "activelyskin-catalog-pipeline/0.1"})
            with urllib.request.urlopen(req, timeout=40) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return {"results": []}
            if attempt == retries - 1:
                raise
            time.sleep(3 * (attempt + 1))
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(3 * (attempt + 1))
    return {"results": []}


def clean(parts) -> str:
    if not parts:
        return ""
    text = "\n".join(p.strip() for p in parts if p and p.strip())
    return HEADING.sub("", text, count=1).strip()


def main() -> None:
    ids: list[str] = []
    seen: set[str] = set()
    for name in INPUTS:
        with open(os.path.join(OUT_DIR, name), newline="") as f:
            for row in csv.DictReader(f):
                sid = (row.get("spl_set_id") or "").strip()
                if sid and sid not in seen:
                    seen.add(sid)
                    ids.append(sid)
    print(f"{len(ids)} set ids to fetch", file=sys.stderr)

    rows: dict[str, dict] = {}
    for i in range(0, len(ids), BATCH):
        chunk = ids[i : i + BATCH]
        query = "set_id:(" + "+".join(f'"{s}"' for s in chunk) + ")"
        url = "https://api.fda.gov/drug/label.json?search=" + urllib.parse.quote(query, safe=':()+"') + f"&limit={BATCH * 2}"
        for rec in _get(url).get("results", []):
            sid = rec.get("set_id")
            if not sid or sid not in seen:
                continue
            # Several versions can come back for one set id; keep the newest.
            eff = rec.get("effective_time", "")
            if sid in rows and rows[sid]["effective_time"] >= eff:
                continue
            row = {"spl_set_id": sid, "effective_time": eff}
            for col, field in SECTIONS.items():
                row[col] = clean(rec.get(field))
            rows[sid] = row
        if (i // BATCH) % 25 == 0:
            print(f"  {min(i + BATCH, len(ids))}/{len(ids)} queried, {len(rows)} labels", file=sys.stderr)
        time.sleep(SLEEP)

    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["spl_set_id", "effective_time", *SECTIONS.keys()])
        w.writeheader()
        for sid in ids:
            if sid in rows:
                w.writerow(rows[sid])
    with_dirs = sum(1 for r in rows.values() if r["directions"])
    print(f"wrote {len(rows)} labels ({with_dirs} with directions) to {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
