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
  (13,719 of 20,481). This isn't a bug to fix — it's how incomplete
  openFDA's own SPL-to-NDC harmonization is. Expect the real usable catalog
  to always trail the full label universe by roughly this ratio unless a
  DailyMed-based resolution pass is built later (DailyMed's `setid` linkage
  is more complete than openFDA's, per early spot checks, but pulling and
  parsing DailyMed SPL XML per set_id for ~14k records is a separate, much
  bigger task — not attempted here).
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

- `output/acne_sun_catalog.csv` — 6,674 rows, the actual catalog
- `output/acne_sun_unmatched.csv` — 13,719 rows, no resolvable NDC but real ingredient/purpose data
- `output/catalog_summary.json` — run stats
