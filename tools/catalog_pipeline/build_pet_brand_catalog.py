#!/usr/bin/env python3
"""
Pet skin, ear, grooming and flea/tick products scraped directly from brand
websites that publish ingredient lists -- the products DailyMed's animal
drug labels (build_pet_catalog.py) and EPA's PPLS (build_pet_epa_catalog.py)
don't cover: grooming shampoos, ear cleaners, wipes, balms, OTC
"medicated" topicals (chlorhexidine/miconazole/hydrocortisone...) and
retail flea/tick products. Standard library (+ optional Pillow for image
resizing, see requirements.txt).

    python3 build_pet_brand_catalog.py            # every brand
    python3 build_pet_brand_catalog.py zymox      # one brand (CSV holds only it)

Output: output/pet_brand_catalog.csv, one row per product, and photos in
app/public/product-images/pet-brand/<id>.<ext> (max 1000px, as
build_brand_direct_catalog.py). Raw responses are cached in
cache/pet_brand/<host>/ (gitignored), so a re-run only fetches what's new.

Rules the crawl follows:
  * brand sites only -- never retailers whose terms forbid scraping (Chewy,
    Petco, PetSmart, Amazon, Walmart, Target);
  * robots.txt is fetched for every host (pages and image CDNs) and every
    URL is checked against its `User-agent: *` rules (Google semantics:
    longest match wins, `*` and `$` wildcards) before it is requested;
    Crawl-delay is honoured; >= 1 s between requests to one host;
    User-Agent "Actively catalog pipeline (hello@activelyskin.com)";
  * a product is kept only when its own page prints an ingredient list or
    actives with strengths; nothing is inferred -- an empty field means the
    page didn't say. Text is stored as printed (typos included), minus
    dot leaders, purpose words and page furniture.
  * no bot protection is fought: a 403, JS-only site or challenge page is
    recorded below and skipped.

Columns: id, brand, product_name, species (dog/cat, or "pet" when the page
names neither; the title wins over body text), concern_ids
(pet_parse.pet_concerns over title + actives + the first 300 characters of
the description; flea/tick and ear concerns only when the title or actives
support them), claim_type, epa_reg_no, active_ingredient_text,
ingredient_text, not_for_cats, source_url, image_url.

claim_type: "pesticide" when the page prints an EPA Reg. No., or lists
EPA-registered flea/tick actives (fipronil, pyrethrins, etofenprox,
tetrachlorvinphos, deltamethrin...) with strengths -- the brand pages for
Adams/PetArmor/Davis don't print the Reg. No.; "drug" when an "Active
Ingredient(s)" section lists a drug-type active (chlorhexidine,
miconazole, ketoconazole, hydrocortisone, pramoxine, lidocaine,
hypochlorous acid, salicylic acid...); otherwise "grooming". 25(b)
minimum-risk botanical flea products (clove, peppermint, cedarwood oil --
Vet's Best, TropiClean Natural, Skout's Honor) print "active ingredients"
but are exempt from EPA registration, so they stay "grooming".
DOUXO S3, Davis and ZYMOX state actives as "Contains 3% chlorhexidine..."
in the description rather than a label section: that text is kept as
active_ingredient_text, but it doesn't make the product a "drug".

robots.txt and outcome per brand (checked 2026-10-11; "N Disallow" = rules
for `*`; none of them disallows /products.json, /products/<handle>, the
sitemaps or the product paths used here):

  brand (host)                          robots.txt              discovery          kept  skipped (why)
  DOUXO (us.douxo.com)                  200, 10 Disallow        Shopify            18    13 bundles/chews out of scope, 1 no list, 1 dup
  Vet's Best (vetsbest.com)             200, 40 Disallow        Shopify            23    30 out of scope, 9 size/scent dups, 1 no list
  TropiClean (tropiclean.com)           200, 40 Disallow        Shopify            84    76 dental/kits/bundles, 26 size dups, 3 no list
  earthbath (earthbath.com)             200, 40 Disallow        Shopify            33    37 out of scope, 16 groomer-size dups, 12 merch
  Vetericyn (vetericyn.com)             200, 46 Disallow        Shopify             8    26 out of scope (equine/poultry/kits), 4 dups, 3 no list
  Skout's Honor (skoutshonor.com)       200, 40 Disallow        Shopify            13    46 cleaning/bundles, 2 dups, 2 no list
  Warren London (warrenlondon.com)      200, 40 Disallow        Shopify            26    88 leashes/collars/boxes, 15 no list
  Natural Dog Co. (naturaldog.com)      200, 50 Disallow        Shopify            15    42 out of scope, 11 no list ("star ingredients" only)
  Pet Head (pethead.com)                200, 40 Disallow        Shopify            11    4 professional 5 L sizes
  PetArmor (petarmor.com)               200, 40 Disallow        Shopify             1    13 pages name actives without strengths
  Curaseb (curaseb.com)                 200, 40 Disallow        Shopify             0    10 no ingredient list on any page
  Earth Rated (earthrated.com)          200, 40 Disallow        Shopify             4    5 shampoos with no list, bags/pads out of scope
  Squishface (squishface.com)           200, 40 Disallow        Shopify             1    2 no list
  Vetnique Labs (vetnique.com)          200, 40 Disallow        Shopify            20    20 out of scope (supplements)
  Petpost (petpost.com)                 200, 40 Disallow        Shopify             7    ferret/chinchilla out of scope, 2 dups
  Nootie (nootie.com)                   200, 40 Disallow        Shopify            20    25 out of scope, 9 scent dups
  Mighty Paw (mightypaw.com)            200, 40 Disallow        Shopify             1    collars/chews out of scope
  Pro Pet Works (propetworks.com)       200, 40 Disallow        Shopify             0    2 no list
  ZYMOX (zymox.com)                     200, 9 Disallow         sitemap (.xml.gz)  15    equine/avian/merch excluded, 9 size dups, 4 no list
  Davis (davismfg.com)                  200, 4 Disallow         sitemap             6    100 grooming shampoos print no list (medicated only)
  Dechra (dechra-us.com)                200, 2 Disallow         sitemap            13    4 no list; Rx products not crawled
  Adams (adamspetcare.com)              200, 1 Disallow         sitemap            14    home/yard sprays excluded, 3 no list
  Vetoquinol (vetoquinolusa.com)        200, 34 Disallow        sitemap             0    12 pages print no ingredient list

Checked and not scraped (see SKIPPED_BRANDS): Frontline (robots 200, but an
Incapsula bot wall), K9 Advantix II / Advantage / Seresto (Elanco's
yourpetandyou.elanco.com: no strengths or lists), Burt's Bees for Pets
(Wix, no product pages in the sitemap), Hartz (sitemap has articles only),
Virbac (no lists on product pages), Sentry (store retired; Crawl-delay
10), Wondercide (403), Honest Paws (empty /products.json), Bodhi Dog
(Crawl-delay 60), Synergy Labs (no product pages), Kin+Kind / Isle of
Dogs / John Paul Pet (/products.json not served).
"""
from __future__ import annotations

