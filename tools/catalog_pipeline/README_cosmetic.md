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
app-side changes. 53 images, ~6.4MB total at the time of that pass (the
brand-direct set has since grown to 425 images, ~54MB, across nine brands).

**Open licensing question:** self-hosting fixes the reliability problem,
not the rights problem. These are the brands' copyrighted product photos,
and copying them onto our own server is still reproduction without a
license. Resolve this (brand permission, affiliate-network image feeds
that come with usage rights, or dropping brand-direct photos) before
treating the image set as launch-ready.

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

## Three more brands (same day): Naturium, COSRX, First Aid Beauty

All three turned out to run on **Shopify**, which changes the economics
versus The Ordinary/CeraVe above: every Shopify store exposes a public,
unauthenticated `/products.json` (confirmed allowed by each site's
robots.txt; Naturium's own `/agents.md` explicitly documents it as the
sanctioned agent-facing catalog endpoint) that gives full catalog discovery
**and** real product images in one paginated call — no sitemap regex, no
per-page JSON-LD image hunting. `fetch_shopify_catalog()` is the one shared
piece; each brand still needs its own extractor because the actual INCI
list isn't in that JSON at all — every theme checked renders it into the
product page as a metafield inside an "Ingredients" accordion, but the
exact wrapper markup differs per brand. Caught one real bug before it ran
at scale by testing against cached real pages first: Naturium's theme
reuses the *same* `metafield-rich_text_field` wrapper class for its
Benefits, How-To-Use, and Ingredients accordions (and COSRX reuses `cb-body`
the same way for How-To-Use and its actual Ingredient List) — anchoring on
the wrapper class alone would have silently grabbed the wrong section
depending on document order, so every extractor anchors on the tab's own
label text first. Also caught: Naturium and First Aid Beauty both append a
disclaimer sentence inside the *same* HTML block as the real ingredient
list (no tag boundary between them) — same "please be aware" pattern as
the original CeraVe bug, split off explicitly rather than left in.

**Skipped The Inkey List** even though it's also Shopify: its only
storefront is `uk.theinkeylist.com` (no separate US site), and per-market
cosmetic formulations can legitimately differ under UK/EU vs. US
regulatory limits — not something to quietly blend into a `brand_direct`
tier that implies this-is-what's-sold-here without flagging the caveat.

Results: 154 more products (207 total in this file) — Naturium 93, First
Aid Beauty 52, COSRX 7 (its catalog skews toward actives not yet tracked
here — snail mucin, propolis — not a bug, just outside `COSMETIC_ACTIVES`'
current scope).

## Actual-fit concern tagging (2026-09-28)

Every cosmetic-sourced product used to get hardcoded to Brightening &
Texture regardless of what it actually was — wrong for a CeraVe-style
ceramide moisturizer or a First Aid Beauty eczema cream. `pick_niche()`
(duplicated in both `build_cosmetic_catalog.py` and this script, same
convention as `COSMETIC_ACTIVES`) now decides per-product: ceramides,
squalane, panthenol, centella asiatica, and hyaluronic acid are
barrier/hydration ingredients first and vote toward Dry Skin & Eczema;
everything else still defaults to Brightening & Texture; ties go to
Brightening & Texture. `app/src/db/actives.ts` dual-categorized those five
actives (`["brightening-texture", "skin-protectant"]`) so their evidence
notes and concern-page filter chips show up correctly in both places. Real
effect on the already-seeded catalog (final numbers after Skinfix/
Vanicream below were added too): Dry Skin & Eczema grew from 1,340 to
2,619 products; Brightening & Texture dropped from 2,248 to 1,159.

## Ingredient-based "clean" and contact-allergen filters (2026-09-28)

