# Section M: FDA monograph ranges and CFR citations, checked against primary sources

Checked 2026-10-09. Every verdict below rests on a fetched primary source: eCFR (title 21, current as of 2026-10-06, via the ecfr.gov versioner API), OTC Monographs@FDA (accessdata.fda.gov/omuf), Drugs@FDA (accessdata.fda.gov/scripts/cder/daf), and fda.gov.

## Status of the regulatory framework

- **Sunscreen: 21 CFR part 352 is stayed indefinitely.** eCFR shows the part heading "PART 352 ... [STAYED INDEFINITELY]" with the note "At 68 FR 33381, June 4, 2003, part 352 was stayed until further notice, effective June 4, 2004." The 2002 renaming amendment to 352.10 (ensulizole, meradimate, octinoxate, octisalate) "could not be incorporated" because of that stay. The rule in force is **OTC Monograph M020**, set by deemed Final Administrative Order **OTC000006** (posted Sept 24, 2021, effective by operation of law under CARES Act section 505G on March 27, 2020). M020 incorporates part 352 as published May 21, 1999, plus the labeling and effectiveness rules in 21 CFR 201.327. On **June 10, 2026**, Final Order **OTC000039** amended M020 to add bemotrizinol at up to 6% as new § M020.10(c), which moved the later paragraphs down one letter. Per fda.gov, the 2021 proposed order OTC000008, which carries forward the 2019 proposed rule, "remains a proposal." Sources: https://www.ecfr.gov/current/title-21/part-352 ; https://www.accessdata.fda.gov/drugsatfda_docs/omuf/Order/Final%20Administrative%20Order%20OTC000006_M020-Sunscreen%20Drug%20Products%20for%20OTC%20Human%20Use.pdf ; https://www.accessdata.fda.gov/drugsatfda_docs/omuf/order/supportDoc/OTC000039/Final_Administrative_Order.pdf ; https://www.fda.gov/drugs/understanding-over-counter-medicines/questions-and-answers-fdas-regulatory-actions-over-counter-sunscreen (updated 09/10/2026)
- **External analgesic: 21 CFR 348.10 is in force but covers only male genital desensitizers** (benzocaine 3–7.5%, lidocaine metered spray). The hydrocortisone, pramoxine and diphenhydramine conditions come from the 1983 tentative final monograph (TFM) as later amended. Under CARES Act 505G(b)(8), that TFM became **OTC Monograph M017**, deemed Final Administrative Order **OTC000033** (posted May 2, 2023, effective March 27, 2020). Calling these conditions a "tentative final monograph" is therefore out of date. Sources: https://www.ecfr.gov/current/title-21/section-348.10 ; https://www.accessdata.fda.gov/drugsatfda_docs/omuf/Order/Final%20Administrative%20Order%20OTC000033_M017-External%20Analgesic%20Drug%20Products%20for%20OTC%20Human%20Use.pdf
- **Other parts:** 333 (acne subpart D, antifungal subpart C), 347, 350 and 358 subpart H are still codified in eCFR. Each also exists as a deemed OTC monograph posted on OTC Monographs@FDA, and the active-ingredient text matches the CFR except where noted below:
  - M006, acne (posted Nov 23, 2021)
  - M005, topical antifungal (posted Dec 16, 2021)
  - M016, skin protectant (posted Sept 24, 2021)
  - M019, antiperspirant (posted Nov 23, 2021)
  - M032, dandruff, seborrheic dermatitis and psoriasis (posted Dec 16, 2021)

  Monograph IDs come from https://www.accessdata.fda.gov/scripts/cder/omuf/index.cfm?event=monograph&OTC=M0xx.
- **The two sunscreen cites do not conflict.** `usage-guidance.ts` cites 21 CFR 201.327 for directions and labeling, which is correct: 201.327 is in force and is the labeling and effectiveness rule. It lists which actives fall under it but sets no concentration limits. The limits were in 352.10 (stayed) and are now in § M020.10.

## Item verdicts

