# build_cosmetic_catalog.py

Adds cosmetic-ingredient products (niacinamide, vitamin C, hyaluronic acid,
cosmetic retinol, ceramides, cosmetic-strength azelaic acid) from Open
Beauty Facts — closing the gap where a real, heavily-searched ingredient
like niacinamide has **no FDA drug-monograph status**, so it never appears
in `build_acne_sun_catalog.py`'s openFDA/DailyMed pipeline at all (that
pipeline only sees products with a Drug Facts panel). This was
project.md's original "Top 200-500 cosmetic INCI lists... Open Beauty
Facts" plan, run for the first time 2026-09-27.

```bash
python3 build_cosmetic_catalog.py
```

See also `build_brand_direct_catalog.py` — the higher-trust sibling layer
sourced directly from a brand's own product pages (The Ordinary, currently)
instead of crowd-edited data. Same active-ingredient scope, different
provenance, kept in a separate script/CSV/README section because the
extraction method (per-brand HTML scraping) is fundamentally different
from OBF's uniform search API.

## This is a different trust tier, on purpose

Open Beauty Facts is crowd-sourced — anyone can submit or edit an entry.
Spot-checking before writing this found real junk in it: a plain
niacinamide search returned a `"TESTBRAND"` / `"TEST Regression Cream"`
entry, and a targeted look at The Ordinary (40+ real SKUs) found only 14
OBF entries, some junk (a "product" literally named `www.THEORDINARY.COM`).

So every row this script produces carries `source=open_beauty_facts` and
`verified=false`, and the app renders an unmistakable "Community-sourced,
not FDA-verified" badge on both the product card and detail page — see
`app/src/db/schema.ts`'s `products.dataSource`/`verified` columns. This is
never blended with the openFDA/DailyMed rows without that visible
distinction. Basic junk filtering happens here too (`is_junk()`): reject
entries with "test" in the brand/name, missing name/brand, near-empty
ingredient lists, or OBF's own `completeness` score below 0.2 — none of
that makes the data verified, just less obviously broken.

## Product identity: barcode-keyed, same principle as the drug catalog

Each row is keyed by OBF's own barcode (`code`), mirroring `product_ndc`
for the drug catalog: one row per distinct barcode. A relaunch with new
packaging (which almost always gets a new barcode, per GS1 convention)
becomes a new row rather than silently overwriting the old one. A brand
quietly reformulating without changing its barcode won't be caught — an
accepted, documented gap, not an oversight.

## Results (run 2026-09-27)

| Active | Products matched |
|---|---|
| Niacinamide | 502 |
| Panthenol | 984 |
| Hyaluronic Acid | 730 |
| Lactic Acid | 522 |
| Ceramides | 174 |
| Peptides | 100 |
| Vitamin C (Ascorbic Acid) | 150 |
| Centella Asiatica (Cica) | 73 |
| Retinol (cosmetic) | 39 |
| Mandelic Acid | 17 |
| Azelaic Acid (cosmetic) | 13 |
| Bakuchiol | 11 |
| Kojic Acid | 7 |
| Tranexamic Acid | 9 |

