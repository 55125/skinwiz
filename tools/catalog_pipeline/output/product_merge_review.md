# Duplicate-product review (2026-10-04)

Reviewer pass over `product_merge_flagged.csv` from the de-dup pipeline
(commit 83842c8). Decisions are made by explicit rules in
`product_merge_review.py`, applied by `review_product_merges.py`, and every
row carries its rule id in `reviewer_notes`, so a whole rule can be audited or
reverted at once.

**Principle.** A merge is correct only if the two listings are the same
retail product with the same formula (pack size may differ). Any real
ingredient difference keeps them apart. Private-label copies with the same
product name and the same list merge. The same formula sold under different
product names (or different store brands) stays separate.

## Headline

| | before review (83842c8) | after review |
|---|---|---|
| auto merge rows applied | 1,020 | 521 |
| reviewed merge rows applied | 0 | 1,060 pairs (1,812 rows) |
| products hidden as duplicates | 1,020 | 822 |
| merge groups | 591 | 584 |
| **listed OTC products** | **17,206** | **17,404** |

The listed count goes **up**, not down. Reviewing the flagged pairs led to
checking the auto tier too. **542 of its 1,020 merges are undone.** 462 of
them were clear errors, and the other 80 are conservative splits:

- 402: the SPL evidence names different variants (title variant words 274,
  titles differ 70, numbers 26, brand-only with no title 17, artwork shades
  15);
- 59: the lists differ;
- 1: DailyMed-checked;
- 80 conservative: 68 names differ by identity words, 12 split off a chain.

Most of the errors were scent and shade variants filed under a brand-only
openFDA name. openFDA
calls every Dove antiperspirant just "Dove". The DailyMed SPL titles show
these are "Invisible Sheer Cool", "Sheer Fresh", "Men+Care Clean Comfort",
Buildable Blur "110 Fair" vs "380 Deep", Degree "Apple & Gardenia" vs
"Adventure". The old exact rule merged all of them. Other wrong merges had
ingredient lists that differed by a dye, a preservative or a botanical
(Lipstick Queen shades with different D&C reds, Obagi with butylparaben on one
side only, Chapstick with menthol on one side only).

1,060 reviewed pairs were merged in their place. These are mostly white-label
medspa copies and labeler-name variants.

## Changes to the pipeline (rules fixed during review)

1. **SPL titles** (`build_spl_titles.py` → `spl_titles.csv`, read from the
   DailyMed XML cache with no network calls). Two FDA labels are different
   products when their titles differ by variant words, by numbers (shade or
   model, 48H vs 72H), or by any identity word when the two openFDA names are
   identical. NDC codes, pack sizes and revision dates are removed from titles
   first.
2. **Brand-only names without a usable title** ("Cremo Company", whose SPL
   title is just "Active ingredient") are never merged. The DailyMed artwork
   names for Cremo show these are scents (bourbon vanilla, fresh timber,
   whiskey cherry ...).
