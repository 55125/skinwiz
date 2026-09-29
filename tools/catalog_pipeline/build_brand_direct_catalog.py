#!/usr/bin/env python3
"""
Adds the high-confidence layer discussed alongside build_cosmetic_catalog.py:
products sourced directly from a brand's own published ingredient-list
pages, rather than the crowd-edited Open Beauty Facts. This is what closes
the gap OBF's own thinness left open — e.g. The Ordinary has 40+ real SKUs
but only 14 (some junk) in Open Beauty Facts.

Trust tier: distinct from both the FDA-sourced catalog and the OBF layer.
It's the manufacturer's own claim (real, legally-exposed if wrong — most
markets require accurate INCI labeling), so it's meaningfully more
trustworthy than crowd-sourced data, but it isn't an FDA filing either.
source="brand_direct" — see app/src/db/schema.ts's products.dataSource
comment and the app's three-tier badge logic (product-card.tsx,
product/[id]/page.tsx) for how this is kept visually distinct from both
other tiers, not blended into either.

Product identity: the manufacturer's own SKU code (from each page's
schema.org Product JSON-LD `sku`/`mpn`), same barcode-keyed-identity
principle as the rest of the catalog — a relaunch under a new SKU becomes
a new row.

Started with The Ordinary (chosen because it's the exact brand the gap
was first found against — zero real entries existed for it before this).
Added CeraVe second: also server-rendered and robots.txt-allowed, but a
messier site than The Ordinary's — its product-listing grids are
client-rendered (Vue.js), so its full catalog isn't discoverable via
static sitemap/HTML the way The Ordinary's is; only 9 product URLs were
reachable this way (see README_cosmetic.md for the accepted gap and what
a full crawl would need). Its ingredient-list markup and product-identity
field also differ from The Ordinary's, hence the per-brand `parser` key
and extractor function below rather than one shared extractor.

Added Naturium, COSRX, and First Aid Beauty 2026-09-28, all in one pass --
all three turned out to run on Shopify, which changes the economics versus
the two brands above: every Shopify store exposes a public, unauthenticated
`/products.json` (confirmed allowed by each site's robots.txt; Naturium's
own published /agents.md explicitly documents it as the sanctioned
agent-facing catalog endpoint) that gives full catalog discovery AND real
product images in one paginated call, with no sitemap regex or per-page
JSON-LD image hunting needed. The one thing still missing from that JSON
is the actual INCI ingredient list -- every Shopify theme checked renders
it into the product page as a metafield inside an "Ingredients" accordion/
tab, but the exact wrapper markup differs per brand's theme, so each still
needs its own extractor (see `_finish_shopify_product` for the shared tail
end of that logic, and each `extract_product_*` function for the
brand-specific boundary regex -- verified against real fetched pages
before being trusted, same discipline as the CeraVe `<br` bug below).
Skipped The Inkey List even though it's also Shopify: its only storefront
is uk.theinkeylist.com (no separate US site), and per-market cosmetic
formulations can legitimately differ under UK/EU vs. US regulatory limits
-- not something to quietly blend into a "brand_direct" tier that implies
this-is-what's-sold-here without flagging the caveat.
"""
from __future__ import annotations

import csv
import html as html_module
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

try:
    from PIL import Image
except ImportError:
    Image = None  # resizing becomes a no-op below; see requirements.txt

SLEEP = 0.4
# A real ingredient list is at most a few hundred words. Guards against the
# exact bug found while building this: a boundary regex that (on some pages
# only) matched 50,000+ characters of unrelated page content instead of the
# ingredient list. If a future page-structure change reintroduces something
# like it, this rejects the row instead of silently storing garbage.
MAX_INGREDIENT_TEXT_LEN = 3000

# Self-host brand-direct photos instead of hotlinking the brand's own CDN --
# unlike Open Beauty Facts (an open ODbL database whose API is meant for
# reuse), these are commercial product photos scraped off a retail page with
# no license to embed them live from their origin, and hotlinking also means
# our product pages silently break the moment a brand adds referrer-based
# hotlink protection or reshuffles a URL. Downloaded once here and committed
# into the Next.js app's public/ dir, same as any other static asset --
# app/src/db/seed.ts stores whatever string is in this CSV's image_url column
# as-is, so a root-relative path works exactly like the old full URL did with
# no app-side changes needed.
IMAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "app", "public", "product-images", "brand-direct")
IMAGE_URL_PREFIX = "/product-images/brand-direct"
MAX_IMAGE_BYTES = 5_000_000
# Real manufacturer product photos came back at up to 2000x2000px (First Aid
# Beauty), 2.5-3MB each PNG, for a thumbnail that only ever renders at a few
# hundred px in a product card -- caught by checking actual file sizes after
# the first full run before committing 105MB of images to the repo.
MAX_IMAGE_DIMENSION = 1000

