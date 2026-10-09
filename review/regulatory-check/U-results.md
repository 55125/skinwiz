# U. Usage guidance: label/regulatory verification

Checked 2026-10-09 against primary sources. Code: `app/src/db/usage-guidance.ts`. Claims: `review/openevidence-claims.md` section U.

**Scope.** Label and regulatory claims only: directions, warnings, stop-use windows, age limits, frequency, regulatory status. Clinical, practice-advice and mechanism items are listed at the end for Muse.

**Totals (56 checked):** 49 Confirmed, 6 Corrected, 1 Unsupported. 41 IDs were left for Muse.

## Sources used (all fetched)

eCFR text came from the eCFR versioner API, current as of 2025-10-01. The ecfr.gov HTML pages redirect to a bot check, so they could not be fetched directly. Example: `https://www.ecfr.gov/api/versioner/v1/full/2025-10-01/title-21.xml?part=333`. Section links below use the standard eCFR path.

- **[201.327]** 21 CFR 201.327, sunscreen labeling: https://www.ecfr.gov/current/title-21/section-201.327. The same text appears in OTC Monograph M020 (Final Order OTC000006, 2021). The 2026-06-10 amendment OTC000039 (adds bemotrizinol) keeps the same Warnings and Directions text in M020.50(d)/(e).
- **[333.250]** 21 CFR 333.250, topical antifungal labeling: https://www.ecfr.gov/current/title-21/section-333.250 (Deemed Final Order M005).
- **[333.350]** 21 CFR 333.350, topical acne labeling: https://www.ecfr.gov/current/title-21/section-333.350 (M006).
- **[347.50]** 21 CFR 347.50, skin protectant labeling: https://www.ecfr.gov/current/title-21/section-347.50 (M016).
- **[350.50]** 21 CFR 350.50, antiperspirant labeling: https://www.ecfr.gov/current/title-21/section-350.50 (M019).
- **[358.750]** 21 CFR 358.750 / 358.710, dandruff, seborrheic dermatitis and psoriasis: https://www.ecfr.gov/current/title-21/section-358.750 (M032).
- **[M017]** OTC Monograph M017, External Analgesic Drug Products (posted May 2, 2023), M017.50(c)/(d): https://www.accessdata.fda.gov/drugsatfda_docs/omuf/monographs/OTC%20Monograph_M017-External%20Analgesic%20Drug%20Products%20for%20OTC%20Human%20Use%2005.02.2023.pdf. Part 348 in the eCFR now covers only male genital desensitizers, so hydrocortisone, pramoxine and diphenhydramine labeling lives in M017.
- **[FDA-AHA]** FDA, Alpha Hydroxy Acids (cites Guidance for Industry, Jan 2005): https://www.fda.gov/cosmetics/cosmetic-ingredients/alpha-hydroxy-acids
- DailyMed SPLs (`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=<setid>`):
  - **[Differin-OTC]** Differin Gel adapalene 0.1% OTC, Galderma: 0739d631-171b-42a8-bd55-0022b8df2d8a
  - **[Differin-Rx]** Differin Gel 0.3% Rx PI: a0031324-92a6-4c11-90e2-c2818f7278ec
  - **[Proactiv-ada]** Proactiv MD adapalene 0.1%: 0a9b3755-c0db-4282-e063-6394a90a0c08
  - **[Lamisil]** Lamisil AT cream: 1aa5e03a-432b-4154-ab6e-6dbce7a67109
  - **[LotriminUltra]** Lotrimin Ultra butenafine: d11dfdf6-9b36-03bc-e053-2995a90a0bc3
  - **[LotriminAF]** Lotrimin AF Jock Itch powder (miconazole): 1300d84f-d7ff-ec57-e063-6294a90ae0de
  - **[Monistat-tio]** Monistat Tioconazole 1: 587e42b4-cbdc-4a03-afae-f9e5e6605937
  - **[Vagistat-tio]** Vagistat tioconazole: da8eaa33-4195-487f-a234-472dd1036225
  - **[Monistat7]** Monistat 7 miconazole vaginal cream: 2aad40f2-4eea-441d-8b34-5613f1955405
  - **[Differin-BPO-wash]** Differin Daily Deep Cleanser BPO 5%: 192b231b-51f1-457c-9a82-ef75671c0d34
  - **[PanOxyl-bar]** PanOxyl BPO bar: ff09cbab-304b-4da9-e053-6394a90ae600
  - **[SecretClin]** Secret Clinical (Al-Zr): 558f5bce-b814-3485-e063-6394a90a432b
  - **[GilletteClin]** Gillette Clinical (Al-Zr): 2048e36d-71fe-3831-e063-6394a90a55e5
  - **[OldSpice]** Old Spice (Al-Zr): 58758bc4-018d-ff63-e063-6394a90a84de
  - **[CertainDri-ACH]** Certain Dri ACH spray: 59a3c8d3-64cf-439a-b290-7a7016ce7d0d
  - **[CertainDri-AlCl]** Certain Dri aluminum chloride roll-on: 076320fa-a765-4c78-a1d4-307b30242f9e
  - **[Selsun]** Selsun Blue: f97e458c-cce3-498f-81fc-1b96a4e8f50a
  - **[HEB-Se]** H-E-B selenium sulfide shampoo: 182ca790-0713-412a-9111-c0cf40f20d02
  - **[HS-Clin-Se]** Head & Shoulders Clinical selenium: b6ad7707-9d02-31a6-e053-2a95a90ae7ad
  - **[DHS-Tar]** DHS Tar shampoo: 4c5f7278-c53a-cef6-e063-6394a90a0008
  - **[MG217]** MG217 coal tar ointment: 7cb04d20-9b3c-27bb-e053-2a91aa0a5bc4
  - **[Cutar]** Summers Cutar coal tar: 5fa7b421-50f7-469c-b3db-62e8579bd299
  - **[T-Gel-generic]** Walgreens T-Gel: 42cc63ab-6f79-4544-8529-7b8c36021b18
  - **[Benadryl-gel]** Benadryl ES Itch Stopping Gel: 66a2fd60-1757-45cc-a195-ecb9241dca2a
  - **[Benadryl-cream]** Benadryl ES Itch Stopping Cream: a1c1b878-d58f-41ff-b7a8-477f28c52667
  - **[Cortizone]** Cortizone-10: bb3d1a3e-4c0c-4694-9c05-80152dd9bd1c

