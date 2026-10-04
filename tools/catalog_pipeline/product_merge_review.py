"""Pure rules for reviewing flagged duplicate pairs (review_product_merges.py).

The flagged tier of build_product_merges.py is decided here with explicit,
documented rules instead of row-by-row judgement. Each decision carries a rule
id (see RULES) so a whole rule can be audited or reverted at once.

The principle (allergen correctness beats tidiness):

  merge only when two listings are the same retail product with the same
  formula; pack size may differ. Private-label copies (one formula relabeled
  by several companies) with the same product name and an identical
  ingredient list are one formula and merge. Different product names with
  the same formula are different retail products and stay separate. Any
  real ingredient difference (fragrance, preservative, dye, botanical,
  active, strength, SPF) keeps them apart.

Ingredient lists are compared after removing naming noise only: INCI vs
common names (Simmondsia Chinensis Seed Oil = Jojoba Oil), FDA UNII names for
iron-oxide pigments, "Inactive ingredients:" prefixes glued to the first
item, lot / formula codes parsed as ingredients, hyphenation and one- or
two-letter typos in long names (never across a digit difference: PEG-10 is
not PEG-12), and one item split or glued across a comma. Anything left over
is a real difference.
"""
from __future__ import annotations

import re

from product_merge import (
    FORM_FAMILY, FORM_WORDS, Product, brand_tokens, edit_distance, fuzzy_partner, name_diff, name_tokens, norm_ingredient,
    brand_neutral, shared_brand_tokens, spf_values, strengths_match, title_conflict, title_tokens,
)

RULES = {
    "R1-same-name-same-list": "Same product name (after pack sizes, filler, typos and word order), SPL titles that "
                              "agree, and the same ingredient list (after naming noise): one formula -> merge. "
                              "Labelers may differ (manufacturer vs brand, labeler-name typos, repackagers).",
    "R1a-white-label": "R1 inside a white-label family (Stay Ageless, Dynamic SPF 55, ...: one NDC product code "
                       "under many labeler codes): one manufacturer's formula relabeled by many practices under one "
                       "product name -> merge.",
    "R1b-brand-only-fda-name": "R1 where the FDA listing name is one word -- only the brand (\"Dove\", \"Degree\") "
                               "or a bare form word (\"Cream\") -- and the two SPL titles name the same variant "
                               "(\"Invisible Sheer Cool\" on both) -> merge. Without usable titles these never merge "
                               "(the pipeline excludes them: every scent / shade is filed under the one name).",
    "R1c-generic-name": "R1 where the product name is only the drug name (\"Clotrimazole\"), with titles that do "
                        "not name different store brands -> merge.",
    "R2-neutral-name-words": "Names (or titles) differ only by neutral words -- a brand word on one side only "
                             "(\"Cetaphil Gentle Skin Cleanser\" / \"Gentle Skin Cleanser\"), the drug active's "
                             "name, a form word naming the one dosage form both list, or a pack word (refill, "
                             "travel, trial) -- and the lists are the same -> merge. Brand words on both sides "
                             "(\"Leader\" / \"Meijer\") are different store brands, not neutral.",
    "R3-spl-coding-white-label": "Stay Ageless Tinted Mineral SPF 30 formula only: one side is the DailyMed "
                                 "structured (UNII-coded) list, which renames items and omits five coded items that "
                                 "the label text lists; every other item matches. Verified on the label texts: same "
                                 "formula. Merged with the fuller label-text list as canonical, so no allergen is "
                                 "hidden.",
    "R4-same-name-list-differs": "Same product name, but the ingredient lists differ after naming noise is removed "
                                 "-> reformulated (or an unnamed variant: scent, shade, kit). Not merged.",
    "R5-different-name": "Product names or SPL titles differ by identity words (line, variant, shade, scent, "
                         "audience, kit, indication, store brand), or SPL artwork names different shades -> "
                         "different retail products, even with the same formula. Not merged.",
    "R6-strength-or-active": "Actives or stated strengths differ -> different products. Not merged.",
    "R7-no-list": "One side has no ingredient list, so the formula cannot be confirmed -> needs_owner.",
    "R7a-single-ingredient": "Same name, both 100% one active (white petrolatum): there are no inactive "
                             "ingredients to differ -> merge.",
    "R8-dailymed-checked": "Hard case decided by reading the DailyMed SPL for the set id (MANUAL table).",
    "R9-chain-conflict": "The pair matches, but merges are transitive and merging it would also join two products "
                         "the rules keep apart (through an auto merge or another reviewed merge) -> needs_owner; "
                         "keep_separate when the clash is SPL artwork-shade or title variant-word evidence (a listing "
                         "whose own variant is unknown cannot be assigned to one shade).",
}

