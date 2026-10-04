"""
Shared helpers for the DailyMed SPL passes (fetch_dailymed_spl.py,
fetch_dailymed_media.py, fetch_dailymed_inactive.py): the set-id universe, a
polite rate-limited HTTP client, and the on-disk XML cache that doubles as
the resume checkpoint.

DailyMed SPL labeling is FDA public-domain content. NLM publishes no rate
limit; we stay under 5 requests/second across all workers and identify
ourselves with a contact address.
"""
from __future__ import annotations

import csv
import gzip
import os
import threading
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "output")
# Not committed (see the repo-root .gitignore): ~15k gzipped SPL documents.
CACHE_DIR = os.environ.get("DAILYMED_CACHE_DIR", os.path.join(HERE, "cache"))
XML_CACHE = os.path.join(CACHE_DIR, "spl_xml")
MISSING_FILE = os.path.join(CACHE_DIR, "spl_missing.txt")

BASE = "https://dailymed.nlm.nih.gov/dailymed/services/v2/spls"
IMAGE_BASE = "https://dailymed.nlm.nih.gov/dailymed/image.cfm"
USER_AGENT = "Actively catalog pipeline (hello@activelyskin.com)"

# Catalog CSVs whose rows carry an SPL set id, in fetch-priority order:
# DailyMed-resolved rows first (they need the inactive list), then the
# openFDA catalog, then Rx (images only, for clinician views).
SOURCES = [
    ("dailymed_resolved_catalog.csv", "dailymed"),
    ("acne_sun_catalog.csv", "openfda"),
    ("rx_catalog.csv", "rx"),
]


def catalog_setids() -> dict[str, str]:
    """Every FDA set id in the committed catalogs -> the first source listing it."""
    out: dict[str, str] = {}
    for name, source in SOURCES:
        path = os.path.join(OUT_DIR, name)
        if not os.path.exists(path):
            continue
        with open(path, newline="") as f:
            for row in csv.DictReader(f):
                sid = (row.get("spl_set_id") or "").strip()
                if sid and sid not in out:
                    out[sid] = source
    return out


class RateLimiter:
    """At most `rate` request starts per second, shared by every thread."""

    def __init__(self, rate: float):
        self.interval = 1.0 / rate
        self.lock = threading.Lock()
        self.next_at = 0.0

    def wait(self) -> None:
        with self.lock:
            now = time.monotonic()
            at = max(now, self.next_at)
            self.next_at = at + self.interval
        delay = at - time.monotonic()
        if delay > 0:
            time.sleep(delay)


def http_get(url: str, limiter: RateLimiter, retries: int = 5, timeout: int = 60) -> bytes | None:
    """GET with backoff. None for a 404 (set id withdrawn); raises after the last retry."""
    for attempt in range(retries):
        limiter.wait()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "identity"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return None
            if attempt == retries - 1:
                raise
            # 429/503: back off harder
            time.sleep((10 if exc.code in (429, 503) else 2) * (attempt + 1))
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))
    return None


def cache_path(setid: str) -> str:
    return os.path.join(XML_CACHE, f"{setid}.xml.gz")


def read_cached_xml(setid: str) -> str | None:
    path = cache_path(setid)
    if not os.path.exists(path):
        return None
    with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
        return f.read()


def write_cached_xml(setid: str, body: bytes) -> None:
    os.makedirs(XML_CACHE, exist_ok=True)
    tmp = cache_path(setid) + ".tmp"
    with gzip.open(tmp, "wb") as f:
        f.write(body)
    os.replace(tmp, cache_path(setid))


def missing_setids() -> set[str]:
    if not os.path.exists(MISSING_FILE):
        return set()
    with open(MISSING_FILE) as f:
        return {line.strip() for line in f if line.strip()}


def image_url(setid: str, name: str) -> str:
    from urllib.parse import urlencode

    return f"{IMAGE_BASE}?{urlencode({'setid': setid, 'name': name})}"