## U1. Sunscreen

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-02 | Confirmed | 201.327(e)(1)(ii); M020 | Required text: "apply [liberally/generously] 15 minutes before sun exposure". |
| U-03 | Confirmed | 201.327(e)(3), (e)(4) | "reapply at least every 2 hours" is required on all sunscreens. |
| U-04 | Confirmed | 201.327(e)(3), (e)(4) | Applies to water-resistant products: "reapply after 40/80 minutes of swimming or sweating, immediately after towel drying, at least every 2 hours". Non-water-resistant labels instead say "use a water resistant sunscreen if swimming or sweating". |
| U-06 | Confirmed | 201.327(d)(1)(i) | "Do not use on damaged or broken skin." |
| U-07 | Corrected: The label carries "children under 6 months of age: Ask a doctor" under **Directions**, not Warnings. | 201.327(e)(1)(iv); M020 | The substance is right; only the label section is wrong. The code lists it under `cautions`. |

## U2. Monograph antifungals

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-11 | Confirmed | 333.250(d)(1); [LotriminAF] | "a thin layer ... twice daily (morning and night) or as directed by a doctor". |
| U-12 | Confirmed | 333.250(d)(1), (c)(2) | "For athlete's foot and ringworm, use daily for 4 weeks". |
| U-13 | Confirmed | 333.250(d)(1), (c)(3); [LotriminAF] | "for jock itch, use daily for 2 weeks". |
| U-14 | Confirmed | 333.250(d)(1) | Verbatim: "wear well-fitting, ventilated shoes, and change shoes and socks at least once daily". |
| U-15 | Confirmed | 333.250(d)(1); [LotriminAF] | "This product is not effective on the scalp or nails" appears under Directions. |
| U-16 | Confirmed | 333.250(c)(1)(i); [LotriminAF] | Exact wording: "Do not use on children under 2 years of age unless directed by a doctor". This is a Warning, and the claim matches it in substance. |
| U-17 | Confirmed | [Monistat7] | Vaginal miconazole is labeled "For vaginal use only" with vaginal directions (1 applicatorful at bedtime for 7 nights; age 12+). These differ from the skin monograph. |

