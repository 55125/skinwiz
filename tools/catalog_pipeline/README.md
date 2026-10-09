# build_acne_sun_catalog.py

Builds the OTC drug product catalog for every skin concern Actively Skin covers
from openFDA — project.md §6 MVP build order, step 1. No dependencies
beyond the standard library. Filename is historical (started as acne+sun
only, 2026-09-27); it now covers 7 categories — see "Scope, 2026-09-27"
below for which and why.

```bash
python3 build_acne_sun_catalog.py
```

Takes a few minutes: ~30 paginated pulls across all 7 purpose categories'
label universes, then batched NDC directory lookups to enrich each matched
product.

## Scope, 2026-09-27: every skin-related OTC category, not literally every OTC drug

Expanded from acne+sunscreen to cover every FDA OTC monograph category that
maps to a concern a consumer would actually browse a dermatology site for:
**Acne, Sunscreen, Antifungal** (athlete's foot/jock itch/ringworm),
**Antidandruff** (seborrheic dermatitis), **Anti-itch** (eczema/poison
ivy/insect bites), **Skin protectant** (dry skin/eczema/diaper rash/chapped
skin), **Antiperspirant**.

Deliberately excluded, even though technically skin-adjacent: **Antiseptic**
(25,104 labels — dominated by hand sanitizer/surgical scrub, general
hygiene rather than a skin concern), **External analgesic** (topical
musculoskeletal pain relief, not dermatology), **Antibacterial**
(redundant with Antiseptic), **First aid antibiotic** (wound care —
borderline in-scope, cut for this pass, revisit if a "cuts & wounds"
concern is wanted later).

## Why two openFDA endpoints, not one

`/drug/label.json` is the only endpoint with a `purpose` field — the actual
Drug Facts "Purpose" line — so it's the only reliable way to scope to
"Acne treatment" / "Sunscreen" specifically rather than every product that
happens to contain salicylic acid or zinc oxide (which are also used for
warts, dandruff, diaper rash, etc.).

But sampling before building this confirmed `openfda.product_ndc` — the
label endpoint's cross-reference to a clean product id — is only populated
on **roughly 35–40% of records**. The rest have an entirely empty `openfda`
block: no brand name, no NDC, nothing to hang a catalog row on.

`/drug/ndc.json` (the NDC directory) has clean `product_ndc`, `brand_name`,
`dosage_form`, and marketing-status fields for every record — but has no
`purpose` field at all, so it can't be used standalone to scope to a niche.

So the pipeline: scope by `purpose` on the label endpoint, keep only
records with a resolvable `product_ndc`, dedupe to one row per product
(latest label wins), then batch-enrich those specific NDCs against the
directory for `dosage_form`/marketing status. Records without a resolvable
NDC go to `acne_sun_unmatched.csv` instead of being silently dropped — they
still carry the free-text active-ingredient/purpose lines, useful for the
Phase 1 evidence table even without a linkable commerce product.

## Results (7-category run, 2026-09-27)

| | Count |
|---|---|
| Label records fetched, all 7 categories | 31,903 |
| ...with a resolvable product_ndc | 10,637 (matches `acne_sun_catalog.csv`) |
| ...without one | 21,266 (matches `acne_sun_unmatched.csv`), see DailyMed recovery below |
| Distinct products, acne | 841 |
| Distinct products, sunscreen | 5,833 |
| Distinct products, antifungal | 914 |
| Distinct products, antidandruff | 65 |
| Distinct products, anti-itch | 396 |
| Distinct products, skin protectant | 1,231 |
| Distinct products, antiperspirant | 1,357 |

(Original acne+sun-only run for reference: 20,481 labels, 6,674 resolvable, 98.6% dosage_form hit rate, 96.2% structured-strength hit rate — see git history for that run's full numbers.)

Sample rows (real data):

```
CeraVe Developed with Dermatologists Acne Control Cleanser | GEL | SALICYLIC ACID 20 mg/mL
Dr. Zenovia Acne Cleanser | LIQUID | BENZOYL PEROXIDE 100 mg/mL
Neutrogena Mineral Invisible Daily Defense Face Sunscreen Broad Spectrum SPF 30 | LOTION | TITANIUM DIOXIDE 49 mg/mL; ZINC OXIDE 216 mg/mL
```

## Known data-quality issues to design around

- **`brand_name` is self-reported marketing copy, not a clean product
  name.** Some entries are full taglines: e.g. one sunscreen's brand_name
  is `"FOREVER SKIN GLOW 24h wear radiant foundation Perfection and
  hydration Concentrated floral skincare with suncreen Broad spectrum SPF
  15 00"`. Don't display `brand_name` raw in the UI — it needs a cleanup
  pass (truncation heuristics, or cross-reference against retailer listing
  titles) before it's presentable.
- **Roughly two-thirds of the label universe has no resolvable NDC at all**
  (21,266 of 31,903 across all 7 categories) via openFDA's own SPL-to-NDC
  harmonization. **Partially closed 2026-09-27** by
  `resolve_unmatched_via_dailymed.py`, which hits DailyMed's own
  `packaging.json` per set_id instead — run against the full 7-category
  unmatched set, that resolved **4,747 more products** (483 acne, 4,084
  sunscreen, 2 antifungal, 6 anti-itch, 172 skin protectant — antidandruff
  and antiperspirant recovered none this round), taking the catalog from
  10,637 to **15,384 total matched rows** (15,247 after the app's own
  active-ingredient recognition filter drops a further 137 — see
  `app/README.md`). The remaining unresolved records return an empty
  `packaging.json` from DailyMed too, even when the DailyMed HTML page for
  the same set_id renders a real product page — the structured API just
  doesn't have current data for those specific SPL versions. Not worth
  chasing further without a different data source. One caveat on the
  DailyMed-recovered rows: only ~1% got a `dosage_form` from the
  NDC-directory enrichment step (vs. 98.6% for the primary openFDA-matched
  catalog) — these NDCs mostly aren't listed in openFDA's NDC directory
  either, so brand name and active ingredient are solid but dosage form is
  usually missing.
- **Ingredient-name normalization**: `substance_name` and
  `active_ingredients_structured` use FDA's raw naming, which includes
  synonym duplication (e.g. `OCTINOXATE` and `ETHYLHEXYL METHOXYCINNAMATE`
  are the same molecule). **Built 2026-09-27** in `app/src/db/actives.ts`
  (`matchActiveIds`) — 35 canonical actives across all 7 concerns, each
  with a synonym list; this is what the app's seed script runs every raw
  CSV row through before it becomes a product. Expanded 2026-10-08 to 92
  (bemotrizinol and the other UV filters, the remaining monograph actives
  found on unmatched labels, retinal/HPR and the PHA/LHA acids). UV filters
  are flagged `countsAnywhereListed`, so seed.ts also counts one found in a
  label's inactive list or a cosmetic INCI list.
- **`listing_expiration_date` is a recertification deadline, not a
  discontinuation flag.** `expired_listing_estimate` in
  `catalog_summary.json` is a rough proxy, not authoritative — it's 0 in
  this run because everything pulled happens to have a current listing;
  don't read that as "no discontinued products exist in this space."

## Files

- `output/acne_sun_catalog.csv` — 10,637 rows, the primary openFDA-resolved catalog across all 7 categories
- `output/acne_sun_unmatched.csv` — 21,266 rows with no resolvable NDC from openFDA, real ingredient/purpose data
- `output/dailymed_resolved_catalog.csv` — 4,747 more rows recovered from that unmatched set via DailyMed (see above); same column schema, seed.ts reads both
- `output/catalog_summary.json` — run stats for the primary build (by-niche breakdown)
- `output/curated_catalog.csv` — hand-picked products the bulk passes miss, built by `build_curated_catalog.py` from `curated_products.csv` (one reviewed row each, with a note on its source). seed.ts reads it first, so a curated row also replaces a bulk row with the same id, and it may list a product with no tracked active (a hydrocolloid patch, a plain lotion). To add one, add a row to `curated_products.csv` and rerun the script; for a drug row, then rerun `fetch_dailymed_media.py` for its package photo.

# build_rx_catalog.py (Rx catalog, 2026-10-02)

Prescription dermatology products for the Rx reference pages and the
clinician handout builder (business-plan.md §3). Scoped by a fixed list of
generics (topical retinoids, acne, rosacea, topical corticosteroids,
non-steroidal anti-inflammatories, antifungals, mupirocin / fluorouracil /
imiquimod / hydroquinone, and the orals dermatologists co-prescribe:
doxycycline, minocycline, sarecycline, spironolactone, terbinafine,
fluconazole; isotretinoin as informational only). See the script docstring
for the filters (Rx product type, topical/oral route, finished, still
marketed, original packager only).

```bash
python3 build_rx_catalog.py          # ~100 openFDA requests
```

Outputs `output/rx_catalog.csv` (one row per product NDC, with
`package_descriptions`, `marketing_category`, per-ingredient percent
strengths in `ingredients_json`) and `output/rx_label_sections.csv`
(indications, dosage & administration, boxed warning, contraindications,
warnings, pregnancy, lactation per SPL set id, each capped at 6,000
characters). Steroid potency classes are assigned at seed time from
`app/src/db/steroid-potency.ts`, not here.

Run 2026-10-02: 1,352 products (retinoid 112, acne 201, rosacea 35,
corticosteroid 444, non-steroidal 21, antifungal 114, other 54, oral 371 of
which 97 isotretinoin), 965 labels, 29 with a boxed warning. Skipped 1,590
listings for route (oral tretinoin, vaginal/ophthalmic/nasal/injectable
forms), 1,038 repackager listings, 5 combination orals, 2 ended listings.

Known data-quality issues: a handful of listings carry unit errors in their
filed strength (clobetasol spray filed as `.05 g/mL` = 5%, Wynzora as
`64 mg/g`, Psorcon cream as `5 mg/g`); they're kept as filed and the potency
mapping leaves them unclassified rather than guessing.

# fetch_otc_package_info.py

Package descriptions ("1 TUBE in 1 CARTON / 45 g in 1 TUBE") and marketing
category for the OTC drug rows, from the NDC directory, written to
`output/otc_package_info.csv` and joined by the seed on product_ndc (for
price per ounce, the homeopathic HSA exclusion and NDA/ANDA detection).
2026-10-02: 10,586 of 15,384 NDCs found (most DailyMed-resolved NDCs aren't
in the NDC directory; those stay unknown).

# DailyMed SPL pass: package images + inactive ingredients (2026-10-04)

Phase 1 catalog coverage for the FDA rows, from DailyMed's SPL XML
(public-domain FDA labeling). Stdlib only.

```bash
python3 fetch_dailymed_spl.py        # 1 request per set id, <=4.5/s, ~1 hour; resumable
python3 fetch_dailymed_media.py      # offline: output/spl_media.csv + spl_media_candidates.csv
python3 fetch_dailymed_inactive.py   # offline: output/dailymed_inactive_ingredients.csv
python3 build_unii_label_names.py    # offline: app/src/db/unii-label-names.json
python3 -m unittest discover -s tests   # also run by `npm test` in app/
```

- **`fetch_dailymed_spl.py`** downloads `/services/v2/spls/{setid}.xml` for
  every set id in `acne_sun_catalog.csv`, `dailymed_resolved_catalog.csv`
  and `rx_catalog.csv` into `cache/spl_xml/` (gzipped, ~100 MB, not
  committed). The cache is the checkpoint: re-running fetches only what's
  missing; 404s go to `cache/spl_missing.txt`. User-Agent
  `Actively catalog pipeline (hello@activelyskin.com)`, shared rate limiter,
  backoff on 429/5xx. One XML per label replaces a media.json pass: the XML
  lists the same image files plus the section each sits in and its caption
  (most of the signal), and carries the structured ingredient list too.
- **`fetch_dailymed_media.py`** scores every image (`spl_parse.score_candidate`):
  +10 inside the Package Label / Principal Display Panel section (LOINC
  51945-4), -1 in the SPL product data elements section (48780-1, where
  Galderma, Mayne and some Rx generics file all their carton art), -10 in
  any other section unless it's a photo/render; name and
  caption words front/PDP, carton/container/product up, photo/render +12,
  "label" +1.5 outside the display panel;
  DISC(ontinued), drug facts/DFB, back, side, barcode, insert,
  structure/figure down; a small penalty per position in the section. Score
  < 0 = nothing usable, with one exception (`spl_parse.usable_images`): when
  every packaging image in a label is marked DISC (the rest only inserts,
  structures, drug facts or barcodes -- Differin gel's label), the DISC
  images are usable anyway, since old artwork of the same product beats no
  photo. The top 4 per label go to `spl_media_candidates.csv`, with a
  `usable` flag; the app's image sync tries the usable ones in order
  (skipping any that 404 or are under 300 px). Hand-picked manufacturer
  photos in `image_overrides.csv` win over all of this at seed. DailyMed only serves the newest SPL version, so every
  candidate is from the current label.
- **`fetch_dailymed_inactive.py`** targets catalog rows with no usable
  inactive list (every DailyMed-resolved row; openFDA rows with no text or a
  run-on line with no separators) and writes the structured
  `<ingredient classCode="IACT">` list of the product whose NDC matches (or
  the label's only list), in label order with UNII codes, plus the Inactive
  Ingredients section text (source `section_text`, position 0) when present.
  The seed builds `product_ingredients` from the structured names and runs
  allergen / free-from matching over names + section text
  (`app/src/db/spl-inactive.ts`).
- **`build_unii_label_names.py`** learns label spellings for registry names
  ("VITAMIN A PALMITATE" -> retinyl palmitate, "EDETATE DISODIUM" -> disodium
  EDTA, ".ALPHA.-TOCOPHEROL ACETATE" -> tocopheryl acetate) from openFDA rows
  whose label text and SPL list line up position by position; only
  recurring, common spellings are kept, minus a hand-reviewed deny list.
  101 mappings from 826 aligned labels.

Run 2026-10-04: 15,846 set ids, 15,787 fetched, 59 gone from DailyMed (404).
Every fetched label embeds at least one image; 15,643 have a usable pick
(4,183 DailyMed-resolved, 10,522 openFDA, 938 Rx); 144 have only negative
candidates (drug-facts panels, inserts, structures). 10,532 labels have a
single candidate, 5,111 several. Inactive lists: 5,379 products gained one
(5,106 structured IACT matched by NDC, 272 section text only, 1 single-list
label); 11 labels have neither.

Pick quality, checked by eye on 60 random picks: ~65% show the product
front clearly at card size, ~20% are legible but busy (whole carton
dielines, front and Drug Facts side by side), ~15% poor (mostly blank
dielines, Drug Facts only). Every poor one was a label with a single image,
where no heuristic can do better. On 30 random multi-image labels the
heuristic chose the best available image in 26; the last tuning round
(front renders filed outside the display section, "product" over
"carton") fixed 3 of the 4 misses. The remaining kind of miss is a label
covering several products (Lamisil foot vs. jock itch), where images aren't
matched to NDCs. These are FDA label artwork, not retail photos, and the UI
captions them "Package image: FDA label via DailyMed".

Re-tune 2026-10-05 (section 48780-1): 15,644 -> 15,702 labels with a pick.
58 previously imageless labels recovered, 31 of them Galderma (Cetaphil,
Differin), the rest Mayne / Dr. Reddy's / Xiromed / Nizoral / Lamisil Rx and
OTC cartons; every one checked by eye was real carton, tube or label art
(sample: `output/picker_samples/recovered.png`). In 48780-1 the order
penalty is off (structures often come first). Names are now split at
letter/digit boundaries ("carton1sez", "carton50g", "Label18Front"),
except that carton/container/package words glued to a number don't count
inside the display panel (see below). Outside the display panel a single
"front and back" image keeps most of its front credit. Elsewhere:
hex/UUID file names no longer spell "df" (drug facts), "Velvet Fig" isn't a
figure, "Panel - 5 gr" isn't a side panel, "how to apply" / "step 3" count
as instructions, a "3 Pack" multipack doesn't earn the package bonus.
Only 3 existing picks changed (product photo over a blank dieline, a front
over an unnumbered label, a single lip balm over a 3-pack; see
`picker_samples/changed.png`). Counting numbered "Tube2" / "Box2" /
"Outer12" as carton/container words inside the display panel was tried
and dropped: it flipped 56 picks, about as many worse as better
(`picker_samples/rejected.png`). 85 labels still have no usable image:
mostly single images filed under Active Ingredient / Dosage sections
(PurMinerals compact dielines, drug-facts panels, blank dielines), which
stay at -10.

# build_product_merges.py: duplicate listings (2026-10-04)

Finds catalog rows that are the same retail product (any pack size): one FDA
product under several NDCs, near-duplicate names, and the same product as an
FDA listing, an Open Beauty Facts entry and/or a brand-site page. Reads the
seeded app DB (`app/data/skinwiz.db`, run `npm run db:seed` first) and
`../affiliate_feeds/output/product_barcodes.csv`. Rules live in
`product_merge.py` and are tested in `tests/test_product_merges.py`.

```bash
JEV_KEY_FILE=/path/to/.env python3 build_product_merges.py   # scores new pairs with Jev
python3 build_product_merges.py --no-jev                      # cached scores only
```

1. Candidates by blocks (exact name+labeler+form+strength, a shared real
   barcode or an OBF barcode that encodes an NDC, brand-anchor and
   same-strength buckets with similar names), never all pairs.
2. Exclusions: strength, SPF, percent, dosage form, brand, variant words
   (tinted, kids/baby, fragrance-free/scented, shades, flavors, skin type)
   and shade/model numbers.
3. Formula check on the full ingredient lists: differing allergen hits or
   low overlap = different (reformulated), whatever the names say.
4. Jev (`typesafe/jev-1.13`, OpenRouter `/systemone`), A/B and B/A. Auto:
   both runs >= 0.90 with matching lists, or a reliable shared barcode
   (>= 0.75, or >= 0.50 with identical names). Flagged: 0.50-0.90 or runs
   more than 0.2 apart. Exact-rule groups need no Jev call.
5. Union-find over auto pairs; a group with any conflicting pair is not
   merged. Canonical: full ingredient list > FDA label sections > retail
   photo > DailyMed artwork > source (openfda, dailymed, brand_direct,
   open_beauty_facts) > longer list > smallest id.

Outputs: `product_merges.csv` (auto tier; the seed sets
`products.canonical_id` from it), `product_merge_flagged.csv` (blank
`decision` / `decided_canonical_id` / `reviewer_notes` columns, filled by
`review_product_merges.py`), `product_merge_pairs.csv` (every scored pair;
doubles as the Jev cache, and keeps the scores of pairs a newer rule
excludes as tier `excluded`) and `product_merge_summary.json`. Undo a merge
by deleting its row (or setting a reviewed row's decision to
`keep_separate`) and reseeding.

## SPL titles and the review pass (2026-10-04)

openFDA's `brand_name` is often only the brand ("Dove", "Degree", "Cream"),
so every scent or shade of a line looked identical and the exact rule merged
them. `build_spl_titles.py` reads the DailyMed SPL document title of every
set id from the XML cache (`output/spl_titles.csv`, no network), and the
merge rules now use it: different variant words, numbers or (for identical
names) any identity word in the two titles = different products; a
brand-only name with no usable title is never merged; shade numbers in the
label artwork file names (`spl_media_candidates.csv`, "Shade 29.jpg") split
shade families. An automatic merge also needs the two ingredient lists to
match once naming noise is removed (INCI vs common names, UNII pigment names,
glued "Inactive ingredients:" prefixes, lot codes), and must pass the review
rules below for every pair in its group.

```bash
DAILYMED_CACHE_DIR=/path/to/cache python3 build_spl_titles.py   # only when the catalog's set ids change
python3 build_product_merges.py --no-jev
python3 review_product_merges.py     # decides every flagged pair, fills the decision columns
```

`review_product_merges.py` applies the documented rules in
`product_merge_review.py` (rule ids R1-R9, explained in `RULES` there and
in `output/product_merge_review.md`) and writes `decision`,
`decided_canonical_id` (the canonical of the whole final group) and
`reviewer_notes` ("<rule id>: <reason>"). Merges are transitive, so a merge
row that would join two products the rules keep apart goes to `needs_owner`
(R9). The seed applies `merge` rows from the flagged file on top of
`product_merges.csv` (`app/src/db/product-merges.ts`); `keep_separate`,
`reformulated` and `needs_owner` rows are never applied. Rerun the review
after every `build_product_merges.py` run (the build rewrites the flagged
file with empty decision columns).
