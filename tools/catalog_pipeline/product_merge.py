"""Pure logic for the product de-duplication pass (build_product_merges.py).

Kept free of I/O so tests/test_product_merges.py can exercise every rule:
name normalization, the blocking exclusions (strength, SPF, percent, variant
and shade words, form conflicts), ingredient-list comparison, tiering,
union-find grouping and the canonical choice.

Precision first: a wrong merge hides a product and can show a shopper the
wrong ingredient list (allergens), while a missed merge only leaves a
duplicate row in a listing. Every rule below errs toward "not the same".
"""
from __future__ import annotations

import html
import re
import unicodedata
from functools import lru_cache
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------------

FDA_SOURCES = {"openfda", "dailymed"}
# Higher = preferred as canonical, after the data-richness criteria.
SOURCE_RANK = {"openfda": 3, "dailymed": 2, "brand_direct": 1, "open_beauty_facts": 0}


@dataclass
class Product:
    id: str
    source: str
    brand_name: str
    manufacturer: str
    dosage_form: str
    active_ids: list[str]
    strengths: dict[str, float] | None
    is_rx: bool = False
    spl_set_id: str = ""
    strength_key: str = ""
    # Full ingredient list (slugs, label order). For FDA rows this is the
    # inactive list; for cosmetic rows the whole INCI list. Empty = unknown.
    ingredients: list[str] = field(default_factory=list)
    ingredient_names: list[str] = field(default_factory=list)
    allergen_hits: list[str] | None = None
    free_from: list[str] | None = None
    has_label_sections: bool = False
    real_photo: bool = False  # retail photo (OBF / brand site)
    label_photo: bool = False  # DailyMed package artwork available
    image_url: str = ""
    active_text: str = ""
    barcodes: list[str] = field(default_factory=list)

    @property
    def is_fda(self) -> bool:
        return self.source in FDA_SOURCES

    @property
    def has_list(self) -> bool:
        return bool(self.ingredients) and self.free_from is not None


# ---------------------------------------------------------------------------
# Name normalization
# ---------------------------------------------------------------------------

SYNONYMS = {
    "facial": "face", "wash": "cleanser", "cleansing": "cleanser", "moisturiser": "moisturizer",
    "moisturising": "moisturizer", "moisturizing": "moisturizer", "moisturise": "moisturizer",
    "moisturize": "moisturizer", "colour": "color", "hydratant": "moisturizer",
    "sunblock": "sunscreen", "suncreen": "sunscreen", "sunscreens": "sunscreen",
    "lotions": "lotion", "creme": "cream", "crème": "cream", "gels": "gel", "sprays": "spray",
    "&": "and", "w": "with", "oz": "oz", "anti": "anti", "spf": "spf",
    "deodorants": "deodorant", "antiperspirants": "antiperspirant", "fluide": "fluid",
}
# Words that carry no identity: dropped before names are compared. "travel",
# "mini" etc. are pack sizes, which the brief says merge ("any pack size").
FILLER = {
    "broad", "spectrum", "sunscreen", "sun", "screen", "with", "for", "the", "and", "of", "a", "an", "by",
    "in", "on", "to", "new", "improved", "formula", "uva", "uvb", "protection", "protect", "water", "resistant",
    "minutes", "minute", "min", "travel", "size", "mini", "jumbo", "value", "pack", "count", "ct", "pk",
    "refill", "each", "bonus", "twin", "duo", "family", "trial", "sample", "tube", "bottle", "pump", "jar",
    "fl", "oz", "ml", "g", "gr", "mg", "l", "lb", "lbs", "kg", "x", "pc", "pcs", "piece", "pieces", "spf",
    "sunscreens", "lotion_", "otc", "drug", "facts", "usp", "inc", "llc", "co", "ltd", "corp",
    "de", "la", "le", "les", "du", "et", "pour", "avec", "en",
}
# A token on one side only from this set means a different retail product
# (shade, flavor/scent, audience, finish, tint, skin type, strength claim).
VARIANT_WORDS = {
    # tint / audience
    "tinted", "untinted", "tint", "kids", "kid", "baby", "babies", "children", "childrens", "child", "toddler",
    "junior", "teen", "men", "mens", "man", "male", "women", "womens", "woman", "female", "ladies",
    # scent
    "fragrance", "fragrancefree", "unscented", "scented", "unperfumed", "perfume", "perfumed", "parfum", "scent",
    "fresh", "original", "classic", "powder", "cherry", "strawberry", "raspberry", "vanilla", "mint",
    "peppermint", "spearmint", "coconut", "berry", "lemon", "lime", "orange", "grape", "watermelon", "mango",
    "peach", "citrus", "lavender", "rose", "cucumber", "honey", "cocoa", "chocolate", "pomegranate", "apple",
    "tropical", "pineapple", "banana", "melon", "eucalyptus", "tea", "sandalwood", "musk", "cotton", "breeze",
    "ocean", "spring", "rain", "flower", "floral", "unflavored", "flavored", "sweet",
    # skin type / use
    "sport", "sports", "sensitive", "mineral", "clear", "dry", "oily", "combination", "normal", "night", "day",
    "pm", "am", "extra", "maximum", "max", "strength", "plus", "lite", "matte", "dewy", "shimmer",
    # shades / colors
    "shade", "color", "fair", "light", "medium", "deep", "dark", "tan", "ivory", "beige", "porcelain", "sand",
    "caramel", "mocha", "espresso", "almond", "nude", "warm", "cool", "neutral", "golden", "gold", "bronze",
    "rich", "buff", "natural", "pink", "red", "coral", "peach", "berry", "plum", "brown", "black", "white",
    "clear", "translucent", "olive", "chestnut", "sable", "cocoa", "toffee", "suede", "linen", "porcelaine",
    "fairly", "petal", "cashew", "vanille", "sienna", "amber", "ebony", "mahogany", "walnut", "pecan",
}
# Body areas only conflict when both names name one ("face" vs "body"); a
# name that just omits "facial" is the same product more often than not.
AREA_WORDS = {"face", "body", "lip", "lips", "hand", "hands", "foot", "feet", "scalp", "eye", "eyes", "hair", "baby"}
FORM_WORDS = {
    "lotion", "cream", "gel", "spray", "stick", "oil", "foam", "mist", "balm", "ointment", "serum", "wipes",
    "wipe", "towelettes", "towelette", "mousse", "fluid", "milk", "powder", "shampoo", "conditioner", "soap",
    "bar", "pads", "pad", "patch", "patches", "solution", "liquid", "toner", "essence", "mask", "scrub",
    "roll", "aerosol", "emulsion", "paste", "jelly", "salve",
}