BRANDS = {
    "the_ordinary": {
        "brand_name": "The Ordinary",
        "discovery": "sitemap",
        "sitemap_url": "https://theordinary.com/sitemap-en_US.xml",
        "url_pattern": re.compile(r"https://theordinary\.com/en-us/[a-z0-9-]+\.html"),
        "parser": "the_ordinary",
    },
    "cerave": {
        "brand_name": "CeraVe",
        # Sitemap-based discovery only ever found 9 URLs (see the old
        # comment/README entry) -- assumed to be JS-rendered category grids
        # with no static discovery path at all. Wrong: the raw (non-JS) HTML
        # of any category hub page already embeds the full product link set
        # (confirmed 2026-09-29 -- a plain `curl` on
        # /skincare/cleansers/facial-cleansers alone surfaced 2x the product
        # URLs the sitemap ever did), just not on the homepage/sitemap. Real
        # product pages sit at inconsistent depths under /skincare/ (some
        # /skincare/{cat}/{slug}, some /skincare/{cat}/{subcat}/{slug}), so
        # rather than guess a depth pattern, `hub_crawl` fetches every hub
        # below, extracts every `"/skincare/..."` quoted path with 2+
        # segments, and lets extract_product_cerave's own JSON-LD+ingredient
        # requirement reject the handful of sub-category hubs that slip
        # through (e.g. "/skincare/cleansers/facial-cleansers" itself).
        "discovery": "hub_crawl",
        "hub_urls": [
            "https://www.cerave.com/skincare",
            "https://www.cerave.com/skincare/cleansers/facial-cleansers",
            "https://www.cerave.com/skincare/cleansers/body-cleansers",
            "https://www.cerave.com/skincare/moisturizers/facial-moisturizers",
            "https://www.cerave.com/skincare/moisturizers/body-moisturizers",
            "https://www.cerave.com/skincare/moisturizers/eye-creams",
            "https://www.cerave.com/skincare/facial-serums",
            "https://www.cerave.com/skincare/baby",
            "https://www.cerave.com/skincare/ointment",
            "https://www.cerave.com/skincare/best-sellers",
            "https://www.cerave.com/skincare/new-products",
            "https://www.cerave.com/skincare/acne",
            "https://www.cerave.com/skincare/anti-aging",
            "https://www.cerave.com/skincare/eczema",
            "https://www.cerave.com/skincare/dry-skin",
            "https://www.cerave.com/skincare/makeup-removers",
        ],
        "parser": "cerave",
    },
    "naturium": {
        "brand_name": "Naturium",
        "discovery": "shopify",
        "shop_domain": "naturium.com",
        "parser": "naturium",
    },
    "cosrx": {
        "brand_name": "COSRX",
        "discovery": "shopify",
        "shop_domain": "www.cosrx.com",
        "parser": "cosrx",
    },
    "first_aid_beauty": {
        "brand_name": "First Aid Beauty",
        "discovery": "shopify",
        "shop_domain": "www.firstaidbeauty.com",
        "parser": "first_aid_beauty",
    },
    "skinfix": {
        "brand_name": "Skinfix",
        "discovery": "shopify",
        "shop_domain": "skinfix.com",
        "parser": "skinfix",
    },
    # Korean/US-storefront Shopify brands added 2026-09-29. Every one publishes
    # a full INCI list in plain server-rendered HTML on its own product pages
    # (Anua does not -- INCI is image-only there -- so it is deliberately
    # absent). "skip_bundles" turns on the bundle/gift/duplicate-promo filter
    # (see _skip_shopify_product), which the older brands above predate.
    "medicube": {
        "brand_name": "Medicube",
        "discovery": "shopify",
        "shop_domain": "medicube.us",
        "parser": "medicube",
        "skip_bundles": True,
        "sleep": 1.5,
    },
    "round_lab": {
        "brand_name": "Round Lab",
        "discovery": "shopify",
        "shop_domain": "roundlab.com",
        "parser": "round_lab",
        "skip_bundles": True,
        "sleep": 1.5,
    },
    "skin1004": {
        "brand_name": "SKIN1004",
        "discovery": "shopify",
        "shop_domain": "www.skin1004.com",
        "parser": "skin1004",
        "skip_bundles": True,
        "sleep": 1.5,
    },
    "innisfree": {
        "brand_name": "Innisfree",
        "discovery": "shopify",
        "shop_domain": "us.innisfree.com",
        "parser": "innisfree",
        "skip_bundles": True,
        "sleep": 1.5,
    },
    "laneige": {
        "brand_name": "Laneige",
        "discovery": "shopify",
        "shop_domain": "us.laneige.com",
        "parser": "laneige",
        "skip_bundles": True,
        "sleep": 1.5,
    },
    "tatcha": {
        "brand_name": "Tatcha",
        "discovery": "shopify",
        "shop_domain": "tatcha.com",
        "parser": "tatcha",
        "skip_bundles": True,
        "sleep": 1.5,
    },
    "torriden": {
        "brand_name": "Torriden",
        "discovery": "shopify",
        "shop_domain": "torriden.us",
        "parser": "torriden",
        "skip_bundles": True,
        "sleep": 1.5,
    },
    # Kao's Curel (Japan-made line). Only /japanskincare/products/{category}/
    # {product}/ pages -- the US body-care pages under /en-us/products/ carry
    # no ingredient text at all (checked), so they're out of reach, and the
    # two-segment pattern also excludes the category hubs and the trial kit.
    # robots.txt (fetched 2026-09-29) disallows only error/thank-you/
    # unsubscribe pages.
    "curel_japan": {
        "brand_name": "Curél",
        "discovery": "sitemap",
        "sitemap_url": "https://www.curel.com/en-us/sitemap.xml",
        "url_pattern": re.compile(r"https://www\.curel\.com/en-us/japanskincare/products/[a-z0-9-]+/[a-z0-9-]+/"),
        "parser": "curel_japan",
    },
    "vanicream": {
        "brand_name": "Vanicream",
        "discovery": "sitemap",
        "sitemap_url": "https://www.vanicream.com/sitemap.xml",
        "url_pattern": re.compile(r"https://www\.vanicream\.com/product/[a-z0-9-]+"),
        "parser": "vanicream",
    },
    "cetaphil": {
        "brand_name": "Cetaphil",
        "discovery": "sitemap",
        "sitemap_url": "https://www.cetaphil.com/us/sitemap_0-product.xml",
        "url_pattern": re.compile(r"https://www\.cetaphil\.com/us/[a-z0-9/-]+/\d+\.html"),
        "parser": "cetaphil",
    },
    "aquaphor": {
        "brand_name": "Aquaphor",
        "discovery": "sitemap",
        "sitemap_url": "https://www.aquaphorus.com/sitemap",
        "url_pattern": re.compile(r"https://www\.aquaphorus\.com/products/aquaphor/[^<\s]+"),
        "parser": "aquaphor",
    },
}

# Checked and skipped 2026-09-28 (see README_cosmetic.md for the per-brand
# detail): La Roche-Posay, Aveeno, and Neutrogena all return 403 on a plain
# fetch (Akamai-style bot protection, same as CeraVe's owner L'Oreal and
# J&J); Paula's Choice's sitemap returns 200 with an empty body to a
# non-browser request (also bot-gated); Eucerin's US site redirects to a
# separate "select.eucerin.com" portal that isn't a normal product catalog.
# None of these were force-bypassed -- robots.txt-allowed-but-blocked in
# practice is still a stop, not a challenge to defeat.

# Same canonical active ids as app/src/db/actives.ts's cosmetic definitions,
# plus a few more real actives found in The Ordinary's actual catalog while
# building this (alpha arbutin, glycolic acid, squalane) — kept as a
# separate small addition here rather than expanding scope further.
COSMETIC_ACTIVES = {
    "niacinamide": ["niacinamide"],
    "azelaic-acid": ["azelaic acid"],
    "vitamin-c": ["ascorbic acid", "ascorbyl glucoside", "ascorbyl tetraisopalmitate"],
    "hyaluronic-acid": ["hyaluronic acid", "sodium hyaluronate"],
    "retinol-cosmetic": ["retinol"],
    "ceramides": ["ceramide"],
    "alpha-arbutin": ["alpha arbutin", "alpha-arbutin"],
    "glycolic-acid": ["glycolic acid"],
    "squalane": ["squalane"],
    # Added 2026-09-27 alongside the same additions in build_cosmetic_catalog.py.
    "peptides": ["palmitoyl pentapeptide", "palmitoyl tripeptide", "palmitoyl hexapeptide", "copper tripeptide", "copper peptide", "acetyl hexapeptide"],
    "bakuchiol": ["bakuchiol"],
    "tranexamic-acid": ["tranexamic acid"],
    "centella-asiatica": ["centella asiatica"],
    "panthenol": ["panthenol", "dexpanthenol"],
    "kojic-acid": ["kojic acid"],
    "mandelic-acid": ["mandelic acid"],
    "lactic-acid": ["lactic acid"],
    # Added 2026-09-29 while adding Aquaphor (a petrolatum-first brand) --
    # "petrolatum" already exists as a canonical active id (the FDA
    # skin-protectant one in app/src/db/actives.ts), reused here rather than
    # creating a duplicate id, so a cosmetic-sourced petrolatum product joins
    # the same evidence note and active-filter chip an FDA one would.
    "petrolatum": ["petrolatum", "petroleum jelly", "white petrolatum"],
}


