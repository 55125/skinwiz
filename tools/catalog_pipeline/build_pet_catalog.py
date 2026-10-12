#!/usr/bin/env python3
"""
Build the pet (dog and cat) skin and ear catalog from DailyMed's animal SPL
labels, for pet mode. Standard library only, like the rest of this pipeline.

    curl -LO https://dailymed-data.nlm.nih.gov/public-release-files/dm_spl_release_animal.zip
    python3 build_pet_catalog.py --zip /path/to/dm_spl_release_animal.zip

The zip (~1.2 GB, ~3,600 labels, one inner zip per label) is read in place
and never committed; nothing here hits the network.

Outputs (committed, read by app/src/db/seed.ts):
  output/pet_catalog.csv           one row per product NDC in scope, with
                                   the label's indications, directions and
                                   warnings/cautions quoted (capped ~6k chars)
  output/pet_catalog_summary.json  the counts reported in the PR

Scope (pet_parse.py has the rules and tests/test_pet_parse.py pins them):
  - route TOPICAL / AURICULAR (OTIC) / TRANSDERMAL / CUTANEOUS, or no route
    and a skin dosage form (shampoo, spray, lotion, ointment, cream,
    solution, gel, cloth/wipe, ...); never tablets, injections, feeds;
  - the label names dogs or cats (dog/cat/horse labels in, horse-only and
    livestock-only out), species parsed from the label text because SPL has
    no species field;
  - marketing still active (marketingAct statusCode "active"); "export
    only" products are out.

Regulatory status comes from the SPL's own approval code: NADA/ANADA ->
fda_approved, conditional NADA -> fda_conditional, "unapproved drug other"
and the minor-species category -> unapproved. Rx = the document type is a
PRESCRIPTION ANIMAL DRUG LABEL. Nothing is inferred: a strength the label
doesn't give is left empty.
"""
from __future__ import annotations

import argparse
import collections
import csv
import io
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

from build_rx_catalog import MAX_SECTION, parse_strength
from pet_parse import is_pet_product, is_skin_product, parse_species, pet_concerns, regulatory_status
from spl_parse import NDC_SYSTEM, NS, UNII_SYSTEM, _text, effective_time, inactive_section_text

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "output")

SECTIONS = {
    "indications": ["34067-9"],
    "dosage_and_administration": ["34068-7"],
    "contraindications": ["34070-3"],
    # warnings + precautions + user safety, in label order
    "warnings": ["34071-1", "42232-9", "50742-6", "50741-8", "53414-9"],
}
HEADING = re.compile(r"^\s*(?:indications?(?:\s*(?:and|&)\s*usage)?|directions(?:\s*for\s*use)?|dosage(?:\s*(?:and|&)\s*administration)?|"
                     r"contraindications?|warnings?|cautions?|precautions?|user safety(?:\s*warnings)?)\s*[:.\-]?\s*", re.I)