## U3. Terbinafine and butenafine

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-18 | Confirmed | [Lamisil]; [LotriminUltra] | Lamisil AT: twice daily for athlete's foot, once daily for jock itch and ringworm. Lotrimin Ultra: twice daily for 1 week, or once daily for 4 weeks. |
| U-19 | Confirmed | [Lamisil] vs 333.250(d)(1) | Lamisil AT courses are 1 week (between the toes), 2 weeks (bottom/sides of foot) and 1 week (jock itch, ringworm). The monograph courses are 4 weeks and 2 weeks. |
| U-20 | Confirmed | [Lamisil]; [LotriminUltra] | Both labels: "Do not use on nails or scalp". |
| U-21 | Confirmed | [Lamisil]; [LotriminUltra] | "children under 12 years: ask a doctor". |

## U4. Tioconazole

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-22 | Confirmed | [Monistat-tio]; [Vagistat-tio] | "insert entire content of applicator into the vagina at bedtime". |
| U-23 | Corrected: Do not use if you have never had a vaginal yeast infection diagnosed by a doctor; ask a doctor before use if you have vaginal itching and discomfort for the first time. | [Monistat-tio]; [Vagistat-tio] | The label's "Do not use" line is stronger than "ask a doctor". The current text leaves it out. |
| U-24 | Confirmed | [Monistat-tio] | "If pregnant or breast-feeding, ask a health professional before use". Consider adding breast-feeding. |
| U-25 | Confirmed | [Monistat-tio]; [Vagistat-tio] | "Condoms and diaphragms may be damaged and fail to prevent pregnancy or sexually transmitted diseases". The label does not say "latex". |

## U5. Antiperspirants

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-26 | Corrected: Clinical-strength labels (for example Secret Clinical and Gillette Clinical) direct application at bedtime. The monograph and standard ACH/Al-Zr labels say only "apply to underarms only". | 350.50(d); [SecretClin]; [GilletteClin]; [OldSpice]; [CertainDri-ACH] | "Many labels" overstates it. The monograph requires only "apply to underarms only". Of the standard labels checked, Old Spice and Certain Dri ACH spray have no bedtime direction. Bedtime directions appear on clinical-strength Al-Zr labels and on aluminum chloride products such as [CertainDri-AlCl], which is not an active covered here. Also applies to `:931`. |
| U-28 | Confirmed | 350.50(c)(1) | "Do not use on broken skin". |
| U-29 | Confirmed | 350.50(c)(3) | "Ask a doctor before use if you have kidney disease". |

## U6. Benzoyl peroxide

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-30 | Confirmed | 333.350(c)(4)(ii) | Exact wording: "avoid contact with hair and dyed fabrics, which may be bleached by this product". "Towels and pillowcases" is the code's own example; it is not label text. |
| U-31 | Confirmed | [Differin-BPO-wash]; [PanOxyl-bar]; 333.350(d)(3) | The monograph leaves wash-off directions to the manufacturer ("appropriate directions"). Labels say: "Wet face. Gently massage ... Rinse thoroughly" and "work into a lather ... rinse thoroughly". |
| U-32 | Confirmed | 333.350(d)(1) | "one to three times daily". |
| U-33 | Confirmed | 333.350(d)(1) | Near-verbatim. The label says "bothersome dryness or peeling". |
| U-34 | Confirmed | 333.350(c)(4)(ii), (d)(2)(ii) | "avoid unnecessary sun exposure and use a sunscreen". |
| U-35 | Confirmed | 333.350(c)(1)(ii) | Required for all acne actives, including salicylic acid and sulfur: "skin irritation and dryness is more likely to occur if you use another topical acne medication at the same time". |
| U-36 | Confirmed | 333.350(c)(4)(i) | "Do not use if you have very sensitive skin; are sensitive to benzoyl peroxide". |

