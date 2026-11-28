#!/usr/bin/env python3
"""
Check every topical prescription row's listed strength (rx_catalog.csv,
from the openFDA NDC directory) against the strengths FDA approved for its
application in the Orange Book, and write the disagreements to
output/rx_strength_checks.csv for the seed.

Labelers sometimes key a strength with the wrong unit: Zydus's clobetasol
propionate spray (NDC 70771-1080, ANDA 206378) is listed as ".05 g/mL",
which reads as 5%, but the Orange Book approves 0.05%. Rules:

  ok          every listed percent matches an approved strength of the
              application (within a salt/base factor: "EQ 1% BASE" vs 1.2%
              clindamycin phosphate counts as a match). Not written.
  corrected   no match as listed, and one approved strength of the
              application is confirmed: by a power-of-ten unit slip (every
              percent off by the same 10, 100 or 1000) that the label's own
              text (cached SPL XML) also states, or by the slip alone when
              the listed strength isn't approved for that drug anywhere, or
              by the label text alone when no slip explains it (metronidazole
              "10 mg/60g" on a 1% gel). `source` says which.
  unverified  neither: shown with a "check the label" note, never guessed.
  no_reference  the row has no NDA/ANDA number or the Orange Book has no
              percent strengths for it (unapproved drugs, kits, per-unit
              strengths). Not written: nothing to check against.

The Orange Book download (https://www.fda.gov/media/76860/download, a zip
with products.txt) is passed in, so the run needs no network:

    curl -L -o /tmp/ob.zip https://www.fda.gov/media/76860/download
    unzip -o /tmp/ob.zip products.txt -d /tmp/ob
    python3 check_rx_strengths.py /tmp/ob/products.txt
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict

from dailymed_spl import read_cached_xml

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "output")
RX_CSV = os.path.join(OUT_DIR, "rx_catalog.csv")
OUT = os.path.join(OUT_DIR, "rx_strength_checks.csv")

PCT = re.compile(r"(\d+(?:\.\d+)?)\s*%")
SALT_FACTOR = (0.6, 1.6)  # salt or ester vs "EQ ... BASE"


def approved_strengths(products_txt: str) -> tuple[dict[str, list[list[float]]], dict[str, set[float]]]:
    """application number (digits) -> each approved product's percents, in
    order; and ingredient word -> every percent approved for it anywhere."""
    out: dict[str, list[list[float]]] = defaultdict(list)
    by_ing: dict[str, set[float]] = defaultdict(set)
    with open(products_txt, encoding="latin-1") as f:
        header = f.readline().rstrip("\n").split("~")
        col = {h: i for i, h in enumerate(header)}
        for line in f:
            parts = line.rstrip("\n").split("~")
            if len(parts) < len(header):
                continue
            strength = parts[col["Strength"]].split("**")[0]
            pcts = [float(x) for x in PCT.findall(strength)]
            if pcts:
                out[parts[col["Appl_No"]].lstrip("0")].append(pcts)
                for name in parts[col["Ingredient"]].split(";"):
                    by_ing[name.strip().split(" ")[0].lower()].update(pcts)
    return out, by_ing


TAG = re.compile(r"<[^>]+>")


def label_percents(setid: str) -> set[float]:
    """Every "N%" in the cached SPL XML's text (fetch_dailymed_spl.py)."""
    xml = read_cached_xml(setid) if setid else None
    if not xml:
        return set()
    return {float(x) for x in PCT.findall(TAG.sub(" ", xml))}


def close(a: float, b: float, lo: float, hi: float) -> bool:
    if a == b:
        return True
    if a <= 0 or b <= 0:
        return False
    return lo <= a / b <= hi


def matches(listed: list[float], approved: list[float], strict: bool = False) -> bool:
    """Same number of actives, each within the tolerance once both are sorted.
    Loose (salt or ester vs "EQ ... BASE") for "as listed"; strict (2%) for a
    power-of-ten correction, so 0.25% x 10 can't also "match" 3.75%."""
    if len(listed) != len(approved):
        return False
    lo, hi = (0.98, 1.02) if strict else SALT_FACTOR
    return all(close(p, q, lo, hi) for p, q in zip(sorted(listed), sorted(approved)))