_UNIT = r"(?:fl\.?\s*oz|oz|ml|mL|g|gr|mg|kg|l|lb|lbs|ct|count|pk|pack|pcs?|pieces?|sheets?|wipes?|pads?)"
PACK_RE = re.compile(rf"\b\d+(?:[.,]\d+)?\s*{_UNIT}\b\.?", re.I)
MULTIPACK_RE = re.compile(r"\b\d+\s*[x×]\s*\d*|\b(?:pack|set|box)\s+of\s+\d+\b", re.I)
SPF_RE = re.compile(r"\bspf\s*-?\s*(\d{1,3})\+?", re.I)
PCT_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*%")
WR_RE = re.compile(r"\bwater\s+resistant\s*(?:\(\s*)?\d+\s*min(?:ute)?s?\)?", re.I)


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def spf_values(name: str) -> set[int]:
    return {int(m) for m in SPF_RE.findall(name)}


def pct_values(name: str) -> set[float]:
    return {float(m.replace(",", ".")) for m in PCT_RE.findall(name)}


def _stem(t: str) -> str:
    t = SYNONYMS.get(t, t)
    if len(t) > 4 and t.endswith("es") and t[:-2] in FORM_WORDS:
        return t[:-2]
    if len(t) > 3 and t.endswith("s") and not t.endswith("ss"):
        t = t[:-1]
    return SYNONYMS.get(t, t)


def name_tokens(name: str) -> list[str]:
    """Lowercased identity tokens: pack sizes, SPF, percents and filler removed."""
    return list(_name_tokens(name or ""))


@lru_cache(maxsize=None)
def _name_tokens(name: str) -> tuple[str, ...]:
    s = strip_accents(html.unescape(name or ""))
    s = WR_RE.sub(" ", s)
    s = s.replace("fragrance-free", "fragrancefree").replace("Fragrance-Free", "fragrancefree")
    s = re.sub(r"fragrance\s+free", "fragrancefree", s, flags=re.I)
    s = SPF_RE.sub(" ", s)
    s = PCT_RE.sub(" ", s)
    s = MULTIPACK_RE.sub(" ", s)
    s = PACK_RE.sub(" ", s)
    s = s.lower().replace("&", " and ").replace("'", "").replace("’", "")
    # split letter/digit boundaries: "spf50" -> "spf 50", "15fair" -> "15 fair"
    s = re.sub(r"(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])", " ", s)
    toks = re.findall(r"[a-z0-9]+", s)
    out = []
    for t in toks:
        t = _stem(t)
        if t in FILLER or len(t) == 0:
            continue
        out.append(t)
    return tuple(out)