## U7. Salicylic acid and sulfur

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-38 | Confirmed | 333.350(d)(1) | The same directions apply to every 333.310 active. Gap: sulfur products also require "Do not use on broken skin, large areas of the skin" and "apply only to areas with acne" (333.350(c)(2)). These are missing from the sulfur entry. |

## U8. Adapalene (OTC 0.1%, NDA Rx-to-OTC switch)

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-42 | Unsupported | [Differin-OTC]; [Differin-Rx] | Neither label mentions a pea-sized amount. The OTC label says "cover the entire affected area with a thin layer. For example, if your acne is on the face, apply the product to the entire face". "Pea-sized" is clinician or AAD advice, so attribute it that way or drop it. Also applies to `:841`. |
| U-43 | Confirmed | [Differin-OTC] | "use once daily ... do not use more than one time a day". |
| U-45 | Confirmed | [Differin-OTC] | "irritation (redness, itching, dryness, burning) is more likely to occur in the first few weeks of use". The leaflet adds "usually lessens after 4 weeks". |
| U-46 | Corrected: The OTC label says "avoid product contact with eyes, lips, and mouth". The Rx PI adds "angles of the nose, and mucous membranes". | [Differin-OTC]; [Differin-Rx] | "Corners of the mouth" is on neither label. The current wording blends the two labels. The retinol copy at `:610` is cosmetic advice, not label text. |
| U-47 | Confirmed | [Differin-OTC] | "Do not use on damaged skin (cuts, abrasions, eczema, sunburn)". |
| U-48 | Confirmed | [Differin-OTC] | "If pregnant or breast-feeding, ask a doctor before use", plus "Stop use and ask a doctor if you become pregnant, or are planning to become pregnant, while using the product". |
| U-49 | Confirmed | [Differin-OTC]; [Proactiv-ada] | "Children under 12 years of age: ask a doctor". |

## U10. Dandruff actives

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-53 | Confirmed | 358.750(d)(1); [Selsun] | Required for wash-off products: "For best results use at least twice a week or as directed by a doctor". Leave-on products say "one to four times daily" (358.750(d)(2)). |
| U-54 | Confirmed | [HEB-Se]; [HS-Clin-Se] | This is not a monograph requirement. Labels say "if used on bleached, gray, tinted or permed hair, rinse for at least 5 minutes". The code says "rinse thoroughly"; the labels say at least 5 minutes. |
| U-55 | Confirmed | 358.750(c)(2)(i); [DHS-Tar] | "Use caution in exposing skin to sunlight after applying this product. It may increase your tendency to sunburn for up to 24 hours after application." Consider adding "up to 24 hours". |
| U-56 | Confirmed | 358.750(c)(2)(ii) | "Do not use for prolonged periods without consulting a doctor." |
| U-57 | Confirmed | [Cutar]; [T-Gel-generic]; [DHS-Tar] | This is not a monograph requirement. Cutar: "may stain light color[ed] ..." and "blot off excess ... to help prevent staining of clothing or linens", plus a warning not to use in plastic or fiberglass tubs. T-Gel-type shampoos: "in rare instances, discoloration of gray, blonde, bleached or tinted hair may occur". |
| U-58 | Confirmed | 358.750(c)(5); [DHS-Tar]; [MG217] | Required only on products labeled for seborrheic dermatitis or psoriasis: "If condition covers a large area of the body, consult your doctor before using this product." Dandruff-only labels do not need it. Also missing from the coal tar entry: leave-on coal tar requires "Do not use ... in or around the rectum or in the genital area or groin except on the advice of a doctor" (c)(3), and psoriasis labels add "not with other psoriasis therapy (UV, Rx) unless directed" (c)(4). |