# ---------------------------------------------------------------------------
# Ingredient-list comparison
# ---------------------------------------------------------------------------

# common / INCI / UNII names of one ingredient -> one key
SYNONYMS = {
    "simmondsia-chinensis-seed-oil": "jojoba-oil", "jojoba-seed-oil": "jojoba-oil",
    "simmondsia-chinensis-oil": "jojoba-oil",
    "lepidium-sativum-sprout-extract": "garden-cress-sprout",
    "phenylethyl-alcohol": "phenethyl-alcohol",
    "alumina": "aluminum-oxide",
    "glyceryl-monocaprylate": "glyceryl-caprylate",
    "polygonum-aviculare-top": "polygonum-aviculare-extract",
    "carthamus-tinctorius-seed-oleosomes": "carthamus-tinctorius-oleosomes",
    "euphorbia-cerifera-cera": "candelilla-wax", "euphorbia-cerifera-wax": "candelilla-wax",
    "copernicia-cerifera-wax": "carnauba-wax", "copernicia-cerifera-cera": "carnauba-wax",
    "theobroma-cacao-seed-butter": "cocoa-butter",
    "linum-usitatissimum-seed-extract": "flax-seed",
    "phytate-sodium": "sodium-phytate",
    "ultramarine-blue": "ultramarines",
    "methyl-methacrylate-glycol-dimethacrylate-crosspolymer": "methyl-methacrylate-crosspolymer",
    "c12-c15-alkyl-benzoate": "c12-15-alkyl-benzoate",
    "2-octyldodecanol": "octyldodecanol",
    "beeswax-cire-d-abeille": "beeswax", "cera-alba": "beeswax",
    "microcrystalline-wax-cire-microcristalline": "microcrystalline-wax",
    "butyrospermum-parkii-butter": "shea-butter",
    "sd-alcohol-40-b": "alcohol-denat", "sd-alcohol-40": "alcohol-denat", "sd-alcohol": "alcohol-denat",
    "aloe-barbadensis-leaf-juice-powder": "aloe-barbadensis-leaf-juice",
    "aloe-barbadensis-juice": "aloe-barbadensis-leaf-juice",
    "oryza-sativa-bran": "rice-bran", "bentonite-magma": "bentonite",
    "polyethylene-glycol-400": "peg-400", "propylene-glycol-monolaurate": "propylene-glycol-laurate",
    "pongamia-pinnata-seed": "pongamia-pinnata-seed-extract", "titanium-dioxide-ci-77891": "titanium-dioxide",
}
IRON_OXIDES = {"iron-oxides", "iron-oxide", "ferric-oxide-red", "ferric-oxide-yellow", "ferrosoferric-oxide",
               "ci-77491", "ci-77492", "ci-77499", "red-iron-oxide", "yellow-iron-oxide", "black-iron-oxide",
               "iron-oxide-red", "iron-oxide-yellow", "iron-oxide-black", "ferric-oxide"}
_PREFIX = re.compile(r"^(?:i-?n-?active-ingredients?|in-active-ingredients|inactive-ingredients?|other-ingredients"
                     r"|inactive)-")
_SUFFIX = re.compile(r"-(?:f-i-l|fil|color|colour|code)$")
_JUNK = re.compile(r"^(?:fil-?\d.*|d\d{6}-\d+|z\d{6,}.*|pr-\d+|\d{5,}-e|code-.*|none|this-ingredient)$")


def ingredient_key(slug: str) -> str | None:
    """One key per ingredient, or None for junk parsed as an ingredient."""
    s = slug.strip().lower()
    for _ in range(2):
        s = _PREFIX.sub("", s)
        s = _SUFFIX.sub("", s)
    if not s or _JUNK.match(s):
        return None
    s = norm_ingredient(s)
    s = SYNONYMS.get(s, s)
    if s in IRON_OXIDES or s.startswith("iron-oxides"):
        return "iron-oxides"
    return s


