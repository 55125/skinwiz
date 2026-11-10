# Search gaps

Products people searched for on the site that the catalog missed or under-covered,
taken from the admin dashboard's Searches list. Each pass adds what it can through
`curated_products.csv` (see the docstring in `build_curated_catalog.py`) and records here
what it couldn't add, and why.

Source order for each product: open sources first (DailyMed SPL for anything with a Drug
Facts panel, Open Beauty Facts for cosmetics), then the manufacturer's own US product page,
after checking its robots.txt. Never guess an ingredient list.

## Pass 2026-10-10

Searches list as of 2026-10-10 (count, latest results): vanicream 4/16, rogaine 3/0,
olay total 3/8, tatcha 2/40, sunscreen 2/7,033, olay regenerates 2/0, l'oréal moisturizer 2/5,
l'oréal 2/64, isdin 2/8, soap 1/49, olay regen 1/16, l'oréal night 1/1, lume deodorant 1/10,
k18 1/0, cerave 1/121, cetaphil 1/70, azelaic acid 1/37, anua moisturizer 1/3.

The "Searches with no results" panel needs the admin login, which this pass didn't use. The
zero-result terms visible in the Searches list are rogaine, olay regenerates and k18.

### Added (18 rows, all `cosmetic` / brand_direct)

Open Beauty Facts had none of these with a US ingredient list: the Anua entries carry no
list, and its L'Oréal and ISDIN entries are mostly non-US formulas. The one exception is
Revitalift 1.5% Hyaluronic Acid Serum (0071249377512), which OBF has with a list from the
pack. The lists below come from each brand's US product page. robots.txt on anua.us,
lorealparisusa.com and isdin.com allows product pages.

| Search | Product | Id | Source |
|---|---|---|---|
| anua moisturizer | Heartleaf 70% Intense Calming Cream | 8809640730696 | anua.com |
| anua moisturizer | Heartleaf 70% Daily Lotion | 8809640732799 | anua.com |
| anua moisturizer | 3 Ceramide Panthenol Moisture Barrier Cream | 8809640737251 | anua.com |
| anua moisturizer | Barrier Reboot Daily Moisturizer | anua-AA001755 (SKU, no barcode on page) | anua.com |
| anua | Heartleaf 77% Soothing Toner | 8809640731433 | anua.com |
| anua | Heartleaf Pore Control Cleansing Oil | 8809640732829 | anua.com |
| anua | Peach 70% Niacinamide Serum | 8809640733550 | anua.com |
| anua | Azelaic Acid 10 Hyaluron Redness Soothing Serum | 8809640737190 | anua.com |
| l'oréal night | Revitalift Anti-Wrinkle + Firming Night Cream | 0071249104590 | lorealparisusa.com |
| l'oréal moisturizer | Revitalift Triple Power Anti-Aging Moisturizer Fragrance-Free | 0071249396339 | lorealparisusa.com |
| l'oréal night | Revitalift Derm Intensives 0.3% Pure Retinol Night Serum | 0071249419182 | lorealparisusa.com |
| l'oréal | Revitalift Derm Intensives 1.5% Pure Hyaluronic Acid Serum | 0071249377512 | lorealparisusa.com (OBF agrees) |
| l'oréal moisturizer | Collagen Moisture Filler Day/Night Cream | 0071249668276 | lorealparisusa.com |
| isdin | ISDINCEUTICS Melatonik | isdin-2962 | isdin.com/us |
| isdin | ISDINCEUTICS Flavo-C Ultraglican Ampoules | isdin-3081 | isdin.com/us |
| isdin | ISDINCEUTICS Hyaluronic Concentrate | isdin-3805 | isdin.com/us |
| isdin | ISDINCEUTICS K-Ox Eyes | isdin-1510 | isdin.com/us |
| isdin | ISDINCEUTICS Hyaluronic Moisture Normal to Dry | isdin-4052 | isdin.com/us |

ISDIN's US pages publish no barcode, so those rows are keyed by ISDIN's own product code,
which also appears in its image file names. Fixes made to the brands' published lists
(missing or stray commas, a list printed with no separators) are described in each row's
`note`.

### Still missing

- **ISDIN Night Peel**: ISDIN's US sitemap (isdin.com/us/sitemaps/sitemap-us-product.xml)
  doesn't list it, so it isn't sold on ISDIN's US site. Nothing added.