**2,195 distinct products** (by barcode) after junk filtering, all mapped
to the new **Brightening & Texture** concern (`brightening-texture`).
Azelaic acid's canonical active definition is shared with the drug catalog
(same molecule) — it's tagged under both `acne` and `brightening-texture`
categories in `app/src/db/actives.ts`, but a given cosmetic-sourced product
row only gets the `brightening-texture` concern in this first pass
(cross-listing a product under multiple concerns isn't built yet — see
`products.concernId`'s single-value limitation in schema.ts).

### Second pass (same day): 8 more actives, plus real product images

Closed the same class of gap the original niacinamide search found — real,
heavily-searched cosmetic actives with no FDA drug-monograph status and
therefore no catalog presence: peptides (grouped from
`palmitoyl-pentapeptide-4`/`copper-tripeptide-1`/`acetyl-hexapeptide-8`,
the same way `app/src/db/actives.ts` already groups the aluminum-zirconium
antiperspirant variants), bakuchiol, tranexamic acid, centella asiatica,
panthenol, kojic acid, mandelic acid, and lactic acid. Every OBF tag above
was confirmed against a live `count` in the API before being added — no
guessed or dead tags. **`urea` was deliberately not added**: its INCI
substring collides with unrelated preservatives ("Diazolidinyl Urea",
"Imidazolidinyl Urea"), and `matched_active_ids`/`matchActiveIds` only do a
plain substring check, so adding it would have mislabeled every product
containing those preservatives as containing moisturizing urea. Fixing
that would need real exclusion logic, not just another synonym — parked,
not silently worked around.

Also added `image_url` to this script's OBF `fields` request and CSV
output (`image_front_url` — OBF's own front-of-pack photo), and to
`build_brand_direct_catalog.py`'s two extractors (each brand's own
JSON-LD `image` array, first entry — consistently the plain product-bottle
shot on every page checked, ahead of application photos and infographics
later in the array). `app/src/db/schema.ts`'s `products.imageUrl` and the
product card/detail page render it when present; 1,633 of 17,509 products
have one as of this pass — the ~15,255 openFDA/DailyMed rows have no image
field in either FDA source at all and fall back to a plain placeholder.

**OBF images are hotlinked directly from `images.openbeautyfacts.org`** —
that's the intended/designed reuse pattern for an open, ODbL-licensed
database with a public API built for exactly this. **Brand-direct images
are downloaded and self-hosted instead** (`download_image()` in
`build_brand_direct_catalog.py`, into `app/public/product-images/brand-direct/`,
committed to git like any other static asset) — those are commercial
product photography scraped off a retail page with no license to embed
live from the brand's own CDN, and hotlinking them would also mean a
product page silently breaks the moment the brand adds referrer-based
hotlink protection or reshuffles a URL. `app/src/db/seed.ts` stores
whatever string is in the CSV's `image_url` column as-is, so the
root-relative local path works identically to the old full URL with zero
app-side changes. 53 images, ~6.4MB total.

## Known limitations

- **Thin, non-US-filtered coverage.** Queries aren't restricted to
  `countries_tags=united-states` — that filter made coverage even worse in
  testing (OBF's country tagging is unreliable), so this pulls globally.
  Expect non-US brands and non-English product names in the results (real,
  not a bug — e.g. genuine German-market products from Balea).
- **`active_ingredient_text` is truncated to 500 characters** for display
  (full INCI lists can be very long) — but matching against
  `COSMETIC_ACTIVES` runs on the untruncated text before truncation, so
  truncation doesn't cause missed actives, only a shorter displayed list.

## Files

- `output/cosmetic_catalog.csv` — 1,227 rows; same core columns as the
  drug catalog CSVs plus `source` and `verified`, which `app/src/db/seed.ts`
  reads to set `products.dataSource`/`verified` instead of re-deriving
  active ids via text matching (this source's `active_ingredients_structured`
  already holds canonical active ids, not raw substance names).

---

# build_brand_direct_catalog.py

The higher-trust layer discussed alongside the above: sourced directly
from a brand's own product pages, not a crowd-edited database. Chosen
target — **The Ordinary** — is the exact brand the original gap was found
against (zero real entries existed for it before this work; Open Beauty
Facts itself only has 14 of its 40+ real SKUs, some junk).

```bash
python3 build_brand_direct_catalog.py
```

## Why this brand, and how it works

- `robots.txt` on theordinary.com allows product pages (only disallows
  cart/checkout/search/filter paths).
- Product pages are server-rendered — no JS execution needed. Each page
  carries a `schema.org/Product` JSON-LD block (name, sku/mpn, brand) and
  a `data-original-ingredients="..."` HTML attribute with the full INCI
  list, both extracted with plain regex, no HTML parser needed.
- Product identity uses the JSON-LD `sku`/`mpn` field — the manufacturer's
  own stable product code (same barcode-keyed-identity principle as the
  rest of the catalog).
- The full real catalog (102 US SKUs) comes from `sitemap-en_US.xml`, not
  a hand-picked subset — every product actually sold, not a curated sample.

## Results (run 2026-09-27)

39 of 102 real SKUs matched a tracked active after excluding bundle/kit
pages (see below; the rest use actives not yet in `COSMETIC_ACTIVES` or
are the dropped bundles — expected, not a bug):

| Active | Products matched |
|---|---|
| Hyaluronic Acid | 15 |
| Squalane | 14 |
| Niacinamide | 5 |
| Vitamin C (Ascorbic Acid) | 4 |
| Retinol (cosmetic) | 4 |
| Glycolic Acid | 3 |
| Alpha Arbutin | 1 |
| Azelaic Acid (cosmetic) | 1 |

Found and fixed a real bug while building this: the ingredient list
spells it `Alpha-Arbutin` (hyphenated), but the matcher's needle was
`"alpha arbutin"` (space) — missed every match until caught by inspecting
actual extracted output before running the full 102-page pass. Added
`alpha-arbutin`, `glycolic-acid`, and `squalane` as new canonical actives
(`app/src/db/actives.ts`) to cover what showed up in the real catalog.

## Second brand: CeraVe (added 2026-09-27)

Also server-rendered and robots.txt-allowed, but messier than The
Ordinary: its product-listing/category grids are client-rendered (Vue.js),
so only 9 product URLs were discoverable via its sitemap + static HTML
(depth-4 `/skincare/{category}/{subcategory}/{slug}` paths) — nowhere near
its full real catalog. A full crawl would need a JS-capable fetch
(Playwright) to render the category grids before extracting links; not
built. 9 of 9 matched a tracked active — real signature CeraVe formulas
(niacinamide + hyaluronic acid + ceramides together, repeatedly).

**A serious bug was caught here before it reached the database**, worth
recording in full: the first extraction attempt cut the ingredient text at
the first `<br` tag after the ingredients block, copying The Ordinary
script's approach. On most CeraVe pages that boundary sits right after a
short disclaimer paragraph — but on one product, the nearest `<br` in the
*entire rest of the page* was 88,752 characters away, so the "ingredient
text" swept up nearly the whole document. This silently inserted a
53KB garbage string into `products.active_ingredient_text` and made that
product's page render as an unstyled 11,000px wall of text — caught by
actually looking at a Playwright screenshot after seeding, not by the
curl/grep checks run beforehand, which found the right substrings amid
the noise and reported false positives. Fixed by bounding at the block's
own `</div>` instead (verified against both the pathological page and a
page that does have the inline disclaimer, stripping that and any nested
`<a href>` ingredient links explicitly rather than relying on the
boundary alone) and adding `MAX_INGREDIENT_TEXT_LEN` as a standing guard
against this bug class recurring silently.

Product identity: CeraVe's JSON-LD has no `sku`/`mpn` field, and the page
embeds several barcodes (this product's own plus related-product carousel
items) with no reliable way to tell which is which — so the canonical
product URL (`@id` in the JSON-LD) is used as the identifier instead.
Still one distinct id per product, just not a GS1 barcode for this brand.

## Two more bugs, both caught by reading real output before trusting it

Both found the same way as the `</div>`-boundary bug above: by actually
looking at a rendered card, not by reasoning about the extraction code.

- **Bundle/kit pages produce garbage, not a bug in the regex.** The
  Ordinary's "The Daily Set" concatenates three separate products'
  ingredient lists into one `data-original-ingredients` attribute,
  separated by embedded `&lt;strong&gt;`/`&lt;br&gt;` display markup. A
  real single-product ingredient list is a plain comma-separated string
  with no markup at all — so the fix isn't more parsing, it's detecting
  and skipping: any HTML-entity marker in the extracted text means the
  page isn't a real single product, and the row is dropped rather than
  half-parsed.
- **`&nbsp;` and other HTML entities survive tag-stripping.** Regexing out
  `<[^>]+>` removes tags but doesn't decode entities — a CeraVe sunscreen's
  ingredient text rendered with a literal `&nbsp;` visible on the homepage
  before this was caught. Fixed with Python's `html.unescape()` in both
  extractors (imported as `html_module` since the function parameter is
  already named `html`).

## Adding another brand

Add one `BRANDS` entry (sitemap URL + product-URL regex) and a matching
extractor function in `EXTRACTORS` if the site's JSON-LD/ingredient markup
differs from the two already handled (it has, both times). Check
`robots.txt`, confirm pages are server-rendered (no JS needed), and —
learned the hard way above — **actually look at a rendered product page
screenshot after seeding**, not just HTTP status codes and grep, before
trusting a new extractor at scale.

## Files

- `output/brand_direct_catalog.csv` — 53 rows (44 The Ordinary + 9 CeraVe,
  after dropping bundle/kit pages — see above; grew from 48 when the 8
  actives above were added), same schema as `cosmetic_catalog.csv`
  (`source=brand_direct`, `verified=true`) plus `source_url` (the exact
  page scraped) and `image_url` (each page's own JSON-LD product photo)
  columns.
