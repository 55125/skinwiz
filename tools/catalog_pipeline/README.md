# build_acne_sun_catalog.py

Builds the actual OTC drug product catalog for the acne+sun niche from
openFDA — project.md §6 MVP build order, step 1. No dependencies beyond the
standard library.

```bash
python3 build_acne_sun_catalog.py
```

Takes a few minutes: ~21 paginated pulls of the full `Acne treatment` +
`Sunscreen` label universe (20,481 label records), then batched NDC
directory lookups to enrich each matched product.

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

## Results (run 2026-09-27)

| | Count |
|---|---|
| Label records fetched (Acne treatment + Sunscreen) | 20,481 |
| ...with a resolvable product_ndc | 6,674 (matches `acne_sun_catalog.csv`) |
| ...without one | 13,719 (matches `acne_sun_unmatched.csv`) |
| Distinct products, acne | 841 |
| Distinct products, sunscreen | 5,833 |
| Rows with dosage_form after NDC enrichment | 6,581 / 6,674 (98.6%) |
| Rows with structured active-ingredient strength | 6,423 / 6,674 (96.2%) |

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
- **~67% of the niche's label universe has no resolvable NDC at all**
  (13,719 of 20,481) via openFDA's own SPL-to-NDC harmonization. **Partially
  closed 2026-09-27** by `resolve_unmatched_via_dailymed.py`, which hits
  DailyMed's own `packaging.json` per set_id instead — that resolved
  4,567 more products (483 acne, 4,084 sunscreen) from the 13,719
  unmatched, a ~33% recovery rate, taking the catalog from 6,674 to 11,241
  products. The remaining ~67% of *that* gap returns an empty
  `packaging.json` from DailyMed too, even when the DailyMed HTML page for
  the same set_id renders a real product page — the structured API just
  doesn't have current data for those specific SPL versions. Not worth
  chasing further without a different data source. One caveat on the
  recovered rows: only ~1% got a `dosage_form` from the NDC-directory
  enrichment step (vs. 98.6% for the original catalog) — these NDCs mostly
  aren't listed in openFDA's NDC directory either, so brand name and active
  ingredient are solid but dosage form is usually missing.
- **Ingredient-name normalization is still needed.** `substance_name` and
  `active_ingredients_structured` use FDA's raw naming, which includes
  synonym duplication (e.g. `OCTINOXATE` and `ETHYLHEXYL METHOXYCINNAMATE`
  are the same molecule). A synonym map is needed before this feeds the
  Phase 1 evidence-grading table, or the same active will look like two.
- **`listing_expiration_date` is a recertification deadline, not a
  discontinuation flag.** `expired_listing_estimate` in
  `catalog_summary.json` is a rough proxy, not authoritative — it's 0 in
  this run because everything pulled happens to have a current listing;
  don't read that as "no discontinued products exist in this space."

## Files

- `output/acne_sun_catalog.csv` — 6,674 rows, the primary openFDA-resolved catalog
- `output/acne_sun_unmatched.csv` — 13,719 rows with no resolvable NDC from openFDA, real ingredient/purpose data
- `output/dailymed_resolved_catalog.csv` — 4,567 more rows recovered from that unmatched set via DailyMed (see above); same column schema, seed.ts reads both
- `output/catalog_summary.json` — run stats for the primary build
