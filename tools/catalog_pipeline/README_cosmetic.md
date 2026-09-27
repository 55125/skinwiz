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
| Niacinamide | 500 |
| Hyaluronic Acid | 725 |
| Ceramides | 171 |
| Vitamin C (Ascorbic Acid) | 148 |
| Azelaic Acid (cosmetic) | 13 |
| Retinol (cosmetic) | 39 |

**1,227 distinct products** (by barcode) after junk filtering, all mapped
to the new **Brightening & Texture** concern (`brightening-texture`).
Azelaic acid's canonical active definition is shared with the drug catalog
(same molecule) — it's tagged under both `acne` and `brightening-texture`
categories in `app/src/db/actives.ts`, but a given cosmetic-sourced product
row only gets the `brightening-texture` concern in this first pass
(cross-listing a product under multiple concerns isn't built yet — see
`products.concernId`'s single-value limitation in schema.ts).

## Known limitations

- **Thin, non-US-filtered coverage.** Queries aren't restricted to
  `countries_tags=united-states` — that filter made coverage even worse in
  testing (OBF's country tagging is unreliable), so this pulls globally.
  Expect non-US brands and non-English product names in the results (real,
  not a bug — e.g. genuine German-market products from Balea).
- **No brand-direct layer yet.** The plan discussed alongside this build
  was to layer OBF (broad, unverified) with data sourced directly from top
  brands' own published ingredient pages (narrow, verifiable) — only the
  first layer is built. The second is future work.
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
