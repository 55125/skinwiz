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
- **K18** (1/0): hair care, out of scope.
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