## U11. Anti-itch actives

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-59 | Confirmed | M017.50(d)(1), (d)(2)(i); [Cortizone]; [Benadryl-gel] | "Adults and children 2 years of age and older: Apply to affected area not more than 3 to 4 times daily. Children under 2 years of age: do not use, consult a doctor". Drug Facts labels render the last part as "children under 2 years of age: ask a doctor". |
| U-60 | Confirmed | M017.50(c)(7)(iv); [Cortizone] | "Do not use for the treatment of diaper rash. Consult a doctor." |
| U-61 | Confirmed | M017.50(c)(1)(iii), (c)(7)(iii); [Cortizone] | Required for hydrocortisone and pramoxine. The hydrocortisone version adds "do not begin use of any other hydrocortisone product unless you have asked a doctor". Separately, the diphenhydramine entry (`:455`) leaves out the "clear up and occur again" clause, which M017 and [Benadryl-gel] include. |
| U-62 | Corrected: Do not use on large areas of the body. Ask a doctor before use on chicken pox or measles. | [Benadryl-gel]; [Benadryl-cream]; M017.50(c)(8) | On marketed labels, "large areas" is an absolute Do not use with no "unless a doctor directs" exception. Chicken pox and measles are "Ask a doctor before use". The M017 text is broader: Do not use "on chicken pox, poison ivy, sunburn, large areas of the body, broken, blistered, or oozing skin, more often than directed". |
| U-63 | Confirmed | M017.50(c)(8); [Benadryl-gel] | "with any other product containing diphenhydramine, even one taken by mouth". |

## U12. Skin protectants

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-64 | Confirmed | 347.50(d)(1), (d)(2)(ii) | "apply as needed". Colloidal oatmeal soaks are "as needed, or as directed by a doctor" (d)(2)(i)(A). |
| U-67 | Confirmed | 347.50(c)(4) | Required for products labeled for cuts, scrapes and burns or for chapped skin: "Do not use on deep or puncture wounds, animal bites, serious burns". The code applies it to petrolatum, dimethicone, allantoin and lanolin, all of which are 347.10 actives. Correct. |
| U-68 | Corrected: Stop use and ask a doctor if the condition worsens, or symptoms last more than 7 days or clear up and occur again within a few days. | 347.50(c)(3) | The recurrence clause is missing. Products containing only petrolatum or cocoa butter may use the short form "See a doctor if condition lasts more than 7 days" (347.50(f)(1)(iii)). |
| U-69 | Confirmed | 347.50(c)(5) | Required for oatmeal soaks: "to avoid slipping, use mat in tub or shower". |

## U13. Cosmetic ingredients (regulatory part only)

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-88 | Confirmed | [FDA-AHA] | FDA's recommended label: an AHA "may increase your skin's sensitivity to the sun and particularly the possibility of sunburn". |
| U-89 | Confirmed | [FDA-AHA] | "Use a sunscreen, wear protective clothing, and limit sun exposure while using this product and for a week afterwards." This comes from nonbinding Guidance for Industry (Jan 2005), not a requirement. |

## U14. Formulation layering (regulatory part only)

| ID | Verdict | Source | Note |
|---|---|---|---|
| U-97 | Confirmed | 347.50(c)(6)(ii); 350.50(c)(4)(i) | Required for kaolin and topical-starch protectant powders and for aerosol antiperspirants: "keep away from face and mouth to avoid breathing it". Antifungal powders do not carry it ([LotriminAF] does not). |

## Clinical, for Muse (not label or regulatory claims; not verified here)

U-01, U-05, U-08, U-09, U-10, U-27, U-37, U-39, U-40, U-41, U-44, U-50, U-51, U-52, U-65, U-66, U-70, U-71, U-72, U-73, U-74, U-75, U-76, U-77, U-78, U-79, U-80, U-81, U-82, U-83, U-84, U-85, U-86, U-87, U-90, U-91, U-92, U-93, U-94, U-95, U-96

Pointers for Muse:
- **U-05:** the label says only "regularly use a sunscreen" (201.327(e)(2)). "Near windows" is not label text.
- **U-10:** the nickel-sized and one-ounce amounts are AAD advice. No label says this.
- **U-41:** the Rx Differin PI says "once daily in the evening". The OTC label sets no time of day.
- **U-52:** no label addresses time of day.