def _digits(s: str) -> str:
    return "".join(c for c in s if c.isdigit())


def _same_spelling(x: str, y: str) -> bool:
    if x.replace("-", "") == y.replace("-", ""):
        return True
    if _digits(x) != _digits(y):
        return False
    n = min(len(x), len(y))
    if n < 6:
        return False
    return edit_distance(x, y, 2) <= (1 if n < 9 else 2)


def list_residual(a: list[str], b: list[str]) -> tuple[set[str], set[str]]:
    """Items of each list with no counterpart on the other side, after naming noise."""
    ka = {k for k in (ingredient_key(x) for x in a) if k}
    kb = {k for k in (ingredient_key(x) for x in b) if k}
    ra, rb = ka - kb, kb - ka
    # typos / hyphenation
    for x in sorted(ra):
        y = next((y for y in sorted(rb) if _same_spelling(x, y)), None)
        if y:
            ra.discard(x)
            rb.discard(y)
    # one item glued across a comma on one side ("sodium-benzoate-citric-acid")
    for side, other, other_all in ((ra, rb, kb), (rb, ra, ka)):
        for x in sorted(side):
            parts = [p for p in other_all if len(p) >= 3 and p in x]
            if len(parts) >= 2 and sorted("-".join(sorted(parts, key=x.index)).split("-")) == sorted(x.split("-")):
                side.discard(x)
                for p in parts:
                    other.discard(p)
    # one item split across a comma ("cucumis-sativus", "extract")
    for side, other in ((ra, rb), (rb, ra)):
        for y in sorted(other):
            pieces = [p for p in side if p in y]
            if len(pieces) >= 2 and sorted("-".join(pieces).split("-")) == sorted(y.split("-")):
                other.discard(y)
                for p in pieces:
                    side.discard(p)
    # commas placed differently around the same words on both sides
    if ra and rb and sorted("-".join(ra).split("-")) == sorted("-".join(rb).split("-")):
        return set(), set()
    return ra, rb


def list_difference(a: Product, b: Product) -> tuple[set[str], set[str]]:
    """list_residual of the two full lists with the actives left out (a cosmetic INCI list names them)."""
    actives = {ingredient_key(x) for x in a.active_ids + b.active_ids}
    return list_residual([x for x in a.ingredients if ingredient_key(x) not in actives],
                         [x for x in b.ingredients if ingredient_key(x) not in actives])


# The five items the DailyMed structured list of the Stay Ageless Tinted
# Mineral SPF 30 formula leaves out (the label text lists them).
SPL_OMITTED_STAY_AGELESS = {"styrene-acrylates-copolymer", "polyhydroxystearic-acid", "perilla-frutescens-extract",
                            "vitis-vinifera-fruit-cell-extract", "ethylene-propylene-styrene-copolymer"}

# ---------------------------------------------------------------------------
# Names
# ---------------------------------------------------------------------------

PACK_WORDS = {"refill", "refillable", "travel", "trial"}
WHITE_LABEL = re.compile(r"\bstay\s*ageless", re.I)
DRUG_WORDS = {"tolnaftate", "tolnafate", "clotrimazole", "miconazole", "terbinafine", "hydrocortisone",
              "adapalene", "bacitracin", "lidocaine", "petrolatum", "zinc", "oxide", "nitrate", "hydrochloride"}
GENERIC_DRUG = DRUG_WORDS | FORM_WORDS | {"7", "1", "3"}


def neutral_words(a: Product, b: Product) -> set[str]:
    """Words that may differ between two names of one product, brand words aside (product_merge.brand_neutral):
    the active's name, a form word naming the dosage form both list, pack words."""
    out: set[str] = set()
    for p in (a, b):
        if p.is_fda:  # a cosmetic row's "actives" are INCI matches, not a drug name
            for act in p.active_ids:
                out |= set(act.split("-"))
    # a form word is neutral only when it names the one dosage form both list
    fams = {FORM_FAMILY.get(f.upper(), f.lower()) for f in (a.dosage_form or "", b.dosage_form or "") if f}
    if len(fams) == 1:
        fam = fams.pop()
        out |= {w for w in FORM_WORDS if w == fam}
    return out | PACK_WORDS