- **Olay Regenerist** ("olay regenerates" 2/0, "olay regen" 1/16): a spelling miss, not a
  catalog gap. `lib/search-terms.ts` now maps regenerates/regenerating to Regenerist, so it
  finds the 16 Regenerist products. No rows added.
- **K18** (1/0): hair care. Out of scope at the time; in scope since 2026-10-21 (Hair Care concern), as a `cosmetic` row with niche `hair-care`.
- **Rogaine / minoxidil** (3/0): no rows added here. Michael chose a Hair Thinning & Loss
  concern as its own PR (branch claude/hair-loss-concern), which adds these rows. The DailyMed data a follow-up would need is below. All are
  OTC drug SPLs, so they'd be `drug` rows in `curated_products.csv` (product NDC as the id).

| Product | DailyMed set id | Product NDC | Strength |
|---|---|---|---|
| Men's Rogaine 5% Minoxidil Foam, Unscented | 1b5e2860-6855-4a65-8bbc-e064172a1adf | 69968-0031 | 50 mg/g (5%) |
| Women's Rogaine 5% Minoxidil Foam, Unscented | 4d328537-b7f5-43cc-9837-c5a0c6c390f8 | 69968-0030 | 50 mg/g (5%) |
| Men's Rogaine Extra Strength 5% Solution, Unscented | ccaecec5-5348-4b24-9190-5464c50f6d80 | 69968-0089 | 50 mg/mL (5%) |
| Women's Rogaine 2% Solution, Unscented | 8bf0000c-95f3-4a4d-830b-f5ac1539823d | 69968-0090 | 20 mg/mL (2%) |
| Kirkland Signature Minoxidil 5% Foam (Costco) | 90137bb7-f0e3-4c3c-9cfb-d4d5eed13a9c | 63981-098 | 5 g/100 g (5%) |
| Kirkland Signature Minoxidil 5% Solution (Costco) | ec4b79fd-f68b-4f8d-a173-983835bc82eb | 63981-032 | 5 g/100 mL (5%) |
| Equate Hair Regrowth Treatment 2% Solution (Walmart) | fd67b4d2-e71d-4145-bf69-437d0aa86cd3 | 79903-072 | 2 g/100 mL (2%) |

  Other current store-brand SPLs found (not checked for NDCs): Amazon Basic Care foam
  728db7d9-3f38-4006-8024-018f0d9c96da and solution 0ce77e6b-c4cf-49e2-8fd9-183286c26f8a;
  CVS men's foam f6320d33-92b1-44ef-97d8-56e78e83d417; Target up&up men's solution
  545e3e21-6333-4d85-8754-b7a6201234b7.

## Pass 2026-10-16

Zero-result searches in the admin dashboard as of 2026-10-16: rogaine, olay regenerates,
cantabaria, k18, cantabarai. The panel counts every search since launch, so it still shows
rogaine and olay regenerates, which were fixed after the last pass (the 13 minoxidil rows from
claude/hair-loss-concern and the Regenerist alias).

### Added

Nothing. The two Cantabria Labs misspellings (cantabaria, cantabarai) now map to the brand in
`lib/search-terms.ts`, but none of its products can be added to the catalog yet:

- **Cantabria Labs USA's site** (cantabrialabs.com/us/products/, allowed by robots.txt) sells
  two products, Heliocare and Heliocare Advanced Niacin B3. Both are oral dietary supplements,
  which this catalog leaves out.
- **Heliocare sunscreens** (360 Gel Oil-Free, Water Gel, Fluid Cream, Mineral Tolerance Fluid
  and the rest): DailyMed and openFDA have no label for any of them. A sunscreen sold in the
  US is an OTC drug and has to be listed, so these aren't sold in the US by Cantabria. The
  only Cantabria listing is NDC 82040-3161 (Industrial Farmaceutica Cantabria SA, titanium
  dioxide / zinc oxide cream, "drug for further processing"), which is a bulk ingredient, not
  a retail product. Listing an imported sunscreen as a cosmetic would misstate what it is.
- **Endocare** (Tensage, Radiance C, Renewal Retinol and the rest): listed only on Cantabria's
  global site, which is not a US product page; the US site doesn't sell them. Open Beauty
  Facts has no Endocare entries. Its four Cantabria entries are Spanish/Moroccan Heliocare
  packs, and none of them includes an ingredient list.
