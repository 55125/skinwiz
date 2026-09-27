# Affiliate feed integration

Joins affiliate-network product feeds (price, image, buy-link) onto the
openFDA acne+sun catalog from `tools/catalog_pipeline/` — project.md §6,
MVP build order step 2.

## No live data yet — by design

You don't have an approved affiliate account (Rakuten, CJ, Impact, Awin) or
Amazon PA API access yet, so there's nothing to pull for real. Rather than
wait, this builds the parts that don't depend on having one:

- `affiliate_schema.py` — a normalized product schema, with adapters that
  map each network's real, publicly-documented bulk-feed field names into
  it (Awin's "Product Feed" spec, CJ's Product Catalog Search / bulk feed).
  These are genuine field-name mappings, not guesses.
- `match_catalog.py` — the join logic: match a feed row to a catalog
  product, so it can carry a real price/image/buy-link.
- `generate_mock_feeds.py` — builds **synthetic** Awin- and CJ-format feed
  files from 9 real products already in the catalog, with deliberately
  reworded retailer-style titles (the way a real retailer's feed title
  differs from the FDA drug-facts brand name), so the matching logic has
  something realistic to prove itself against before real data exists.

**When a real affiliate account is approved:** replace
`generate_mock_feeds.py`'s output with the network's actual feed download
(scheduled bulk file or their search API), point `match_catalog.py` at that
file instead of `mock_feeds/*.csv`, and re-tune `AUTO_MATCH_THRESHOLD`
against real title variance. Nothing else in the pipeline needs to change —
that's the point of the adapter layer.

Amazon PA API isn't adapted here: it's a signed JSON REST API, not a bulk
feed, requires an approved Associates account with ongoing qualifying
sales to keep access, and per project.md §6 that requirement makes it a
weak pre-launch fit anyway.

## Correction to project.md §6: NDC↔UPC isn't a reliable join key

The original brief's data-sourcing table lists "Barcode matching — Drug
NDC↔UPC mapping" as the mechanism for auto-linking the OTC catalog to
affiliate buy-links. That's not reliable for retail OTC products: the
"NDC-to-UPC" numeric conversion formulas that exist (e.g.
`"3" + 11-digit-NDC + checksum`) are a pharmacy point-of-sale convention
for prescription vials relabeled in-store — not how manufacturer-branded
retail products like a CeraVe cleanser or Neutrogena sunscreen get their
UPC. Those products carry their own independently-assigned GS1 UPC that
has no mathematical relationship to their NDC. Our catalog's `product_ndc`
column can't be converted into a UPC to join against a feed's GTIN field.

**What actually works, built here instead:** fuzzy text matching on
product title + brand, with an active-ingredient cross-check, landing
low-confidence matches in a manual-review queue rather than auto-linking
them. This mirrors how affiliate/product matching is done in practice at
this scale (text/brand matching plus human QA), not a barcode shortcut.
If real feeds do provide clean GTINs for some products, the code already
prefers an exact GTIN match first — it just can't be the primary strategy.

## A real matching bug found and fixed while building this

First version scored titles with `difflib.SequenceMatcher` (character
sequence overlap) plus a brand-name bonus. Tested against the 9-product
mock feed and **2 of 9 products matched wrong** — e.g. a reworded "CeraVe
Acne Control Face Wash with Salicylic Acid" title matched to an unrelated
"Defense Acne Care 2% Salicylic Acid" product instead of the real CeraVe
product, because `SequenceMatcher` penalizes reordered words heavily even
when they share the same key terms, and the +0.15 brand bonus wasn't
enough to overcome that gap.

Fixed two ways, both now in `match_catalog.py`:
1. **Active-ingredient pre-filter**: if the feed text names an active
   ingredient (salicylic acid, benzoyl peroxide, adapalene, etc.), only
   consider catalog rows sharing that active before scoring similarity at
   all. This is what caught the other wrong match in testing (a Neutrogena
   adapalene product matching a Neutrogena benzoyl-peroxide product on
   title alone).
2. **Token-set (Jaccard) similarity instead of character-sequence
   similarity** — order-independent, so reworded retail titles that share
   the same key words score correctly.

After both fixes: 18/18 mock feed rows (9 products × 2 networks) matched
to the correct catalog product. `AUTO_MATCH_THRESHOLD = 0.30` is tuned
against this one small, deliberately-adversarial test set — re-validate it
once real feed data exists; retail titles in the wild will be noisier.

## Run it

```bash
python3 generate_mock_feeds.py   # writes mock_feeds/*.csv
python3 match_catalog.py         # writes output/matched_catalog.csv, output/needs_review.csv
```

## Files

- `output/matched_catalog.csv` — feed rows that auto-matched (score ≥ threshold)
- `output/needs_review.csv` — feed rows that didn't clear the threshold, for manual QA
- `output/match_summary.json` — counts