def _relation(a: Product, b: Product, ta: list[str], tb: list[str], neutral: set[str]
              ) -> tuple[str, set[str], set[str]]:
    ua, ub = name_diff(ta, tb)
    if not ua and not ub:
        return "same", ua, ub
    neutral = neutral | brand_neutral(a, b, ua - neutral, ub - neutral)
    if not (ua - neutral) and not (ub - neutral):
        return "neutral", ua, ub
    return "different", ua, ub


def name_relation(a: Product, b: Product) -> tuple[str, set[str], set[str]]:
    """('same'|'neutral'|'different', words only in a, words only in b), from the product names and,
    for two FDA labels, their SPL titles (the worse of the two)."""
    sa, sb = spf_values(a.brand_name), spf_values(b.brand_name)
    if sa and sb and sa != sb:
        return "different", {"spf"}, set()
    neutral = neutral_words(a, b)
    rel, ua, ub = _relation(a, b, name_tokens(a.brand_name), name_tokens(b.brand_name), neutral)
    if rel == "different":
        return rel, ua, ub
    ta, tb = title_tokens(a, set(), True), title_tokens(b, set(), True)
    if ta and tb:
        trel, tua, tub = _relation(a, b, ta, tb, neutral)
        if trel == "different":
            return "different", {"title:" + t for t in tua}, {"title:" + t for t in tub}
        if trel == "neutral" and rel == "same":
            return "neutral", {"title:" + t for t in tua}, {"title:" + t for t in tub}
    return rel, ua, ub


def white_label(a: Product, b: Product) -> bool:
    """Stay Ageless, or one product code filed under several labeler codes (81693-5550, 82549-5550: a white-label
    manufacturer's NDC product segment reused by each practice that relabels it)."""
    if WHITE_LABEL.search(a.brand_name) or WHITE_LABEL.search(b.brand_name):
        return True
    pa, pb = a.id.split("-"), b.id.split("-")
    return (a.is_fda and b.is_fda and len(pa) == 2 and len(pb) == 2 and pa[0] != pb[0] and pa[1] == pb[1]
            and not {t for t in brand_tokens(a.manufacturer) & brand_tokens(b.manufacturer) if len(t) >= 3})


def brand_only_name(p: Product) -> bool:
    """The name is one word, or nothing but the labeler's own name ("Cremo Company")."""
    toks = name_tokens(p.brand_name)
    if not toks or any(t in DRUG_WORDS for t in toks):
        return False
    return len(toks) == 1 or set(toks) <= brand_tokens(p.manufacturer) | {"company"}


def generic_name(p: Product) -> bool:
    """The name is nothing but drug / active-ingredient and form words ("Tolnaftate", "Avobenzone, Homosalate")."""
    toks = name_tokens(p.brand_name)
    vocab = GENERIC_DRUG | {w for a in p.active_ids for w in a.split("-")}
    return bool(toks) and all(t in vocab or fuzzy_partner(t, vocab) for t in toks) and any(
        t not in FORM_WORDS for t in toks)


# ---------------------------------------------------------------------------
# Decision
# ---------------------------------------------------------------------------


def actives_same(a: Product, b: Product) -> bool:
    if a.is_fda and b.is_fda and set(a.active_ids) != set(b.active_ids):
        return False
    return strengths_match(a.strengths, b.strengths) is not False


def single_ingredient(p: Product) -> bool:
    """A 100% single-active product (white petrolatum): no inactive ingredients exist to differ."""
    return len(p.strengths or {}) == 1 and abs(sum((p.strengths or {}).values()) - 100) < 0.01 and not [
        x for x in p.ingredients if ingredient_key(x)]


# Hard cases decided by reading the DailyMed SPL for the set id (see product_merge_review.md).
# (id_a, id_b) -> (decision, note)
MANUAL = {
    ("85966-010", "85966-012"): ("reformulated", "SPL 4eea5ee7 lists thyme, cinnamon, clove, oregano oils; 85966-012 "
                                                 "lists eucalyptus, manuka, lactic acid: different formulas"),
    ("67225-5211", "67225-5311"): ("merge", "SPL 3c295f6b and 43c48c66 list the same 43 inactives; Mini is a pack size"),
    ("67225-5015", "67225-5311"): ("reformulated", "5015 lists fragrance, linalool, benzyl salicylate, DHHB; SPL "
                                                   "43c48c66 (Mini) has none of them"),
    ("67225-5016", "67225-5311"): ("reformulated", "5016 lists fragrance, linalool, benzyl salicylate; SPL 43c48c66 "
                                                   "(Mini) has none of them"),
    ("67225-5016", "67225-5211"): ("reformulated", "5016 lists fragrance, linalool, benzyl salicylate; SPL 3c295f6b "
                                                   "has none of them"),
    ("67225-5015", "67225-5211"): ("reformulated", "5015 lists fragrance, linalool, benzyl salicylate, DHHB; SPL "
                                                   "3c295f6b has none of them"),
}