3. **Artwork shades.** Shade numbers in label artwork file names ("Shade
   29.jpg") split shade families. In a family that names two or more shades,
   a listing whose shade is unknown is not merged (Tula Skin Tint: 28 set
   ids, which had been 1 auto merge group).
4. **Lists must match for an auto merge.** Overlap ≥ 0.75 is no longer
   enough. Any item left after naming noise is removed sends the pair to
   review.
5. **Review rules gate the auto tier.** An auto pair, and every pair inside an
   auto group, must also be a `merge` under the review rules. Otherwise its
   edges go to flagged and are decided individually.
6. **Transitivity.** A reviewed merge that would put two products the rules
   keep apart into one group is not applied (R9). After reseeding, 0 of the
   1,104 non-merge flagged pairs share a group, and 0 of 584 final groups has
   a member with an ingredient its canonical's list lacks.
7. The Jev cache is kept for pairs a new rule excludes (tier `excluded` in
   `product_merge_pairs.csv`). No Jev calls were made, and all 8,250 paid
   scores are kept.

Because of 1-5, `build_product_merges.py --no-jev` now writes **2,164**
flagged pairs (was 3,277). All 3,277 original pairs are accounted for:

| original flagged pair | count |
|---|---|
| now excluded by SPL evidence (title variant words 881, titles differ 435, title numbers 137, brand-only no title 40): separate | 1,493 |
| still flagged: merge | 1,060 |
| still flagged: keep_separate | 621 |
| still flagged: reformulated | 102 |
| still flagged: needs_owner | 1 |

The other 380 rows of the new flagged file are auto pairs that the stricter
rules sent to review.

## Ingredient-list comparison (shared by all rules)

Two lists are compared with the actives left out, after removing **naming
noise only**:

- INCI vs common names (Simmondsia Chinensis Seed Oil = Jojoba Oil, Lepidium
  Sativum Sprout Extract = Garden Cress Sprout, Phenethyl = Phenylethyl
  Alcohol, Alumina = Aluminum Oxide, Euphorbia Cerifera Cera = Candelilla Wax,
  ...);
- UNII pigment names (Ferric Oxide Red / Ferrosoferric Oxide / CI 77491 =
  Iron Oxides);
- "Inactive ingredients:" prefixes glued to the first item, lot and formula
  codes parsed as items (FIL-1747, D214633-3), hyphenation;
- 1-2 letter typos in long names, but never across a digit (PEG-10 ≠ PEG-12);
- one item split or glued across a comma.

Anything left over is a real difference.

## Rules (rule id → decision)

| rule | decision | pairs | what it covers |
|---|---|---|---|
| R1-same-name-same-list | merge | 196 | same product name and agreeing SPL titles, same list; labelers may differ (manufacturer vs brand, "Cremo Compay" typo, repackagers such as A-S Medication). |
| R1a-white-label | merge | 628 | **Family: white-label medspa products.** Stay Ageless Tinted Mineral SPF 30 / Daily Moisturizer SPF 25 / Daily Moisturizer Mineral SPF 30, Dynamic SPF 55, Preserve & Protect and similar: one NDC product code (-0650, -2650, -2750, -5550) under many labeler codes, same name, same list. |
| R1b-brand-only-fda-name | merge | 39 | **Family: brand-only names** (Dove, Degree, Axe; Oxygen Development's "Cream"). Merged only when both SPL titles name the same variant (two "Dove Advanced Care Invisible Sheer Cool" labels; "Tarte BB tinted treatment primer" ×N). |
| R1c-generic-name | merge | 1 | drug-name-only product name (Clotrimazole, Granules USA / Granules Pharmaceuticals), titles agree. |
| R2-neutral-name-words | merge | 16 | names differ only by a brand word on one side ("Cetaphil Gentle Skin Cleanser" / "Gentle Skin Cleanser"), the drug active's name, a form word naming the shared dosage form, or a pack word (refill, travel, trial). |
| R3-spl-coding-white-label | merge | 178 | **Family: Stay Ageless Tinted Mineral SPF 30, DailyMed-coded copies.** The SPL structured list renames items and leaves out 5 coded items (styrene/acrylates copolymer, polyhydroxystearic acid, perilla extract, grape fruit cell extract, ethylene/propylene/styrene copolymer). Everything else matches the label-text copies, so it is one formula. The canonical is always a label-text copy (the fuller list), so no allergen is hidden. |
| R7a-single-ingredient | merge | 1 | Walgreens Petroleum Jelly, 100% white petrolatum, no inactives to differ. |
| R8-dailymed-checked | 1 merge, 5 reformulated | 6 | Age20s Essence Pact and Toenail Renewal Pen, decided by reading the SPL (below). |
| R4-same-name-list-differs | reformulated | 151 | same name, real list difference (Degree talc vs polyethylene, Dove ± isopropyl palmitate / hydroxystearic acid, Desitin talc vs corn starch, Carmex wax bases, Oxygen "Cream" bis-PEG-10 vs PEG-10 dimethicone, store-brand adapalene carbomer/NaOH). |
| R5-different-name | keep_separate | 945 | names or titles differ by identity words (scent, shade, line, audience, indication, store brand), different SPL artwork shades, or a shade family whose listing has no known shade. Includes "same formula, different name" (Golfblok vs Cycleblok, Secret vs Gillette ClearShield, Acne Buster vs AOAO Acne Buster). |
| R9-chain-conflict | needs_owner 3 (keep_separate for SPL shade evidence) | 3 | the pair matches, but merging it would also join two listings the rules keep apart. |

**Decision counts (2,164 flagged pairs):** merge 1,060 · keep_separate 945 ·
reformulated 156 · needs_owner 3.

**Per family:**

| family | pairs | merge | keep_separate | reformulated | needs_owner |
|---|---|---|---|---|---|
| white-label medspa (Stay Ageless, Dynamic, ...) | 825 | 807 | 18 | 0 | 0 |
| Tula skin tint shades | 259 | 0 | 259 | 0 | 0 |
| Oxygen Development "Cream"/"Powder" | 46 | 35 | 0 | 11 | 0 |
| Carmex | 21 | 1 | 12 | 8 | 0 |
| Unilever brand-only (Dove/Degree/Axe) | 14 | 4 | 1 | 9 | 0 |
| other | 999 | 213 | 655 | 128 | 3 |

The big Dove/Degree family (~750 flagged pairs before review) now sits mostly
in the pipeline's exclusions. The SPL titles name different scents, so those
pairs never reach review.

**Rule verification on samples (evidence read, not just the rule output):**

- R1a/R3: 20 pairs read in full (lists, titles, labelers). All were one
  formula. The R3 lists differ only by the 5 coded omissions plus renames.
- R1b: titles checked on the DailyMed pages of 3 Dove set ids (Invisible
  Sheer Cool ×2 vs Sheer Fresh) and against the SPL cache for all R1b pairs.
- R4: 30 read. Every one has a real ingredient difference. 1 is a parse
  artifact (Thank You Farmer: truncated glued names); not merging it is the
  safe outcome.
- R5: 40 read. Every one names a different product, or is the same product
  under a different name; see the spot check for conservative misses.

## Hard cases checked on DailyMed (R8, 6 requests to dailymed.nlm.nih.gov)

- Age20s Signature Essence Pact Intense Cover 17N: SPL 3c295f6b (67225-5211)
  and 43c48c66 (67225-5311, "Mini") list the same 43 inactives → **merge**.
  67225-5015 and 67225-5016 list fragrance, linalool and benzyl salicylate
  (5015 also DHHB), and neither SPL has them → **reformulated** against both.
  The old auto tier had merged 5015 with 5211 (5211 has no list in the
  catalog).
- Extra Strength Toenail Renewal Pen: SPL 4eea5ee7 (85966-010) lists thyme,
  cinnamon, clove and oregano oils. 85966-012 lists eucalyptus, manuka and
  lactic acid → **reformulated**.

## needs_owner (3)

1. `0363-0721` Petroleum Jelly (Walgreens) ↔ `0363-1804` Petroleum Jelly
   (Walgreens). Both are 100% white petrolatum, so they match. But 1804 is
   SPL "804A Walgreens Petroleum Jelly 2.5 oz tube" and its sibling 0363-1801
   is "801A Walgreens Petroleum Jelly". **Are 801A and 804A the same product
   in two tube sizes (then merge all three), or two products (e.g. a scented
   or baby version)?**
2. `54473-407` ↔ `54473-408` Sei Bella Tinted BB Moisturizing Cream
   (Melaleuca). Same name, same list, same 30 mL size. 407 has no SPL title.
   Its siblings are titled with shades "115 N" (406) and "410 N" (408).
   **Which shade is 407: the same as 406, as 408, or a third?** It is
   currently auto-merged with 406.
3. `59735-891` ↔ `59735-892` Sei Bella Tinted BB Moisturizing Cream (PML
   NYC, same product under another labeler). Same question for 891 vs
   890 ("115 N") / 892 ("410 N").

**Policy questions for the owner** (they decide whole rules, not rows):

- **Shades or flavors the data can't tell apart.** These are SPLs with
  identical names, titles and lists, and artwork that doesn't name the
  shade: Cargo Tinted Moisturizer ×4, Blistex Fruit Smoothies ×5, mally Face
  Defender ×8, Almay Clear Complexion Concealer ×6 (all titled "- FAIR"),
  Tarte BB primer ×10, PUR 4-in-1 "LINEN MN3" ×5. They stay merged (auto
  exact rule, R1b) because nothing we hold separates them, and their
  allergen data is identical. If shades must always be separate pages, the
  rule would be: same labeler + same name + same pack size + different set
  id = variant. That would also split some genuine duplicate SPLs (e.g.
  Dove "Shea Butter Dry Spray" vs "Dry Spray Shea Butter").
- **Store-brand generics.** These stay separate: "Leader Tolnaftate" vs
  "Meijer Tolnaftate", Amazon vs Top Care sport sunscreen D46. They are the
  same formula under different store-brand names, which matches the
  Stmb/Lyssera example. Say so if one page per generic formula is wanted
  instead.

## Spot check

**Round 1** was run against the 83842c8 auto tier with the first draft of the
review rules. It found the brand-only-name problem: 1,934 of 3,482 auto pairs
have SPL titles naming different variants. Examples: Dove/Degree/Axe scents,
Buildable Blur shades, Amazon Kids SPF 50 merged with Sport SPF 50, A-S
Medication Clotrimazole **Vaginal** Cream merged with Clotrimazole Cream, and
Tarte BB primer merged with Sugar Rush tinted moisturizer. It also found 46
group members whose lists had items missing from the canonical (dyes,
butylparaben, menthol, retinyl palmitate). This led to rules 1, 2, 4 and 5.

**Round 2.** 40 groups (20 auto-only, 20 with reviewed merges): Tula Skin
Tint (28 shades in one group, confirmed by the "ShadeNN.jpg" artwork) and
mally Face Defender ×8 (identical titles). This led to rule 3.

**Round 3.** 40 groups after rule 3: 38 confirmed one product and one
formula. 2 are suspected hidden variants (Blistex Fruit Smoothies ×5, Sei
Bella 406/407) with identical names, titles and lists.

**Round 4, final state.** 40 groups (20 auto-only, 20 with reviewed merges):
39 confirmed. 1 suspected hidden variant (Cargo Tinted Moisturizer ×4,
identical titles). The confirmed groups include sizes (Diaper Rash Cream
2-15 oz, Sun Bum, Naked Sundays 15/40 mL), manufacturer vs brand labeler
(Phofay, Laura Mercier, LBEL, L'Oréal/SICOS, Kate Somerville/Rare Beauty),
repackagers (Rugby → A-S Medication), and white-label families.

**Error rate (final rules, rounds 3 and 4, 80 groups):** 0 groups with any
ingredient difference. 0 of 584 final groups has a member whose list
includes something the canonical's list lacks. 3/80 (3.75%) are suspected
shade/flavor variants that no data field distinguishes (see the policy
question above).

**keep_separate, 20 sampled:** 17 are correct separations: Tula shades ×4,
Sheglam and Ciele shades, Flormar Mattifying vs Weightless ×2, Old Spice
scents, Obagi Nu-Derm FX vs Obagi-C, Secret vs Gillette ClearShield, Round Lab
stick vs gift set, Derma E Sun Defense vs Face, and others. 3 are
conservative misses where the duplicate stays listed: PUR "4 in 1 Makeup" vs
"4 in 1 Pressed Mineral", Balea "Shampoo Ultra Sensitive" vs its
"Reisegröße" (travel size), and CVS "Acne Treatment" vs "Acne Spot
Treatment". None hides a product.

**reformulated, 10 sampled:** 10/10 have a real list difference, or a
broken-parse list where not merging is the safe call (Thank You Farmer).
Examples: Clotrimazole ± sodium phosphate, Neutrogena Body Clear
(grapefruit-extract and UV-filter changes), Oil-Free Acne Wash (chamomile vs
glycerin), Sawyer Stay Put (propylene glycol esters), MyChelle (oryzanol and
rice-bran oil), CeraVe hyaluronic vs hydrolyzed hyaluronic acid.

## Reproduce

```bash
cd tools/catalog_pipeline
DAILYMED_CACHE_DIR=/path/to/cache python3 build_spl_titles.py   # titles from the SPL XML cache
python3 build_product_merges.py --no-jev                         # cached Jev scores only
python3 review_product_merges.py                                 # decisions + product_merge_review_summary.json
cd ../../app && npm run db:seed                                  # applies auto + reviewed merges
```

## Owner decisions (2026-10-04)

Applied by hand to the committed CSVs. **Re-apply these after any re-run of `build_product_merges.py` / `review_product_merges.py`**, which regenerate both files:

- `0363-0721` ↔ `0363-1804` Walgreens Petroleum Jelly: **merge** into `0363-0721` (same 100% petrolatum; "801A"/"804A" are pack codes).
- `54473-407` ↔ `54473-408` and `59735-891` ↔ `59735-892` Sei Bella Tinted BB Moisturizing Cream: **keep separate**, and the auto rows `54473-407 → 54473-406` and `59735-891 → 59735-890` were removed from `product_merges.csv` (listing has no shade name; don't guess a shade).
- Policy: store-brand generics with the same formula stay as separate pages; hidden shade/flavor families with identical data stay merged.
