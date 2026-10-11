"""
Pure rules for the pet catalog (build_pet_catalog.py, build_pet_epa_catalog.py,
build_pet_brand_catalog.py): which animal labels count as skin/ear products,
which species a label is for, which pet concerns it treats and its
regulatory status. No network, no files, so tests/test_pet_parse.py can pin
each rule.

Species is not a structured SPL field: it is read from the label's own
words. A mention of a species counts unless it is negated ("Do not use on
cats", "toxic to cats"); a negated cat mention also sets not_for_cats, which
the app shows as a warning on dog products.
"""
from __future__ import annotations

import re

# ---------------------------------------------------------------- scope

SKIN_ROUTES = {"TOPICAL", "AURICULAR (OTIC)", "TRANSDERMAL", "CUTANEOUS", "PERCUTANEOUS"}
# Forms that are never applied to skin or ears, even when a labeler files a
# TOPICAL route (rare, but seen on kits and medicated feeds).
NON_SKIN_FORM = re.compile(
    r"INJECT|TABLET|CAPSULE|IMPLANT|\bGAS\b|GRANULE|PELLET|\bBAR\b|WAFER|SYRUP|ENEMA|INSERT|\bRING\b|INHAL|IRRIGANT|"
    r"TYPE A|MEDICATED ARTICLE|FEED|BOLUS|CHEW",
    re.I,
)
SKIN_FORM = re.compile(
    r"SHAMPOO|SPRAY|LOTION|OINTMENT|CREAM|SOLUTION|\bGEL\b|CLOTH|WIPE|SWAB|LIQUID|SOAP|RINSE|EMULSION|SALVE|AEROSOL|"
    r"FOAM|\bOIL\b|JELLY|POWDER|DROPS|PATCH|DRESSING|SUSPENSION|CONDITIONER|LINIMENT|POULTICE|COLLAR",
    re.I,
)


def is_skin_product(form: str, routes: list[str]) -> bool:
    """A topical, transdermal (spot-on) or ear product."""
    form = form or ""
    if NON_SKIN_FORM.search(form):
        return False
    up = {r.upper() for r in routes if r}
    if up:
        return bool(up & SKIN_ROUTES)
    return bool(SKIN_FORM.search(form))


# ---------------------------------------------------------------- species

SPECIES_WORDS = {
    "dog": r"dogs?|canines?|pupp(?:y|ies)|k-?9",
    "cat": r"cats?|kittens?|felines?",
    "horse": r"horses?|equines?|foals?|ponies|pony",
}
LIVESTOCK = re.compile(r"\b(cattle|cows?|calves|swine|pigs?|sheep|goats?|poultry|chickens?|turkeys?|lactating dairy)\b", re.I)
# Words that, shortly before a species, turn the mention into a warning
# ("do not use on cats", "not for use on cats or kittens", "toxic to cats",
# "keep treated dogs away from cats"). Checked over the ~60 characters
# before the species word, within the same sentence.
NEGATION = re.compile(
    r"(?:do not|don't|never|not to be)\s+(?:use|apply|treat|administer|allow)\b[^.;:]{0,45}$|"
    r"\bnot (?:for|intended for|recommended for|labeled for|approved for|safe for)\b[^.;:]{0,40}$|"
    r"\b(?:toxic|poisonous|fatal|harmful|lethal|dangerous)\s+(?:to|for|in)\b[^.;:]{0,25}$|"
    r"\b(?:away from|separate (?:from)?|separated from|apart from|contact with)\b[^.;:]{0,25}$|"
    r"\bexcept\b[^.;:]{0,15}$|"
    r"\b(?:fatalit(?:y|ies)|deaths?|reactions?|toxicity|poisoning)\s+(?:in|to|of)\b[^.;:]{0,25}$|"
    r"\bon or near\b[^.;:]{0,10}$",
    re.I,
)
# "...cats. Do not use on cats" also reads "cat" right after negation; a
# following "only" ("for use on dogs only") does not negate the dog.


def species_mentions(text: str) -> tuple[set[str], set[str]]:
    """(species named positively, species named only in a warning)."""
    pos: set[str] = set()
    neg: set[str] = set()
    for sp, words in SPECIES_WORDS.items():
        for m in re.finditer(rf"\b(?:{words})\b", text, re.I):
            before = text[max(0, m.start() - 60) : m.start()]
            if NEGATION.search(before):
                neg.add(sp)
            else:
                pos.add(sp)
    return pos, neg - pos


# Some warnings name dogs then cats in one list ("Do not use on puppies or
# kittens under 12 weeks"): an age-limited warning is not a species ban.
AGE_LIMIT = re.compile(r"(?:pupp(?:y|ies)|kittens?)\s+(?:less than|under|younger than|below)\s+\d", re.I)