def shade_split_ids(prods: dict[str, Product]) -> set[str]:
    """Ids of FDA listings in a family (one labeler code, one name) whose label artwork names two or more shades
    ("Shade 29", "shade27"): a listing of such a family is one shade, so it only merges with the same shade."""
    fams: dict[tuple[str, tuple[str, ...]], list[Product]] = {}
    for p in prods.values():
        if p.is_fda and "-" in p.id:
            fams.setdefault((p.id.split("-")[0], tuple(sorted(set(name_tokens(p.brand_name))))), []).append(p)
    out: set[str] = set()
    for members in fams.values():
        if len({s for p in members for s in p.artwork_shades}) >= 2:
            out |= {p.id for p in members}
    return out


def decide(a: Product, b: Product, shade_split: set[str] | frozenset[str] = frozenset()) -> tuple[str, str, str]:
    """(decision, rule id, note). decision: merge | keep_separate | reformulated | needs_owner.
    shade_split: shade_split_ids() of the catalog."""
    key = (a.id, b.id) if a.id < b.id else (b.id, a.id)
    if key in MANUAL:
        d, note = MANUAL[key]
        return d, "R8-dailymed-checked", note
    if a.is_rx or b.is_rx or not actives_same(a, b):
        return "keep_separate", "R6-strength-or-active", "actives or strengths differ"
    why = title_conflict(a, b)
    if why:
        return "keep_separate", "R5-different-name", why
    if (a.id in shade_split or b.id in shade_split) and not (a.artwork_shades & b.artwork_shades):
        return "keep_separate", "R5-different-name", "SPL artwork: a family sold in shades, and this listing's shade is unknown"
    rel, ua, ub = name_relation(a, b)
    if rel != "different" and single_ingredient(a) and single_ingredient(b):
        return "merge", "R7a-single-ingredient", "100% single-ingredient product, same name"
    if not a.ingredients or not b.ingredients:
        if rel == "different":
            return "keep_separate", "R5-different-name", f"names differ ({_words(ua, ub)})"
        return "needs_owner", "R7-no-list", "no ingredient list on one side"
    ra, rb = list_difference(a, b)
    if rel == "different":
        same = "same list" if not ra and not rb else "lists differ too"
        return "keep_separate", "R5-different-name", f"names differ ({_words(ua, ub)}); {same}"
    if ra or rb:
        if rel == "same" and (
                (not ra and rb <= SPL_OMITTED_STAY_AGELESS) or (not rb and ra <= SPL_OMITTED_STAY_AGELESS)):
            return "merge", "R3-spl-coding-white-label", "DailyMed coded list omits " + _short(ra | rb)
        return "reformulated", "R4-same-name-list-differs", "list differs: " + _diff(ra, rb)
    if rel == "neutral":
        return "merge", "R2-neutral-name-words", f"name differs only by {_words(ua, ub)}; same list"
    if white_label(a, b):
        return "merge", "R1a-white-label", "white-label copy, same name and list"
    if brand_only_name(a) and brand_only_name(b):
        return "merge", "R1b-brand-only-fda-name", "brand-only FDA name, same title/actives/form/list"
    if generic_name(a) and generic_name(b):
        return "merge", "R1c-generic-name", "generic name, private-label copy with same list"
    return "merge", "R1-same-name-same-list", "same name and list"


def _words(ua: set[str], ub: set[str]) -> str:
    return "/".join(x for x in (",".join(sorted(ua)), ",".join(sorted(ub))) if x) or "-"


def _short(s: set[str], n: int = 4) -> str:
    items = sorted(s)
    return ", ".join(items[:n]) + (f" +{len(items) - n}" if len(items) > n else "")


def _diff(ra: set[str], rb: set[str]) -> str:
    parts = []
    if ra:
        parts.append("A only " + _short(ra))
    if rb:
        parts.append("B only " + _short(rb))
    return "; ".join(parts)