Computed in `app/src/db/seed.ts` via `computeFreeFromFlags()`
(`app/src/db/ingredient-flags.ts`), not in this pipeline directly, but it
changed what this pipeline stores: openFDA's own **Inactive Ingredients**
section (`inactive_ingredient_text` — present on 99.8% of
`acne_sun_catalog.csv` rows, 0% of `dailymed_resolved_catalog.csv`, and
never previously read by `seed.ts` at all) is now combined with the active
line to give ~15k FDA products a real full ingredient list for the first
time, not just the Drug Facts active line. Also fixed the same day: OBF's
`active_ingredient_text` used to be truncated to 500 chars for display —
harmless for showing a card blurb, but a real accuracy risk once that same
field feeds an ingredient-presence check (a truncated list could produce a
false "fragrance-free" claim if the real mention fell past the cutoff).
Un-truncated at storage time; truncation now happens only at display time
via CSS `line-clamp` (already in place on the product card).

## Image resizing (2026-09-28)

First real crawl of the three Shopify brands came back with product photos
up to 2000x2000px (First Aid Beauty, ~2.5-3MB each PNG) for a thumbnail
that only ever renders at a few hundred px in a card — caught by checking
actual file sizes on disk after the run, not assumed. `download_image()`
now downscales anything over `MAX_IMAGE_DIMENSION` (1000px long edge) via
Pillow before saving (`requirements.txt`: `pip install -r requirements.txt`
in a venv); if Pillow isn't installed it's a silent no-op, not a crash —
images just stay larger than ideal rather than blocking a run, but **that
silence caused a real regression**: the Skinfix/Vanicream crawl ran under
plain system `python3` (no venv, no Pillow) and quietly re-bloated the
already-downloaded 41MB image set back to 137MB, caught only by manually
re-checking file sizes after the fact, not by anything in the run's own
output. `main()` now prints a loud warning at the top of the run if Pillow
is missing — still doesn't block, but can't be missed in the log anymore.

## Buy-direct links (2026-09-28)

Every `brand_direct` row's `source_url` (the exact manufacturer page
scraped) is now stored on `products.sourceUrl` and surfaced as a "Buy
directly from {brand}" link on the product page whenever no affiliate link
exists — honestly labeled as non-affiliate (no commission), since it's
just the real product page these rows were already pulled from. Not shown
for `open_beauty_facts` rows (not a place to buy) or `openfda`/`dailymed`
rows (no single product page to link to).

## Two more brands: Skinfix, Vanicream (2026-09-28)