import csv
import gzip
import hashlib
import html as html_module
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

try:
    from PIL import Image
except ImportError:
    Image = None  # resizing becomes a no-op; see requirements.txt

from pet_parse import PET_CONCERN_IDS, PET_CONCERN_RULES, parse_species, pet_concerns, species_mentions

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_CSV = os.path.join(HERE, "output", "pet_brand_catalog.csv")
CACHE = os.path.join(HERE, "cache", "pet_brand")
IMAGE_DIR = os.path.join(HERE, "..", "..", "app", "public", "product-images", "pet-brand")
IMAGE_URL_PREFIX = "/product-images/pet-brand"
WEBP_MAX = 800
USER_AGENT = "Actively catalog pipeline (hello@activelyskin.com)"
MIN_INTERVAL = 1.0  # seconds between requests to one host (raised per brand by robots Crawl-delay)
MAX_INGREDIENT_TEXT_LEN = 3000
MAX_IMAGE_BYTES = 5_000_000

# ---------------------------------------------------------------- polite HTTP

_last_hit: dict[str, float] = {}
_host_interval: dict[str, float] = {}


def _wait(host: str) -> None:
    gap = max(MIN_INTERVAL, _host_interval.get(host, 0.0))
    last = _last_hit.get(host)
    if last is not None:
        delta = time.monotonic() - last
        if delta < gap:
            time.sleep(gap - delta)
    _last_hit[host] = time.monotonic()


def _cache_path(url: str, binary: bool = False) -> str:
    host = urllib.parse.urlsplit(url).netloc
    h = hashlib.sha1(url.encode()).hexdigest()[:20]
    return os.path.join(CACHE, host, h + (".bin" if binary else ".json"))


def iri_to_uri(url: str) -> str:
    """Percent-encode non-ASCII characters (Shopify handles like "douxo®-...")."""
    return urllib.parse.quote(url, safe=":/?&=%#+,;@!$'()*~")


def fetch(url: str, *, check_robots: bool = True) -> tuple[int, str]:
    """(status, body) for url, from cache when present. status -2 = blocked
    by robots.txt (never fetched), -1 = network error."""
    url = iri_to_uri(url)
    if check_robots and not robots_allows(url):
        return -2, ""
    path = _cache_path(url)
    if os.path.exists(path):
        with open(path) as f:
            d = json.load(f)
        return d["status"], d["body"]
    host = urllib.parse.urlsplit(url).netloc
    status, body = -1, ""
    for attempt in range(3):
        _wait(host)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "en-US"})
            with urllib.request.urlopen(req, timeout=25) as resp:
                raw = resp.read()
                status = resp.status
            if raw[:2] == b"\x1f\x8b":  # gzipped sitemap
                raw = gzip.decompress(raw)
            body = raw.decode("utf-8", errors="replace")
            break
        except urllib.error.HTTPError as exc:
            status, body = exc.code, ""
            if exc.code == 429:
                time.sleep(20 * (attempt + 1))
                continue
            if exc.code >= 500 and attempt < 2:
                time.sleep(3 * (attempt + 1))
                continue
            break
        except Exception:
            status, body = -1, ""
            time.sleep(3 * (attempt + 1))
    if status != -1:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump({"url": url, "status": status, "body": body}, f)
    return status, body


def fetch_bytes(url: str) -> bytes | None:
    url = iri_to_uri(url)
    if not robots_allows(url):
        return None
    path = _cache_path(url, binary=True)
    if os.path.exists(path):
        with open(path, "rb") as f:
            return f.read()
    host = urllib.parse.urlsplit(url).netloc
    for attempt in range(2):
        _wait(host)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = resp.read(MAX_IMAGE_BYTES + 1)
            if len(data) > MAX_IMAGE_BYTES:
                return None
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb") as f:
                f.write(data)
            return data
        except Exception:
            time.sleep(2)
    return None


# ---------------------------------------------------------------- robots.txt

_robots: dict[str, list[tuple[str, str]]] = {}
ROBOTS_LOG: dict[str, str] = {}


def _robots_rules(origin: str) -> list[tuple[str, str]]:
    """(allow|disallow, pattern) rules from every `User-agent: *` group of
    origin's robots.txt (Google semantics: groups for the same agent merge).
    Also records Crawl-delay into _host_interval."""
    if origin in _robots:
        return _robots[origin]
    status, body = fetch(origin + "/robots.txt", check_robots=False)
    rules: list[tuple[str, str]] = []
    host = urllib.parse.urlsplit(origin).netloc
    if status == 200 and "<html" not in body[:500].lower():
        agents: list[str] = []
        in_rules = False
        for raw in body.splitlines():
            line = raw.split("#", 1)[0].strip()
            if ":" not in line:
                continue
            key, val = (s.strip() for s in line.split(":", 1))
            key = key.lower()
            if key == "user-agent":
                if in_rules:
                    agents, in_rules = [], False
                agents.append(val.lower())
                continue
            in_rules = True
            if "*" not in agents:
                continue
            if key in ("allow", "disallow") and val:
                rules.append((key, val))
            elif key == "crawl-delay":
                try:
                    _host_interval[host] = max(_host_interval.get(host, 0.0), float(val))
                except ValueError:
                    pass
        ROBOTS_LOG[host] = f"200, {sum(1 for k, _ in rules if k == 'disallow')} Disallow rules for *"
    else:
        ROBOTS_LOG[host] = f"{status} (no robots.txt: all allowed)"
    _robots[origin] = rules
    return rules


def _pattern_re(pat: str) -> re.Pattern:
    out = re.escape(pat).replace(r"\*", ".*")
    if out.endswith(r"\$"):
        out = out[:-2] + "$"
    return re.compile(out)


def robots_allows(url: str) -> bool:
    parts = urllib.parse.urlsplit(url)
    origin = f"{parts.scheme}://{parts.netloc}"
    path = parts.path or "/"
    if parts.query:
        path += "?" + parts.query
    best: tuple[int, bool] = (-1, True)
    for kind, pat in _robots_rules(origin):
        if _pattern_re(pat).match(path):
            length = len(pat)
            allow = kind == "allow"
            # Longest match wins; on a tie, Allow wins.
            if length > best[0] or (length == best[0] and allow):
                best = (length, allow)
    return best[1]