- **heliocare.com**, Heliocare's older US domain, returns a WordPress error page (HTTP 500)
  for every page, robots.txt included.

Recheck if Cantabria Labs USA adds topical products to its US site, or if a Heliocare SPL shows
up on DailyMed.

### Still missing

- **Cantabria Labs / Heliocare / Endocare**: see above.
- **K18** (1/0): hair care. Out of scope at the time; in scope since 2026-10-21 (Hair Care concern), as a `cosmetic` row with niche `hair-care`.

## 2026-10-21: hair care and oral care in scope

Michael moved hair care and oral care into scope ("k18", "colgate optic white toothpaste").
New niches: `hair-care` (cosmetics, curated rows) and `oral-care` (OTC anticavity,
antigingivitis and antisensitivity drugs from openFDA:
`python3 build_acne_sun_catalog.py --niches oral-care`).

## Pass 2026-11-05 (weekly check)

`/api/cron/search-gaps?days=7` (2026-10-30 to 2026-11-05): missing "beauty of hossein" (1),
low results "beauty of jos" (1 search, 1 result). Both are Beauty of Joseon, which the catalog
had one product for (Revive Eye Serum). "hossein" now maps to "joseon" in `lib/search-terms.ts`.

### Added (14 rows, all `cosmetic` / brand_direct)

Dynasty Cream, Green Plum Refreshing Toner and Cleanser, Apricot Blossom Peeling Gel, Glow
Replenishing Rice Milk, Red Bean Water Gel, Red Bean Refreshing Pore Mask, Radiance Cleansing
Balm, Ginseng Cleansing Oil, Calming Barrier Serum, Glow Serum, Glow Deep Serum, Light On Serum,
Pore Firming Red Bean PDRN Serum. Lists come from beautyofjoseon.com product pages, which
robots.txt allows. Open Beauty Facts has no ingredient list for the barcodes checked.

Photos: Open Beauty Facts first (5 rows, hotlinked), otherwise the brand's, self-hosted (9 rows).

### Still missing

- **Beauty of Joseon**: Revive Serum (Ginseng + Snail Mucin), Ginseng Essence Water, Ground Rice
  and Honey Glow Mask, Revive Firming Moisturizer. The store answered 429 to these on every
  pass, including one page every three minutes, so retry on a later day.
- **Beauty of Joseon sunscreens** (Relief Sun, Day Dew, Dayscreen, Tinted Mineral Dayscreen):
  DailyMed and openFDA searches found no label under the brand or these product names. A
  sunscreen sold in the US has to be listed as an OTC drug, so these aren't listed as cosmetics
  (same call as Heliocare above). Recheck under the labeler's name, which may not be the brand's.

### First source sync (`sync_sources.py --apply`)

Stopped at a 2-hour limit, partway through COSRX. New rows are additive; existing rows untouched.