def brand_tokens(*names: str) -> set[str]:
    out: set[str] = set()
    for n in names:
        if n:
            out |= _brand_tokens(n)
    return out


@lru_cache(maxsize=None)
def _brand_tokens(n: str) -> frozenset[str]:
    out: set[str] = set()
    for t in re.findall(r"[a-z0-9]+", strip_accents(n).lower().replace("'", "")):
        if t not in {"inc", "llc", "co", "ltd", "corp", "corporation", "company", "the", "and", "of", "brands",
                     "consumer", "products", "laboratories", "labs", "lab", "usa", "us", "international",
                     "cosmetics", "beauty", "skin", "care", "skincare", "group", "holdings", "dba", "d", "b",
                     "a", "llp", "gmbh", "sa", "ag", "srl", "plc", "health", "healthcare", "pharma",
                     "pharmaceuticals", "pharmaceutical", "manufacturing", "global", "america", "north"}:
            out.add(t)
    return frozenset(out)


def core_tokens(p: Product, brand: set[str] | None = None) -> list[str]:
    toks = name_tokens(p.brand_name)
    b = brand if brand is not None else brand_tokens(p.manufacturer)
    return [t for t in toks if t not in b]


def trigrams(s: str) -> set[str]:
    s = f"  {s} "
    return {s[i:i + 3] for i in range(len(s) - 2)}


def jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    return len(a & b) / len(a | b)


def edit_distance(a: str, b: str, cap: int = 3) -> int:
    if abs(len(a) - len(b)) > cap:
        return cap + 1
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb))
        prev = cur
    return prev[-1]


def fuzzy_partner(t: str, others: set[str]) -> bool:
    """A typo or glued/split spelling of a token on the other side."""
    if len(t) < 4 or any(c.isdigit() for c in t):
        return False  # shade and model numbers never count as typos
    for o in others:
        if len(o) >= 4 and not any(c.isdigit() for c in o) and edit_distance(t, o, 2) <= (1 if len(t) < 7 else 2):
            return True
    return False


def name_diff(a_toks: list[str], b_toks: list[str]) -> tuple[set[str], set[str]]:
    """Tokens on one side only, after cancelling typos and glued words."""
    a, b = set(a_toks), set(b_toks)
    only_a, only_b = a - b, b - a
    # glued words: "hydroboost" vs "hydro boost"
    joined_a, joined_b = "".join(a_toks), "".join(b_toks)
    ua = {t for t in only_a if not fuzzy_partner(t, only_b) and not (len(t) >= 6 and t in joined_b)}
    ub = {t for t in only_b if not fuzzy_partner(t, only_a) and not (len(t) >= 6 and t in joined_a)}
    # pieces of a glued word on the other side
    ua = {t for t in ua if not any(len(o) >= 6 and t in o and len(t) >= 3 for o in ub | only_b)}
    ub = {t for t in ub if not any(len(o) >= 6 and t in o and len(t) >= 3 for o in ua | only_a)}
    return ua, ub


# ---------------------------------------------------------------------------
# Blocking exclusions
# ---------------------------------------------------------------------------

FORM_FAMILY = {
    "CREAM": "cream", "CREAM, AUGMENTED": "cream",
    "LOTION": "lotion", "LOTION, AUGMENTED": "lotion", "EMULSION": "lotion", "LIQUID": "liquid",
    "SOLUTION": "liquid", "SOLUTION/ DROPS": "liquid", "SUSPENSION": "liquid", "OIL": "liquid",
    "SPRAY": "spray", "AEROSOL, SPRAY": "spray", "AEROSOL": "spray", "SPRAY, METERED": "spray",
    "AEROSOL, FOAM": "foam", "STICK": "stick", "LIPSTICK": "stick", "GEL": "gel", "JELLY": "gel",
    "OINTMENT": "ointment", "SALVE": "ointment", "POWDER": "powder", "AEROSOL, POWDER": "powder",
    "SOAP": "soap", "SHAMPOO": "shampoo", "LOTION/SHAMPOO": "shampoo", "SHAMPOO, SUSPENSION": "shampoo",
    "PASTE": "paste", "PATCH": "patch", "CLOTH": "cloth", "SWAB": "cloth", "KIT": "kit",
}
# Families that a label may file the same product under interchangeably.
COMPATIBLE_FAMILIES = [{"lotion", "liquid"}, {"cream", "lotion"}, {"gel", "liquid"}]