# ---------------------------------------------------------------- discovery

def shopify_products(domain: str) -> list[dict]:
    """Every product in a Shopify store's public /products.json."""
    out: list[dict] = []
    for page in range(1, 21):
        status, body = fetch(f"https://{domain}/products.json?limit=250&page={page}")
        if status != 200:
            break
        try:
            batch = json.loads(body).get("products", [])
        except json.JSONDecodeError:
            break
        if not batch:
            break
        out.extend(batch)
        if len(batch) < 250:
            break
    return out


def sitemap_urls(url: str, pattern: re.Pattern, depth: int = 0) -> list[str]:
    """Product URLs matching pattern from a sitemap (following sitemap indexes)."""
    status, body = fetch(url)
    if status != 200:
        return []
    locs = [html_module.unescape(u).strip() for u in re.findall(r"<loc>(.*?)</loc>", body, re.S)]
    found: list[str] = []
    for loc in locs:
        if loc.endswith(".xml") or "sitemap" in loc.rsplit("/", 1)[-1]:
            if depth < 2:
                found.extend(sitemap_urls(loc, pattern, depth + 1))
        elif pattern.search(loc):
            found.append(loc)
    return list(dict.fromkeys(found))


# What a product is (title/type/tags): in scope only when it is a topical
# skin/coat/ear/paw/wound or flea/tick product, never a bundle or a duplicate
# multi-pack listing of a product that is listed on its own.
OUT_OF_SCOPE = re.compile(
    r"\b(chews?|treats?|supplements?|vitamins?|probiotic powder|powder supplement|dental|tooth|toothpaste|teeth|oral|water additive|"
    r"breath|toys?|bundles?|kits?|gift|sets?|duo|trio|combo|routine|\d+[- ]?pack|\d+ ?pk|home|yard|carpet|fogger|premise|"
    r"laundry|stain and odor|stain & odor|urine|litter|odor (?:destroyer|eliminator)|training|chew stop|anti-chew|"
    r"calming|anxiety|hoof|horse|equine|livestock|tablets?|capsules?|aspirin|antihistamine|de-?wormer|nitenpyram|"
    r"capaction|eye|tear|skin (?:&|and) coat oil|salmon oil|bully|gullet|collagen|harness|leash|nail|polish|"
    r"ferret|chinchilla|rabbit|small animal|reptile|poultry|bird|guinea|towel|brush|comb|applicator|vest|tincture|bites|soft gels?|peanut butter|fish oil|"
    r"bone broth|mussel|mushroom|subscription|sample|variety pack|bitter|anti-chew|deterrent|\d+ piece|refill pouch|gallon|1 ?g\b|5 ?l\b|2\.5 ?l\b|groomer strength|"
    r"professional)\b",
    re.I,
)
IN_SCOPE = re.compile(
    r"shampoo|conditioner|spray|wipes?|\bears?\b|balm|spot[- ]?on|topical|collar|mousse|lotion|cream|ointment|"
    r"\bgel\b|hydrogel|otic|foam|rinse|cleanser|\bwash\b|butter|salve|paste|mist|drops|soak|flush|pads|detangl|"
    r"\bwound|hot ?spot|itch|paw|nose|skin|coat|flea|tick|dander|deodoriz|cologne|serum",
    re.I,
)


def product_in_scope(title: str, ptype: str = "", tags: str = "") -> bool:
    text = re.sub(r"(?:dogs?|cats?|pets?) ?(?:and|&|\+) ?home", "", f"{title} {ptype}", flags=re.I)
    if OUT_OF_SCOPE.search(text):
        return False
    return bool(IN_SCOPE.search(f"{text} {tags}"))


# ---------------------------------------------------------------- text helpers

BLOCK_TAGS = r"p|div|br|li|ul|ol|h[1-6]|tr|td|th|table|section|article|summary|details|dt|dd|span class=\"?metafield|strong|b"


