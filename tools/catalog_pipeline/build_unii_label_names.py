#!/usr/bin/env python3
"""
Learn how labels spell the substances the SPL registry names differently --
"VITAMIN A PALMITATE" is printed "retinyl palmitate", "EDETATE DISODIUM" is
"disodium EDTA", "ALPHA-TOCOPHEROL ACETATE" is "tocopheryl acetate" -- so the
DailyMed-only products' structured inactive lists land on the same
ingredient pages (and pregnancy / avoid matching) as the openFDA rows' label
text.

Evidence: the openFDA catalog rows have both the label's Inactive Ingredients
text (acne_sun_catalog.csv) and, from the cached SPL XML, the structured IACT
list with UNII codes. When a label's list and its IACT list line up position
by position (same length, most entries already agree), the positions that
disagree pair a registry name with the label's spelling. A UNII is mapped
only when that pairing recurs (>= MIN_PAIRS labels, >= MIN_SHARE of its
disagreements) -- precision first; unmapped names keep the registry name.

Output (committed): app/src/db/unii-label-names.json  {UNII: "label spelling"}
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict

from dailymed_spl import OUT_DIR, read_cached_xml
from spl_parse import parse_xml, product_inactive_lists

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "app", "src", "db", "unii-label-names.json")
MIN_PAIRS = 3
MIN_SHARE = 0.6
MIN_AGREEMENT = 0.5  # share of positions that must already agree for a list to count
MIN_CORPUS = 10  # labels that must print a spelling before it can be a target
# Reviewed by hand (2026-10-04): pairings the statistics accept but that are
# a different substance or a vaguer/narrower name, by registry name.
DENY = {
    "PALM OIL",  # -> "mct oil": a different oil
    "CETETH-23",  # -> "polyoxyethylene cetyl ether": the registry name is already the INCI one
    "ICODEXTRIN",  # -> "dextrin": narrower substance
    "AMINO ACIDS, SOURCE UNSPECIFIED",  # -> "yeast amino acids": adds a source
    "PHENYLSILANETRIOL",  # -> "polyphenylsilsesquioxane": a different compound
    "PROPOLIS WAX",  # -> "propolis extract": a different preparation
}

QUALIFIER = re.compile(r",\s*(unspecified(\s+form)?|dl-|d-|l-|\(\+/-\)-?)\s*$", re.I)
LABEL_PREFIX = re.compile(r"^\s*(inactive|other)?\s*ingredients?\s*(list)?\s*[:\-–]?\s*", re.I)


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = QUALIFIER.sub("", s)
    s = re.sub(r"\([^)]*\)|\[[^\]]*\]", " ", s)
    s = s.replace("sulphate", "sulfate").replace("hydrolysed", "hydrolyzed")
    s = re.sub(r"[*†‡]", "", s)
    s = re.sub(r"\s+", " ", s).strip(" .:;-–")
    if s in ("aqua", "eau", "water/aqua", "aqua/water", "purified water"):
        return "water"
    return s


def split_label(text: str) -> list[str]:
    text = LABEL_PREFIX.sub("", text.replace(";", ","))
    out, depth, cur = [], 0, ""
    for i, ch in enumerate(text):
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth = max(0, depth - 1)
        locant = i > 0 and text[i - 1].isdigit() and i + 1 < len(text) and text[i + 1].isdigit()
        if ch == "," and depth == 0 and not locant:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return [t.strip(" .") for t in out if t.strip(" .")]


def ndc_key(ndc: str) -> str:
    return "-".join(p.lstrip("0") or "0" for p in ndc.split("-"))


def main() -> None:
    pairs: dict[str, Counter] = defaultdict(Counter)  # unii -> label spelling counts
    registry_name: dict[str, str] = {}
    disagreements: Counter = Counter()
    used = 0
    with open(os.path.join(OUT_DIR, "acne_sun_catalog.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    # how many labels print each spelling at all
    corpus: Counter = Counter()
    for row in rows:
        corpus.update({norm(t) for t in split_label(row.get("inactive_ingredient_text") or "")})
    for row in rows:
        text = (row.get("inactive_ingredient_text") or "").strip()
        sid = (row.get("spl_set_id") or "").strip()
        if not text or not sid:
            continue
        xml = read_cached_xml(sid)
        if xml is None:
            continue
        try:
            products = [p for p in product_inactive_lists(parse_xml(xml)) if p.inactive]
        except Exception:
            continue
        match = next((p for p in products if p.ndc and ndc_key(p.ndc) == ndc_key(row["product_ndc"])), None)
        if match is None and len(products) == 1:
            match = products[0]
        if match is None:
            continue
        label = split_label(text)
        iact = match.inactive
        if len(label) != len(iact):
            continue
        agree = sum(norm(l) == norm(n) for l, (n, _) in zip(label, iact))
        if agree < MIN_AGREEMENT * len(iact):
            continue
        used += 1
        for l, (n, unii) in zip(label, iact):
            if not unii:
                continue
            registry_name[unii] = n
            if norm(l) != norm(n):
                disagreements[unii] += 1
                pairs[unii][norm(l)] += 1
    mapping: dict[str, str] = {}
    skipped: list[str] = []
    for unii, counts in pairs.items():
        spelling, n = counts.most_common(1)[0]
        if not (n >= MIN_PAIRS and n / disagreements[unii] >= MIN_SHARE and len(spelling) >= 3):
            continue
        if registry_name[unii].upper() in DENY:
            continue
        reg = norm(registry_name[unii])
        reg_words, sp_words = set(reg.split()), set(spelling.split())
        if spelling.startswith("water") or reg == "water":
            continue  # every water spelling already lands on "water"
        if reg_words < sp_words:
            # the label adds a qualifier ("ALCOHOL" -> "alcohol denat"): a
            # different substance on some labels, not a spelling
            skipped.append(f"{registry_name[unii]} -> {spelling} (qualifier)")
            continue
        if corpus[reg] >= corpus[spelling]:
            # labels already print the registry name at least as often (so a
            # recurring pair is one labeler's habit or typo: "methylparabem")
            skipped.append(f"{registry_name[unii]} -> {spelling} (registry spelling is common: {corpus[reg]} vs {corpus[spelling]})")
            continue
        if corpus[spelling] < MIN_CORPUS:
            # a misspelling that recurs in one labeler's SPLs ("methylparabem")
            skipped.append(f"{registry_name[unii]} -> {spelling} (rare spelling: {corpus[spelling]})")
            continue
        mapping[unii] = spelling
    with open(OUT, "w") as f:
        json.dump(dict(sorted(mapping.items())), f, indent=1, sort_keys=True)
        f.write("\n")
    print(f"{used} label/SPL list pairs aligned; {len(mapping)} UNII spellings -> {os.path.relpath(OUT)}", file=sys.stderr)
    top = sorted(mapping, key=lambda u: -pairs[u][mapping[u]])[:40]
    for u in top:
        print(f"  {registry_name[u]!r:45} -> {mapping[u]!r} ({pairs[u][mapping[u]]})", file=sys.stderr)
    for s in skipped:
        print(f"  skipped: {s}", file=sys.stderr)


if __name__ == "__main__":
    main()