def forms_compatible(a: str, b: str) -> bool:
    if not a or not b:
        return True
    fa, fb = FORM_FAMILY.get(a.upper(), a.lower()), FORM_FAMILY.get(b.upper(), b.lower())
    if fa == fb:
        return True
    if "kit" in (fa, fb):
        return False
    return any(fa in s and fb in s for s in COMPATIBLE_FAMILIES)


def strengths_match(a: dict[str, float] | None, b: dict[str, float] | None) -> bool | None:
    """True/False when both labels state strengths, None when either doesn't."""
    if not a or not b:
        return None
    if set(a) != set(b):
        return False
    for k, v in a.items():
        w = b[k]
        # parsed from label text into percent; two listings of one product
        # state the same figure, so any real difference is a different product
        if abs(v - w) > 0.005:
            return False
    return True


def actives_compatible(a: Product, b: Product) -> bool:
    if a.is_fda and b.is_fda:
        return set(a.active_ids) == set(b.active_ids)
    if a.is_fda != b.is_fda:
        fda, cos = (a, b) if a.is_fda else (b, a)
        # cosmetic sources match actives off the INCI list, so every drug
        # active must at least appear in the cosmetic product's ingredients
        have = set(cos.active_ids) | set(cos.ingredients) | {norm_ingredient(s) for s in cos.ingredients}
        return all(x in have or norm_ingredient(x) in have for x in fda.active_ids)
    return True  # two cosmetic rows: their "actives" are INCI matches, compared via the list


# Words that open a name without naming a brand ("Clotrimazole Cream",
# "Sunscreen Lotion"): never accepted as brand evidence.
GENERIC_FIRST = {
    "zinc", "titanium", "oxide", "dioxide", "salicylic", "acid", "benzoyl", "peroxide", "adapalene", "sulfur",
    "clotrimazole", "miconazole", "tolnaftate", "terbinafine", "butenafine", "undecylenic", "ketoconazole",
    "pyrithione", "selenium", "coal", "tar", "hydrocortisone", "pramoxine", "diphenhydramine", "calamine",
    "camphor", "menthol", "petrolatum", "dimethicone", "allantoin", "glycerin", "lanolin", "aluminum",
    "avobenzone", "octinoxate", "octisalate", "octocrylene", "homosalate", "oxybenzone", "ensulizole",
    "daily", "ultra", "sheer", "tinted", "mineral", "lip", "clear", "anti", "antifungal", "antiperspirant",
    "deodorant", "athletes", "athlete", "jock", "itch", "diaper", "rash", "first", "aid", "baby", "kids",
    "moisturizer", "moisturizing", "hydrating", "face", "body", "hand", "foot", "acne", "spot", "treatment",
    "cream", "lotion", "gel", "spray", "stick", "balm", "ointment", "cleanser", "skin", "care", "natural",
    "organic", "pure", "advanced", "maximum", "extra", "original", "classic", "medicated", "dandruff",
    "eczema", "healing", "protectant", "protective", "invisible", "sport", "beach", "everyday", "premium",
}


def brand_evidence(a: Product, b: Product) -> bool:
    """Do two records name the same brand? Store-brand generics ("Clotrimazole"
    from two labelers) are different retail products even with one formula."""
    ma, mb = brand_tokens(a.manufacturer), brand_tokens(b.manufacturer)
    if ma & mb:
        return True
    na = set(re.findall(r"[a-z0-9]+", strip_accents(a.brand_name).lower().replace("'", "")))
    nb = set(re.findall(r"[a-z0-9]+", strip_accents(b.brand_name).lower().replace("'", "")))
    if {t for t in ma if len(t) >= 3} & nb or {t for t in mb if len(t) >= 3} & na:
        return True
    fa, fb = name_tokens(a.brand_name)[:1], name_tokens(b.brand_name)[:1]
    return bool(fa) and fa == fb and len(fa[0]) >= 4 and fa[0] not in GENERIC_FIRST \
        and fa[0] not in VARIANT_WORDS and fa[0] not in FORM_WORDS


