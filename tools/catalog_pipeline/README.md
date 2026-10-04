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
  CSV row through before it becomes a product.
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
  51945-4), -10 in any other section unless it's a photo/render; name and
  caption words front/PDP, carton/container/product up, photo/render +12;
  DISC(ontinued), drug facts/DFB, back, side, barcode, insert,
  structure/figure down; a small penalty per position in the section. Score
  < 0 = nothing usable. The top 4 per label go to `spl_media_candidates.csv`;
  the app's image sync tries them in order (skipping any that 404 or are
  under 300 px). DailyMed only serves the newest SPL version, so every
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
