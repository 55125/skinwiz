#!/usr/bin/env python3
"""
Download the current SPL XML from DailyMed for every FDA set id in the
committed catalogs (openFDA, DailyMed-resolved, Rx), into a local gzip cache.

One request per set id gives both things Phase 1 needs:
  - the package images and where each sits in the label (the "Package
    Label / Principal Display Panel" section vs. a chemical-structure figure),
    with the image caption -- parsed by fetch_dailymed_media.py;
  - the structured inactive-ingredient list (<ingredient classCode="IACT">,
    in label order, with UNII codes) -- parsed by fetch_dailymed_inactive.py.

DailyMed always serves the newest SPL version of a set id, so the images and
ingredients are the current label's.

Resumable: a set id whose XML is already cached (or that returned 404, listed
in cache/spl_missing.txt) is skipped, so re-running after an interruption
only fetches what's left. `--refresh` refetches everything.

    python3 fetch_dailymed_spl.py             # ~15.8k set ids, ~1 hour
    python3 fetch_dailymed_spl.py --limit 50  # quick sample
"""
from __future__ import annotations

import argparse
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

from dailymed_spl import (
    BASE, MISSING_FILE, RateLimiter, cache_path, catalog_setids, http_get, missing_setids, write_cached_xml,
)

RATE = 4.5  # requests/second across all workers (< 5)
WORKERS = 8  # latency-bound; the shared limiter caps the rate


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--only-source", choices=["dailymed", "openfda", "rx"])
    args = ap.parse_args()

    setids = catalog_setids()
    gone = set() if args.refresh else missing_setids()
    todo = [
        s for s, src in setids.items()
        if (not args.only_source or src == args.only_source)
        and (args.refresh or (not os.path.exists(cache_path(s)) and s not in gone))
    ]
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(setids)} set ids in catalogs, {len(todo)} to fetch", file=sys.stderr)

    limiter = RateLimiter(RATE)
    lock = threading.Lock()
    stats = {"ok": 0, "missing": 0, "error": 0}

    def one(setid: str) -> None:
        body = http_get(f"{BASE}/{setid}.xml", limiter)
        if body is None:
            with lock:
                stats["missing"] += 1
                os.makedirs(os.path.dirname(MISSING_FILE), exist_ok=True)
                with open(MISSING_FILE, "a") as f:
                    f.write(setid + "\n")
            return
        write_cached_xml(setid, body)
        with lock:
            stats["ok"] += 1

    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(one, s): s for s in todo}
        for fut in as_completed(futures):
            done += 1
            try:
                fut.result()
            except Exception as exc:  # leave it uncached; the next run retries it
                stats["error"] += 1
                print(f"  {futures[fut]}: {exc}", file=sys.stderr)
            if done % 500 == 0:
                print(f"  {done}/{len(todo)} {stats}", file=sys.stderr)
    print(f"done: {stats}", file=sys.stderr)


if __name__ == "__main__":
    main()