def html_to_lines(fragment: str) -> list[str]:
    """Visible text of an HTML fragment, one line per block element."""
    s = re.sub(r"(?is)<(script|style|noscript|svg|template)\b.*?</\1>", " ", fragment)
    s = re.sub(r"(?is)<!--.*?-->", " ", s)
    s = re.sub(r"(?i)<(?:/?(?:p|div|li|ul|ol|h[1-6]|tr|table|section|article|summary|details|dt|dd|button)\b[^>]*|br\s*/?)>", "\n", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html_module.unescape(s).replace("\xa0", " ")
    lines = [re.sub(r"[ \t\r\f\v]+", " ", ln).strip() for ln in s.split("\n")]
    out: list[str] = []
    for ln in lines:
        # "Active Ingredients: X 2%. Inactive Ingredients: Water, ..." on one
        # line: split so each section is its own line.
        out.extend(p.strip() for p in re.split(r"(?<=\S)\s+(?=(?:inactive|other|inert) ingredients?\s*:)", ln, flags=re.I))
    return [ln for ln in out if ln]


# ---------------------------------------------------------------- ingredient sections

ACTIVE_HEAD = re.compile(r"^(?:\W*)(?:active\(s\)\s*/\s*ingredient\(s\)|actives?(?: ingredients?)?)(?:\b|(?<=\)))\s*(?:\([^)]*\))?\s*[:\-–]?\s*(.*)$", re.I)
INGR_HEAD = re.compile(
    r"^(?:\W*)(?:in-?active ingredients?|other ingredients?|other(?=\s*:)|inert ingredients?|ingredients?|main ingredients?|"
    r"full ingredients?(?: list)?|ingredient list|complete ingredients?(?: list)?|ingredients? list|"
    r"all ingredients|full ingredient declaration|key ingredients?|active\(s\)\s*/\s*ingredient\(s\))(?:\b|(?<=\)))\s*(?:\([^)]*\))?\s*[:\-–]?\s*(.*)$",
    re.I,
)
STOP_LINE = re.compile(
    r"^(?:\W*)(?:directions?|instructions?|how to use|to use|usage|warnings?|cautions?|precautions?|purpose|uses?|"
    r"indications?|benefits?|features?|description|details|product details|reviews?|faq|frequently|previous|next|"
    r"learn more|shipping|size|add to cart|storage|store |first aid|keep out|questions|why |what |who |made in|"
    r"key ingredients?|key benefits|highlights|you may also|related|customers|recommended|net |contents?|"
    r"active ingredients?|in-?active ingredients?|other ingredients?|customer|share\b|ingredients?|inert ingredients?|sku|upc|"
    r"epa reg|est\.|manufactured|distributed|caution|precautionary|hazards|environmental|physical|"
    r"for (?:dogs|cats|use)|safe for|lifestage|scent|fragrance:|pairs? well|free (?:from|of)|our formula|"
    r"†|this product|not tested|cruelty|vegan|ph[- ]balanced|veterinarian|vet recommended|disclaimer)",
    re.I,
)
PCT = r"(?:\d+(?:\.\d+)?|\.\d+)\s*%"


def _clean_active_line(line: str) -> str:
    line = re.sub(r"\s*[.…]{2,}\s*(?=\d)", " ", line)   # "Fipronil ...... 9.8%"
    line = re.sub(r"\s*[.…]{2,}.*$", "", line)          # dot leaders + purpose
    line = re.sub(r"\s*…+.*$", "", line)
    return line.strip(" ,;:")


INGREDIENT_WORD = re.compile(
    r"\b(?:water|aqua|oil|extract|acid|glycerin|glycerine|butter|wax|alcohol|sodium|potassium|glycol|vitamin|"
    r"fragrance|parfum|aloe|oatmeal|juice|gum|cleanser|betaine|glucoside|sulfate|chloride|benzoate|sorbate|"
    r"phenoxyethanol|tocopher\w*|polysorbate|lanolin|protein|soap|surfactant|preservative)\b",
    re.I,
)


def looks_like_ingredient_list(text: str, min_items: int = 3) -> bool:
    """A published INCI/ingredient list, not a marketing sentence. An
    inactive/inert section may be as short as two items."""
    if not text or len(text) > MAX_INGREDIENT_TEXT_LEN or len(text) < 8:
        return False
    if re.search(r"https?://|<|\{|\}|\$\d", text):
        return False
    items = [i.strip() for i in re.split(r",|;|•|\|", text) if i.strip()]
    if len(items) < min_items:
        return False
    if not INGREDIENT_WORD.search(text):
        return False
    if re.match(r"^[A-Za-z][A-Za-z &]{2,40}:\s", text):
        return False  # "Fragrance Notes: ...", "Remaining essential ingredients: ..."
    if len(re.findall(r"\s[-–]\s", text)) >= 2:
        return False  # "Coconut Oil - anti-inflammatory, ..." benefit lists
    if re.search(r"\b(?:to|easy|gently|removes?|wipes? away|perfect|ideal|great)\b", items[0], re.I):
        return False
    words = len(text.split())
    if words / len(items) > 6.5:
        return False
    if re.search(r"\b(?:your|you|our|we|is|are|will|helps?|keeps?|made with|formulated|free of|free from|no harsh)\b",
                 text, re.I) and words / len(items) > 3.2:
        return False
    return True


def _gather(lines: list[str], i: int, first: str, max_lines: int = 14, prose_stop: bool = True) -> list[str]:
    """first (rest of the heading line) plus following lines up to a stop line."""
    out = [first] if first else []
    for ln in lines[i + 1 : i + 1 + max_lines]:
        if STOP_LINE.match(ln) or INGR_HEAD.match(ln) or ACTIVE_HEAD.match(ln):
            break
        if out and ln.rstrip().endswith(":") and len(ln) < 40:
            break  # the next section's heading ("Pack size(s):")
        if out and re.match(r"^\*+\s*\w+(?:\s+\w+){2,}", ln) and not re.search(PCT, ln):
            break  # a footnote ("*Made with natural active ingredients")
        if len(ln) > 400 and not out:
            out.append(ln)
            break
        if out and len(ln.split()) > 14 and ln.count(",") < 2 and not re.search(PCT, ln):
            break  # a prose paragraph: the list has ended
        if prose_stop and out and "," not in ln and not out[-1].rstrip().endswith(",") and not re.search(PCT, ln) \
                and (out[-1].rstrip().endswith(".") or len(ln.split()) > 3):
            break  # a list line wrapped mid-item continues; a sentence after a finished list does not
        out.append(ln)
    return out


def extract_actives(lines: list[str]) -> tuple[str, str]:
    """(active ingredient(s) with strength exactly as listed, joined with ', ';
    an "Other:/Inactive:" list printed on the same line, if any)."""
    for i, ln in enumerate(lines):
        m = ACTIVE_HEAD.match(ln)
        if not m:
            # "Ingredients: 0.4% Chlorhexidine Gluconate (Antiseptic)." -- a
            # plain ingredients heading whose content starts with a strength.
            m2 = re.match(r"^\W*ingredients?\s*:\s*(\d.*%.*)$", ln, re.I)
            m = m2 if m2 and len(m2.group(1)) < 200 else None
            # Adams: an "Ingredients" heading whose next line is the
            # actives with strengths ("Etofenprox: 55%, ...").
            if not m and re.fullmatch(r"\W*ingredients?\s*:?", ln, re.I) and i + 2 < len(lines) \
                    and (re.search(r"^[^,]{2,60}?[:\-–.]?\s*" + PCT, lines[i + 1])
                         or re.fullmatch(r"\(?" + PCT + r"\)?", lines[i + 2])):
                m = re.match(r"^\W*ingredients?\s*:?\s*(.*)$", ln, re.I)
        if not m or len(ln) > 600:
            continue
        rest = m.group(1).strip()
        other = ""
        split = re.split(r"\s*;?\s*\b(?:other|inactive|inert)(?: ingredients?)?\s*:\s*", rest, maxsplit=1, flags=re.I)
        if len(split) == 2:
            rest, other = split[0].strip(" ;,"), split[1].strip(" ;,.")
        # "Active Ingredients" as a marketing heading ("Active Ingredients that
        # work") is not a label section.
        if rest and not re.search(PCT, rest):
            continue
        gathered = [_clean_active_line(p) for p in _gather(lines, i, rest, max_lines=12, prose_stop=False)]
        gathered = [g for g in gathered if g and not re.fullmatch(r"(?:purpose|amount|total|(?:total\s*)?100(?:\.0+)?\s*%)", g, re.I)]
        parts: list[str] = []
        j = 0
        while j < len(gathered):
            g = gathered[j]
            nxt = gathered[j + 1] if j + 1 < len(gathered) else ""
            if re.match(r"\W*(?:other|inert) ingredients?", g, re.I):
                break
            if re.search(PCT, g) and len(g) < 250:
                parts.append(g)
            elif (len(g.split()) <= 7 and re.fullmatch(r"\(?" + PCT + r"\)?(?:\s*w/w)?", nxt)):
                parts.append(f"{g} {nxt}")
                j += 1
            elif len(g.split()) <= 3 and re.search(PCT, nxt) and len(nxt) < 120 and \
                    not re.match(r"\W*(?:other|inert|inactive)", nxt, re.I):
                parts.append(f"{g} {nxt}")  # a name wrapped onto two lines
                j += 1
            elif parts:
                break
            j += 1
        text = ", ".join(parts).strip(" .")
        text = re.sub(r"[,;]?\s*(?:other|inert) ingredients?\b.*$", "", text, flags=re.I)
        text = re.sub(r"[,;]?\s*\bother\s*[-:.]?\s*\d+(?:\.\d+)?\s*%.*$", "", text, flags=re.I)
        # "1% Pramoxine HCI - relieves itching..." -> keep the ingredient, drop the purpose
        text = re.sub(r"\s+[-–]\s+[a-z][^,%]*(?=,|$)", "", text).strip(" ,.;")
        if re.search(PCT, text) and len(text) < 400:
            return text, other
    return "", ""


def extract_ingredients(lines: list[str]) -> str:
    """The first published ingredient list (inactive/other/full list).
    Tried in order: a list right under a plain ingredients heading; under a
    "Key Ingredients" heading (on some sites the full list, on others
    highlights, which looks_like_ingredient_list rejects); then two layouts
    seen on real pages -- the list printed as one sentence ("A, B and C work
    together to..."), and a marketing paragraph between heading and list."""
    heads = []
    for i, ln in enumerate(lines):
        m = INGR_HEAD.match(ln)
        if not m or len(ln) > MAX_INGREDIENT_TEXT_LEN or re.match(r"^\W*other\s*$", ln, re.I):
            continue
        heads.append((i, m.group(1).strip(), bool(re.match(r"^\W*key\b", ln, re.I))))
    for want_key in (False, True):
        for i, rest, is_key in heads:
            if is_key == want_key:
                inactive = bool(re.match(r"^\W*(?:in-?active|inert|other|active\(s\))", lines[i], re.I))
                text = clean_ingredient_text(" ".join(_gather(lines, i, rest)))
                if looks_like_ingredient_list(text, min_items=2 if inactive else 3):
                    return text
    for i, rest, _ in heads:
        text = clean_ingredient_text(" ".join(_gather(lines, i, rest)))
        cut = re.split(r"\s+(?:work together|work to|help to|helps to|combine to)\b", text, maxsplit=1)[0]
        if cut != text and looks_like_ingredient_list(cut):
            return cut
    for i, _, is_key in heads:
        if is_key:
            continue
        for j in range(i + 1, min(i + 14, len(lines))):
            if INGR_HEAD.match(lines[j]) or ACTIVE_HEAD.match(lines[j]):
                break
            if "," in lines[j] and INGREDIENT_WORD.search(lines[j]) and len(lines[j].split()) / (lines[j].count(",") + 1) <= 4:
                text = clean_ingredient_text(" ".join(_gather(lines, j - 1, "", max_lines=8)))
                if looks_like_ingredient_list(text):
                    return text
    return ""


def clean_ingredient_text(text: str) -> str:
    text = re.sub(r"\s*,\s*", ", ", text)
    text = re.sub(r"\s+", " ", text).strip(" ,.;")
    text = re.sub(r"^contains:?\s+", "", text, flags=re.I)
    # Pesticide labels print the inert total ("... Glycerin 95.49% TOTAL: 100%").
    if re.search(r"total[\s.:…]*100", text, re.I):
        text = re.sub(r"\s*[.…]*\s*\d+(?:\.\d+)?\s*%.*$", "", text, flags=re.I)
    text = re.split(r"\s(?:learn more|view full|see full|†)|\.?\s\*+\s*[A-Za-z]|"
                    r"\s(?:Facebook|Twitter|Pinterest|Instagram|Contact Us|For Best Results|Join the pack)\b|\sF\s?AQ\b|\sQ1:|"
                    r"\.?\s+(?i:contains no|does not contain|made with|free of|free from|no added|learn more|view full|see full)\b|\s+(?=[A-Z]{3,}®)", text)[0]
    return text.strip(" ,.;*")


EPA_RE = re.compile(r"EPA\s*Reg(?:istration)?\.?\s*(?:No\.?|Number|#)?\s*[:.]?\s*(\d{1,7}-\d{1,6}(?:-\d{1,6})?)", re.I)


def extract_epa(text: str) -> str:
    m = EPA_RE.search(text)
    return m.group(1) if m else ""


_CONTAINS_ITEM = PCT + r"\s+[A-Za-z][\w\-®™*()/ ]*?"
CONTAINS_RE = re.compile(
    r"^\W*contains\s+(" + _CONTAINS_ITEM + r"(?:(?:\s*,\s*(?:and\s+)?|\s+and\s+|\s*&\s*)" + _CONTAINS_ITEM + r")*)"
    r"(?=\s+(?:for|to|which|that|in|with|instead|plus|as|providing|helps?)\b|\s*[.;!]|\s*$)", re.I)


def extract_contains_actives(lines: list[str]) -> str:
    """'Contains 2% Miconazole Nitrate and 2% Colloidal Oatmeal' -> the
    strengths as printed. Only used for brands (BRANDS[...]['contains'])
    whose pages state actives this way instead of a label section."""
    for ln in lines:
        m = CONTAINS_RE.match(ln) if len(ln) < 300 else None
        if m:
            text = re.sub(r"\*+", "", m.group(1)).strip(" .,")
            if not re.search(r"natural|ingredients|organic|plant|origin", text, re.I):
                return text
    return ""


# ---------------------------------------------------------------- brands

# discovery: "shopify" (/products.json) or "sitemap" (url_include filter).
BRANDS: dict[str, dict] = {
    "douxo": {"brand": "DOUXO", "discovery": "shopify", "domain": "us.douxo.com", "contains": True},
    "vetsbest": {"brand": "Vet's Best", "discovery": "shopify", "domain": "vetsbest.com"},
    "tropiclean": {"brand": "TropiClean", "discovery": "shopify", "domain": "tropiclean.com"},
    "earthbath": {"brand": "earthbath", "discovery": "shopify", "domain": "earthbath.com"},
    "vetericyn": {"brand": "Vetericyn", "discovery": "shopify", "domain": "vetericyn.com"},
    "skoutshonor": {"brand": "Skout's Honor", "discovery": "shopify", "domain": "skoutshonor.com"},
    "warrenlondon": {"brand": "Warren London", "discovery": "shopify", "domain": "warrenlondon.com"},
    "naturaldog": {"brand": "Natural Dog Company", "discovery": "shopify", "domain": "naturaldog.com"},
    "pethead": {"brand": "Pet Head", "discovery": "shopify", "domain": "pethead.com"},
    "petarmor": {"brand": "PetArmor", "discovery": "shopify", "domain": "petarmor.com"},
    "curaseb": {"brand": "Curaseb", "discovery": "shopify", "domain": "curaseb.com"},
    "earthrated": {"brand": "Earth Rated", "discovery": "shopify", "domain": "www.earthrated.com"},
    "squishface": {"brand": "Squishface", "discovery": "shopify", "domain": "squishface.com"},
    "vetnique": {"brand": "Vetnique Labs", "discovery": "shopify", "domain": "vetnique.com"},
    "petpost": {"brand": "Petpost", "discovery": "shopify", "domain": "petpost.com"},
    "nootie": {"brand": "Nootie", "discovery": "shopify", "domain": "nootie.com"},
    "mightypaw": {"brand": "Mighty Paw", "discovery": "shopify", "domain": "mightypaw.com"},
    "propetworks": {"brand": "Pro Pet Works", "discovery": "shopify", "domain": "propetworks.com"},
    "zymox": {
        "brand": "ZYMOX", "discovery": "sitemap", "sitemap": "https://zymox.com/sitemap.xml", "contains": True,
        "url_include": re.compile(r"zymox\.com/(?:products/zymox-(?:dermatology|ear-care)/|zymox-|ZYMOX-)[^/]*"
                                  r"(?:otic|ear|topical|shampoo|conditioner|wipes|cream|spray|cleanser)", re.I),
        "url_exclude": re.compile(r"equine|avian|exotic|small-animal|oratene|display|brochure|sample|foil|-pop|sheet|"
                                  r"gallon|-pens?\b|-bags?\b|tote|-mats?\b|-balls?\b|counter|wobbler|literature|chart|"
                                  r"postcard|bandana|celebrat|years", re.I),
    },
    "davis": {
        "brand": "Davis", "discovery": "sitemap", "sitemap": "https://davismfg.com/kSitemap-1.xml", "contains": True,
        "url_include": re.compile(r"davismfg\.com/[a-z0-9-]*(?:shampoo|spray|ear|wipes|conditioner|rinse|lotion|"
                                  r"ointment|cream|cleanse|wash|mousse|foam)[a-z0-9-]*$", re.I),
        "url_exclude": re.compile(r"gallon|-64-oz|5-gallon|bucket|bundle|horse|equine|livestock|poultry|dental|breath|"
                                  r"shear|nail|comb|bandanna|ribbon|medicated-(?:pet-)?shampoos$|-e-[a-z]+\d", re.I),
        "image_re": re.compile(r'https://davismfg-\d\.azureedge\.net/img/product/[^"\s]+?_1-B\.jpg[^"\s]*'),
    },
    "dechra": {
        "brand": "Dechra", "discovery": "sitemap", "sitemap": "https://www.dechra-us.com/Sitemap.xml",
        "url_include": re.compile(r"/companion-animal/(?:dog|cat)/non-prescription/[a-z0-9-]+$"),
        "url_exclude": re.compile(r"ophthalm|puralube|ophthavet|dent|eicosacaps|eicosa3ff|probiowrap|redonyl|provet|"
                                  r"porus|phycox|epitreats|catney|cat-lax|vetradent|atopivet"),
        "dedupe_slug": True,
    },
    "adams": {
        "brand": "Adams", "discovery": "sitemap", "sitemap": "https://www.adamspetcare.com/sitemap.xml",
        "url_include": re.compile(r"/products/pet/[a-z0-9-]+-[a-z0-9-]+"),
        "url_exclude": re.compile(r"home-spray|pet-home-spray|and-home-spray"),
    },
    "vetoquinol": {
        "brand": "Vetoquinol", "discovery": "sitemap", "sitemap": "https://www.vetoquinolusa.com/sitemap.xml",
        "url_include": re.compile(r"/products/(?:aloe-oatmeal|bpo-3|cerumene|ear-cleansing|groom-aid|hyaluronic|"
                                  r"sebozole|universal-medicated|phnotix|imoxi)"),
    },
}

# Checked and not scraped (2026-10-11); see the module docstring.
SKIPPED_BRANDS = {
    "Frontline (frontline.com)": "Incapsula bot wall (NOINDEX iframe challenge): not bypassed",
    "K9 Advantix II / Advantage / Seresto (yourpetandyou.elanco.com)": "pages name actives but print no strengths or ingredient list",
    "Burt's Bees for Pets (burtsbeespets.com)": "Wix site; sitemap has no product pages (client-rendered)",
    "Hartz (hartz.com)": "sitemap has articles only, no product pages",
    "Vetoquinol (vetoquinolusa.com)": "product pages (BPO-3, Sebozole, Universal Medicated...) print no ingredient list or strengths",
    "Virbac (us.virbac.com)": "product pages (Epi-Otic, Ketochlor, Allergroom) print no ingredient list or strengths",
    "Sentry (sentrypetcare.com)": "store retired: product sitemap lists one behaviour spray (robots Crawl-delay 10)",
    "Wondercide (wondercide.com)": "403 on /products.json (bot protection)",
    "Honest Paws (honestpaws.com)": "/products.json returned no products on the crawl (topicals: shampoo only)",
    "Bodhi Dog (bodhidog.com)": "robots.txt Crawl-delay 60 and not Shopify: skipped as impractical",
    "Synergy Labs / Veterinary Formula (synergylabs.com)": "WordPress sitemap lists no product pages",
}


# ---------------------------------------------------------------- rows

FIELDS = ["id", "brand", "product_name", "species", "concern_ids", "claim_type", "epa_reg_no",
          "active_ingredient_text", "ingredient_text", "not_for_cats", "source_url", "image_url"]


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")[:70]


def _meta(body: str, prop: str) -> str:
    m = re.search(rf'<meta[^>]+(?:property|name)="{prop}"[^>]+content="([^"]*)"', body, re.I) or \
        re.search(rf'<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="{prop}"', body, re.I)
    return html_module.unescape(m.group(1)).strip() if m else ""


def page_title(body: str) -> str:
    m = re.search(r"<h1[^>]*>(.*?)</h1>", body, re.S | re.I)
    title = re.sub(r"<[^>]+>", " ", m.group(1)) if m else ""
    title = re.sub(r"\s+", " ", html_module.unescape(title)).strip()
    if not title:
        title = re.split(r"\s+[|–-]\s+", _meta(body, "og:title"))[0]
    return title


SPECIES_LINE = re.compile(r"\b(?:for|on|in)\s+(?:all\s+)?(?:dogs?|cats?|pupp(?:y|ies)|kittens?|pets?)\b|"
                          r"do not use on cats|not for (?:use on )?cats|toxic to cats|dogs? (?:and|&) cats?", re.I)


def species_text(lines: list[str], title: str) -> str:
    """Lines near the product title that state species (or a cat warning);
    page navigation and footers are left out."""
    start = next((i for i, ln in enumerate(lines) if title and ln.startswith(title[:30])), 0)
    window = lines[start : start + 160]
    return " ".join(ln for ln in window if SPECIES_LINE.search(ln) and len(ln) < 600)


CAT_BAN = re.compile(r"(?:do not|never)\s+(?:use|apply)\b[^.;]{0,30}\bcats?\b|\bnot for (?:use on |use in )?cats\b|"
                     r"toxic to cats|harmful to cats|fatal to cats", re.I)
# pet_parse's flea/tick active list (synthetic, EPA-registered actives).
FLEA_ACTIVES = PET_CONCERN_RULES[0][1]
DRUG_ACTIVES = "|".join([r[1] for r in PET_CONCERN_RULES[1:] if r[1] != "(?!)"] +
                        [r"hypochlor|lidocaine|hydrocort|salicylic|acetic acid|boric|pramox|miconazole|"
                         r"ketoconazole|chlorhexidine|benzoyl|silver"])


def build_row(key: str, brand: dict, url: str, body: str, title: str, description: str, sku: str,
              image: str, url_species: set[str] | None = None) -> tuple[dict | None, str]:
    """(row, "") or (None, reason skipped)."""
    lines = html_to_lines(body)
    actives, other = extract_actives(lines)
    explicit_actives = bool(actives)
    if not actives and brand.get("contains"):
        actives = extract_contains_actives(lines)
    ingredients = extract_ingredients(lines) or (clean_ingredient_text(other) if other else "")
    if ingredients and not looks_like_ingredient_list(ingredients, min_items=2):
        ingredients = ""
    if ingredients and actives and ingredients.lower().startswith(actives.lower()[:25]):
        ingredients = ""  # the same actives line read twice, not an inactive list
    if not actives and not ingredients:
        return None, "no ingredient list on page"
    epa = extract_epa(" ".join(lines))

    # Species: the product title is authoritative when it names one ("Flea
    # Collar for Dogs" is not a cat product because the page's footer or a
    # related product says "cats"); otherwise the description and lines near
    # the title. A cat warning anywhere in that text sets not_for_cats.
    text_for_species = f"{description} {species_text(lines, title)}"
    sp = parse_species(title, text_for_species)
    title_pos, _ = species_mentions(title)
    if url_species:
        species = sorted(url_species)
    elif title_pos & {"dog", "cat"}:
        species = sorted(title_pos & {"dog", "cat"})
    else:
        species = [s for s in sp["species"] if s in ("dog", "cat", "pet")]
    if "horse" in sp["species"] and not species:
        return None, "horse only"
    if not species:
        species = ["pet"]
    not_for_cats = sp["not_for_cats"] or (
        "cat" not in species and bool(CAT_BAN.search(f"{title} {text_for_species}")))

    otic = bool(re.search(r"\bears?\b|\botic\b", title, re.I))
    indication = f"{title} {description[:300]}"
    concerns = pet_concerns([actives], indication, route_otic=otic)
    # Flea/tick and ear concerns only from the title or the actives: a
    # shampoo whose blurb mentions "flea allergies" is not a flea product.
    if "pet-fleas-ticks" in concerns and not (
            re.search(r"\bfleas?\b|\bticks?\b|\blice\b|\bmites?\b|mange|mosquito", title, re.I)
            or re.search(FLEA_ACTIVES, actives, re.I)):
        concerns.remove("pet-fleas-ticks")
    if "pet-ear-infections" in concerns and not otic:
        concerns.remove("pet-ear-infections")

    if epa or (actives and re.search(FLEA_ACTIVES, actives, re.I)):
        # EPA-registered actives (fipronil, pyrethrins, etofenprox...) are
        # pesticides even when the page leaves out the Reg. No.
        claim = "pesticide"
    elif explicit_actives and re.search(DRUG_ACTIVES, actives, re.I):
        claim = "drug"
    else:
        # Includes 25(b) minimum-risk flea/tick botanicals (clove, peppermint,
        # cedarwood oil...), which list "active ingredients" but are exempt
        # from EPA registration.
        claim = "grooming"
    row = {
        "id": f"pet-{key}-{slug(sku)}",
        "brand": brand["brand"],
        "product_name": re.sub(r"\s+", " ", title).strip(),
        "species": ";".join(species),
        "concern_ids": ";".join(c for c in concerns if c in PET_CONCERN_IDS),
        "claim_type": claim,
        "epa_reg_no": epa,
        "active_ingredient_text": actives,
        "ingredient_text": ingredients,
        "not_for_cats": "1" if not_for_cats else "0",
        "source_url": url,
        "image_url": image,  # remote until download_image()
    }
    return row, ""


def _to_webp(data: bytes) -> bytes | None:
    """At most WEBP_MAX px, WebP quality 80: a pet-brand photo is shown at
    64-320 px, and PNG product shots at 1000 px were ~250 KB each."""
    if Image is None:
        return None
    try:
        img = Image.open(io.BytesIO(data))
        img.thumbnail((WEBP_MAX, WEBP_MAX))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=80, method=6)
        return out.getvalue()
    except Exception as exc:
        print(f"  webp conversion failed: {exc}", file=sys.stderr)
        return None


