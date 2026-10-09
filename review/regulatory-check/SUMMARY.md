# Regulatory claims check: summary

Checked 2026-10-09 against primary sources: eCFR, the FDA OTC monograph orders (CARES Act deemed final orders), Drugs@FDA and DailyMed labels. Each verdict, with its source link, is in `M-results.md`, `AG-results.md` and `U-results.md` in this folder. The research-evidence claims are not covered here; Michael is checking those in OpenEvidence.

| Section | Checked | Confirmed | Corrected | Cite only | Unsupported |
|---|---|---|---|---|---|
| M: FDA ranges and citations | 37 | 17 | 8 | 12 | 0 |
| A + G: regulatory status lines, product-page copy | 85 | 68 | 17 | 0 | 0 |
| U: label-based usage guidance (not public yet) | 56 | 49 | 6 | 0 | 1 |
| **Total** | **178** | **134** | **31** | **12** | **1** |

## Changes that alter what the site shows

**Wrong badges (code fixes):**
- **Avobenzone (M-05):** the allowed range is up to 3% with no minimum. The site's 2% floor marks sunscreens under 2% as "Below".
- **Zinc oxide as a skin protectant (M-15):** 1–25%, and above 25% up to 40% in ointments. 40% diaper creams are marked "Above".
- **Pyrithione zinc (M-23, A-68):** 0.3–2% rinse-off for dandruff, 0.95–2% for seb derm, and 0.1–0.25% leave-on. Leave-on products are marked "Below".
- **Selenium sulfide (M-24):** micronized selenium sulfide is 0.6%.
- **Salicylic acid and sulfur (M-02/03, A-16/18):** the dandruff ranges differ from the acne ranges (salicylic acid 1.8–3%, sulfur 2–5%), so 3% salicylic acid dandruff shampoos are marked "Above". Sulfur isn't a seb-derm active.
- **Brand-sourced pages (G-11):** about 40 of 781 brand-direct rows are OTC drugs, for example CeraVe Healing Ointment (petrolatum), the CeraVe BPO wash, and SPF products. The "no OTC monograph status" banner is wrong for them, and they miss the range badge, because the brand-direct matcher never assigns the drug active.

**Wrong facts in text:**
- **NDA numbers (M-04, M-21):** OTC adapalene 0.1% is NDA 020380, not 021753 (that's the Rx 0.3%). OTC butenafine is NDA 021307, not 020524 (that's Mentax, Rx).
- **Tioconazole (A-65):** not a monograph antifungal. It is OTC under NDA 020676 (Vagistat-1) and generics.
- **Citations (M-06..14, M-26..28, M-16, M-36):** sunscreen limits are in OTC Monograph M020, and the anti-itch limits are in M017. Part 352 is stayed, and 348.10 now covers only male genital desensitizers. The open PR #1 cites the "deemed final order" by name; it should cite M020 and M017 with the section letters in M-results.md (M020 letters shifted in June 2026 when bemotrizinol was added).
- **Avobenzone summary (A-29):** monograph actives are "generally recognized as safe and effective", not "FDA-approved". Bemotrizinol (up to 6%) has been in the monograph since Aug 2026.
- **EWG (G-08):** a product's EWG score is not the average of its ingredients' scores. The site's figure is an average of product scores, and the copy should say so.
- **Monograph wording (A-05, A-89, A-93, A-99, A-76):**
  - "Dry skin" and "soothing irritated skin" aren't monograph indications for skin protectants or allantoin.
  - The oatmeal bath minimum is 0.007%, lower than for leave-on products, not higher.
  - "Clinical strength" isn't a monograph term.
  - Hydrocortisone is 0.25–1%.
- **Cosmetic-ingredient line (A-06, A-102):** "not an FDA-regulated drug ingredient" implies cosmetics are unregulated. Better: "no OTC monograph or approved topical OTC drug status; a product's claims decide whether it's a drug."
- **Ingredient order (G-09):** on OTC drugs, inactive ingredients are listed alphabetically, so position says nothing about amount.
- **G-01, G-02:** an NDA can approve a strength outside the monograph range, which explains some "out of range" products.

**Usage guidance (not public yet):**
- U-07, U-23, U-26, U-46, U-62 and U-68 are corrected wording from the labels. U-42 ("pea-sized" for adapalene) is not on any label, so credit it as clinical advice or drop it.
- Required warnings are missing for sulfur, coal tar and topical diphenhydramine. Tioconazole's pregnancy warning also covers breast-feeding, and selenium sulfide labels require a 5-minute rinse on treated hair.

## Worth knowing
- **Differin Epiduo** (adapalene 0.1% + BPO 2.5%) went OTC on 2026-05-22 (NDA 220736). Check whether the catalog and the BPO/retinoid caution handle it.
