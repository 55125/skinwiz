#!/usr/bin/env python3
"""
Product de-duplication: which catalog rows are the same retail product?

Reads the seeded app database (app/data/skinwiz.db -- rebuilt from the
committed catalog CSVs by `npm run db:seed`, so it is a pure function of
them) plus tools/affiliate_feeds/output/product_barcodes.csv, and writes:

  output/product_merges.csv         auto-tier merges, applied by the seed
                                    (duplicate_id -> canonical_id)
  output/product_merge_flagged.csv  pairs a human should look at; NOT merged
  output/product_merge_pairs.csv    every scored candidate pair with its
                                    Jev scores (also the Jev cache: a rerun
                                    only calls Jev for pairs not in it)
  output/product_merge_summary.json counts per stage and tier

Pipeline (logic in product_merge.py, tested in tests/test_product_merges.py):

 1. Candidates, never O(n^2) over the catalog:
      exact    same brand_name + manufacturer + dosage_form + strength_key
               (the old SEO canonical rule, now folded in here)
      barcode  a shared real barcode (openfda_upc / obf_id), or an Open
               Beauty Facts barcode that encodes an FDA row's NDC
      name     same brand anchor (labeler / brand words) or same active
               strengths, and similar names (trigram / token overlap)
 2. Exclusions: strength, SPF, percent, dosage-form family, variant words
    (tinted, kids, fragrance-free, shades, flavors...), shade numbers, and
    the same checks on the two labels' SPL titles (output/spl_titles.csv)
    and artwork shade numbers; a brand-only name ("Dove") without a usable
    title never merges.
 3. Formula check: the two full ingredient lists (actives removed) must
    overlap; differing allergen hits = different (reformulated).
 4. Jev (typesafe/jev-1.13 via OpenRouter /systemone), two runs with A/B
    swapped. Tiers: auto (both >= 0.90, or a reliable shared barcode),
    flagged (0.50-0.90 or runs disagree by > 0.2), different (< 0.50).
 5. Auto also needs matching lists after naming noise and the review rules
    (product_merge_review.decide) to say merge, for the pair and for every
    pair in its union-find group; otherwise the edges go to flagged.
    Canonical = product_merge.canonical_key. review_product_merges.py then
    decides the flagged pairs.

Rx rows are never loaded, so they can never merge.

    python3 build_product_merges.py            # uses cached Jev scores, calls Jev for new pairs
    python3 build_product_merges.py --no-jev   # cache only; unscored pairs are flagged

OPENROUTER_API_KEY is read from the environment, or from the file named by
JEV_KEY_FILE (a dotenv file), inside this process only -- never printed.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import csv
import json
import os
import random
import sqlite3
import sys
import time
import urllib.request
from collections import Counter, defaultdict

from product_merge import (
    FDA_SOURCES, Product, UnionFind, artwork_shades, brand_tokens, choose_canonical, core_tokens, exclusion_reason,
    formula_check, group_conflicts, jaccard, name_tokens, names_match, tier_for, title_conflict, trigrams,
)
from product_merge_review import decide, list_difference, shade_split_ids

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, "output")
DB_DEFAULT = os.path.join(REPO, "app", "data", "skinwiz.db")
BARCODES_CSV = os.path.join(REPO, "tools", "affiliate_feeds", "output", "product_barcodes.csv")
SPL_MEDIA_CSV = os.path.join(OUT, "spl_media.csv")
SPL_TITLES_CSV = os.path.join(OUT, "spl_titles.csv")  # build_spl_titles.py
SPL_MEDIA_CANDIDATES_CSV = os.path.join(OUT, "spl_media_candidates.csv")

JEV_URL = "https://openrouter.ai/api/v1/systemone"
JEV_MODEL = "typesafe/jev-1.13"
JEV_BATCH = 20

csv.field_size_limit(10**9)


# ---------------------------------------------------------------------------
# Load
# ---------------------------------------------------------------------------

def load_products(db_path: str) -> dict[str, Product]:
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    label_sets = {r[0] for r in con.execute("SELECT spl_set_id FROM label_sections")}
    photo_sets: set[str] = set()
    if os.path.exists(SPL_MEDIA_CSV):
        with open(SPL_MEDIA_CSV, newline="", encoding="utf-8") as f:
            photo_sets = {r["setid"] for r in csv.DictReader(f) if r.get("chosen_url")}
    artwork: dict[str, list[str]] = defaultdict(list)
    if os.path.exists(SPL_MEDIA_CANDIDATES_CSV):
        with open(SPL_MEDIA_CANDIDATES_CSV, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                artwork[r["setid"]].append(r["image_name"])
    titles: dict[str, str] = {}
    if os.path.exists(SPL_TITLES_CSV):
        with open(SPL_TITLES_CSV, newline="", encoding="utf-8") as f:
            titles = {r["setid"]: r["title"] for r in csv.DictReader(f)}
    prods: dict[str, Product] = {}
    for r in con.execute("SELECT * FROM products WHERE is_rx = 0"):
        src = r["data_source"]
        prods[r["id"]] = Product(
            id=r["id"],
            source=src,
            brand_name=r["brand_name"] or "",
            manufacturer=r["manufacturer"] or "",
            dosage_form=r["dosage_form"] or "",
            active_ids=json.loads(r["active_ids"] or "[]"),
            strengths=json.loads(r["strengths"]) if r["strengths"] else None,
            is_rx=bool(r["is_rx"]),
            spl_set_id=r["spl_set_id"] or "",
            strength_key=r["strength_key"] or "",
            allergen_hits=json.loads(r["allergen_hits"]) if r["allergen_hits"] else None,
            free_from=json.loads(r["free_from_flags"]) if r["free_from_flags"] else None,
            has_label_sections=bool(r["spl_set_id"]) and r["spl_set_id"] in label_sets,
            real_photo=src not in FDA_SOURCES and bool(r["image_url"]),
            label_photo=src in FDA_SOURCES and bool(r["spl_set_id"]) and r["spl_set_id"] in photo_sets,
            image_url=r["image_url"] or "",
            active_text=r["active_ingredient_text"] or "",
            spl_title=titles.get(r["spl_set_id"] or "", "") if src in FDA_SOURCES else "",
            artwork_shades=artwork_shades(artwork.get(r["spl_set_id"] or "", [])) if src in FDA_SOURCES else frozenset(),
        )
    for r in con.execute(
        "SELECT pi.product_id, pi.ingredient_id, pi.raw_name FROM product_ingredients pi "
        "JOIN products p ON p.id = pi.product_id WHERE p.is_rx = 0 AND pi.position > 0 ORDER BY pi.product_id, pi.position"
    ):
        p = prods.get(r[0])
        if p:
            p.ingredients.append(r[1])
            p.ingredient_names.append(r[2])
    con.close()
    return prods


def gtin(code: str) -> str:
    d = "".join(c for c in code if c.isdigit())
    if len(d) in (12, 13, 14):
        return d.lstrip("0").zfill(13)
    return d


def load_barcodes(prods: dict[str, Product]):
    """real: gtin -> ids (openfda_upc/obf_id); ndc: gtin -> ids (ndc_derived); upc_count: id -> #openfda UPCs."""
    real: dict[str, set[str]] = defaultdict(set)
    ndc: dict[str, set[str]] = defaultdict(set)
    upc_count: Counter = Counter()
    if not os.path.exists(BARCODES_CSV):
        return real, ndc, upc_count
    with open(BARCODES_CSV, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            pid, code, src = r["product_id"], r["barcode"].strip(), r["source"]
            if pid not in prods or not code or set(code) == {"0"}:
                continue
            g = gtin(code)
            prods[pid].barcodes.append(code)
            if src in ("openfda_upc", "obf_id"):
                real[g].add(pid)
                if src == "openfda_upc":
                    upc_count[pid] += 1
            elif src == "ndc_derived":
                ndc[g].add(pid)
    return real, ndc, upc_count


# ---------------------------------------------------------------------------
# Candidates
# ---------------------------------------------------------------------------

def anchors(p: Product) -> set[str]:
    """Brand words a product can be found under: its labeler and its name's first word."""
    out = {t for t in brand_tokens(p.manufacturer) if len(t) >= 3}
    first = name_tokens(p.brand_name)[:1]
    out |= {t for t in first if len(t) >= 3}
    return out


def name_sim(a: Product, b: Product) -> float:
    brand = brand_tokens(a.manufacturer) | brand_tokens(b.manufacturer)
    ta, tb = core_tokens(a, brand), core_tokens(b, brand)
    if not ta or not tb:
        return 0.0
    tri = jaccard(trigrams(" ".join(sorted(ta))), trigrams(" ".join(sorted(tb))))
    sa, sb = set(ta), set(tb)
    contain = len(sa & sb) / min(len(sa), len(sb)) if min(len(sa), len(sb)) >= 2 else 0.0
    return max(tri, contain * 0.9)


def candidates(prods: dict[str, Product], real, ndc, upc_count):
    pairs: dict[tuple[str, str], dict] = {}

    def add(a: str, b: str, method: str, **kw):
        if a == b:
            return
        key = (a, b) if a < b else (b, a)
        cur = pairs.get(key)
        rank = {"exact": 0, "barcode": 1, "name": 2}
        if cur is None or rank[method] < rank[cur["method"]]:
            pairs[key] = {"method": method, **kw}
        elif method == "barcode" or kw.get("reliable_barcode"):
            cur["reliable_barcode"] = cur.get("reliable_barcode") or kw.get("reliable_barcode", False)

    # exact (old SEO canonical rule)
    exact = defaultdict(list)
    for p in prods.values():
        exact[(p.brand_name, p.manufacturer, p.dosage_form, p.strength_key)].append(p.id)
    n_exact = 0
    for ids in exact.values():
        if len(ids) > 1:
            ids = sorted(ids)
            for x in ids[1:]:
                add(ids[0], x, "exact")
                n_exact += 1

    # barcode
    n_bar = 0
    for g, ids in real.items():
        ids = sorted(ids)
        for i, a in enumerate(ids):
            for b in ids[i + 1:]:
                ok = all(upc_count[x] <= 2 for x in (a, b) if prods[x].is_fda) and len(ids) <= 3
                add(a, b, "barcode", reliable_barcode=ok)
                n_bar += 1
        # an OBF barcode that is an NDC-encoded drug code (3 + NDC + check)
        for b in ndc.get(g, ()):
            for a in ids:
                if prods[a].source == "open_beauty_facts" and prods[b].is_fda:
                    add(a, b, "barcode", reliable_barcode=True)
                    n_bar += 1

    # name: brand-anchor buckets and active-strength buckets
    buckets: dict[str, list[str]] = defaultdict(list)
    for p in prods.values():
        for t in anchors(p):
            buckets["a:" + t].append(p.id)
        if p.strength_key:
            buckets["s:" + p.strength_key].append(p.id)
    n_name = 0
    seen = set()
    for key, ids in buckets.items():
        if len(ids) < 2 or len(ids) > 2500:
            continue
        thresh = 0.55 if key.startswith("a:") else 0.75
        for i, a in enumerate(ids):
            pa = prods[a]
            for b in ids[i + 1:]:
                k = (a, b) if a < b else (b, a)
                if k in seen:
                    continue
                pb = prods[b]
                # cheap pre-filter: share at least one non-brand token
                if name_sim(pa, pb) >= thresh:
                    seen.add(k)
                    add(a, b, "name")
                    n_name += 1
    return pairs, {"exact_pairs": n_exact, "barcode_pairs": n_bar, "name_pairs": n_name}


# ---------------------------------------------------------------------------
# Jev
# ---------------------------------------------------------------------------

SOURCE_LABEL = {
    "openfda": "FDA drug listing",
    "dailymed": "FDA drug listing (DailyMed)",
    "open_beauty_facts": "Open Beauty Facts (crowd-sourced)",
    "brand_direct": "brand's own website",
}

CRITERIA = {
    "true": "Both records describe the same retail product: the same brand and product line, the same variant "
            "(shade, scent, SPF, strength, tint, audience) and the same formula. A different pack size or "
            "container count of that product still counts as the same product.",
    "false": "The records describe two different retail products: a different product line, variant, shade, "
             "scent, strength, SPF or formula, or a different brand's product with similar actives.",
}


def describe(p: Product) -> str:
    ings = ", ".join(p.ingredient_names[:25]) if p.ingredient_names else "(not available)"
    return (
        f"Source: {SOURCE_LABEL.get(p.source, p.source)}\n"
        f"Product name: {p.brand_name}\n"
        f"Brand / labeler: {p.manufacturer or '(unknown)'}\n"
        f"Dosage form: {p.dosage_form or '(not stated)'}\n"
        f"Active ingredients: {p.active_text[:300] if p.is_fda else ', '.join(p.active_ids) or '(none)'}\n"
        f"First ingredients of the full list: {ings}"
    )


def read_key() -> str | None:
    key = os.environ.get("OPENROUTER_API_KEY")
    if key:
        return key
    path = os.environ.get("JEV_KEY_FILE")
    if path and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("OPENROUTER_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def jev_batch(key: str, items: list[tuple[str, str, str]]) -> tuple[dict[str, float], float]:
    """items: (qid, recordA, recordB) -> ({qid: p}, usd)."""
    questions = {
        qid: {
            "type": "noul",
            "instructions": f"Two catalog records from a skincare product database.\n\nRECORD A\n{a}\n\nRECORD B\n{b}",
            "criteria": CRITERIA,
        }
        for qid, a, b in items
    }
    body = json.dumps({
        "model": JEV_MODEL,
        "state": {"task": "De-duplicating a skincare catalog. Records come from FDA drug listings, Open Beauty "
                          "Facts and brand websites, so the same product can be named a little differently "
                          "(word order, typos, 'Face Wash' vs 'Facial Cleanser'). Shades, scents, SPF levels, "
                          "strengths, tinted/untinted, kids/adult versions are different products."},
        "questions": questions,
    }).encode()
    for attempt in range(5):
        try:
            req = urllib.request.Request(JEV_URL, data=body, method="POST", headers={
                "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as resp:
                b = json.loads(resp.read())
            if b.get("error"):
                raise RuntimeError(str(b["error"])[:300])
            ans = b.get("answers") or {}
            out = {}
            for qid in questions:
                v = (ans.get(qid) or {}).get("noul")
                if v is not None:
                    out[qid] = float(v)
            return out, float((b.get("usage") or {}).get("cost") or 0)
        except Exception as e:  # noqa: BLE001 -- retried, then surfaced
            msg = str(e)
            if hasattr(e, "read"):
                try:
                    msg += " " + e.read().decode()[:300]  # type: ignore[attr-defined]
                except Exception:  # noqa: BLE001
                    pass
            if attempt == 4:
                raise RuntimeError(f"Jev call failed: {msg[:400]}") from None
            time.sleep(2 ** attempt)
    return {}, 0.0


def run_jev(prods, todo: list[tuple[str, str]], cache: dict, key: str, workers: int = 6) -> float:
    jobs = []
    for a, b in todo:
        da, db_ = describe(prods[a]), describe(prods[b])
        jobs.append((f"{a}|{b}|ab", da, db_))
        jobs.append((f"{a}|{b}|ba", db_, da))
    batches = [jobs[i:i + JEV_BATCH] for i in range(0, len(jobs), JEV_BATCH)]
    usd = 0.0
    done = 0

    def one(batch):
        items = [(f"q{i}", a, b) for i, (_, a, b) in enumerate(batch)]
        res, cost = jev_batch(key, items)
        return {batch[int(q[1:])][0]: p for q, p in res.items()}, cost

    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        for res, cost in ex.map(one, batches):
            usd += cost
            for qid, p in res.items():
                a, b, side = qid.split("|")
                cache.setdefault((a, b), {})["p_" + side] = p
            done += 1
            if done % 20 == 0:
                print(f"  jev {done}/{len(batches)} batches, ${usd:.4f}", file=sys.stderr)
    return usd


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def fmt(x: float | None) -> str:
    return "" if x is None else f"{x:.3f}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=DB_DEFAULT)
    ap.add_argument("--no-jev", action="store_true")
    ap.add_argument("--limit-jev", type=int, default=0, help="score at most N new pairs (testing)")
    args = ap.parse_args()

    prods = load_products(args.db)
    real, ndc, upc_count = load_barcodes(prods)
    print(f"{len(prods)} OTC products", file=sys.stderr)
    pairs, cstats = candidates(prods, real, ndc, upc_count)
    print(f"{len(pairs)} candidate pairs {cstats}", file=sys.stderr)

    excluded = Counter()
    excluded_why: dict[tuple[str, str], str] = {}
    live: dict[tuple[str, str], dict] = {}
    for (a, b), info in pairs.items():
        pa, pb = prods[a], prods[b]
        why = exclusion_reason(pa, pb)
        if why and info["method"] == "exact" and why.startswith(("variant", "shade")):
            # identical names: the "variant" is the same on both sides, so
            # only the SPL titles can still tell the two apart
            why = title_conflict(pa, pb)
        if why:
            excluded[why.split(":")[0]] += 1
            excluded_why[(a, b)] = why
            continue
        f, note = formula_check(pa, pb)
        if f == "ok":
            # overlap alone is not enough for an automatic merge: any item left
            # once naming noise is removed (a dye, a preservative, a botanical)
            # sends the pair to review instead
            ra, rb = list_difference(pa, pb)
            if ra or rb:
                f = "minor"
                note += "; lists differ: " + ", ".join(sorted(ra | rb)[:6])
        live[(a, b)] = {**info, "formula": f, "formula_note": note}

    # Jev cache = the committed pairs file
    pairs_csv = os.path.join(OUT, "product_merge_pairs.csv")
    cache: dict[tuple[str, str], dict] = {}
    if os.path.exists(pairs_csv):
        with open(pairs_csv, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                if r["p_ab"] and r["p_ba"]:
                    cache[(r["id_a"], r["id_b"])] = {"p_ab": float(r["p_ab"]), "p_ba": float(r["p_ba"])}
    todo = [k for k, v in live.items() if v["method"] != "exact" and v["formula"] != "conflict"
            and not ({"p_ab", "p_ba"} <= set(cache.get(k, {})))]
    todo.sort()
    usd = 0.0
    if todo and not args.no_jev:
        key = read_key()
        if not key:
            sys.exit("No OPENROUTER_API_KEY (env or JEV_KEY_FILE); rerun with --no-jev to use the cache only")
        if args.limit_jev:
            todo = todo[: args.limit_jev]
        print(f"scoring {len(todo)} pairs with Jev (x2 A/B swapped)", file=sys.stderr)
        usd = run_jev(prods, todo, cache, key)
        print(f"Jev cost ${usd:.4f}", file=sys.stderr)

    # tiers
    rows = []
    for (a, b), info in sorted(live.items()):
        c = cache.get((a, b), {})
        p_ab, p_ba = c.get("p_ab"), c.get("p_ba")
        t = tier_for(info["method"], p_ab, p_ba, info["formula"], bool(info.get("reliable_barcode")),
                     names_match(prods[a], prods[b]))
        rows.append({"a": a, "b": b, **info, "p_ab": p_ab, "p_ba": p_ba, "tier": t})

    # union-find over auto edges; conflicting groups are split back to flagged
    def build_groups(edges):
        uf = UnionFind()
        for r in edges:
            uf.union(r["a"], r["b"])
        return uf.groups()

    # The reviewer's rules (product_merge_review.decide) hold for automatic
    # merges too: an auto pair they would not merge (a name that differs by
    # identity words, a list that differs, a list missing on one side) goes
    # to review instead.
    review_cache: dict[tuple[str, str], str] = {}
    shade_split = shade_split_ids(prods)

    def review_decision(x: str, y: str) -> str:
        k = (x, y) if x < y else (y, x)
        if k not in review_cache:
            review_cache[k] = decide(prods[k[0]], prods[k[1]], shade_split)[0]
        return review_cache[k]

    def conflicts(g: list[str]) -> bool:
        if group_conflicts([prods[x] for x in g]):
            return True
        return any(review_decision(x, y) != "merge" for i, x in enumerate(g) for y in g[i + 1:])

    auto = [r for r in rows if r["tier"] == "auto"]
    demoted = 0
    review_demoted = 0
    for r in auto:
        d = review_decision(r["a"], r["b"])
        if d != "merge":
            r["tier"] = "flagged"
            r["formula_note"] += f"; review rules say {d}"
            review_demoted += 1
    auto = [r for r in rows if r["tier"] == "auto"]
    for _ in range(5):
        groups = build_groups(auto)
        bad: set[str] = set()
        for g in groups:
            if conflicts(g):
                bad |= set(g)
        if not bad:
            break
        for r in auto:
            if r["a"] in bad and r["method"] != "exact":
                r["tier"] = "flagged"
                r["formula_note"] += "; chain conflict inside its merge group"
                demoted += 1
        auto = [r for r in rows if r["tier"] == "auto"]
        # an exact-only group can still conflict (same name, different lists): demote those too
        groups = build_groups(auto)
        for g in groups:
            if conflicts(g):
                for r in auto:
                    if r["a"] in g:
                        r["tier"] = "flagged"
                        r["formula_note"] += "; chain conflict inside its merge group"
                        demoted += 1
        auto = [r for r in rows if r["tier"] == "auto"]

    groups = build_groups(auto)
    edge = {(r["a"], r["b"]): r for r in auto}
    merges = []
    for g in groups:
        canon = choose_canonical([prods[x] for x in g])
        for x in g:
            if x == canon.id:
                continue
            e = edge.get((min(x, canon.id), max(x, canon.id)))
            if e is None:  # joined through a chain: report the edge that brought it in
                e = next(r for k, r in edge.items() if x in k)
            note = e["formula_note"]
            if (min(x, canon.id), max(x, canon.id)) not in edge:
                note += "; via chain"
            p_ab, p_ba = e["p_ab"], e["p_ba"]
            merges.append({
                "duplicate_id": x, "canonical_id": canon.id, "tier": "auto", "method": e["method"],
                "p_ab": fmt(p_ab), "p_ba": fmt(p_ba), "notes": note,
            })
    merges.sort(key=lambda m: (m["canonical_id"], m["duplicate_id"]))

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "product_merges.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["duplicate_id", "canonical_id", "tier", "method", "p_ab", "p_ba", "notes"])
        w.writeheader()
        w.writerows(merges)

    flagged = [r for r in rows if r["tier"] == "flagged"]
    with open(os.path.join(OUT, "product_merge_flagged.csv"), "w", newline="", encoding="utf-8") as f:
        cols = ["id_a", "id_b", "method", "p_ab", "p_ba", "notes",
                "name_a", "name_b", "source_a", "source_b", "labeler_a", "labeler_b", "form_a", "form_b",
                "actives_a", "actives_b", "ingredients_a", "ingredients_b", "only_in_a", "only_in_b",
                "image_a", "image_b", "decision", "decided_canonical_id", "reviewer_notes"]
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in flagged:
            pa, pb = prods[r["a"]], prods[r["b"]]
            sa, sb = set(pa.ingredients), set(pb.ingredients)
            w.writerow({
                "id_a": pa.id, "id_b": pb.id, "method": r["method"], "p_ab": fmt(r["p_ab"]), "p_ba": fmt(r["p_ba"]),
                "notes": r["formula_note"], "name_a": pa.brand_name, "name_b": pb.brand_name,
                "source_a": pa.source, "source_b": pb.source, "labeler_a": pa.manufacturer, "labeler_b": pb.manufacturer,
                "form_a": pa.dosage_form, "form_b": pb.dosage_form,
                "actives_a": pa.active_text[:300] if pa.is_fda else ";".join(pa.active_ids),
                "actives_b": pb.active_text[:300] if pb.is_fda else ";".join(pb.active_ids),
                "ingredients_a": ", ".join(pa.ingredient_names), "ingredients_b": ", ".join(pb.ingredient_names),
                "only_in_a": ", ".join(x for x in pa.ingredients if x not in sb),
                "only_in_b": ", ".join(x for x in pb.ingredients if x not in sa),
                "image_a": pa.image_url, "image_b": pb.image_url,
                "decision": "", "decided_canonical_id": "", "reviewer_notes": "",
            })

    with open(pairs_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["id_a", "id_b", "method", "tier", "p_ab", "p_ba", "formula", "notes"])
        w.writeheader()
        for r in rows:
            c = cache.get((r["a"], r["b"]), {})
            w.writerow({"id_a": r["a"], "id_b": r["b"], "method": r["method"], "tier": r["tier"],
                        "p_ab": fmt(c.get("p_ab")), "p_ba": fmt(c.get("p_ba")), "formula": r["formula"],
                        "notes": r["formula_note"]})
        # keep paid Jev scores for pairs a newer rule excludes, so relaxing the
        # rule later needs no new calls
        for (a, b) in sorted(set(cache) - set(live)):
            c = cache[(a, b)]
            w.writerow({"id_a": a, "id_b": b, "method": pairs.get((a, b), {}).get("method", ""),
                        "tier": "excluded", "p_ab": fmt(c.get("p_ab")), "p_ba": fmt(c.get("p_ba")),
                        "formula": "", "notes": excluded_why.get((a, b), "no longer a candidate")})

    tiers = Counter(r["tier"] for r in rows)
    prev_total_usd = 0.0
    summary_path = os.path.join(OUT, "product_merge_summary.json")
    if os.path.exists(summary_path):
        with open(summary_path, encoding="utf-8") as f:
            prev_total_usd = float(json.load(f).get("jev_cost_usd_total", 0.0))
    summary = {
        "otc_products": len(prods),
        "candidate_pairs": len(pairs),
        "candidates_by_block": cstats,
        "excluded_by_rule": dict(sorted(excluded.items())),
        "pairs_considered": len(rows),
        "pairs_by_tier": dict(sorted(tiers.items())),
        "pairs_by_method_auto": dict(Counter(r["method"] for r in rows if r["tier"] == "auto")),
        "chain_demotions": demoted,
        "review_rule_demotions": review_demoted,
        "merge_groups": len(groups),
        "products_removed_from_listings": len(merges),
        "listed_products_after": len(prods) - len(merges),
        "removed_by_source": dict(Counter(prods[m["duplicate_id"]].source for m in merges)),
        "jev_pairs_scored_this_run": len(todo) if not args.no_jev else 0,
        "jev_cost_usd_this_run": round(usd, 4),
        # every Jev call behind the cached scores (runs only score new pairs)
        "jev_cost_usd_total": round(prev_total_usd + usd, 4),
        "jev_scored_pairs_cached": sum(1 for v in cache.values() if {"p_ab", "p_ba"} <= set(v)),
        "canonical_rule": "full ingredient list > FDA label sections > retail photo > DailyMed artwork > "
                          "source (openfda, dailymed, brand_direct, open_beauty_facts) > longer list > smallest id",
    }
    with open(os.path.join(OUT, "product_merge_summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        f.write("\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    random.seed(0)
    main()