def download_image(url: str, product_id: str) -> str:
    if not url:
        return ""
    if url.startswith("//"):
        url = "https:" + url
    data = fetch_bytes(url)
    if not data:
        return ""
    webp = _to_webp(data)
    if webp is None:
        # Without Pillow, keep the original file as served.
        m = re.search(r"\.(jpg|jpeg|png|webp)(?:[?#]|$)", url, re.I)
        name, webp = f"{product_id}.{m.group(1).lower() if m else 'jpg'}", data
    else:
        name = f"{product_id}.webp"
    os.makedirs(IMAGE_DIR, exist_ok=True)
    with open(os.path.join(IMAGE_DIR, name), "wb") as f:
        f.write(webp)
    return f"{IMAGE_URL_PREFIX}/{name}"


SIZE_TOKENS = re.compile(r"\b\d+(?:\.\d+)?\s*(?:fl\.?\s*)?(?:oz|ml|l|ct|count|gallon|gal|g|lb|pk|pack)\b\.?|"
                         r"\b(?:\d+-)?pack\b|\bgroomer\b|®|™|\blined cap\b", re.I)
TITLE_NOISE = re.compile(r"\b(?:pets?|for|and|the|with|tropiclean|lined|cap|luxury)\b", re.I)
FORM = re.compile(r"shampoo|conditioner|spray|wipes?|mousse|balm|cream|ointment|gel|lotion|foam|rinse|flush|"
                  r"drops|solution|cleanser|collar|spot-?on|wash|stick|butter|mist|pads", re.I)