def _get(url: str, retries: int = 3) -> str | None:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (skinwiz-catalog-pipeline/0.1)"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return None
            if attempt == retries - 1:
                return None
            if exc.code == 429:
                # Rate-limited (Skin1004 does this after a short burst): back
                # off for real, honouring Retry-After when it's a plain number.
                retry_after = exc.headers.get("Retry-After", "") if exc.headers else ""
                time.sleep(max(float(retry_after) if retry_after.isdigit() else 0, 20 * (attempt + 1)))
            else:
                time.sleep(1.5 * (attempt + 1))
        except Exception:
            if attempt == retries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def _get_bytes(url: str, retries: int = 3) -> bytes | None:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (skinwiz-catalog-pipeline/0.1)"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read(MAX_IMAGE_BYTES + 1)
                if len(data) > MAX_IMAGE_BYTES:
                    print(f"  skipping image {url}: over {MAX_IMAGE_BYTES} bytes", file=sys.stderr)
                    return None
                return data
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return None
            if attempt == retries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
        except Exception:
            if attempt == retries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def download_image(url: str, product_id: str) -> str:
    """Downloads a product photo into IMAGE_DIR, returns the root-relative
    app path to store in the CSV, or "" if the download failed (a missing
    photo is not fatal to the row -- the product still gets everything else,
    same as a product with no image_url at all)."""
    if not url:
        return ""
    ext_match = re.search(r"\.(jpg|jpeg|png|webp)(?:[?#]|$)", url, re.IGNORECASE)
    ext = ext_match.group(1).lower() if ext_match else "jpg"
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", product_id).strip("-").lower()[:80]
    filename = f"{slug}.{ext}"
    dest_path = os.path.join(IMAGE_DIR, filename)

    data = _get_bytes(url)
    if not data:
        print(f"  failed to download image for {product_id}: {url}", file=sys.stderr)
        return ""
    data = _resize_if_needed(data, ext)
    os.makedirs(IMAGE_DIR, exist_ok=True)
    with open(dest_path, "wb") as f:
        f.write(data)
    return f"{IMAGE_URL_PREFIX}/{filename}"


def _resize_if_needed(data: bytes, ext: str) -> bytes:
    """Downscales an oversized product photo to MAX_IMAGE_DIMENSION on its
    long edge -- a no-op (returns the original bytes unchanged) if Pillow
    isn't installed or the image is already small, so this never blocks a
    run, just leaves some images larger than ideal."""
    if Image is None:
        return data
    try:
        img = Image.open(io.BytesIO(data))
        if max(img.size) <= MAX_IMAGE_DIMENSION:
            return data
        img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION))
        out = io.BytesIO()
        save_format = "JPEG" if ext in ("jpg", "jpeg") else img.format or "PNG"
        if save_format == "JPEG" and img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(out, format=save_format, optimize=True, quality=85)
        return out.getvalue()
    except Exception as exc:
        print(f"  resize failed, keeping original: {exc}", file=sys.stderr)
        return data


def fetch_shopify_catalog(shop_domain: str) -> list[dict]:
    """Paginates a Shopify store's public /products.json -- no auth, no
    sitemap regex needed, and it comes with real product images already
    attached (product["images"][0]["src"]). Confirmed present and allowed
    by robots.txt on all three Shopify brands below before relying on it."""
    products: list[dict] = []
    page = 1
    while True:
        raw = _get(f"https://{shop_domain}/products.json?limit=250&page={page}")
        if not raw:
            break
        try:
            batch = json.loads(raw).get("products", [])
        except json.JSONDecodeError:
            break
        if not batch:
            break
        products.extend(batch)
        page += 1
        time.sleep(SLEEP)
    return products


# Real product paths sit at inconsistent depths under /skincare/ (see
# CeraVe's BRANDS comment), so this is a depth floor, not a fixed pattern --
# matches "/skincare/{cat}/{slug}" and deeper, excludes single-segment hub/
# filter pages like "/skincare/acne" or "/skincare/niacinamide".
HUB_LINK_PATTERN = re.compile(r'"(/skincare/[a-z0-9-]+/[a-z0-9-]+(?:/[a-z0-9-]+)?)"')


def fetch_hub_crawl_urls(hub_urls: list[str], domain: str) -> list[str]:
    """Fetches each hub page and extracts every quoted /skincare/... path
    with 2+ segments -- category hub pages embed the full product link set
    in their raw HTML even though the visible grid itself renders via JS
    (confirmed by comparing a plain fetch against what the rendered page
    showed). Some sub-category hubs slip through this depth floor (e.g.
    "/skincare/cleansers/facial-cleansers" is itself a link on other hub
    pages) -- harmless, since the per-product extractor rejects anything
    without a real Product JSON-LD block."""
    urls: set[str] = set()
    for hub_url in hub_urls:
        html = _get(hub_url)
        if not html:
            print(f"  failed to fetch hub {hub_url}", file=sys.stderr)
            continue
        for path in HUB_LINK_PATTERN.findall(html):
            urls.add(f"https://{domain}{path}")
        time.sleep(SLEEP)
    return sorted(urls)