def cap(text: str) -> str:
    text = text.strip()
    if len(text) > MAX_SECTION:
        cut = text.rfind(". ", 0, MAX_SECTION)
        text = text[: cut + 1 if cut > MAX_SECTION // 2 else MAX_SECTION].rstrip() + " [...]"
    return text


def section_texts(root: ET.Element) -> dict[str, str]:
    found: dict[str, list[str]] = {k: [] for k in SECTIONS}
    for sec in root.iter(f"{NS}section"):
        code = sec.find(f"{NS}code")
        c = code.get("code") if code is not None else ""
        for key, codes in SECTIONS.items():
            if c in codes:
                t = HEADING.sub("", _text(sec.find(f"{NS}text")), count=1)
                if t and t not in found[key]:
                    found[key].append(t)
    return {k: cap(" ".join(v)) for k, v in found.items()}


def all_text(root: ET.Element) -> str:
    parts = []
    for sec in root.iter(f"{NS}section"):
        parts.append(_text(sec.find(f"{NS}title")))
        parts.append(_text(sec.find(f"{NS}text")))
    return " ".join(p for p in parts if p)


def labeler(root: ET.Element) -> str:
    org = root.find(f"{NS}author/{NS}assignedEntity/{NS}representedOrganization/{NS}name")
    return _text(org)


def quantity(ing: ET.Element) -> str:
    q = ing.find(f"{NS}quantity")
    if q is None:
        return ""
    num, den = q.find(f"{NS}numerator"), q.find(f"{NS}denominator")
    if num is None or not num.get("value"):
        return ""
    s = f"{num.get('value')} {num.get('unit') or ''}".strip()
    if den is not None and den.get("value"):
        d_unit = den.get("unit") or ""
        s += "/" + (f"{den.get('value')} {d_unit}" if d_unit not in ("", "1") else den.get("value"))
    return s


def products_in(root: ET.Element) -> list[dict]:
    """One dict per product with its own NDC and ingredients (kit parts skipped)."""
    out = []
    for outer in root.iter(f"{NS}manufacturedProduct"):
        mp = outer.find(f"{NS}manufacturedProduct")
        if mp is None or mp.find(f"{NS}ingredient") is None:
            continue
        code = mp.find(f"{NS}code")
        ndc = code.get("code") if code is not None and code.get("codeSystem") == NDC_SYSTEM else ""
        form_el = mp.find(f"{NS}formCode")
        actives, inactives = [], []
        for ing in mp.findall(f"{NS}ingredient"):
            sub = ing.find(f"{NS}ingredientSubstance")
            if sub is None:
                continue
            name = _text(sub.find(f"{NS}name"))
            c = sub.find(f"{NS}code")
            unii = c.get("code") if c is not None and c.get("codeSystem") == UNII_SYSTEM else ""
            cls = ing.get("classCode") or ""
            if cls == "IACT":
                if name and name.upper() not in {n.upper() for n, _ in inactives}:
                    inactives.append((name, unii or ""))
            elif cls.startswith("ACT"):
                raw = quantity(ing)
                pct, display = parse_strength(raw) if raw else (None, "")
                if pct is not None and pct > 100:  # a labeler's unit slip ("2500%"): keep what the label says
                    pct, display = None, raw
                actives.append({"name": name, "unii": unii or "", "strength": raw, "pct": pct, "display": display if raw else ""})
        cat_el = outer.find(f".//{NS}subjectOf/{NS}approval/{NS}code")
        app_id = outer.find(f".//{NS}subjectOf/{NS}approval/{NS}id")
        status_el = outer.find(f".//{NS}subjectOf/{NS}marketingAct/{NS}statusCode")
        routes = [r.get("displayName") or "" for r in outer.iter(f"{NS}routeCode")]
        packages = []
        for cp in mp.iter(f"{NS}containerPackagedProduct"):
            pc = cp.find(f"{NS}code")
            if pc is not None and pc.get("code"):
                packages.append(pc.get("code"))
        out.append({
            "ndc": ndc,
            "name": _text(mp.find(f"{NS}name")),
            "form": (form_el.get("displayName") if form_el is not None else "") or "",
            "routes": sorted({r.upper() for r in routes if r}),
            "actives": actives,
            "inactives": inactives,
            "marketing_category": (cat_el.get("displayName") if cat_el is not None else "") or "",
            "application_number": (app_id.get("extension") if app_id is not None else "") or "",
            "marketing_status": (status_el.get("code") if status_el is not None else "") or "",
            "packages": packages,
        })
    return out


def iter_labels(zip_path: str):
    with zipfile.ZipFile(zip_path) as outer:
        for name in outer.namelist():
            if not name.endswith(".zip"):
                continue
            with zipfile.ZipFile(io.BytesIO(outer.read(name))) as inner:
                for m in inner.namelist():
                    if m.endswith(".xml"):
                        yield inner.read(m)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--zip", default=os.environ.get("DAILYMED_ANIMAL_ZIP", "dm_spl_release_animal.zip"))
    args = ap.parse_args()

    stats = collections.Counter()
    by_species: collections.Counter = collections.Counter()
    by_category: collections.Counter = collections.Counter()
    by_status: collections.Counter = collections.Counter()
    by_concern: collections.Counter = collections.Counter()
    rows: dict[str, dict] = {}
    for xml in iter_labels(args.zip):
        stats["labels"] += 1
        root = ET.fromstring(xml)
        doc_type = (root.find(f"{NS}code").get("displayName") or "").upper()
        set_id = (root.find(f"{NS}setId").get("root") or "") if root.find(f"{NS}setId") is not None else ""
        eff = effective_time(root)
        prods = [p for p in products_in(root) if p["ndc"]]
        # ~1% of labels have no <title>; the first product's name stands in.
        title = _text(root.find(f"{NS}title")) or (prods[0]["name"] if prods else "")
        if not prods:
            stats["no_product_ndc"] += 1
            continue
        skin = [p for p in prods if is_skin_product(p["form"], p["routes"])]
        if not skin:
            continue
        stats["skin_labels"] += 1
        secs = section_texts(root)
        body = all_text(root)
        sp = parse_species(title, body)
        if not is_pet_product(sp["species"]):
            stats["skin_not_dog_or_cat"] += 1
            continue
        stats["dog_cat_skin_labels"] += 1
        is_rx = "PRESCRIPTION" in doc_type
        free_inactive = inactive_section_text(root)
        for p in skin:
            if p["marketing_status"] and p["marketing_status"] != "active":
                stats["not_marketed"] += 1
                continue
            status = regulatory_status(p["marketing_category"])
            if status is None:
                stats["export_only_or_unknown"] += 1
                continue
            ndc = p["ndc"]
            if ndc in rows and rows[ndc]["effective_time"] >= eff:
                stats["duplicate_ndc"] += 1
                continue
            active_names = [a["name"] for a in p["actives"]]
            otic = "AURICULAR (OTIC)" in p["routes"] or bool(re.search(r"\b(ear|otic)\b", title + " " + p["name"], re.I))
            concerns = pet_concerns(active_names, f"{title} {p['name']} {secs['indications']}", otic)
            inactive_text = "; ".join(n for n, _ in p["inactives"]) or free_inactive
            rows[ndc] = {
                "product_ndc": ndc,
                "brand_name": p["name"] or title,
                "labeler": labeler(root),
                "title": title[:300],
                "species": ";".join(sp["species"]),
                "not_for_cats": "1" if sp["not_for_cats"] else "0",
                "concern_ids": ";".join(concerns),
                "active_ingredients_structured": "; ".join(f"{a['name']} {a['strength']}".strip() for a in p["actives"]),
                "strength_text": "; ".join(f"{a['name'].lower()} {a['display']}".strip() for a in p["actives"]),
                "ingredients_json": json.dumps(p["actives"], separators=(",", ":")),
                "inactive_ingredient_text": inactive_text,
                "inactive_uniis": ";".join(u for _, u in p["inactives"] if u),
                "dosage_form": p["form"].upper(),
                "route": ";".join(p["routes"]),
                "marketing_category": p["marketing_category"].upper(),
                "application_number": p["application_number"],
                "regulatory_status": status,
                "is_rx": "1" if is_rx else "0",
                "document_type": doc_type,
                "package_ndcs": ";".join(p["packages"]),
                "spl_set_id": set_id,
                "effective_time": eff,
                "indications": secs["indications"],
                "directions": secs["dosage_and_administration"],
                "warnings": " ".join(t for t in (secs["contraindications"], secs["warnings"]) if t),
            }

    ordered = sorted(rows.values(), key=lambda r: (r["concern_ids"] == "", r["brand_name"].lower(), r["product_ndc"]))
    for r in ordered:
        by_species[r["species"]] += 1
        by_category[r["marketing_category"]] += 1
        by_status[("rx " if r["is_rx"] == "1" else "otc ") + r["regulatory_status"]] += 1
        for c in r["concern_ids"].split(";") if r["concern_ids"] else ["(none)"]:
            by_concern[c] += 1
    with open(os.path.join(OUT_DIR, "pet_catalog.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(ordered[0].keys()))
        w.writeheader()
        w.writerows(ordered)
    summary = {
        "labels": stats["labels"],
        "skin_or_ear_labels": stats["skin_labels"],
        "dog_or_cat_skin_labels": stats["dog_cat_skin_labels"],
        "products": len(ordered),
        "products_with_a_pet_concern": sum(1 for r in ordered if r["concern_ids"]),
        "not_for_cats": sum(1 for r in ordered if r["not_for_cats"] == "1"),
        "by_species": dict(by_species.most_common()),
        "by_marketing_category": dict(by_category.most_common()),
        "by_status": dict(by_status.most_common()),
        "by_concern": dict(by_concern.most_common()),
        "skipped": {k: stats[k] for k in ["no_product_ndc", "skin_not_dog_or_cat", "not_marketed", "export_only_or_unknown", "duplicate_ndc"]},
    }
    with open(os.path.join(OUT_DIR, "pet_catalog_summary.json"), "w") as f:
        json.dump(summary, f, indent=2)
        f.write("\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    sys.exit(main())