def title_key(title: str) -> str:
    """Title with sizes, pack counts and filler words removed, so "Lime &
    Coconut Shed Control Shampoo for Pets, 1 gal" and "Lime + Coconut Shed
    Control Pet Shampoo, 20oz" are one product."""
    t = TITLE_NOISE.sub(" ", SIZE_TOKENS.sub(" ", title.lower()))
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


# ---------------------------------------------------------------- main

def candidates(key: str, brand: dict) -> tuple[list[dict], list[str]]:
    """Product candidates for a brand: dicts with url/title/description/sku/
    image/body. Second value: notes on what was dropped before fetching."""
    notes: list[str] = []
    out: list[dict] = []
    if brand["discovery"] == "shopify":
        products = shopify_products(brand["domain"])
        if not products:
            notes.append("no /products.json")
        for p in products:
            tags = p.get("tags") or []
            tags = " ".join(tags) if isinstance(tags, list) else str(tags)
            if not product_in_scope(p.get("title", ""), p.get("product_type", ""), tags):
                notes.append("out of scope")
                continue
            url = f"https://{brand['domain']}/products/{p['handle']}"
            variants = p.get("variants") or []
            sku = (variants[0].get("sku") if variants else "") or p["handle"]
            images = p.get("images") or []
            out.append({"url": url, "title": p.get("title", ""), "sku": sku,
                        "description": " ".join(html_to_lines(p.get("body_html") or "")),
                        "image": images[0].get("src", "") if images else "",
                        "extra_html": p.get("body_html") or ""})
    else:
        urls = [u for u in sitemap_urls(brand["sitemap"], brand["url_include"])
                if not (brand.get("url_exclude") and brand["url_exclude"].search(u))]
        by_slug: dict[str, dict] = {}
        for u in urls:
            last = u.rstrip("/").rsplit("/", 1)[-1]
            if brand.get("dedupe_slug"):
                # Dechra lists one product under /dog/ and /cat/: one row,
                # species from the sections it is listed in.
                sp = re.search(r"/companion-animal/(dog|cat)/", u)
                if last in by_slug:
                    if sp:
                        by_slug[last]["url_species"].add(sp.group(1))
                    continue
                c = {"url": u, "title": "", "sku": last, "description": "", "image": "", "extra_html": "",
                     "url_species": {sp.group(1)} if sp else set()}
                by_slug[last] = c
                out.append(c)
                continue
            out.append({"url": u, "title": "", "sku": last, "description": "", "image": "", "extra_html": ""})
    return out, notes