def _finish_shopify_product(raw_ingredients_html: str, url: str, product_json: dict) -> dict | None:
    """Shared tail end of every Shopify extractor once it has isolated the
    raw ingredients HTML fragment -- strip tags/entities, apply the same
    length and bundle guards as the sitemap-based extractors above, then
    build the row from the Shopify product JSON (which already has a real
    sku and a real image, unlike the_ordinary/cerave which had to pull both
    out of page HTML)."""
    text = re.sub(r"<[^>]+>", " ", raw_ingredients_html)
    text = html_module.unescape(text)
    # Both First Aid Beauty and Naturium append a disclaimer inside the same
    # HTML block as the real ingredient list, separated by nothing more than
    # a <br> -- confirmed by inspecting a real fetched page for each, same
    # discipline as CeraVe's "please be aware" cut. Whichever phrase appears
    # first wins; a given page only ever matches one of its own brand's.
    text = re.split(r"the list of ingredients is subject to change|learn more about all our ingredients", text, flags=re.IGNORECASE)[0]
    text = re.sub(r"\s+", " ", text).strip(" ,.")
    # Skinfix's modal appends a bare 3-6 digit number after the last real
    # ingredient (e.g. "...Citric Acid. 2416") -- not part of the INCI list
    # on any page checked, so stripped rather than left as noise. Anchored
    # to a preceding period: a list ending in a colorant ("..., CI 77491")
    # must keep its number.
    text = re.sub(r"\.\s+\d{3,6}$", "", text).strip(" ,.")
    if not text:
        return None
    if len(text) > MAX_INGREDIENT_TEXT_LEN:
        print(f"  skipping {url}: extracted ingredient text implausibly long ({len(text)} chars)", file=sys.stderr)
        return None
    # Same bundle/kit signal as extract_product_the_ordinary: a real
    # single-product ingredient list is plain text with no leftover markup.
    if "&lt;" in text or "<" in text:
        return None
    # Skinfix bundle/set pages (e.g. "Winter Hydration Duo") concatenate each
    # contained product's own "Ingredients/Ingrédients:" sub-heading into one
    # block with no HTML markup between them, so the "<" check above doesn't
    # catch it -- caught by reading two real rows before trusting this brand
    # at scale. A real single-product ingredient list never contains this
    # literal heading text itself.
    if "ingredients/ingrédients" in text.lower():
        return None
    if _looks_like_multi_formula(text):
        return None

    active_ids = matched_active_ids(text)
    if not active_ids:
        return None

    variants = product_json.get("variants") or []
    sku = (variants[0].get("sku") if variants else "") or product_json.get("handle", "")
    if not sku:
        return None

    images = product_json.get("images") or []
    image_url = images[0].get("src", "") if images else ""

    # COSRX titles many of its promo-bundled SKUs with a leading
    # "($80+ Free Gift)"-style prefix on the *same* underlying product --
    # real, distinct SKUs (different promo threshold/price point), not a
    # bug, but the prefix is noise for a product name display.
    # \d* (not \d+) and the fullwidth pound sign both needed after finding
    # real "(Free Gift)" (no number) and "(￡70+ Free Gift)" variants that
    # the first pass of this regex missed.
    title = re.sub(r"^\(\s*[$£€￡]?\d*\+?\s*Free\s*Gifts?\s*\)\s*", "", (product_json.get("title") or "").strip(), flags=re.IGNORECASE)

    return {
        "product_ndc": sku,
        "niche": pick_niche(active_ids),
        "brand_name": title.strip() or "(unnamed product)",
        "manufacturer_name": product_json.get("vendor", ""),
        "active_ingredient_text": text,
        "active_ingredients_structured": ";".join(active_ids),
        "source_url": url,
        "image_url": image_url,
    }


def extract_product_naturium(html: str, url: str, product_json: dict) -> dict | None:
    # Verified against a real fetched page before trusting it: the theme
    # renders several accordions with the *same* "metafield-rich_text_field"
    # wrapper class (Benefits, How To Use, Ingredients), so anchoring on the
    # wrapper class alone would silently grab the wrong section depending on
    # document order -- anchor on the "INGREDIENTS" tab label first instead.
    match = re.search(r'INGREDIENTS</span>.{0,800}?metafield-rich_text_field"><p>(.*?)</p>', html, re.DOTALL | re.IGNORECASE)
    if not match:
        return None
    return _finish_shopify_product(match.group(1), url, product_json)


def extract_product_cosrx(html: str, url: str, product_json: dict) -> dict | None:
    # COSRX runs at least two different product-page templates -- found by
    # checking why several products whose titles obviously matched a
    # tracked active (a "Centella Blemish Cream", a niacinamide serum) came
    # back with zero matches. Template 1: same "same wrapper class,
    # different section" trap as Naturium above ("cb-body" also wraps the
    # "How to Use" accordion earlier in the page, so this anchors on the
    # "Ingredient List" tab label first). Template 2: an older
    # "Full Ingredients" modal with a differently-named wrapper
    # ("modal-body" vs "cb-body"). A third template exists too (confirmed
    # while investigating this) where the ingredient div is populated by
    # client-side JS only, with no server-rendered fallback -- a real,
    # accepted gap, same as CeraVe's JS-rendered category grids.
    match = re.search(r'Ingredient List</span>.{0,800}?cb-body">(.*?)</div>', html, re.DOTALL | re.IGNORECASE)
    if not match:
        match = re.search(r'Full Ingredients</button>.{0,800}?modal-body">(.*?)</div>', html, re.DOTALL | re.IGNORECASE)
    if not match:
        return None
    return _finish_shopify_product(match.group(1), url, product_json)


def extract_product_first_aid_beauty(html: str, url: str, product_json: dict) -> dict | None:
    match = re.search(r'Full Ingredients</p>.{0,500}?ingredients">(.*?)</div>', html, re.DOTALL | re.IGNORECASE)
    if not match:
        return None
    return _finish_shopify_product(match.group(1), url, product_json)


def extract_product_skinfix(html: str, url: str, product_json: dict) -> dict | None:
    # The theme also has a marketing "Free From" list (e.g. "x fragrance, x
    # essential oils, x silicones...") right next to this -- deliberately
    # not parsed as a separate authoritative claim; the app derives its own
    # free-from flags from the actual ingredient list instead (see
    # app/src/db/ingredient-flags.ts), which catches a brand's page being
    # wrong/outdated in either direction. "Full Ingredients</h2>" (the modal
    # header, appears twice per page for a responsive-breakpoint duplicate,
    # both identical) anchors past the reused metafield-rich_text_field
    # wrapper class the same way Naturium's "INGREDIENTS" label does.
    match = re.search(r'Full Ingredients</h2>.{0,1500}?metafield-rich_text_field"><p>(.*?)</p>', html, re.DOTALL | re.IGNORECASE)
    if not match:
        return None
    return _finish_shopify_product(match.group(1), url, product_json)


_BUNDLE_TITLE_WORDS = re.compile(
    r"\b(sets?|bundles?|kits?|duos?|trios?|gifts?|samples?|minis?|pouch|routine|collection|box|refills?|packette)\b",
    re.IGNORECASE,
)
_BUNDLE_TYPE_WORDS = re.compile(r"gift|gioft|bundle|\bsets?\b|gwp|merch|sample|packette|hidden|\bkit", re.IGNORECASE)
# Medicube wraps many real products in promo-listing copies titled e.g.
# "[Exclusive Deal] Amazon's #1 Beauty Brand | PDRN Pink Gel Cleanser" --
# same product, so stripped down to the real name rather than shown as-is.
_PROMO_TITLE_PREFIX = re.compile(r"^\s*(?:\[[^\]]*\]\s*)?(?:Amazon['’]s\s*#1\s*Beauty\s*Brand\s*\|\s*)?", re.IGNORECASE)