Checked a longer "big brand" list first — La Roche-Posay, Aveeno, and
Neutrogena all return 403 on a plain fetch (Akamai-style bot protection,
same story as CeraVe's owner L'Oreal and J&J generally); Paula's Choice's
sitemap returns 200 with an empty body to a non-browser request (also
bot-gated); Eucerin's US site redirects to a separate "select.eucerin.com"
portal that isn't a normal product catalog. None of these were
force-bypassed. **Skinfix** turned out to be Shopify (same
`fetch_shopify_catalog()` path as Naturium/COSRX/First Aid Beauty) — its
theme has the same "reused wrapper class across sections" trap as
Naturium's, so the extractor anchors on the "Full Ingredients" modal
header, not the wrapper class alone. It also renders its own marketing
"Free From" list (fragrance, essential oils, silicones, phthalates,
microplastics, parabens, sulfates, PEGs, gluten) right on the page —
deliberately *not* parsed as an authoritative claim; the app derives its
own free-from flags from the actual ingredient list instead (see
`app/src/db/ingredient-flags.ts`), which catches the brand's own page
being wrong or outdated in either direction. **Vanicream** is not
Shopify and has no JSON-LD at all — sitemap-discoverable real
`/product/{slug}` URLs, ingredient list in a `panel-ingredients` div,
identity from the URL slug (no SKU field anywhere, same as CeraVe), image
from the first product-gallery `<img>` on the page. Notably, Vanicream's
own product pages declare a structured set of "free from" icon badges
(fragrance, dye, paraben, sulfate, lanolin, cocamidopropyl betaine,
formaldehyde...) — real signal that this brand is an unusually good fit
for the contact-allergen-avoidance filters, and independent confirmation
that deriving flags from the actual ingredient list (rather than trusting
either brand's marketing page) lands on the same answer. Results: 27
Skinfix, 9 Vanicream (two Skinfix bundle/set pages were caught and dropped
after the fact — see the extractor's `ingredients/ingrédients` guard, added
once these were found concatenating multiple products' ingredient lists
the same way The Ordinary's kit pages do, just without HTML markup between
them so the existing `<`-based guard didn't catch it).

## Korean and Japanese brands (2026-09-29)

No licensable K/J ingredient database was free to use, so this extends the
brand-direct scrape instead. Seven Shopify brands (`/products.json`
discovery, per-brand extractors that funnel into `_finish_shopify_product`)
plus one sitemap brand: **Medicube** (108 rows), **Round Lab** (75),
**SKIN1004** (56), **Torriden** (48), **Tatcha** (32), **Laneige** (24),
**Innisfree** (14), **Curél Japan line** (1). Brand-direct total: 781 rows.

- **Full INCI, not marketing lists.** Each theme buries the real list
  somewhere different (Medicube's `full-ingredient-popup`, Round Lab's
  "Full INCI" label or a page-level `full_ingredients` tab, SKIN1004's
  "FULL INGREDIENTS" metafield, Laneige's per-product inline JS object —
  anchored to the product's own handle, since related products are inlined
  too). Medicube lists each premix's water separately, so bare "Water" repeats
  many times in one list; that is the printed label, not a scrape error.
- **Bundles and kits are dropped** (`skip_bundles`): title/type heuristics,
  Medicube's promo-title wrapper is stripped and duplicate promo listings are
  de-duplicated. `_looks_like_multi_formula()` rejects any text with more than
  one leading Water/Aqua after sentence punctuation. It runs for **all**
  Shopify brands, so it also removed eight First Aid Beauty bundles/routines
  whose rows had been concatenating several formulas (54 to 46).
- **Not extractable, so absent:** Anua (INCI only exists inside images);
  Curél's US body-care pages have no ingredient text at all — only the
  `/en-us/japanskincare/` pages carry server-rendered INCI, and just one of
  those has a tracked active. Beauty of Joseon's product pages 404.
- **Rate limiting:** these stores return HTTP 429 to Python `urllib` after a
  few hundred rapid requests. The pipeline treats that as a real slow-down
  request rather than something to evade: `_get` backs off on 429 (the
  larger of `Retry-After` and 20s x attempt) and K/J brands use a 1.5s
  per-page pause. It clears after a few minutes.
- **Guards that fired:** four pages skipped for implausibly long ingredient
  text (8-13k chars, i.e. a page's whole ingredient section, not one list); images over 5 MB are skipped
  and the product keeps a placeholder.
- **Deferred:** Cafe24 brands (Some By Mi, Numbuzin, Isntree, Illiyoon) are
  Korean-only; they need the MFDS ingredient API (data.go.kr 15111774) to
  map Korean names to INCI.

## Adding another brand

Add one `BRANDS` entry and a matching extractor. For a sitemap-discoverable
brand: sitemap URL + product-URL regex, extractor takes `(html, url)`. For
a Shopify brand: `discovery: "shopify"` + `shop_domain`, extractor takes
`(html, url, product_json)` and can lean on `_finish_shopify_product()` for
the shared tail (tag-strip/unescape/length-guard/bundle-guard/active-match/
niche-pick). Either way: check `robots.txt`, confirm pages are
server-rendered (no JS needed), and — learned the hard way above, more than
once — **actually look at a rendered product page screenshot after
seeding**, not just HTTP status codes and grep, before trusting a new
extractor at scale.

## Files

- `output/brand_direct_catalog.csv` — 781 rows as of 2026-09-29 (44 The
  Ordinary, 67 CeraVe, 93 Naturium, 84 COSRX, 46 First Aid Beauty, 28
  Skinfix, 12 Vanicream, 40 Cetaphil, 9 Aquaphor, plus the K/J brands above;
  769 land in the DB — a few rows carry no active the seeder recognises, and
  a few share a SKU across size variants), same schema as `cosmetic_catalog.csv`
  (`source=brand_direct`, `verified=true`) plus `source_url` (the exact
  page scraped, also used as the buy-direct link) and `image_url` (each
  page's own photo, self-hosted — see above) columns.
- `output/cosmetic_catalog.csv` — 2,196 rows (unchanged count from the
  un-truncation fix above; only the stored ingredient text length changed).