def exclusion_reason(a: Product, b: Product) -> str | None:
    """Why two records cannot be the same retail product, or None."""
    if a.is_rx or b.is_rx:
        return "rx"
    sm = strengths_match(a.strengths, b.strengths)
    if sm is False:
        return "strength differs"
    if not actives_compatible(a, b):
        return "actives differ"
    sa, sb = spf_values(a.brand_name), spf_values(b.brand_name)
    if sa and sb and sa != sb:
        return "SPF differs"
    pa, pb = pct_values(a.brand_name), pct_values(b.brand_name)
    if pa and pb and pa != pb:
        return "percent differs"
    if not forms_compatible(a.dosage_form, b.dosage_form):
        return "dosage form differs"
    if not brand_evidence(a, b):
        return "different brand"
    brand = brand_tokens(a.manufacturer) | brand_tokens(b.manufacturer)
    ta, tb = core_tokens(a, brand), core_tokens(b, brand)
    ua, ub = name_diff(ta, tb)
    var = (ua | ub) & VARIANT_WORDS
    if var:
        return "variant words: " + ",".join(sorted(var))
    fa, fb = set(ta) & FORM_WORDS, set(tb) & FORM_WORDS
    if fa and fb and not (fa & fb):
        return "form words differ"
    aa, ab = {_stem(t) for t in ta} & AREA_WORDS, {_stem(t) for t in tb} & AREA_WORDS
    if aa and ab and not (aa & ab):
        return "body area differs"
    nums = {t for t in ua | ub if any(c.isdigit() for c in t)}
    if nums:
        return "shade/model numbers differ: " + ",".join(sorted(nums))
    return None


# ---------------------------------------------------------------------------
# Ingredient lists
# ---------------------------------------------------------------------------

_ING_DROP = {"purified", "usp", "nf", "deionized", "demineralized", "fcc", "ep", "bp"}
_ING_MAP = {
    "aqua": "water", "eau": "water", "aqua-water": "water", "water-aqua": "water", "aqua-water-eau": "water",
    "water-aqua-eau": "water", "parfum": "fragrance", "fragrance-parfum": "fragrance", "perfume": "fragrance",
    "parfum-fragrance": "fragrance", "tocopheryl-acetate": "tocopheryl-acetate", "vitamin-e": "tocopherol",
    "ci-77891": "titanium-dioxide", "ci-77947": "zinc-oxide",
}


def norm_ingredient(slug: str) -> str:
    s = _ING_MAP.get(slug, slug)
    parts = [p for p in s.split("-") if p not in _ING_DROP]
    s = "-".join(parts) or s
    return _ING_MAP.get(s, s)


def ingredient_similarity(a: Product, b: Product) -> float | None:
    """Jaccard of the two full lists (actives removed), or None if either is unknown."""
    if not a.has_list or not b.has_list:
        return None
    actives = {norm_ingredient(x) for x in a.active_ids + b.active_ids if a.is_fda or b.is_fda}
    sa = {norm_ingredient(x) for x in a.ingredients} - actives
    sb = {norm_ingredient(x) for x in b.ingredients} - actives
    if not sa or not sb:
        return None
    # typo-tolerant: count near-identical slugs as shared
    shared = len(sa & sb)
    rest_b = sb - sa
    for x in sa - sb:
        if len(x) >= 6 and any(edit_distance(x, y, 2) <= 2 for y in rest_b if abs(len(y) - len(x)) <= 2):
            shared += 1
    union = len(sa) + len(sb) - shared
    return shared / union if union else 1.0


def formula_check(a: Product, b: Product) -> tuple[str, str]:
    """('ok'|'conflict'|'unknown', note) -- allergen correctness before tidiness."""
    sim = ingredient_similarity(a, b)
    if sim is None:
        return "unknown", "an ingredient list is missing on one side"
    notes = [f"ingredient overlap {sim:.2f}"]
    if a.allergen_hits is not None and b.allergen_hits is not None and set(a.allergen_hits) != set(b.allergen_hits):
        d = sorted(set(a.allergen_hits) ^ set(b.allergen_hits))
        return "conflict", "; ".join(notes + ["allergen hits differ: " + ",".join(d)])
    if a.free_from is not None and b.free_from is not None and set(a.free_from) != set(b.free_from):
        d = sorted(set(a.free_from) ^ set(b.free_from))
        if sim < 0.85:
            return "conflict", "; ".join(notes + ["free-from flags differ: " + ",".join(d)])
        notes.append("free-from flags differ: " + ",".join(d))
        return "minor", "; ".join(notes)
    if sim < 0.5:
        return "conflict", "; ".join(notes)
    if sim < 0.75:
        return "minor", "; ".join(notes)
    return "ok", "; ".join(notes)