def _clean_promo_title(title: str) -> str:
    return _PROMO_TITLE_PREFIX.sub("", title).strip()


def _skip_shopify_product(product_json: dict) -> bool:
    """True for bundles, gift-with-purchase items, samples and merch. A kit's
    ingredient block concatenates several formulas (or is absent), so it can't
    be attributed to one product -- confirmed on Laneige's "#1. Radiance
    Serum ... #2 ..." kit blocks while building this."""
    title = _clean_promo_title(product_json.get("title") or "")
    if _BUNDLE_TITLE_WORDS.search(title):
        return True
    return bool(_BUNDLE_TYPE_WORDS.search(product_json.get("product_type") or ""))


def _looks_like_multi_formula(text: str) -> bool:
    """A leading Water/Aqua right after sentence punctuation more than once
    means several formulas were concatenated (a kit). Anchored to the start
    or a ./:/; so an ingredient like "Cocos Nucifera (Coconut) Water" inside a
    normal list doesn't trip it."""
    return len(re.findall(r"(?:^|[.:;#]\s*\d*\.?\s*)(?:water|aqua)\b", text, flags=re.IGNORECASE)) > 1


def _search_group(pattern: str, html: str, flags: int = re.DOTALL | re.IGNORECASE) -> str | None:
    match = re.search(pattern, html, flags)
    return match.group(1) if match else None


def _labelled_list_from_html(fragment: str) -> str | None:
    """Text of the first comma-heavy line following a "Full INCI" / "Full
    Ingredients" label. Block-level tags become line breaks first, so a label
    and its list can sit in adjacent <p>s, be split by <br>, or share one <p>
    with inline <strong>s inside the list."""
    text = re.sub(r"(?i)<\s*(?:br|/p|/div|/li|/h\d|/tr)\b[^>]*>", "\n", fragment)
    text = html_module.unescape(re.sub(r"<[^>]+>", " ", text))
    for label in re.finditer(r"(?i)full\s+(?:inci|ingredients?)\s*:?", text):
        for line in text[label.end():].split("\n")[:4]:
            line = re.sub(r"\s+", " ", line).strip()
            if line.count(",") >= 4:
                return re.sub(r"\s+,", ",", line)
    return None


def extract_product_medicube(html: str, url: str, product_json: dict) -> dict | None:
    # The full list lives in a hidden "full-ingredient-popup" dialog, a
    # single <p class="desc"> -- the page's other <p class="desc"> nodes
    # are marketing copy, hence anchoring on the dialog id first.
    raw = _search_group(r'id="full-ingredient-popup".{0,1500}?<p class="desc">(.*?)</p>', html)
    return _finish_shopify_product(raw, url, product_json) if raw else None


def extract_product_round_lab(html: str, url: str, product_json: dict) -> dict | None:
    # Read from the Shopify product JSON's own body_html rather than the
    # page: the same "<strong>Full Ingredients:</strong>" block is there,
    # without the page's JSON-escaped duplicates. body_html also carries an
    # "Active Ingredients:" line just above it, which the anchor skips.
    # Round Lab runs many description templates (found by checking why 46 of
    # 84 products came back empty on the first pass): the label is "Full
    # Ingredients:" or "Full INCI", as a <strong>, <h2> or plain text, with
    # attributes and inline <strong> tags scattered through the list itself,
    # and a few products only have a page-level tab with
    # class="full_ingredients". So: read the text after an explicit "Full
    # ..." label (never the "Active Ingredients" summary beside it), falling
    # back to that tab.
    raw = _labelled_list_from_html(product_json.get("body_html") or "") or _search_group(r'class="full_ingredients">(.*?)</p>', html)
    return _finish_shopify_product(raw, url, product_json) if raw else None


def extract_product_skin1004(html: str, url: str, product_json: dict) -> dict | None:
    # "Key Ingredients:" marketing copy is elsewhere on the page and
    # is not the INCI list -- the "FULL INGREDIENTS" tab label anchors past it.
    raw = _search_group(r'FULL INGREDIENTS</div>.{0,600}?metafield-rich_text_field"><p>(.*?)</p>', html)
    return _finish_shopify_product(raw, url, product_json) if raw else None


def extract_product_innisfree(html: str, url: str, product_json: dict) -> dict | None:
    raw = _search_group(r"Full Ingredient List:\s*</strong>\s*<br\s*/?>(.*?)</p>", html)
    return _finish_shopify_product(raw, url, product_json) if raw else None


def extract_product_tatcha(html: str, url: str, product_json: dict) -> dict | None:
    raw = _search_group(r'slot="header">Ingredients</span>.{0,300}?metafield-rich_text_field"><p>(.*?)</p>', html)
    return _finish_shopify_product(raw, url, product_json) if raw else None


def extract_product_torriden(html: str, url: str, product_json: dict) -> dict | None:
    raw = _search_group(r"Full Ingredient List:\s*<br\s*/?>\s*</strong>\s*<span[^>]*>(.*?)</span>", html)
    return _finish_shopify_product(raw, url, product_json) if raw else None


def extract_product_laneige(html: str, url: str, product_json: dict) -> dict | None:
    # Laneige's pages inline a JS object per product (the viewed one plus
    # every related/quick-view product), each with its own `handle:` and
    # `ingredients:` string -- so the list is anchored to THIS product's
    # handle, not just "the first ingredients string on the page", which
    # would silently attribute a neighbour's formula. The string is JSON-
    # escaped (\/, <), hence json.loads to decode it.
    handle = re.escape(product_json.get("handle", ""))
    raw = _search_group(rf'handle: "{handle}",(?:(?!\n\s*handle: ").)*?\bingredients: "((?:[^"\\]|\\.)*)"', html)
    if not raw:
        return None
    try:
        decoded = json.loads(f'"{raw}"')
    except json.JSONDecodeError:
        return None
    return _finish_shopify_product(decoded, url, product_json)