def parse_species(title: str, body: str) -> dict:
    """Species from the label text: every species the title or body names
    outside a warning. A label whose title is for livestock and names no
    dog or cat is not a pet product, whatever its warnings say about dogs
    (ivermectin pour-ons: "fatalities in dogs may result"). A label that
    names no species but says "pets" gets species ["pet"] (unspecified).

    Returns {species: [...], not_for_cats: bool, livestock: bool}."""
    t_pos, t_neg = species_mentions(title)
    b_pos, b_neg = species_mentions(AGE_LIMIT.sub("", body))
    livestock_title = bool(LIVESTOCK.search(title)) or bool(re.search(r"pour-?on", title, re.I))
    pos = t_pos | b_pos
    if livestock_title and not t_pos & {"dog", "cat"}:
        pos -= {"dog", "cat"}
    neg = (t_neg | b_neg) - pos
    # A dog product that says "do not use on cats" anywhere is not for cats,
    # even if another sentence names cats ("keep cats away from treated dogs"
    # reads as a positive mention to the regex).
    cat_ban = bool(re.search(r"(?:do not|never)\s+(?:use|apply)\b[^.;]{0,30}\bcats?\b|\bnot for (?:use on |use in )?cats\b|toxic to cats", title + " " + body, re.I))
    if cat_ban and "dog" in pos:
        pos.discard("cat")
        neg.add("cat")
    not_pets = re.search(r"\b(?:fish|aquari\w*|ponds?|koi|turtles?|reptiles?|birds?|hens?|poultry|hoof|hooves)\b", title, re.I)
    if not pos and re.search(r"\bpets?\b", title + " " + body, re.I) and not livestock_title and not not_pets:
        pos.add("pet")
    return {
        "species": sorted(pos),
        "not_for_cats": "cat" in neg and "cat" not in pos,
        "livestock": bool(LIVESTOCK.search(title + " " + body)),
    }


def is_pet_product(species: list[str]) -> bool:
    """Dog or cat products (dog/cat/horse labels included, horse-only not;
    "pet" = the label names no species)."""
    return bool({"dog", "cat", "pet"} & set(species))


# ---------------------------------------------------------------- status

def regulatory_status(marketing_category: str) -> str | None:
    """SPL approval code -> fda_approved | fda_conditional | unapproved; None = out of scope (export only)."""
    c = (marketing_category or "").strip().lower()
    if c in ("nada", "anada"):
        return "fda_approved"
    if c == "conditional nada":
        return "fda_conditional"
    if c.startswith("unapproved") or c.startswith("legally marketed unapproved"):
        return "unapproved"
    if c.startswith("export"):
        return None
    return "unapproved" if c else None


# ---------------------------------------------------------------- concerns

# Pet concern ids (app/src/db/pet.ts PET_CONCERNS has the names). Order is
# priority: a product's first concern is its own page.
# Matched against active ingredient names and the label's title +
# indications only (not its warnings, which mention eyes, ears and
# infections in passing).
PET_CONCERN_RULES: list[tuple[str, str, str]] = [
    # (concern id, active-ingredient pattern, indication-text pattern)
    ("pet-fleas-ticks",
     r"fipronil|imidacloprid|permethrin|pyrethrin|piperonyl|methoprene|pyriproxyfen|etofenprox|dinotefuran|selamectin|"
     r"fluralaner|sarolaner|moxidectin|spinetoram|indoxacarb|cyphenothrin|flumethrin|deltamethrin|tetrachlorvinphos|"
     r"nitenpyram|amitraz|cypermethrin|eprinomectin|emodepside|esafoxolaner|phenothrin|lufenuron",
     r"\bfleas?\b|\bticks?\b|\blice\b|\bmites?\b|mange|\bmosquito"),
    ("pet-ear-infections",
     r"posaconazole|florfenicol|terbinafine.*betamethasone|orbifloxacin|marbofloxacin|enrofloxacin.*silver",
     r"\bears?\b|\botic\b|otitis|ear canal"),
    ("pet-yeast",
     r"miconazole|ketoconazole|clotrimazole|climbazole|terbinafine|econazole|nystatin|enilconazole|thiabendazole|lime sulfur|polysulfide|piroctone",
     r"\byeast|malassezia|fungal|fungus|ringworm|dermatophyt"),
    ("pet-bacterial",
     r"chlorhexidine|benzoyl peroxide|ethyl lactate|mupirocin|silver sulfadiazine|gentamicin|neomycin|bacitracin|polymyxin|"
     r"povidone|triclosan|benzalkonium|nitrofurazone|fusidic|enrofloxacin",
     r"bacteri|pyoderma|antisepti|folliculitis|skin infection"),
    ("pet-seborrhea",
     r"\bsulfur\b|salicylic|coal tar|selenium sulfide|benzoyl peroxide|phytosphingosine|piroctone",
     r"seborrh|dandruff|scal(?:ing|y)|flak|greasy|oily skin|keratolyt"),
    ("pet-itch-allergies",
     r"hydrocortisone|triamcinolone|betamethasone|dexamethasone|mometasone|pramoxine|lidocaine|diphenhydramine|"
     r"oatmeal|fluocinolone|isoflupredone|prednisolone",
     r"\bitch|prurit|allerg|atopic|dermatitis|inflam"),
    ("pet-hot-spots", r"(?!)", r"hot ?spots?|moist dermatitis|pyotraumatic"),
    ("pet-dry-skin", r"oatmeal|ceramide|urea|glycerin|lanolin", r"dry skin|moisturi[sz]|dry, ?flaky|hydrat"),
]

PET_CONCERN_IDS = [c for c, _, _ in PET_CONCERN_RULES]


def pet_concerns(active_names: list[str], indication_text: str, route_otic: bool = False) -> list[str]:
    """Pet concern ids for a product, in PET_CONCERN_RULES order ([] = none fits)."""
    actives = " ".join(active_names).lower()
    out: list[str] = []
    for cid, active_re, text_re in PET_CONCERN_RULES:
        hit = bool(actives and re.search(active_re, actives, re.I)) or bool(re.search(text_re, indication_text, re.I))
        if cid == "pet-ear-infections" and route_otic:
            hit = True
        if hit:
            out.append(cid)
    # An ear product's own page is the ear page, whatever its actives treat.
    if route_otic and "pet-ear-infections" in out:
        out.remove("pet-ear-infections")
        out.insert(0, "pet-ear-infections")
    return out