| ID | Verdict | Source | Note |
|---|---|---|---|
| M-01 | Confirmed | eCFR 21 CFR 333.310(a); M006 § M006.10(a) | "Benzoyl peroxide, 2.5 to 10 percent." |
| M-02 | Confirmed | eCFR 333.310(d); M006.10 | "Salicylic acid, 0.5 to 2 percent." Under the dandruff, seb derm and psoriasis monograph (358.710(a)(4), (b)(4), (c)(2)), salicylic acid is 1.8 to 3%. Because the code keys only on `salicylic-acid`, it would wrongly flag a 3% dandruff shampoo as "Above." |
| M-03 | Confirmed | eCFR 333.310(e) | 3 to 10%. Two related limits: sulfur is 3 to 8% when combined with resorcinol (333.310(f)), and 2 to 5% for dandruff (358.710(a)(7)). |
| M-04 | Corrected: Adapalene 0.1% gel OTC is marketed under **NDA 020380** (Differin, Galderma). The Rx-to-OTC switch was approved 07/08/2016 as SUPPL-10 ("Efficacy-Rx To OTC Switch"). **NDA 021753 is Differin Gel 0.3%, which is prescription-only.** | Drugs@FDA NDA 020380: https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=020380 ; NDA 021753: ...&ApplNo=021753 | "0.1% only OTC" and "not a monograph" both hold. |
| M-05 | Corrected: Avobenzone **up to 3%** (no minimum). Cite: OTC Monograph M020 § M020.10(b). | M020 (OTC000006) § M020.10(b): "Avobenzone up to 3 percent."; eCFR 352.10(b) (stayed) says the same | Neither text has a 2% floor, so the site wrongly shows a product under 2% as "Below." |
| M-06 | Range confirmed. Cite corrected to M020 § M020.10(j) (was (i) before June 10, 2026). | M020.10: "Octisalate up to 5 percent." | 352.10 is stayed. The open PR fixes the cite. |
| M-07 | Range confirmed. Cite corrected to M020 § M020.10(k). | M020.10: "Octocrylene up to 10 percent." | Same as M-06. |
| M-08 | Range confirmed. Cite corrected to M020 § M020.10(g). | M020.10: "Homosalate up to 15 percent." | Same. |
| M-09 | Range confirmed. Cite corrected to M020 § M020.10(i). | M020.10: "Octinoxate up to 7.5 percent." | Same. |
| M-10 | Range confirmed. Cite corrected to M020 § M020.10(l). | M020.10: "Oxybenzone up to 6 percent." | Same. |
| M-11 | Range confirmed. Cite corrected to M020 § M020.10(f). | M020.10: "Ensulizole up to 4 percent." | Same. |
| M-12 | Range confirmed. Cite corrected to M020 § M020.10(h). | M020.10: "Meradimate up to 5 percent." | Same. |
| M-13 | Range confirmed. Cite corrected to M020 § M020.10(o). | M020.10: "Titanium dioxide up to 25 percent." | Same. |
| M-14 | Range confirmed. Cite corrected to M020 § M020.10(q). | M020.10: "Zinc oxide up to 25 percent." | Same. |
| M-15 | Corrected: Zinc oxide as a skin protectant is **1 to 25%**, and **above 25 to 40% is also permitted in an ointment dosage form** (the diaper-rash products). eCFR 347.10(u) lists only 1 to 25%; the deemed order **M016 § M016.10(u)–(v)** adds the 25–40% ointment provision. | eCFR 347.10(u); M016: https://www.accessdata.fda.gov/drugsatfda_docs/omuf/monographs/OTCMonograph_M016SkinProtectantDrugProductsforOTCHumanUse09242021.pdf | Today the site would flag 40% zinc oxide diaper creams as "Above." |
| M-16 | Corrected: Sunscreen limits come from **OTC Monograph M020** (deemed final order OTC000006 under the CARES Act, effective 3/27/2020, posted 9/24/2021, amended by OTC000039 on 6/10/2026 to add bemotrizinol up to 6%). M020 incorporates 21 CFR part 352 as published 5/21/1999 (stayed since 2004) and 201.327. **The 2019 proposed rule (carried forward as proposed order OTC000008) is not in force.** | OTC000006 pp. 1–3; OTC000039 p. 1 and §IX; fda.gov sunscreen Q&A | The 201.327 cite in `usage-guidance.ts` is correct for labeling. 201.327 sets no concentration limits, so it is not a competing source for limits. |
| M-17 | Confirmed | eCFR 333.210(g); M005 | "Clotrimazole 1 percent." |
| M-18 | Confirmed | eCFR 333.210(c); M005 | "Miconazole nitrate 2 percent." |
| M-19 | Confirmed | eCFR 333.210(e); M005 | "Tolnaftate 1 percent." |
| M-20 | Confirmed | Drugs@FDA NDA 020980 (Lamisil, terbinafine HCl 1% cream, OTC; approved 03/09/1999, "Partial Rx to OTC Switch") | The OTC NDA covers the cream. The original Rx NDA is 020192 (discontinued). The active is terbinafine hydrochloride. |
| M-21 | Corrected: Butenafine HCl 1% OTC is marketed under **NDA 021307** (Lotrimin Ultra cream, Bayer; approved 12/07/2001, "Partial Rx to OTC Switch"). **NDA 020524 is Mentax 1% cream, the original prescription NDA (new molecular entity, 1996), now discontinued.** | Drugs@FDA NDA 021307 and NDA 020524 | |
| M-22 | Confirmed | eCFR 333.210(f); M005 | Applies to undecylenic acid and its calcium, copper and zinc salts, "total undecylenate concentration of 10 to 25 percent." |
| M-23 | Corrected: Pyrithione zinc limits depend on use and product type. **Dandruff, wash-off: 0.3–2%** (358.710(a)(2)). **Seborrheic dermatitis, wash-off: 0.95–2%** ((b)(2)). **Leave-on (dandruff or seb derm): 0.1–0.25%** ((a)(3), (b)(3)). Pyrithione zinc is not listed for psoriasis. | eCFR 358.710; M032 § M032.10 | Today the site would flag a 0.25% leave-on product as "Below." |
| M-24 | Corrected: Selenium sulfide is **1%**, and **micronized selenium sulfide is 0.6%** (dandruff only, 358.710(a)(6)). | eCFR 358.710(a)(5)–(6), (b)(5); M032 | Selenium sulfide is not listed for psoriasis. |
| M-25 | Confirmed | eCFR 358.710(a)(1), (b)(1), (c)(1) | 0.5 to 5%. When a coal tar solution or fraction is the source, labeling must state the source and the concentration of coal tar. |
| M-26 | Range confirmed. Cite corrected: **OTC Monograph M017 § M017.10(d)(1)** (deemed final order OTC000033), not 21 CFR 348.10. | M017.10(d): "Hydrocortisone 0.25 to 1%"; "(2) Hydrocortisone acetate, equivalent to hydrocortisone, 0.25 to 1%." eCFR 348.10 covers only male genital desensitizers. | The open PR fixes the cite. The "tentative final monograph" wording in `usage-guidance.ts` is out of date. |
| M-27 | Range confirmed. Cite corrected to M017 § M017.10(a)(9). | M017.10(a)(9): "Pramoxine hydrochloride 0.5 to 1%." | The listed form is the hydrochloride salt. |
| M-28 | Range confirmed. Cite corrected to M017 § M017.10(c)(1). | M017.10(c)(1): "Diphenhydramine hydrochloride 1 to 2%." | Same. |
| M-29 | Confirmed | eCFR 347.10(m); M016 | 30 to 100%. White petrolatum (347.10(r)) has the same range. |
| M-30 | Confirmed | eCFR 347.10(f); M016 | The text gives "0.007 percent minimum" and no maximum, so 100% is implied. The minimum drops to 0.003% when combined with mineral oil (347.20(a)(4)). |
| M-31 | Confirmed | eCFR 347.10(g); M016 | 1 to 30% |
| M-32 | Confirmed | eCFR 347.10(a); M016 | 0.5 to 2% |
| M-33 | Confirmed | eCFR 347.10(k); M016 | 12.5 to 50%. M016 also allows 15.5% in a specific combination (§ M016.20(f)), which falls inside that range anyway. |
| M-34 | Confirmed | eCFR 350.10(b); M019 | "up to 25 percent," calculated on an anhydrous basis, excluding buffer. |
| M-35 | Confirmed | eCFR 350.10(k)–(r); M019 | All aluminum zirconium salts listed are "up to 20 percent," on an anhydrous basis, nonaerosol forms only. |
| M-36 | Corrected: Acne = 333 subpart D, antifungal = 333 subpart C, dandruff/seb derm/psoriasis = 358 subpart H, skin protectant = 347, and antiperspirant = 350 are all correct. **External analgesic is wrong as "348."** Part 348 codifies only male genital desensitizers. The hydrocortisone, pramoxine and diphenhydramine conditions are in OTC Monograph M017 (deemed final order OTC000033). **Sunscreen 352 is stayed**; the rule in force is M020. | eCFR structure for parts 333 and 358; eCFR parts 348 and 352 | |
| M-37 | Confirmed | Drugs@FDA: Azelex 20% cream (NDA 020428), Finacea 15% gel (NDA 021470) and Finacea 15% foam (NDA 207071) are all Prescription, and so are all listed ANDAs (15%). M006 § M006.10 lists only benzoyl peroxide, resorcinol, resorcinol monoacetate, salicylic acid and sulfur. | No OTC monograph lists azelaic acid. |

## Tally

- **Confirmed (17):** M-01, M-02, M-03, M-17, M-18, M-19, M-20, M-22, M-25, M-29, M-30, M-31, M-32, M-33, M-34, M-35, M-37.
- **Range confirmed, citation corrected only (12):** M-06 to M-14 (sunscreen, cite should be M020.10) and M-26 to M-28 (cite should be M017.10). The open PR already addresses these cites.
- **Substantively corrected (8):** M-04, M-05, M-15, M-16, M-21, M-23, M-24, M-36.
- **Unsupported:** 0.
- **Total:** 17 + 12 + 8 = 37.