def extract_product_curel_japan(html: str, url: str) -> dict | None:
    # The list is a bare text node inside the "Ingredients" accordion panel,
    # lowercase INCI with no markup -- anchoring on the accordion button
    # label skips the FAQ accordion's "ingredients" question just below it.
    match = re.search(r'>Ingredients<span[^>]*>.*?</button></div><div[^>]*><div[^>]*class="br-accordion-item__content">(.*?)</div>', html, re.DOTALL)
    if not match:
        return None
    text = re.sub(r"<[^>]+>", " ", match.group(1))
    text = html_module.unescape(text)
    text = re.sub(r"\s+", " ", text).strip(" ,.")
    if not text or len(text) > MAX_INGREDIENT_TEXT_LEN:
        return None

    active_ids = matched_active_ids(text)
    if not active_ids:
        return None

    title_match = re.search(r"<title>([^<|]+)", html)
    brand_name = html_module.unescape(title_match.group(1)).strip() if title_match else "(unnamed product)"
    image_match = re.search(r'<img[^>]+src="(https://cdn\.shopify\.com/[^"]+)"', html)
    image_url = html_module.unescape(image_match.group(1)) if image_match else ""

    return {
        "product_ndc": "curel-jp-" + url.rstrip("/").rsplit("/", 1)[-1],
        "niche": pick_niche(active_ids),
        "brand_name": brand_name,
        "manufacturer_name": "Curél",
        "active_ingredient_text": text,
        "active_ingredients_structured": ";".join(active_ids),
        "source_url": url,
        "image_url": image_url,
    }


def extract_product_vanicream(html: str, url: str) -> dict | None:
    # No JSON-LD on this site at all (checked) -- identity comes from the
    # URL slug instead (same principle as CeraVe), and the photo from the
    # first gallery image on the page, which is consistently the plain
    # product-bottle shot on every page checked (matches the pattern of
    # taking image[0] on every other brand here).
    ingredients_match = re.search(r'panel-ingredients"><p>(.*?)</p>', html, re.DOTALL)
    if not ingredients_match:
        return None
    ingredients_text = re.sub(r"<[^>]+>", " ", ingredients_match.group(1))
    ingredients_text = html_module.unescape(ingredients_text)
    ingredients_text = re.sub(r"\s+", " ", ingredients_text).strip(" ,.")
    if not ingredients_text:
        return None
    if len(ingredients_text) > MAX_INGREDIENT_TEXT_LEN:
        print(f"  skipping {url}: extracted ingredient text implausibly long ({len(ingredients_text)} chars)", file=sys.stderr)
        return None
    if "&lt;" in ingredients_text or "<" in ingredients_text:
        return None

    active_ids = matched_active_ids(ingredients_text)
    if not active_ids:
        return None

    title_match = re.search(r"<title>([^<]+)</title>", html)
    brand_name = html_module.unescape(title_match.group(1)).replace("™", "").strip() if title_match else "(unnamed product)"

    image_match = re.search(r'<img[^>]+src="(https://www\.vanicream\.com/dynamic-media/product/images/[^"]+)"', html)
    image_url = html_module.unescape(image_match.group(1)) if image_match else ""

    product_id = "vanicream-" + url.rstrip("/").rsplit("/", 1)[-1]

    return {
        "product_ndc": product_id,
        "niche": pick_niche(active_ids),
        "brand_name": brand_name,
        "manufacturer_name": "Vanicream",
        "active_ingredient_text": ingredients_text,
        "active_ingredients_structured": ";".join(active_ids),
        "source_url": url,
        "image_url": image_url,
    }


def extract_product_cetaphil(html: str, url: str) -> dict | None:
    # Same schema.org JSON-LD identity pattern as The Ordinary (sku/mpn,
    # image array, brand.name). Ingredient list sits under a plain
    # "ALL INGREDIENTS" heading, not an accordion -- no wrapper-class reuse
    # trap here, checked against a real fetched page before trusting it.
    ingredients_match = re.search(r"<h2>ALL INGREDIENTS</h2>.{0,300}?<p>(.*?)</p>", html, re.DOTALL | re.IGNORECASE)
    if not ingredients_match:
        return None
    ingredients_text = re.sub(r"<[^>]+>", " ", ingredients_match.group(1))
    ingredients_text = html_module.unescape(ingredients_text)
    ingredients_text = re.sub(r"\s+", " ", ingredients_text).strip(" ,.")
    if not ingredients_text:
        return None
    if len(ingredients_text) > MAX_INGREDIENT_TEXT_LEN:
        print(f"  skipping {url}: extracted ingredient text implausibly long ({len(ingredients_text)} chars)", file=sys.stderr)
        return None
    if "&lt;" in ingredients_text or "<" in ingredients_text:
        return None

    active_ids = matched_active_ids(ingredients_text)
    if not active_ids:
        return None

    product_data = find_product_json_ld(html)
    if not product_data:
        return None
    sku = product_data.get("sku") or product_data.get("mpn")
    if not sku:
        return None
    image = product_data.get("image")
    image_url = image[0] if isinstance(image, list) and image else (image if isinstance(image, str) else "")

    return {
        "product_ndc": sku,
        "niche": pick_niche(active_ids),
        "brand_name": product_data.get("name", "").strip() or "(unnamed product)",
        "manufacturer_name": "Cetaphil",
        "active_ingredient_text": ingredients_text,
        "active_ingredients_structured": ";".join(active_ids),
        "source_url": url,
        "image_url": image_url,
    }


def extract_product_aquaphor(html: str, url: str) -> dict | None:
    # No Product JSON-LD on this site (only an ItemList/breadcrumb block) --
    # identity comes from a real data-product-id attribute instead (a UPC-
    # looking code, present on every product page checked), image from
    # og:image, same "use what's actually there" approach as Vanicream/CeraVe.
    ingredients_match = re.search(r'class="ingredients-wrapper"><p[^>]*>(.*?)</p>', html, re.DOTALL | re.IGNORECASE)
    if not ingredients_match:
        return None
    ingredients_text = re.sub(r"<[^>]+>", " ", ingredients_match.group(1))
    ingredients_text = html_module.unescape(ingredients_text)
    ingredients_text = re.sub(r"\s+", " ", ingredients_text).strip(" ,.")
    if not ingredients_text:
        return None
    if len(ingredients_text) > MAX_INGREDIENT_TEXT_LEN:
        print(f"  skipping {url}: extracted ingredient text implausibly long ({len(ingredients_text)} chars)", file=sys.stderr)
        return None
    if "&lt;" in ingredients_text or "<" in ingredients_text:
        return None

    active_ids = matched_active_ids(ingredients_text)
    if not active_ids:
        return None

    sku_match = re.search(r'data-product-id="([^"]+)"', html)
    if not sku_match:
        return None
    image_match = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    image_url = html_module.unescape(image_match.group(1)) if image_match else ""
    title_match = re.search(r"<title>([^<|]+)", html)
    brand_name = html_module.unescape(title_match.group(1)).strip() if title_match else "(unnamed product)"

    return {
        "product_ndc": "aquaphor-" + sku_match.group(1),
        "niche": pick_niche(active_ids),
        "brand_name": brand_name,
        "manufacturer_name": "Aquaphor",
        "active_ingredient_text": ingredients_text,
        "active_ingredients_structured": ";".join(active_ids),
        "source_url": url,
        "image_url": image_url,
    }


