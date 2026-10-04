#!/usr/bin/env python3
"""
Choose one front-of-package image per FDA set id, from the SPL XML cached by
fetch_dailymed_spl.py (run that first; this pass makes no requests).

Why the SPL XML instead of /spls/{setid}/media.json: media.json lists file
names only. The XML has the same files plus where each one sits -- inside the
"Package Label / Principal Display Panel" section (LOINC 51945-4) or next to
a chemical structure -- and the labeler's caption ("PRINCIPAL DISPLAY PANEL -
50 mL Tube Carton", "Drug Facts panel", "... - DISC"). That context is most
of the signal. Image URLs are DailyMed's image.cfm?setid=&name=, the same URLs
media.json returns. DailyMed serves only the newest SPL version, so every
candidate is from the current label.

Scoring (spl_parse.score_candidate): +10 inside the display-panel section,
-10 in any other section; file name/caption words: front/PDP/carton/tube/
bottle/... up, DISC(ontinued)/drug facts/back/side/barcode/insert/structure
down; a small penalty for position within the section. Image size isn't
known until download, so the app's image sync (app/src/lib/product-images/
sync.ts) rejects tiny images and falls back to the next-ranked candidate.

Outputs (committed):
  output/spl_media.csv             setid, chosen_image_name, chosen_url, score, n_candidates, spl_version
  output/spl_media_candidates.csv  setid, rank, image_name, score, section_code, caption, reasons (top 4 per set id)
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
from collections import Counter

from dailymed_spl import OUT_DIR, catalog_setids, image_url, read_cached_xml
from spl_parse import media_candidates, parse_xml, rank_media, spl_version

TOP_CANDIDATES = 4
MIN_SCORE = 0  # below this, nothing in the label looks like a package photo


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, default=0, help="print N random choices for review, write nothing")
    args = ap.parse_args()

    setids = catalog_setids()
    stats: Counter = Counter()
    chosen_rows = []
    cand_rows = []
    by_source: Counter = Counter()
    for setid, source in setids.items():
        xml = read_cached_xml(setid)
        if xml is None:
            stats["not_cached"] += 1
            continue
        try:
            root = parse_xml(xml)
        except Exception:
            stats["bad_xml"] += 1
            continue
        stats["parsed"] += 1
        ranked = rank_media(media_candidates(root))
        if not ranked:
            stats["no_images"] += 1
            continue
        stats["with_images"] += 1
        for i, c in enumerate(ranked[:TOP_CANDIDATES]):
            cand_rows.append({
                "setid": setid, "rank": i + 1, "image_name": c.name, "score": c.score,
                "section_code": c.section_code, "caption": c.caption[:120], "reasons": " ".join(c.reasons),
            })
        best = ranked[0]
        if best.score < MIN_SCORE:
            stats["no_usable_image"] += 1
            continue
        stats["chosen"] += 1
        by_source[source] += 1
        chosen_rows.append({
            "setid": setid, "chosen_image_name": best.name, "chosen_url": image_url(setid, best.name),
            "score": best.score, "n_candidates": len(ranked), "spl_version": spl_version(root),
        })

    if args.sample:
        import random

        random.seed(args.sample)
        for r in random.sample(chosen_rows, min(args.sample, len(chosen_rows))):
            print(r["setid"], r["score"], r["n_candidates"], r["chosen_image_name"], sep="\t")
        print(dict(stats), file=sys.stderr)
        return

    chosen_rows.sort(key=lambda r: r["setid"])
    cand_rows.sort(key=lambda r: (r["setid"], r["rank"]))
    with open(os.path.join(OUT_DIR, "spl_media.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["setid", "chosen_image_name", "chosen_url", "score", "n_candidates", "spl_version"])
        w.writeheader()
        w.writerows(chosen_rows)
    with open(os.path.join(OUT_DIR, "spl_media_candidates.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["setid", "rank", "image_name", "score", "section_code", "caption", "reasons"])
        w.writeheader()
        w.writerows(cand_rows)
    print(f"{dict(stats)}; chosen by source {dict(by_source)}", file=sys.stderr)


if __name__ == "__main__":
    main()