| Source | New | Note |
|---|---|---|
| openFDA | 7 | 445 ids the pull no longer returns, kept (see below). An 8th "new" row, ZO Skin Health 42851-211, was the same label as 42851-202 under a new NDC and was dropped |
| OBF hair care | 8 | Two Polish rows later removed with the rest (below) |
| OBF cosmetics | not run | the pull stops at page 11 of a tag: OBF answers 401 past 10 pages of 100 (the hair care builder fetches big tags in English slices for this; the cosmetic builder doesn't yet) |
| Brands: The Ordinary, CeraVe, Naturium | 5, 0, 2 | One Naturium kit row removed; the sync now skips joined-list kits |
| Brands: COSRX and later | not run | |

The new drug rows haven't been through the DailyMed passes (inactive lists, photos) yet. Finish
the rest with `--sources obf` and `--sources brands --brands ...`, a few brands per run.

## 2026-11-08: Polish products out, and the openFDA ids that went missing

**Polish products** are kept out (Michael). OBF has many with an INCI list, which the English
filters read as English. `is_polish()` in `build_cosmetic_catalog.py` (590 GS1 prefix, sold only
in Poland, or a Polish name or Polish-language list) now runs in both OBF builders, and the
existing rows it matches were removed: 63 from `cosmetic_catalog.csv` and 13 from
`hair_care_catalog.csv` (71 products; some were in both).

**The 446 openFDA ids** a fresh pull no longer returns are listed one per row with what happened
in `output/openfda_gone_2026-11-08.csv`. Every one still has its label on openFDA; the label
record's `openfda` block, which carries the product NDC, came back empty, so the builder filed
them as unmatched. Checked against the NDC directory and DailyMed:

| Status | Count | Meaning |
|---|---|---|
| still_listed | 308 | Still in the NDC directory. openFDA lost the label-to-NDC link, the product didn't go anywhere. 60 of these have a marketing end date, all in the future (2026-11-13 to 2031) |
| delisted | 132 | Not in the NDC directory, and DailyMed lists no NDCs for the label: the listing was withdrawn or not recertified. Mostly sunscreens (83); Edgewell (Banana Boat, Hawaiian Tropic), Altona, P&G, Jafra lead |
| renumbered | 6 | ZO Skin Health Daily Mineral Sunshade shades, 42851-201..206, now 42851-210..215 on the same labels |

All 446 rows were kept: a full rebuild of `acne_sun_catalog.csv` would drop them, so don't run one
without `resolve_unmatched_via_dailymed.py` after it.

## 2026-11-10: "delisted" doesn't mean discontinued

Michael approved moving the 132 delisted products to the discontinued shelf if a random sample
confirmed they're no longer sold. It didn't, so none were moved.

Of the 132, 50 have a current listing from the same labeler with a similar name. Automatic
matching can't tell which are the same product, so none were merged. A brand-only name
("HAWAIIAN TROPIC"), a one-day vs. three-day miconazole, or a strength written differently
misleads it. Most of those listings are already in the catalog as their own rows.

The other 82 have no similar current listing from their labeler. In a random sample (seed
202611101), every product checked was still sold at US retailers in November 2026:

| Product | Delisted NDC | What we found |
|---|---|---|
| Old Spice Oasis with Vanilla Notes | 69423-701 | Relisted by P&G under labeler 84126 (84126-092); at Target, Walmart, Kroger, H-E-B |
| Old Spice Nightpanther | 69423-508 | Relisted as 84126-244; at Food Lion, Hannaford |
| Old Spice Fiji with Palm Tree | 69423-541 | Relisted as 84126-094; at Target, Walmart, ShopRite |
| Terrasil Skin Repair Maximum Strength | 24909-033 | At Walmart; a newer Terrasil Skin Repair listing is 24909-032 |
| Kerasal Athlete's Foot powder spray | 16864-110 | No new listing; still at CVS and H-E-B |
| Versed SPF 30 Replenishing Body Mineral | 73690-028 | No new listing; still at Walmart, sold out at one retailer |
| Drunk Elephant Umbra Tinte SPF 30 | 69455-167 | No new listing; in stock at some retailers, out of stock at Space NK |

So a dropped listing means either the labeler relisted the product under another NDC (P&G moved its
Old Spice line to a new labeler code) or stopped listing it while stock still sells through. The
discontinued shelf's retail rule (`lib/availability-rules.ts`: price sources stop finding it for 60
days) is the right signal for the second case. The first case is a relink to the new NDC, which
needs matching across labelers and a human check per product.

**ZO Skin Health** (6 rows) did move, as approved: 42851-201..206 are now merged into new rows
42851-210..215 through `tools/catalog_pipeline/ndc_successors.csv`, a hand-kept file the seed
applies with the merge pipeline's output. Old links redirect and saved items follow. The labels now
say SPF 50 (were SPF 45) with the same zinc oxide and titanium dioxide strengths.

## 2026-11-10: OBF cosmetics pull fixed

`build_cosmetic_catalog.py` stopped at page 11 of any ingredient tag with more than 1,000 products
(OBF answers 401 there). It now fetches those tags in English slices like the hair care builder;
the paging moved into `build_cosmetic_catalog.py` (`fetch_sliced`) and both builders use it. A slice
that itself has more than 1,000 products is still capped (panthenol's English-language slice: 1,626).

The first full pull returned 3,045 products, 991 of them new. They were **not** added: by barcode
prefix 301 are German, 128 Indian, and many are shampoos or makeup the active matcher files under
Brightening. Only 266 have a US/Canada prefix. The list, with each barcode's country, is in
`output/obf_cosmetics_pending_2026-11-10.csv` for a decision on which to add. Do that before the
next `sync_sources.py --apply --sources obf`, which would add all of them.