def main() -> None:
    if Image is None:
        print("WARNING: Pillow not installed -- images will NOT be resized.", file=sys.stderr)
    only = set(sys.argv[1:])
    rows: list[dict] = []
    report: dict[str, dict] = {}
    for key, brand in BRANDS.items():
        if only and key not in only:
            continue
        print(f"{brand['brand']}...", file=sys.stderr)
        cands, notes = candidates(key, brand)
        stats = {"candidates": len(cands), "kept": 0, "skipped": {}}
        for n in notes:
            stats["skipped"][n] = stats["skipped"].get(n, 0) + 1
        seen_titles: set[str] = set()
        seen_formula: set[tuple] = set()
        # Plain listings before groomer/gallon/multi-pack copies of them.
        cands.sort(key=lambda c: bool(re.search(r"groomer|gallon|-1-g$|-2$|pack|pk", c["url"], re.I)))
        for c in cands:
            status, body = fetch(c["url"])
            if status != 200:
                reason = "blocked by robots.txt" if status == -2 else f"HTTP {status}"
                stats["skipped"][reason] = stats["skipped"].get(reason, 0) + 1
                continue
            title = c["title"] or page_title(body)
            if brand["discovery"] != "shopify" and OUT_OF_SCOPE.search(title):
                stats["skipped"]["out of scope"] = stats["skipped"].get("out of scope", 0) + 1
                continue
            description = c["description"] or _meta(body, "description") or _meta(body, "og:description")
            image = c["image"] or _meta(body, "og:image")
            if not image and brand.get("image_re"):
                m = brand["image_re"].search(body)
                image = html_module.unescape(m.group(0)) if m else ""
            row, why = build_row(key, brand, c["url"], body + c["extra_html"], title, description, c["sku"], image,
                                 c.get("url_species"))
            if not row:
                stats["skipped"][why] = stats["skipped"].get(why, 0) + 1
                continue
            tk = title_key(title)
            form = (FORM.search(title) or [""])[0].lower()
            fk = (row["active_ingredient_text"].lower(), row["ingredient_text"].lower(), form)
            if tk in seen_titles or fk in seen_formula:
                stats["skipped"]["duplicate listing (size/scent/pack)"] = \
                    stats["skipped"].get("duplicate listing (size/scent/pack)", 0) + 1
                continue
            seen_titles.add(tk)
            seen_formula.add(fk)
            rows.append(row)
            stats["kept"] += 1
        report[key] = stats
        print(f"  {stats}", file=sys.stderr)

    ids: set[str] = set()
    for row in rows:
        base, n = row["id"], 2
        while row["id"] in ids:
            row["id"] = f"{base}-{n}"
            n += 1
        ids.add(row["id"])
        # Rows with no pet concern aren't seeded (app/src/db/seed-pets.ts),
        # so their photos would only add weight to the repo.
        row["image_url"] = download_image(row["image_url"], row["id"]) if row["concern_ids"] else ""

    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    with open(OUT_CSV, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for row in rows:
            w.writerow(row)
    print(json.dumps({"rows": len(rows), "brands": report, "robots": ROBOTS_LOG}, indent=1))
    print(f"{OUT_CSV} written", file=sys.stderr)


if __name__ == "__main__":
    main()