def matched_active_ids(ingredients_text: str) -> list[str]:
    lowered = ingredients_text.lower()
    return [aid for aid, needles in COSMETIC_ACTIVES.items() if any(n in lowered for n in needles)]


# Same "actual fit" reasoning as build_cosmetic_catalog.py's identical dict
# (duplicated here rather than shared, matching how COSMETIC_ACTIVES itself
# is already duplicated across the two scripts): ceramides, squalane,
# panthenol, centella asiatica, and hyaluronic acid are barrier/hydration
# ingredients first, not brightening ones -- a CeraVe-style ceramide
# moisturizer belongs under Dry Skin & Eczema, not Brightening & Texture.
NICHE_LEANS_SKIN_PROTECTANT = {"ceramides", "squalane", "panthenol", "centella-asiatica", "hyaluronic-acid", "petrolatum"}


def pick_niche(active_ids: list[str]) -> str:
    protectant_votes = sum(1 for a in active_ids if a in NICHE_LEANS_SKIN_PROTECTANT)
    return "skin-protectant" if protectant_votes > len(active_ids) - protectant_votes else "brightening-texture"


def find_product_json_ld(html: str) -> dict | None:
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL):
        try:
            # strict=False: CeraVe's Product JSON-LD embeds literal control
            # characters (real newlines) inside string values, which fails
            # strict JSON parsing — confirmed by hand before adding this.
            data = json.loads(block.strip(), strict=False)
        except json.JSONDecodeError:
            continue
        if data.get("@type") == "Product":
            return data
    return None


def extract_product_the_ordinary(html: str, url: str) -> dict | None:
    product_data = find_product_json_ld(html)
    if not product_data:
        return None

    ingredients_match = re.search(r'data-original-ingredients="([^"]*)"', html)
    if not ingredients_match:
        return None
    ingredients_text = html_module.unescape(ingredients_match.group(1))
    if len(ingredients_text) > MAX_INGREDIENT_TEXT_LEN:
        print(f"  skipping {url}: extracted ingredient text implausibly long ({len(ingredients_text)} chars)", file=sys.stderr)
        return None
    # Bundle/kit pages (e.g. "The Daily Set") concatenate several products'
    # ingredient lists into this one attribute, separated by embedded
    # &lt;strong&gt;/&lt;br&gt; markup for display formatting -- caught by
    # actually reading a rendered product card, not by reasoning about the
    # HTML alone. A real single-product ingredient list is a plain
    # comma-separated INCI string with no markup, so any HTML-entity marker
    # here is itself the signal that this page isn't one.
    if "&lt;" in ingredients_text or "<" in ingredients_text:
        return None

    active_ids = matched_active_ids(ingredients_text)
    if not active_ids:
        return None

    sku = product_data.get("sku") or product_data.get("mpn")
    if not sku:
        return None

    # JSON-LD "image" is a list of several photos (product shot, application
    # shot, before/after, infographics...) -- the first is consistently the
    # plain product-bottle photo on every page checked, so take just that one
    # rather than showing an infographic as the card thumbnail.
    image = product_data.get("image")
    image_url = image[0] if isinstance(image, list) and image else (image if isinstance(image, str) else "")

    return {
        "product_ndc": sku,
        "niche": pick_niche(active_ids),
        "brand_name": product_data.get("name", "").strip() or "(unnamed product)",
        "manufacturer_name": (product_data.get("brand") or {}).get("name", ""),
        "active_ingredient_text": ingredients_text,
        "active_ingredients_structured": ";".join(active_ids),
        "source_url": url,
        "image_url": image_url,
    }


def extract_product_cerave(html: str, url: str) -> dict | None:
    product_data = find_product_json_ld(html)
    if not product_data:
        return None

    # Bug found by hand-inspecting a rendered page before trusting this at
    # scale: originally cut at the first "<br" after the ingredients block,
    # but that tag's distance from the block varies wildly by page -- on
    # one product the nearest "<br" was 88,752 characters away (elsewhere
    # on the page entirely), so the "ingredient text" swept up nearly the
    # whole document. The reliable boundary is the block's own closing
    # "</div>"; a "please be aware ingredients are updated" disclaimer and
    # inline "<a href>" links to ingredient-detail pages both still land
    # inside that div on other products, so those are stripped explicitly
    # rather than relied on to be outside the boundary.
    ingredients_match = re.search(r'keyIngredients-details__content">(.*?)</div>', html, re.DOTALL)
    if not ingredients_match:
        return None
    ingredients_text = re.sub(r"<[^>]+>", " ", ingredients_match.group(1))
    # html.unescape handles &nbsp;/&amp;/etc -- found a live &nbsp; leaking
    # through into a rendered product card (a real, visible bug, not just a
    # theoretical one) because tag-stripping alone doesn't decode entities.
    ingredients_text = html_module.unescape(ingredients_text)
    ingredients_text = re.split(r"please be aware", ingredients_text, flags=re.IGNORECASE)[0]
    ingredients_text = re.sub(r"\s+", " ", ingredients_text).strip(" ,.")
    if not ingredients_text:
        return None
    if len(ingredients_text) > MAX_INGREDIENT_TEXT_LEN:
        print(f"  skipping {url}: extracted ingredient text implausibly long ({len(ingredients_text)} chars)", file=sys.stderr)
        return None

    active_ids = matched_active_ids(ingredients_text)
    if not active_ids:
        return None

    # No single unambiguous barcode: pages embed multiple (this product's
    # own, plus related-product carousel items), and JSON-LD here has no
    # sku/mpn field. The canonical URL is CeraVe's own stable identifier
    # for this product instead — still satisfies the "one distinct id per
    # product" principle even though it isn't a GS1 barcode.
    product_id = product_data.get("@id") or url

    # CeraVe's JSON-LD "image" entries are site-relative paths (unlike The
    # Ordinary's absolute URLs) -- confirmed by inspecting real output before
    # trusting it, same discipline as every other extraction bug found here.
    image = product_data.get("image")
    raw_image = image[0] if isinstance(image, list) and image else (image if isinstance(image, str) else "")
    image_url = f"https://www.cerave.com{raw_image}" if raw_image.startswith("/") else raw_image

    return {
        "product_ndc": product_id,
        "niche": pick_niche(active_ids),
        "brand_name": product_data.get("name", "").strip() or "(unnamed product)",
        "manufacturer_name": "CeraVe",
        "active_ingredient_text": ingredients_text,
        "active_ingredients_structured": ";".join(active_ids),
        "source_url": url,
        "image_url": image_url,
    }


