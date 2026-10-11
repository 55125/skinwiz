#!/usr/bin/env python3
"""
Build the EPA-registered flea and tick catalog for pet mode from EPA's
Pesticide Product Label System (PPLS) API. Standard library only.

    python3 build_pet_epa_catalog.py

Most spot-ons, flea collars and flea/tick shampoos and sprays (Frontline,
K9 Advantix II, Seresto, Hartz, Adams...) are pesticides under FIFRA, not
FDA animal drugs, so they are not in DailyMed's animal labels
(build_pet_catalog.py). PPLS has no bulk file; it answers per query:

  1. ProductSearch/searchWithIngName/v1/<active>: every product with that
     active (registered and cancelled), one row per product name;
  2. ppls/<reg no>: one product's detail, including `sites` ("DOGS (ANIMAL
     TREATMENT)", "CATS (KITTENS) (ANIMAL TREATMENT)"), pests, formulation,
     signal word and active ingredient percentages.

Step 1 runs for each active in ACTIVES; step 2 only for registered, active
products whose name or alternate brand name looks like a pet product
(PET_NAME), and a product is kept only when its own `sites` list treats
dogs or cats. So species comes from EPA's own site list, not a guess.

Output (committed, read by app/src/db/seed.ts):
  output/pet_epa_catalog.csv   one row per EPA registration number
Responses are cached under $PET_EPA_CACHE (default ./cache/epa) so a re-run
only fetches what's new. Requests are spaced RATE apart.

Pesticide labels list active ingredients only (inactives are not required),
so inactive_ingredient_text is always empty here: unknown, not "none".
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
import urllib.parse

from dailymed_spl import RateLimiter, http_get

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "output")
CACHE = os.environ.get("PET_EPA_CACHE", os.path.join(HERE, "cache", "epa"))
BASE = "https://ordspub.epa.gov/ords/pesticides/cswu"
RATE = 2.0  # requests per second; EPA publishes no limit

# Actives used in dog/cat flea, tick and lice products.
ACTIVES = [
    "fipronil", "imidacloprid", "permethrin", "pyriproxyfen", "s-methoprene", "methoprene", "etofenprox",
    "dinotefuran", "flumethrin", "cyphenothrin", "deltamethrin", "pyrethrins", "tetrachlorvinphos", "indoxacarb",
    "phenothrin", "spinosad", "lambda-cyhalothrin",
]
PET_NAME = re.compile(r"\b(DOGS?|CATS?|PETS?|PUPP(?:Y|IES)|KITTENS?|CANINE|FELINE|K-?9|COLLAR|SPOT[- ]?ON|SQUEEZE|"
                      r"TOP SPOT|SHAMPOO|DIP|FLEA|TICK)\b", re.I)
SITE_SPECIES = [(re.compile(r"\bDOGS?\b|PUPP", re.I), "dog"), (re.compile(r"\bCATS?\b|KITTEN", re.I), "cat")]


def cached_json(key: str, url: str, limiter: RateLimiter) -> dict | None:
    path = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9_.-]", "_", key) + ".json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    body = http_get(url, limiter)
    if body is None:
        return None
    data = json.loads(body)
    os.makedirs(CACHE, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f)
    return data


def candidates(limiter: RateLimiter) -> dict[str, set[str]]:
    """Registered pet-looking reg numbers -> the search actives that found them."""
    out: dict[str, set[str]] = {}
    for active in ACTIVES:
        data = cached_json(f"ing_{active}", f"{BASE}/ProductSearch/searchWithIngName/v1/{urllib.parse.quote(active)}", limiter) or {}
        items = data.get("items", [])
        n = 0
        for it in items:
            if it.get("registrationstatus") != "Registered" or it.get("productnamestatus") != "Active":
                continue
            names = f"{it.get('productname') or ''} {it.get('alternatebrandname') or ''}"
            if not PET_NAME.search(names):
                continue
            out.setdefault(it["eparegnumber"], set()).add(active)
            n += 1
        print(f"  {active:20s} {len(items):5d} product names, {n:4d} pet-looking", file=sys.stderr)
    return out


def species_of(sites: list[str]) -> list[str]:
    animal = [s for s in sites if "ANIMAL TREATMENT" in s.upper() or "PETS" in s.upper()]
    return sorted({sp for s in animal for rx, sp in SITE_SPECIES if rx.search(s)})


def main() -> None:
    limiter = RateLimiter(RATE)
    regs = candidates(limiter)
    print(f"{len(regs)} candidate registrations; fetching details", file=sys.stderr)
    rows = []
    stats = {"candidates": len(regs), "not_dog_or_cat_site": 0, "cancelled": 0, "kept": 0}
    for i, reg in enumerate(sorted(regs)):
        data = cached_json(f"ppls_{reg}", f"{BASE}/ppls/{urllib.parse.quote(reg)}", limiter) or {}
        items = data.get("items") or []
        if not items:
            continue
        d = items[0]
        if (d.get("product_status") or "").lower() != "active" or d.get("cancel_flag") == "Yes":
            stats["cancelled"] += 1
            continue
        sites = [s.get("site") or "" for s in d.get("sites") or []]
        species = species_of(sites)
        if not species:
            stats["not_dog_or_cat_site"] += 1
            continue
        actives = [
            {"name": a.get("active_ing") or "", "cas": a.get("cas_number") or "", "pct": a.get("active_ing_percent")}
            for a in d.get("active_ingredients") or []
        ]
        alt = [a.get("altbrandname") or "" for a in d.get("altbrandnames") or [] if a.get("altbrandname")]
        company = ((d.get("companyinfo") or [{}])[0] or {}).get("name") or ""
        rows.append({
            "epa_reg_no": reg,
            "product_name": d.get("productname") or "",
            "alternate_brand_names": "; ".join(alt),
            "company": company,
            "species": ";".join(species),
            "sites": "; ".join(sites),
            "pests": "; ".join(p.get("pest") or "" for p in d.get("pests") or []),
            "formulation": "; ".join(f.get("formulation") or "" for f in d.get("formulations") or []),
            "signal_word": d.get("signal_word") or "",
            "restricted_use": d.get("rup_yn") or "",
            "active_ingredients_structured": "; ".join(f"{a['name']} {a['pct']}%" if a["pct"] is not None else a["name"] for a in actives),
            "ingredients_json": json.dumps(actives, separators=(",", ":")),
            # newest accepted label (file names end in the acceptance date)
            "source_url": (f"https://www3.epa.gov/pesticides/chem_search/ppls/{pdf}" if (pdf := max(
                (p.get("pdffile") or "" for p in d.get("pdffiles") or []), key=lambda n: n[-12:], default="")) else ""),
        })
        stats["kept"] += 1
        if (i + 1) % 100 == 0:
            print(f"  {i + 1}/{len(regs)} details, {stats['kept']} kept", file=sys.stderr)
    rows.sort(key=lambda r: (r["product_name"].lower(), r["epa_reg_no"]))
    with open(os.path.join(OUT_DIR, "pet_epa_catalog.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    by_species: dict[str, int] = {}
    for r in rows:
        by_species[r["species"]] = by_species.get(r["species"], 0) + 1
    print(json.dumps({**stats, "by_species": by_species}, indent=2))


if __name__ == "__main__":
    main()
