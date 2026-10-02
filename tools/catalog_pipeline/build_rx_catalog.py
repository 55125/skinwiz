#!/usr/bin/env python3
"""
Build the prescription (Rx) dermatology catalog from openFDA, for the Rx
reference pages and the clinician handout builder (business-plan.md §3).
Standard library only, like the rest of this pipeline.

    python3 build_rx_catalog.py

Outputs (both committed, both read by app/src/db/seed.ts):
  output/rx_catalog.csv         one row per Rx product NDC in scope
  output/rx_label_sections.csv  one row per SPL set id: the prescribing-
                                information sections the app shows

Scope is a fixed list of generics (SCOPE below), not "every Rx drug": the
topical dermatology prescriptions plus the handful of orals dermatologists
commonly co-prescribe. Unlike the OTC catalog there's no Drug Facts
`purpose` field to scope by, so this goes straight to the NDC directory
(`/drug/ndc.json`), which has clean product_ndc / brand / labeler /
strength / dosage form / route / marketing category / packaging for every
listing, and filters it:

  - product_type must be HUMAN PRESCRIPTION DRUG (OTC adapalene 0.1% gel,
    OTC hydrocortisone 1% etc. are already in the OTC catalog);
  - route must be topical/cutaneous for the topicals, oral for the listed
    orals (drops oral tretinoin, vaginal metronidazole and clindamycin,
    ophthalmic erythromycin/sulfacetamide/brimonidine, nasal mupirocin,
    injectable doxycycline...);
  - finished products only, not bulk ingredients; listings whose
    marketing_end_date has passed are dropped;
  - original packager only (openfda.is_original_packager). Repackagers
    (A-S Medication, Bryant Ranch, ...) re-list the same product under their
    own NDC; for doxycycline that is most of the directory. They add nothing
    a clinician picking "doxycycline hyclate 100 mg" needs, so they're
    counted and skipped rather than listed.

Labels: for every distinct SPL set id the kept rows point at, the label
endpoint (`/drug/label.json`) is queried in batches of 40 (same pattern as
fetch_label_sections.py) for indications, dosage & administration, boxed
warning, contraindications, warnings, pregnancy and lactation. Older
non-PLR labels use `warnings`/`precautions` and `nursing_mothers` instead
of `warnings_and_cautions`/`lactation`; both are handled. Text is kept as
the label states it (only a leading section heading is trimmed) and the app
shows it as "From the FDA label".

Isotretinoin is pulled in as INFORMATIONAL ONLY (informational_only=1): the
app shows a reference page but no handout can include it (iPLEDGE REMS).

Steroid potency classes are NOT assigned here: the I-VII mapping lives in
app/src/db/steroid-potency.ts so the dermatologist's edits to it apply on the
next seed without a network re-run. This script only emits the per-
ingredient percent strengths that mapping needs.

OPENFDA_API_KEY raises the unauthenticated rate limit if set. A full run is
~100 requests.
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "output")
NDC_BASE = "https://api.fda.gov/drug/ndc.json"
LABEL_BASE = "https://api.fda.gov/drug/label.json"
PAGE_LIMIT = 1000
LABEL_BATCH = 40
SLEEP = 0.3

TOPICAL = {"TOPICAL", "CUTANEOUS"}
ORAL = {"ORAL"}

# (group, generic search term, allowed routes, options)
#   forms:   restrict to these dosage-form words (substring match)
#   exclude_forms: drop these exact dosage forms
#   single:  only single-ingredient products (spironolactone, not
#            spironolactone + hydrochlorothiazide)
#   info:    informational only -- never in a handout
# Order matters: a combination product found under several terms
# (Tri-Luma: tretinoin + hydroquinone + fluocinolone) takes the group of the
# first entry that finds it.
SCOPE: list[tuple[str, str, set[str], dict]] = [
    # Retinoids
    ("retinoid", "tretinoin", TOPICAL, {}),
    ("retinoid", "tazarotene", TOPICAL, {}),
    ("retinoid", "trifarotene", TOPICAL, {}),
    ("retinoid", "adapalene", TOPICAL, {}),
    # Acne
    ("acne", "clindamycin", TOPICAL, {}),
    ("acne", "clascoterone", TOPICAL, {}),
    ("acne", "dapsone", TOPICAL, {}),
    ("acne", "azelaic acid", TOPICAL, {}),
    ("acne", "erythromycin", TOPICAL, {}),
    ("acne", "minocycline", TOPICAL, {"forms": ["FOAM"]}),  # minocycline foam (Amzeeq, Zilxi)
    ("acne", "sulfacetamide", TOPICAL, {}),
    # Rosacea
    ("rosacea", "ivermectin", TOPICAL, {"forms": ["CREAM"]}),  # not the lice lotion
    ("rosacea", "metronidazole", TOPICAL, {}),
    ("rosacea", "brimonidine", TOPICAL, {}),
    ("rosacea", "oxymetazoline", TOPICAL, {"forms": ["CREAM"]}),
    # Topical corticosteroids (potency class assigned at seed, see docstring)
    ("corticosteroid", "clobetasol", TOPICAL, {}),
    ("corticosteroid", "halobetasol", TOPICAL, {}),
    ("corticosteroid", "betamethasone", TOPICAL, {}),
    ("corticosteroid", "desoximetasone", TOPICAL, {}),
    ("corticosteroid", "diflorasone", TOPICAL, {}),
    ("corticosteroid", "fluocinonide", TOPICAL, {}),
    ("corticosteroid", "fluocinolone", TOPICAL, {}),
    ("corticosteroid", "halcinonide", TOPICAL, {}),
    ("corticosteroid", "amcinonide", TOPICAL, {}),
    ("corticosteroid", "mometasone", TOPICAL, {}),
    ("corticosteroid", "triamcinolone", TOPICAL, {}),
    ("corticosteroid", "fluticasone", TOPICAL, {}),
    ("corticosteroid", "flurandrenolide", TOPICAL, {}),
    ("corticosteroid", "prednicarbate", TOPICAL, {}),
    ("corticosteroid", "clocortolone", TOPICAL, {}),
    ("corticosteroid", "desonide", TOPICAL, {}),
    ("corticosteroid", "alclometasone", TOPICAL, {}),
    ("corticosteroid", "hydrocortisone", TOPICAL, {}),
    ("corticosteroid", "dexamethasone", TOPICAL, {}),
    # Non-steroidal anti-inflammatories
    ("nonsteroidal", "tacrolimus", TOPICAL, {}),
    ("nonsteroidal", "pimecrolimus", TOPICAL, {}),
    ("nonsteroidal", "ruxolitinib", TOPICAL, {}),
    ("nonsteroidal", "roflumilast", TOPICAL, {}),
    ("nonsteroidal", "tapinarof", TOPICAL, {}),
    ("nonsteroidal", "crisaborole", TOPICAL, {}),
    # Antifungals
    ("antifungal", "ketoconazole", TOPICAL, {}),
    ("antifungal", "ciclopirox", TOPICAL, {}),
    ("antifungal", "econazole", TOPICAL, {}),
    ("antifungal", "naftifine", TOPICAL, {}),
    ("antifungal", "luliconazole", TOPICAL, {}),
    ("antifungal", "efinaconazole", TOPICAL, {}),
    ("antifungal", "terbinafine", ORAL, {"single": True}),
    ("antifungal", "fluconazole", ORAL, {"single": True}),
    # Other topicals
    ("other", "mupirocin", TOPICAL, {}),
    ("other", "fluorouracil", TOPICAL, {}),
    ("other", "imiquimod", TOPICAL, {}),
    ("other", "hydroquinone", TOPICAL, {}),
    # Orals dermatologists commonly co-prescribe
    ("oral", "doxycycline", ORAL, {"single": True}),
    # Not Arestin: periodontal microspheres listed as an ORAL "POWDER".
    ("oral", "minocycline", ORAL, {"single": True, "exclude_forms": ["POWDER"]}),
    ("oral", "sarecycline", ORAL, {"single": True}),
    ("oral", "spironolactone", ORAL, {"single": True}),
    ("oral", "isotretinoin", ORAL, {"single": True, "info": True}),
]

LABEL_FIELDS = {
    # column: [openFDA label fields, first non-empty wins]
    "indications": ["indications_and_usage"],
    "dosage_and_administration": ["dosage_and_administration"],
    "boxed_warning": ["boxed_warning"],
    "contraindications": ["contraindications"],
    "warnings": ["warnings_and_cautions", "warnings", "precautions", "general_precautions"],
    "pregnancy": ["pregnancy", "teratogenic_effects"],
    "lactation": ["lactation", "nursing_mothers"],
}
HEADING = re.compile(
    r"^\s*(?:\d+(?:\.\d+)?\s+)?(?:indications\s*(?:and|&)\s*usage|dosage\s*(?:and|&)\s*administration|"
    r"(?:warning\s*:?\s*)?boxed\s*warning|contraindications|warnings\s*(?:and|&)\s*precautions|warnings|precautions|"
    r"pregnancy|lactation|nursing\s*mothers|warning)\b\s*[:.\-]?\s*",
    re.I,
)
# Every label section is capped: the app shows the start of a section with a
# DailyMed link for the rest, and a full warnings section can run 30k chars.
MAX_SECTION = 6000


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


def fetch_ndc(term: str) -> list[dict]:
    search = f'generic_name:"{term}" AND product_type:"HUMAN PRESCRIPTION DRUG"'
    out: list[dict] = []
    skip = 0
    while True:
        params = {"search": search, "limit": PAGE_LIMIT, "skip": skip}
        data = _get(f"{NDC_BASE}?{urllib.parse.urlencode(params)}")
        batch = data.get("results", [])
        out.extend(batch)
        total = data.get("meta", {}).get("results", {}).get("total", 0)
        skip += PAGE_LIMIT
        time.sleep(SLEEP)
        if not batch or skip >= total:
            break
    return out


# --- strengths ------------------------------------------------------------

MASS = {"kg": 1000.0, "g": 1.0, "mg": 0.001, "ug": 1e-6, "mcg": 1e-6, "l": 1000.0, "ml": 1.0}
STRENGTH_RE = re.compile(r"^\s*(\d*\.?\d+)\s*([a-zA-Z]+)\s*(?:/\s*(\d*\.?\d+)?\s*([a-zA-Z0-9]+))?\s*$")


def fmt_num(n: float) -> str:
    s = f"{n:.4f}".rstrip("0").rstrip(".")
    return s or "0"


def parse_strength(raw: str) -> tuple[float | None, str]:
    """openFDA strength ("0.25 mg/g", "100 mg/1", "1 g/100g") -> (percent or None, display)."""
    m = STRENGTH_RE.match(raw or "")
    if not m:
        return None, (raw or "").strip()
    num, unit, den_n, den_u = m.groups()
    n = float(num)
    unit_l = unit.lower()
    if den_u and den_u.lower() in MASS and unit_l in MASS:
        den = float(den_n) if den_n else 1.0
        pct = n * MASS[unit_l] / (den * MASS[den_u.lower()]) * 100
        pct = round(pct, 4)
        return pct, f"{fmt_num(pct)}%"
    if den_u == "1" or den_u is None:
        # per tablet/capsule (oral), or a bare amount
        return None, f"{fmt_num(n)} {unit}"
    return None, (raw or "").strip()


def title_case(s: str) -> str:
    # Generic names come back in mixed case ("Tretinoin", "clindamycin
    # phosphate and benzoyl peroxide"); the app shows them lower case.
    return s.strip().lower()


def ndc_to_row(rec: dict, group: str, term: str, info: bool) -> dict:
    actives = rec.get("active_ingredients", []) or []
    ings = []
    for a in actives:
        pct, display = parse_strength(a.get("strength", ""))
        ings.append({"name": a.get("name", "").strip(), "strength": a.get("strength", ""), "pct": pct, "display": display})
    openfda = rec.get("openfda", {}) or {}
    packages = rec.get("packaging", []) or []
    return {
        "product_ndc": rec.get("product_ndc", ""),
        "rx_group": group,
        "search_term": term,
        "brand_name": (rec.get("brand_name") or "").strip(),
        "generic_name": title_case(rec.get("generic_name") or ""),
        "labeler": (rec.get("labeler_name") or "").strip(),
        "active_ingredients_structured": "; ".join(f"{i['name']} {i['strength']}".strip() for i in ings),
        "strength_text": "; ".join(f"{i['name'].lower()} {i['display']}".strip() for i in ings),
        "ingredients_json": json.dumps(ings, separators=(",", ":")),
        "dosage_form": rec.get("dosage_form", ""),
        "route": ";".join(rec.get("route", []) or []),
        "marketing_category": rec.get("marketing_category", ""),
        "application_number": rec.get("application_number", ""),
        "product_type": rec.get("product_type", ""),
        "pharm_class": ";".join(rec.get("pharm_class", []) or []),
        "package_ndcs": ";".join(p.get("package_ndc", "") for p in packages),
        # openFDA packaging[].description, e.g. "1 TUBE in 1 CARTON (0187-5170-45) / 45 g in 1 TUBE".
        "package_descriptions": " | ".join(" ".join((p.get("description") or "").split()) for p in packages),
        "spl_set_id": (openfda.get("spl_set_id") or [""])[0],
        "marketing_start_date": rec.get("marketing_start_date", ""),
        "marketing_end_date": rec.get("marketing_end_date", ""),
        "listing_expiration_date": rec.get("listing_expiration_date", ""),
        "informational_only": "1" if info else "0",
    }


def keep(rec: dict, routes: set[str], opts: dict, today: str, stats: dict) -> bool:
    if rec.get("product_type") != "HUMAN PRESCRIPTION DRUG":
        stats["not_rx"] += 1
        return False
    if rec.get("finished") is False:
        stats["unfinished"] += 1
        return False
    rec_routes = set(rec.get("route", []) or [])
    if not rec_routes or not rec_routes <= routes:
        stats["route"] += 1
        return False
    end = rec.get("marketing_end_date", "")
    if end and end < today:
        stats["ended"] += 1
        return False
    # openFDA sets is_original_packager [True] on the labeler's own listing and
    # omits it on repackager listings. A record with no openfda block at all
    # (a brand-new listing not yet harmonized) is kept: unknown, not a repack.
    openfda = rec.get("openfda", {}) or {}
    if openfda and openfda.get("is_original_packager") != [True]:
        stats["repackager"] += 1
        return False
    forms = opts.get("forms")
    if forms and not any(f in (rec.get("dosage_form") or "") for f in forms):
        stats["form"] += 1
        return False
    if (rec.get("dosage_form") or "") in opts.get("exclude_forms", []):
        stats["form"] += 1
        return False
    if opts.get("single") and len(rec.get("active_ingredients", []) or []) != 1:
        stats["combination"] += 1
        return False
    return True


# --- label sections -------------------------------------------------------

def clean(parts) -> str:
    if not parts:
        return ""
    text = "\n".join(p.strip() for p in parts if isinstance(p, str) and p.strip())
    text = HEADING.sub("", text, count=1).strip()
    if len(text) > MAX_SECTION:
        cut = text.rfind(". ", 0, MAX_SECTION)
        text = text[: cut + 1 if cut > MAX_SECTION // 2 else MAX_SECTION].rstrip() + " [...]"
    return text


def fetch_labels(set_ids: list[str]) -> dict[str, dict]:
    rows: dict[str, dict] = {}
    for i in range(0, len(set_ids), LABEL_BATCH):
        chunk = set_ids[i : i + LABEL_BATCH]
        query = "set_id:(" + "+".join(f'"{s}"' for s in chunk) + ")"
        url = f"{LABEL_BASE}?search=" + urllib.parse.quote(query, safe=':()+"') + f"&limit={LABEL_BATCH * 2}"
        for rec in _get(url).get("results", []):
            sid = rec.get("set_id")
            if sid not in chunk:
                continue
            eff = rec.get("effective_time", "")
            if sid in rows and rows[sid]["effective_time"] >= eff:
                continue
            row = {"spl_set_id": sid, "effective_time": eff}
            for col, fields in LABEL_FIELDS.items():
                row[col] = next((clean(rec.get(f)) for f in fields if clean(rec.get(f))), "")
            rows[sid] = row
        print(f"  labels {min(i + LABEL_BATCH, len(set_ids))}/{len(set_ids)} queried, {len(rows)} found", file=sys.stderr)
        time.sleep(SLEEP)
    return rows


def main() -> None:
    today = date.today().strftime("%Y%m%d")
    stats = {k: 0 for k in ["fetched", "not_rx", "unfinished", "route", "ended", "repackager", "form", "combination", "duplicate"]}
    rows: dict[str, dict] = {}
    for group, term, routes, opts in SCOPE:
        recs = fetch_ndc(term)
        stats["fetched"] += len(recs)
        kept = 0
        for rec in recs:
            if not keep(rec, routes, opts, today, stats):
                continue
            ndc = rec.get("product_ndc", "")
            if not ndc:
                continue
            if ndc in rows:
                stats["duplicate"] += 1
                continue
            rows[ndc] = ndc_to_row(rec, group, term, bool(opts.get("info")))
            kept += 1
        print(f"{group:15s} {term:16s} {len(recs):4d} listings, {kept:3d} kept", file=sys.stderr)

    ordered = sorted(rows.values(), key=lambda r: (r["rx_group"], r["generic_name"], r["brand_name"], r["product_ndc"]))
    fieldnames = list(ordered[0].keys()) if ordered else []
    with open(os.path.join(OUT_DIR, "rx_catalog.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(ordered)

    set_ids = sorted({r["spl_set_id"] for r in ordered if r["spl_set_id"]})
    print(f"\nFetching {len(set_ids)} labels...", file=sys.stderr)
    labels = fetch_labels(set_ids)
    with open(os.path.join(OUT_DIR, "rx_label_sections.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["spl_set_id", "effective_time", *LABEL_FIELDS.keys()])
        w.writeheader()
        for sid in set_ids:
            if sid in labels:
                w.writerow(labels[sid])

    by_group: dict[str, int] = {}
    for r in ordered:
        by_group[r["rx_group"]] = by_group.get(r["rx_group"], 0) + 1
    summary = {
        "rx_products": len(ordered),
        "by_group": dict(sorted(by_group.items())),
        "labels_found": len(labels),
        "labels_missing": len(set_ids) - len(labels),
        "with_boxed_warning": sum(1 for l in labels.values() if l["boxed_warning"]),
        "skipped": stats,
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