EXTRACTORS = {
    "the_ordinary": extract_product_the_ordinary,
    "cerave": extract_product_cerave,
    "vanicream": extract_product_vanicream,
    "cetaphil": extract_product_cetaphil,
    "aquaphor": extract_product_aquaphor,
    "curel_japan": extract_product_curel_japan,
}

# Shopify extractors take (html, url, product_json) -- the product_json from
# /products.json already supplies identity/image/vendor, unlike the sitemap
# extractors above which have to parse all of that out of page HTML too.
SHOPIFY_EXTRACTORS = {
    "naturium": extract_product_naturium,
    "cosrx": extract_product_cosrx,
    "first_aid_beauty": extract_product_first_aid_beauty,
    "skinfix": extract_product_skinfix,
    "medicube": extract_product_medicube,
    "round_lab": extract_product_round_lab,
    "skin1004": extract_product_skin1004,
    "innisfree": extract_product_innisfree,
    "laneige": extract_product_laneige,
    "tatcha": extract_product_tatcha,
    "torriden": extract_product_torriden,
}


def main() -> None:
    # Silent-no-op-without-Pillow is deliberate (see the try/import at the
    # top) so a missing dependency never blocks a crawl -- but that silence
    # once caused a real regression: a run under plain `python3` (no venv,
    # no Pillow) quietly skipped every resize and re-bloated the already-
    # downloaded image set from 41MB back to 137MB, caught only by manually
    # re-checking file sizes after the fact. This is the "never again"
    # guard: still doesn't block the run, but it can't be missed in the log.
    if Image is None:
        print("WARNING: Pillow not installed -- images will NOT be resized (see requirements.txt). Run `pip install -r requirements.txt` in a venv first.", file=sys.stderr)

    rows: list[dict] = []

    for key, brand in BRANDS.items():
        if brand["discovery"] == "shopify":
            extractor = SHOPIFY_EXTRACTORS[brand["parser"]]
            print(f"Fetching Shopify catalog for {brand['brand_name']}...", file=sys.stderr)
            products_json = fetch_shopify_catalog(brand["shop_domain"])
            print(f"  {len(products_json)} products found", file=sys.stderr)

            if brand.get("skip_bundles"):
                # Real (non-promo-wrapped) listings first, so when the same
                # product appears under several promo handles the plain one is
                # the copy that survives the title-dedupe below.
                products_json.sort(key=lambda p: _clean_promo_title(p.get("title") or "") != (p.get("title") or "").strip())
                seen_titles: set[str] = set()
                kept = []
                for p in products_json:
                    if _skip_shopify_product(p):
                        continue
                    p["title"] = _clean_promo_title(p.get("title") or "")
                    key_title = re.sub(r"\W+", " ", p["title"].lower()).strip()
                    if key_title in seen_titles:
                        continue
                    seen_titles.add(key_title)
                    kept.append(p)
                print(f"  {len(kept)} after dropping bundles/gifts/duplicate promo listings", file=sys.stderr)
                products_json = kept

            pause = brand.get("sleep", SLEEP)
            for i, product_json in enumerate(products_json, 1):
                handle = product_json.get("handle")
                if not handle:
                    continue
                url = f"https://{brand['shop_domain']}/products/{handle}"
                html = _get(url)
                if html:
                    product = extractor(html, url, product_json)
                    if product:
                        # Always the canonical brand name, not the scraped
                        # Shopify vendor field -- found COSRX's own vendor
                        # field inconsistently cased ("COSRX Official" vs.
                        # "COSRX official") across its own catalog, which
                        # would otherwise show as two different-looking
                        # manufacturers on the site for the same real brand.
                        product["manufacturer_name"] = brand["brand_name"]
                        remote_image_url = product.get("image_url", "")
                        product["image_url"] = download_image(remote_image_url, product["product_ndc"])
                        time.sleep(SLEEP)
                        rows.append(product)
                if i % 20 == 0:
                    print(f"  {i}/{len(products_json)} pages checked, {len(rows)} matched so far", file=sys.stderr)
                time.sleep(pause)
            continue

        extractor = EXTRACTORS[brand["parser"]]

        if brand["discovery"] == "hub_crawl":
            print(f"Crawling category hubs for {brand['brand_name']}...", file=sys.stderr)
            domain = brand["hub_urls"][0].split("/")[2]
            urls = fetch_hub_crawl_urls(brand["hub_urls"], domain)
        else:
            print(f"Fetching sitemap for {brand['brand_name']}...", file=sys.stderr)
            sitemap_xml = _get(brand["sitemap_url"])
            if not sitemap_xml:
                print(f"  failed to fetch sitemap for {key}, skipping", file=sys.stderr)
                continue
            urls = sorted(set(brand["url_pattern"].findall(sitemap_xml)))
        print(f"  {len(urls)} candidate product URLs found", file=sys.stderr)

        for i, url in enumerate(urls, 1):
            html = _get(url)
            if html:
                product = extractor(html, url)
                if product:
                    product["manufacturer_name"] = product["manufacturer_name"] or brand["brand_name"]
                    remote_image_url = product.get("image_url", "")
                    product["image_url"] = download_image(remote_image_url, product["product_ndc"])
                    time.sleep(SLEEP)
                    rows.append(product)
            if i % 20 == 0:
                print(f"  {i}/{len(urls)} pages checked, {len(rows)} matched so far", file=sys.stderr)
            time.sleep(SLEEP)

    fieldnames = [
        "product_ndc", "niche", "brand_name", "manufacturer_name", "substance_name",
        "active_ingredient_text", "active_ingredients_structured", "dosage_form", "route",
        "marketing_category", "product_type", "finished", "listing_expiration_date",
        "package_ndcs", "purpose_text", "indications_and_usage", "inactive_ingredient_text",
        "spl_set_id", "effective_time", "source", "verified", "source_url", "image_url",
    ]
    with open("output/brand_direct_catalog.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            row.setdefault("niche", "brightening-texture")
            row["source"] = "brand_direct"
            row["verified"] = "true"
            for field in fieldnames:
                row.setdefault(field, "")
            writer.writerow(row)

    by_active: dict[str, int] = {}
    for row in rows:
        for aid in row["active_ingredients_structured"].split(";"):
            by_active[aid] = by_active.get(aid, 0) + 1

    print(f"\n{len(rows)} products matched (brand-direct, verified)")
    print(f"by active: {json.dumps(by_active, indent=2)}")
    print("output/brand_direct_catalog.csv written")


if __name__ == "__main__":
    main()