def decide(listed: list[float], names: list[str], approved: list[list[float]], on_label: set[float], by_ing: dict[str, set[float]]) -> tuple[list[float], str]:
    """The confirmed approved strength for a listing that matched none as
    listed, and what confirmed it; ([], "") when nothing does (unverified)."""
    fixes: list[list[float]] = []
    for k in (10, 100, 1000, 0.1, 0.01, 0.001):
        scaled = [p / k for p in listed]
        for a in approved:
            if matches(scaled, a, strict=True) and a not in fixes:
                fixes.append(a)
    # What the label's own text says (SPL XML): an approved strength whose
    # every percent appears there.
    confirmed = [a for a in approved if all(any(abs(p - q) < 1e-9 for q in on_label) for p in a)]
    confirmed = [a for i, a in enumerate(confirmed) if a not in confirmed[:i]]
    # A listed strength approved for the same drug elsewhere (0.5%
    # fluorouracil is Carac) may be right: never fix it on the Orange Book alone.
    elsewhere = all(any(abs(p - q) < 1e-9 for q in by_ing.get(n.split(" ")[0].lower(), ())) for p, n in zip(listed, names))
    both = [a for a in fixes if a in confirmed]
    if len(both) == 1:
        fix, source = both[0], "Orange Book + label text"
    elif len(fixes) == 1 and not elsewhere:
        fix, source = fixes[0], "Orange Book"
    elif not fixes and len(confirmed) == 1:
        fix, source = confirmed[0], "label text + Orange Book"
    else:
        return [], ""
    if len(fix) != len(listed):
        return [], ""  # can't pair a different number of actives
    return fix, source


def in_label_order(listed: list[float], fix: list[float]) -> list[float]:
    """Pair sorted with sorted, as matches() does, then back to label order."""
    order = sorted(range(len(listed)), key=lambda i: listed[i])
    out = [0.0] * len(listed)
    for i, q in zip(order, sorted(fix)):
        out[i] = q
    return out


def fmt(p: float) -> str:
    return f"{p:.4f}".rstrip("0").rstrip(".") + "%"


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    ob, by_ing = approved_strengths(sys.argv[1])
    stats: Counter = Counter()
    out: list[dict] = []
    with open(RX_CSV, newline="") as f:
        for row in csv.DictReader(f):
            if row.get("route") == "ORAL":
                continue
            try:
                ings = json.loads(row["ingredients_json"] or "[]")
            except json.JSONDecodeError:
                ings = []
            listed = [i["pct"] for i in ings if i.get("pct") is not None]
            if not listed or len(listed) != len(ings):
                stats["no_reference"] += 1
                continue
            appl = re.sub(r"\D", "", row.get("application_number") or "").lstrip("0")
            approved = ob.get(appl) if appl else None
            if not approved:
                stats["no_reference"] += 1
                continue
            if any(matches(listed, a) for a in approved):
                stats["ok"] += 1
                continue
            on_label = label_percents((row.get("spl_set_id") or "").strip())
            fix, source = decide(listed, [i["name"] for i in ings], approved, on_label, by_ing)
            approved_text = "; ".join(" + ".join(fmt(p) for p in a) for a in approved)
            names = [i["name"].lower() for i in ings]
            if fix:
                ordered = in_label_order(listed, fix)
                stats["corrected"] += 1
                out.append({
                    "product_ndc": row["product_ndc"],
                    "status": "corrected",
                    "listed": "; ".join(f"{n} {i.get('strength') or fmt(i['pct'])}" for n, i in zip(names, ings)),
                    "pcts_json": json.dumps(ordered),
                    "strength_text": "; ".join(f"{n} {fmt(p)}" for n, p in zip(names, ordered)),
                    "approved": approved_text,
                    "application": row.get("application_number") or "",
                    "source": source,
                })
            else:
                stats["unverified"] += 1
                out.append({
                    "product_ndc": row["product_ndc"],
                    "status": "unverified",
                    "listed": "; ".join(f"{n} {i.get('strength') or fmt(i['pct'])}" for n, i in zip(names, ings)),
                    "pcts_json": "",
                    "strength_text": "",
                    "approved": approved_text,
                    "application": row.get("application_number") or "",
                    "source": "",
                })
    out.sort(key=lambda r: (r["status"], r["product_ndc"]))
    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["product_ndc", "status", "listed", "pcts_json", "strength_text", "approved", "application", "source"])
        w.writeheader()
        w.writerows(out)
    print(f"{dict(stats)} -> {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