# ---------------------------------------------------------------------------
# Tiering
# ---------------------------------------------------------------------------

AUTO_P = 0.90
FLAG_P = 0.50


BARCODE_P = 0.75


def names_match(a: Product, b: Product) -> bool:
    """Same name once brand words, pack sizes, filler and typos are set aside."""
    brand = brand_tokens(a.manufacturer) | brand_tokens(b.manufacturer)
    ua, ub = name_diff(core_tokens(a, brand), core_tokens(b, brand))
    return not ua and not ub and spf_values(a.brand_name) == spf_values(b.brand_name)


def tier_for(method: str, p_ab: float | None, p_ba: float | None, formula: str, reliable_barcode: bool,
             names_match: bool = False) -> str:
    """auto | flagged | different | different_reformulated.

    A shared reliable barcode stands in for part of Jev's confidence: auto at
    >= 0.75 in both runs, or >= 0.50 when the two names also match exactly
    (after pack sizes and filler words are removed)."""
    if formula == "conflict":
        return "different_reformulated"
    if method == "exact":
        return "auto" if formula in ("ok", "unknown") else "flagged"
    if p_ab is None or p_ba is None:
        return "flagged"
    lo, hi = min(p_ab, p_ba), max(p_ab, p_ba)
    if reliable_barcode and formula != "minor" and (lo >= BARCODE_P or (names_match and lo >= FLAG_P and hi - lo <= 0.2)):
        return "auto"
    if hi < FLAG_P:
        return "different"
    if hi - lo > 0.2:
        return "flagged"
    if lo >= AUTO_P and formula == "ok":
        return "auto"
    if lo >= AUTO_P and formula == "unknown" and reliable_barcode:
        return "auto"
    if lo < FLAG_P:
        return "different"
    return "flagged"


# ---------------------------------------------------------------------------
# Grouping and canonical choice
# ---------------------------------------------------------------------------

class UnionFind:
    def __init__(self) -> None:
        self.parent: dict[str, str] = {}

    def find(self, x: str) -> str:
        self.parent.setdefault(x, x)
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a: str, b: str) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            # deterministic: smaller id becomes the root
            if rb < ra:
                ra, rb = rb, ra
            self.parent[rb] = ra

    def groups(self) -> list[list[str]]:
        out: dict[str, list[str]] = {}
        for x in list(self.parent):
            out.setdefault(self.find(x), []).append(x)
        return [sorted(g) for g in out.values() if len(g) > 1]


def canonical_key(p: Product) -> tuple:
    """Sort key, best first. The documented canonical rule:

    1. has a full ingredient list (allergen/free-from checks work)
    2. has FDA Drug Facts label sections (directions, warnings)
    3. has a retail photo (Open Beauty Facts / brand site) over label artwork
    4. has DailyMed package artwork
    5. source: openfda > dailymed > brand_direct > open_beauty_facts
    6. longer ingredient list
    7. smallest id (ties are broken deterministically)
    """
    return (
        0 if p.has_list else 1,
        0 if p.has_label_sections else 1,
        0 if p.real_photo else 1,
        0 if p.label_photo else 1,
        -SOURCE_RANK.get(p.source, -1),
        -len(p.ingredients),
        p.id,
    )


def choose_canonical(group: list[Product]) -> Product:
    return sorted(group, key=canonical_key)[0]


def group_conflicts(group: list[Product]) -> list[tuple[str, str, str]]:
    """Pairs inside a union-find group that conflict (a chain A~B~C where A!~C)."""
    out = []
    for i, a in enumerate(group):
        for b in group[i + 1:]:
            if exclusion_reason(a, b) and exclusion_reason(a, b) not in ("dosage form differs",):
                out.append((a.id, b.id, exclusion_reason(a, b) or ""))
                continue
            f, note = formula_check(a, b)
            if f == "conflict":
                out.append((a.id, b.id, note))
    return out
