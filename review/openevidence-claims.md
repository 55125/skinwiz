# Actively: clinical and science claims to check in OpenEvidence

Built 2026-10-05 from the code in `app/src` (paths below are relative to `/opt/antigravity/skinwiz/app/src`). Tracks the TODO.md item "Confirm every clinical/science statement on the site with OpenEvidence."

## Instructions for Muse

1. Work through the items in order, one section at a time.
2. For each item, search OpenEvidence for the claim. Use the plain-words claim as the query; add the ingredient or product name if the search needs context.
3. Record one verdict per item:
   - **Confirmed**: OpenEvidence supports the claim as written.
   - **Corrected: <the correct statement>**: the claim is partly or wholly wrong. Write the statement as it should read.
   - **Unsupported**: OpenEvidence returns nothing that backs the claim, or the claim can't be checked there (for example, vendor tray order or a website policy).
4. Paste the citation OpenEvidence returned (title, journal or source, year; a link if it gives one). If there are several, give the strongest one.
5. Fill in the Verdict and Citation lines under each item. Leave the claim text as it is.
6. **Don't change any code or site text.** This is a review only. Michael makes the edits afterwards.
7. Report back in batches, one section at a time (A, then M, then U, and so on). Each batch is the filled-in items plus a one-line count (for example, "A: 40 confirmed, 5 corrected, 3 unsupported").

Notes:
- Items marked **Possible issue** are places where the site contradicts itself. Pay extra attention to these, but give your verdict on the claim as written, as for any other item.
- Items tagged **[internal]** are about how the site works, not medical evidence. Mark them "Unsupported (not an evidence question)" unless OpenEvidence happens to cover them.
- For FDA monograph and CFR items, OpenEvidence may point you to the eCFR or an FDA page. Those count as citations.
- Section U (usage guidance) **is not public yet and is under dermatologist review.** Check it anyway so the review has evidence alongside it.

Template for each verdict:
```
Verdict: Confirmed | Corrected: ... | Unsupported
Citation:
```

---

## A. Active ingredients: summaries, typical concentrations, concern definitions
Source: `db/actives.ts`. Summaries and typical concentrations appear on ingredient and product pages as evidence notes.

### A1. Concern definitions (`CONCERN_DEFINITIONS`)

- **A-01** Acne concern is described as "Evidence-graded OTC actives and products for acne-prone skin." (`db/actives.ts:36`)
  - Possible issue: no active has an evidence grade yet. The file header (`db/actives.ts:10-11`) and the About page (`app/about/page.tsx`, "Where the data comes from") both say grades stay empty until a verified dermatologist assigns them.
- **A-02** The OTC actives for athlete's foot, jock itch and ringworm are grouped as one "Antifungal" concern. (`db/actives.ts:38`)
- **A-03** The OTC actives for dandruff and seborrheic dermatitis (flaking, itchy or seborrheic scalp) are grouped as one concern. (`db/actives.ts:39`)
- **A-04** The OTC anti-itch actives treat itch from eczema, insect bites, poison ivy and minor irritation. (`db/actives.ts:40`)
- **A-05** OTC skin-protectant actives are for dry, chapped or eczema-prone skin. (`db/actives.ts:41`)
- **A-06** Brightening and texture actives are cosmetic ingredients: "not FDA drug claims." (`db/actives.ts:47`)

### A2. Acne actives

- **A-07** Benzoyl peroxide is an FDA OTC monograph acne active. (`db/actives.ts:80`)
- **A-08** Benzoyl peroxide works by reducing acne-causing bacteria on the skin. (`db/actives.ts:80`)
- **A-09** Benzoyl peroxide is "typically formulated at 2.5%–10% in OTC products." (`db/actives.ts:81`)
- **A-10** Salicylic acid is an FDA OTC monograph active for acne. (`db/actives.ts:89`)
- **A-11** Salicylic acid is an FDA OTC monograph active for dandruff and seborrheic dermatitis. (`db/actives.ts:89`)
- **A-12** Salicylic acid is also used for wart removal in other OTC product categories. (`db/actives.ts:89`)
- **A-13** Salicylic acid works as a keratolytic, helping shed dead skin cells. (`db/actives.ts:89`)
- **A-14** Salicylic acid is "typically 0.5%–2% for acne use." (`db/actives.ts:90`)
- **A-15** Salicylic acid concentration varies for dandruff and scalp use. (`db/actives.ts:90`)
- **A-16** Sulfur is an FDA OTC monograph active for acne and for dandruff/seborrheic dermatitis. (`db/actives.ts:98`)
- **A-17** Sulfur is one of the oldest recognized topical treatments for both acne and dandruff. (`db/actives.ts:98`)
- **A-18** Sulfur is "typically formulated at 3%–10%." (`db/actives.ts:99`)
- **A-19** Adapalene is a retinoid. (`db/actives.ts:107`)
- **A-20** Adapalene 0.1% was switched from prescription to OTC status in 2016. (`db/actives.ts:107`)
- **A-21** Adapalene 0.3% remains prescription-only. (`db/actives.ts:107`)
- **A-22** "OTC formulations are 0.1%" for adapalene. (`db/actives.ts:108`)
- **A-23** In the US, higher-strength azelaic acid (for example 15–20%) is prescription-only (Finacea, Azelex). (`db/actives.ts:116`)
- **A-24** Lower-concentration azelaic acid appears in some cosmetic-labeled products, and these are not FDA OTC monograph acne treatments. (`db/actives.ts:116`)
- **A-25** Azelaic acid has no standardized OTC monograph concentration. (`db/actives.ts:117`)

### A3. Sunscreen actives

- **A-26** Zinc oxide is FDA-recognized for two distinct monograph uses: broad-spectrum UVA/UVB sunscreen, and skin protectant (for example diaper rash and minor skin irritation). (`db/actives.ts:127`)
- **A-27** Titanium dioxide is an FDA-recognized mineral (physical) sunscreen active. (`db/actives.ts:135`)
- **A-28** Titanium dioxide primarily provides UVB and shorter-UVA protection. (`db/actives.ts:135`)
- **A-29** Avobenzone is "the only FDA-approved chemical sunscreen active that absorbs across the full UVA1 range." (`db/actives.ts:144`)
- **A-30** Avobenzone is often paired with other actives for photostability. (`db/actives.ts:144`)
- **A-31** Avobenzone: "FDA monograph maximum is 3%." (`db/actives.ts:145`)
- **A-32** Octisalate provides UVB protection. (`db/actives.ts:152`)
- **A-33** Octisalate is often used to help stabilize avobenzone. (`db/actives.ts:152`)
- **A-34** Octisalate: FDA monograph maximum is 5%. (`db/actives.ts:153`)
- **A-35** Octocrylene provides UVB protection. (`db/actives.ts:160`)
- **A-36** Octocrylene photostabilizes other sunscreen actives. (`db/actives.ts:160`)
- **A-37** Octocrylene: FDA monograph maximum is 10%. (`db/actives.ts:161`)
- **A-38** Homosalate provides UVB protection. (`db/actives.ts:168`)
- **A-39** Homosalate: FDA monograph maximum is 15%. (`db/actives.ts:169`)
- **A-40** Octinoxate provides UVB protection. (`db/actives.ts:176`)
- **A-41** Octinoxate is one of the most widely used sunscreen actives globally. (`db/actives.ts:176`)
- **A-42** Octinoxate: FDA monograph maximum is 7.5%. (`db/actives.ts:177`)
- **A-43** Oxybenzone provides broad UVA/UVB protection. (`db/actives.ts:185`)
- **A-44** Oxybenzone has drawn environmental and some safety-signal scrutiny in recent years. (`db/actives.ts:185`)
- **A-45** Oxybenzone: FDA monograph maximum is 6%. (`db/actives.ts:186`)
- **A-46** Ensulizole is a water-soluble chemical sunscreen active. (`db/actives.ts:193`)
- **A-47** Ensulizole provides UVB protection. (`db/actives.ts:193`)
- **A-48** Ensulizole: FDA monograph maximum is 4%. (`db/actives.ts:194`)
- **A-49** Meradimate provides UVA2 protection. (`db/actives.ts:201`)
- **A-50** Meradimate is typically used alongside other actives. (`db/actives.ts:201`)
- **A-51** Meradimate: FDA monograph maximum is 5%. (`db/actives.ts:202`)

### A4. Antifungal actives

- **A-52** Clotrimazole is an FDA OTC monograph antifungal for athlete's foot, jock itch and ringworm. (`db/actives.ts:211`)
- **A-53** Clotrimazole is typically formulated at 1%. (`db/actives.ts:212`)
- **A-54** Miconazole nitrate is an FDA OTC monograph antifungal for athlete's foot, jock itch and ringworm. (`db/actives.ts:219`)
- **A-55** Miconazole nitrate is also an FDA OTC active for yeast infections. (`db/actives.ts:219`)
- **A-56** Miconazole nitrate is typically formulated at 2%. (`db/actives.ts:220`)
- **A-57** Tolnaftate is an FDA OTC monograph antifungal for athlete's foot, jock itch and ringworm. (`db/actives.ts:227`)
- **A-58** Tolnaftate is typically formulated at 1%. (`db/actives.ts:228`)
- **A-59** Terbinafine hydrochloride is described as "an FDA OTC monograph antifungal active" for athlete's foot, jock itch and ringworm. (`db/actives.ts:235`)
  - Possible issue: `db/monograph-ranges.ts:44` and `db/usage-guidance.ts:16-17` say terbinafine is an Rx-to-OTC switch under an NDA, not a monograph active.
- **A-60** Terbinafine is typically formulated at 1%. (`db/actives.ts:236`)
- **A-61** Butenafine hydrochloride is described as "an FDA OTC monograph antifungal active" for athlete's foot, jock itch and ringworm. (`db/actives.ts:243`)
  - Possible issue: `db/monograph-ranges.ts:45` and `db/usage-guidance.ts:16-17` say butenafine is an Rx-to-OTC switch under an NDA, not a monograph active.
- **A-62** Butenafine is typically formulated at 1%. (`db/actives.ts:244`)
- **A-63** Undecylenic acid (including zinc undecylenate) is an FDA OTC monograph antifungal for athlete's foot. (`db/actives.ts:251`)
- **A-64** Undecylenic acid is one of the older recognized OTC antifungals. (`db/actives.ts:251`)
- **A-65** Tioconazole is described as "an FDA OTC monograph antifungal active, most commonly formulated for vaginal yeast infections." (`db/actives.ts:259`)
  - Possible issue: `db/usage-guidance.ts:16-17` lists vaginal tioconazole as marketed under an approved application, not a monograph. Tioconazole also has no entry in `db/monograph-ranges.ts`.
- **A-66** Tioconazole is typically 6.5% in single-dose vaginal products. (`db/actives.ts:260`)

### A5. Dandruff and seborrheic dermatitis actives

- **A-67** Pyrithione zinc is the most common FDA OTC monograph antidandruff active, found in most medicated dandruff shampoos. (`db/actives.ts:269`)
- **A-68** Pyrithione zinc is typically formulated at 1%–2%. (`db/actives.ts:270`)
- **A-69** Selenium sulfide is an FDA OTC monograph active for dandruff and seborrheic dermatitis. (`db/actives.ts:277`)
- **A-70** OTC selenium sulfide is typically 1%. (`db/actives.ts:278`)
- **A-71** Higher strengths of selenium sulfide are prescription-only. (`db/actives.ts:278`)
- **A-72** Coal tar is an FDA OTC monograph active for dandruff, seborrheic dermatitis and psoriasis. (`db/actives.ts:285`)
- **A-73** Coal tar concentration varies widely by formulation. (`db/actives.ts:286`)

### A6. Anti-itch actives

- **A-74** Hydrocortisone is "the only FDA OTC monograph topical corticosteroid." (`db/actives.ts:296`)
- **A-75** OTC hydrocortisone is for itch relief from eczema, insect bites, poison ivy and minor skin irritation. (`db/actives.ts:296`)
- **A-76** OTC hydrocortisone formulations are 0.5%–1%. (`db/actives.ts:297`)
- **A-77** Higher strengths of hydrocortisone are prescription-only. (`db/actives.ts:297`)
- **A-78** Pramoxine hydrochloride is an FDA OTC monograph topical anesthetic recognized for itch relief. (`db/actives.ts:304`)
- **A-79** Pramoxine is often combined with a skin protectant. (`db/actives.ts:304`)
- **A-80** Pramoxine is typically formulated at 1%. (`db/actives.ts:305`)
- **A-81** Diphenhydramine hydrochloride is an FDA OTC monograph topical antihistamine for itch from insect bites and minor skin irritation. (`db/actives.ts:312`)
- **A-82** Topical diphenhydramine is typically formulated at 1%–2%. (`db/actives.ts:313`)

### A7. Skin protectant actives

- **A-83** Petrolatum is an FDA OTC monograph skin protectant, one of the most widely used. (`db/actives.ts:322`)
- **A-84** Petrolatum is used for dry or chapped skin and minor wound protection. (`db/actives.ts:322`)
- **A-85** Petrolatum is often used at or near 100% (petroleum jelly). (`db/actives.ts:323`)
- **A-86** Colloidal oatmeal is an FDA OTC monograph skin protectant. (`db/actives.ts:330`)
- **A-87** Colloidal oatmeal is the classic active in eczema-focused bath treatments and moisturizers. (`db/actives.ts:330`)
- **A-88** Colloidal oatmeal is typically 0.5%–1% in leave-on products. (`db/actives.ts:331`)
- **A-89** Colloidal oatmeal is used at higher concentrations in bath treatments. (`db/actives.ts:331`)
- **A-90** Dimethicone is an FDA OTC monograph skin protectant. (`db/actives.ts:338`)
- **A-91** Dimethicone is a silicone-based occlusive used broadly in dry-skin and barrier-repair products. (`db/actives.ts:338`)
- **A-92** Dimethicone is typically formulated at 1%–30%, depending on product type. (`db/actives.ts:339`)
- **A-93** Allantoin is an FDA OTC monograph skin protectant, recognized for soothing dry or irritated skin. (`db/actives.ts:346`)
- **A-94** Allantoin is typically formulated at 0.5%–2%. (`db/actives.ts:347`)
- **A-95** Lanolin is an FDA OTC monograph skin protectant used for dry or chapped skin. (`db/actives.ts:354`)
- **A-96** Lanolin is derived from sheep's wool. (`db/actives.ts:354`)

### A8. Antiperspirant actives

- **A-97** Aluminum chlorohydrate is an FDA OTC monograph antiperspirant active. (`db/actives.ts:364`)
- **A-98** Aluminum antiperspirants work by temporarily blocking sweat ducts. (`db/actives.ts:364`)
- **A-99** Antiperspirant concentration varies by product strength (regular vs. clinical-strength). (`db/actives.ts:365`, `:379`)
- **A-100** Aluminum zirconium complexes (tetrachlorohydrex gly, trichlorohydrex gly, octachlorohydrex gly, pentachlorohydrex gly) are a family of FDA OTC monograph antiperspirant actives that differ in aluminum:zirconium ratio. (`db/actives.ts:371-378`)
- **A-101** Aluminum chloride and aluminum sesquichlorohydrate are treated as synonyms of aluminum chlorohydrate (grouped under one entry). (`db/actives.ts:363`)

### A9. Cosmetic (non-drug) ingredients
Every one of these summaries also says "Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it." That is checked once as A-102 and not repeated per ingredient.

- **A-102** Niacinamide, vitamin C (ascorbic acid), hyaluronic acid, retinol, ceramides, alpha arbutin, glycolic acid, squalane, peptides, bakuchiol, topical tranexamic acid, centella asiatica, panthenol, kojic acid, mandelic acid and lactic acid have no FDA OTC monograph or drug status in the US. (`db/actives.ts:395-537`)
- **A-103** Niacinamide is a form of vitamin B3. (`db/actives.ts:395`)
- **A-104** Niacinamide is commonly formulated at 2%–10% in cosmetic products. (`db/actives.ts:396`)
- **A-105** Vitamin C (ascorbic acid) is an antioxidant used in cosmetic serums, often for brightening. (`db/actives.ts:404`)
- **A-106** Vitamin C formulation and stability vary widely by product. (`db/actives.ts:404`)
- **A-107** Vitamin C is commonly formulated at 5%–20% in cosmetic products. (`db/actives.ts:405`)
- **A-108** Hyaluronic acid is a humectant that draws moisture into skin. (`db/actives.ts:416`)
- **A-109** Hyaluronic acid concentration varies by molecular weight and formulation. (`db/actives.ts:417`)
- **A-110** Retinol is a cosmetic vitamin A derivative, distinct from adapalene and from prescription retinoids such as tretinoin. (`db/actives.ts:425`)
- **A-111** Adapalene is described as "the FDA OTC monograph acne active adapalene." (`db/actives.ts:425`)
  - Possible issue: `db/monograph-ranges.ts:23-25` and `db/usage-guidance.ts:16-17` say adapalene 0.1% is an NDA Rx-to-OTC switch, "not a monograph entry."
- **A-112** Retinol potency and stability vary widely by formulation. (`db/actives.ts:425`)
- **A-113** Ceramides are lipids naturally found in the skin's barrier. (`db/actives.ts:434`)
- **A-114** Ceramides are added to cosmetic moisturizers to support barrier function. (`db/actives.ts:434`)
- **A-115** Alpha arbutin is a cosmetic brightening ingredient, often paired with hyaluronic acid in serums. (`db/actives.ts:443`)
- **A-116** Alpha arbutin is commonly formulated at 1%–2%. (`db/actives.ts:444`)
- **A-117** Glycolic acid is an alpha-hydroxy acid (AHA) exfoliant used in cosmetic peels and toners. (`db/actives.ts:452`)
- **A-118** Glycolic acid is commonly formulated at 5%–30%, depending on product type (leave-on vs. peel). (`db/actives.ts:453`)
- **A-119** Squalane is a stable, plant- or lab-derived emollient oil. (`db/actives.ts:461`)
- **A-120** Squalane is often used at or near 100% in single-ingredient face oils. (`db/actives.ts:462`)
- **A-121** Peptides are a broad family of short amino-acid chains in cosmetic serums and moisturizers, often marketed for texture and firmness. (`db/actives.ts:474`)
- **A-122** Bakuchiol is a plant-derived ingredient often marketed as a gentler alternative to retinol. (`db/actives.ts:483`)
- **A-123** Bakuchiol is chemically unrelated to retinol. (`db/actives.ts:483`)
- **A-124** Tranexamic acid is a cosmetic brightening ingredient increasingly used for uneven tone. (`db/actives.ts:492`)
- **A-125** Higher-dose tranexamic acid is an oral/injectable prescription drug for unrelated uses. (`db/actives.ts:492`)
- **A-126** Topical tranexamic acid is commonly formulated at 2%–5% in cosmetic products. (`db/actives.ts:493`)
- **A-127** Centella asiatica ("cica") is a plant extract used in cosmetic moisturizers and serums for soothing and barrier-support claims. (`db/actives.ts:501`)
- **A-128** Panthenol is a provitamin B5 derivative used in moisturizers for hydration and soothing. (`db/actives.ts:510`)
- **A-129** Panthenol is commonly formulated at 1%–5%. (`db/actives.ts:511`)
- **A-130** Kojic acid is a fungal-derived cosmetic brightening ingredient. (`db/actives.ts:519`)
- **A-131** Kojic acid carries a known skin irritation/sensitization risk in some users. (`db/actives.ts:519`)
- **A-132** Kojic acid is commonly formulated at 1%–4%. (`db/actives.ts:520`)
- **A-133** Mandelic acid is an AHA exfoliant. (`db/actives.ts:528`)
- **A-134** Mandelic acid is gentler than glycolic acid because of its larger molecule size. (`db/actives.ts:528`)
- **A-135** Mandelic acid is commonly formulated at 5%–10%. (`db/actives.ts:529`)
- **A-136** Lactic acid is an AHA exfoliant with humectant properties. (`db/actives.ts:537`)
- **A-137** Lactic acid is commonly formulated at 5%–12%. (`db/actives.ts:538`)

---

## M. FDA monograph ranges and CFR citations
Source: `db/monograph-ranges.ts`. Product and ingredient pages show these as "Within / Above / Below FDA OTC monograph range (X%)" with the CFR cite. "Up to X%" means no minimum is stated.

- **M-01** Benzoyl peroxide: 2.5%–10%, 21 CFR 333.310. (`db/monograph-ranges.ts:20`)
- **M-02** Salicylic acid (acne): 0.5%–2%, 21 CFR 333.310. (`db/monograph-ranges.ts:21`)
- **M-03** Sulfur (acne): 3%–10%, 21 CFR 333.310. (`db/monograph-ranges.ts:22`)
- **M-04** Adapalene: 0.1% only, marketed under NDA 021753 (Rx-to-OTC switch, 2016), not a monograph. (`db/monograph-ranges.ts:23-25`)
- **M-05** Avobenzone: 2%–3%, 21 CFR 352.10. (`db/monograph-ranges.ts:28`)
- **M-06** Octisalate: up to 5%, 21 CFR 352.10. (`db/monograph-ranges.ts:29`)
- **M-07** Octocrylene: up to 10%, 21 CFR 352.10. (`db/monograph-ranges.ts:30`)
- **M-08** Homosalate: up to 15%, 21 CFR 352.10. (`db/monograph-ranges.ts:31`)
- **M-09** Octinoxate: up to 7.5%, 21 CFR 352.10. (`db/monograph-ranges.ts:32`)
- **M-10** Oxybenzone: up to 6%, 21 CFR 352.10. (`db/monograph-ranges.ts:33`)
- **M-11** Ensulizole: up to 4%, 21 CFR 352.10. (`db/monograph-ranges.ts:34`)
- **M-12** Meradimate: up to 5%, 21 CFR 352.10. (`db/monograph-ranges.ts:35`)
- **M-13** Titanium dioxide: up to 25%, 21 CFR 352.10. (`db/monograph-ranges.ts:36`)
- **M-14** Zinc oxide as a sunscreen: up to 25%, 21 CFR 352.10. (`db/monograph-ranges.ts:37-38`)
- **M-15** Zinc oxide as a skin protectant: 1%–25%, 21 CFR 347.10. (`db/monograph-ranges.ts:37-38`)
- **M-16** The sunscreen ranges reflect 21 CFR part 352 "as reflected in the 2019 proposed rule / current enforcement." (`db/monograph-ranges.ts:9-10`)
  - Possible issue: the site cites sunscreen rules two ways. `db/monograph-ranges.ts` cites 21 CFR 352.10, while `db/usage-guidance.ts:69` cites 21 CFR 201.327. Check which section is currently in force for sunscreen active-ingredient limits.
- **M-17** Clotrimazole: 1%, 21 CFR 333.210. (`db/monograph-ranges.ts:41`)
- **M-18** Miconazole nitrate: 2%, 21 CFR 333.210. (`db/monograph-ranges.ts:42`)
- **M-19** Tolnaftate: 1%, 21 CFR 333.210. (`db/monograph-ranges.ts:43`)
- **M-20** Terbinafine: 1%, marketed under NDA 020980 (Rx-to-OTC switch). (`db/monograph-ranges.ts:44`)
- **M-21** Butenafine: 1%, marketed under NDA 020524 (Rx-to-OTC switch). (`db/monograph-ranges.ts:45`)
- **M-22** Undecylenic acid (total undecylenate): 10%–25%, 21 CFR 333.210. (`db/monograph-ranges.ts:46`)
- **M-23** Pyrithione zinc: 0.3%–2%, 21 CFR 358.710. (`db/monograph-ranges.ts:49`)
  - Note for checking: the monograph may set different ranges for shampoos and for leave-on products. Record any split.
- **M-24** Selenium sulfide: 1%, 21 CFR 358.710. (`db/monograph-ranges.ts:50`)
- **M-25** Coal tar: 0.5%–5%, 21 CFR 358.710. (`db/monograph-ranges.ts:51`)
- **M-26** Hydrocortisone: 0.25%–1%, 21 CFR 348.10. (`db/monograph-ranges.ts:54`)
  - Possible issue: `db/usage-guidance.ts:14-15` and `:73` call part 348 a *tentative* final monograph, but `monograph-ranges.ts` cites "21 CFR 348.10" as if it were codified. This applies to M-26 to M-28.
- **M-27** Pramoxine: 0.5%–1%, 21 CFR 348.10. (`db/monograph-ranges.ts:55`)
- **M-28** Diphenhydramine (topical): 1%–2%, 21 CFR 348.10. (`db/monograph-ranges.ts:56`)
- **M-29** Petrolatum: 30%–100%, 21 CFR 347.10. (`db/monograph-ranges.ts:59`)
- **M-30** Colloidal oatmeal: minimum 0.007%, up to 100%, 21 CFR 347.10. (`db/monograph-ranges.ts:60`)
- **M-31** Dimethicone: 1%–30%, 21 CFR 347.10. (`db/monograph-ranges.ts:61`)
- **M-32** Allantoin: 0.5%–2%, 21 CFR 347.10. (`db/monograph-ranges.ts:62`)
- **M-33** Lanolin: 12.5%–50%, 21 CFR 347.10. (`db/monograph-ranges.ts:63`)
- **M-34** Aluminum chlorohydrate: up to 25%, 21 CFR 350.10. (`db/monograph-ranges.ts:66`)
- **M-35** Aluminum zirconium complexes: up to 20%, 21 CFR 350.10. (`db/monograph-ranges.ts:67`)
- **M-36** CFR parts by category: acne = 21 CFR 333 subpart D; antifungal = 333 subpart C; dandruff/seborrheic dermatitis/psoriasis = 358 subpart H; external analgesic = 348; skin protectant = 347; antiperspirant = 350. (`db/monograph-ranges.ts:9-13`)
- **M-37** Azelaic acid is prescription-only at drug strengths in the US and has no OTC monograph. (`db/monograph-ranges.ts:5-6`)

---

## U. Usage guidance: NOT PUBLIC YET, UNDER DERMATOLOGIST REVIEW
Source: `db/usage-guidance.ts`. Every entry is `reviewed: false` and hidden from the public site until the dermatologist approves it (`review/usage-guidance-review.pdf`). Check it anyway so the evidence sits next to the review. Purely procedural steps (for example "apply a thin layer" or "wash hands after use") are left out. Where several actives share the same text, it is listed once.

### U1. Sunscreen actives (shared text for zinc oxide, titanium dioxide, avobenzone, octisalate, octocrylene, homosalate, octinoxate, oxybenzone, ensulizole, meradimate)

- **U-01** Sunscreen is the last step of a morning routine because it protects during daylight hours. (`db/usage-guidance.ts:87`)
- **U-02** "Apply liberally 15 minutes before sun exposure." (`db/usage-guidance.ts:89`, also `:896`)
- **U-03** "Reapply at least every 2 hours." (`db/usage-guidance.ts:90`, also `:898`)
- **U-04** Reapply after 40 or 80 minutes of swimming or sweating, as stated on the label, and immediately after towel drying. (`db/usage-guidance.ts:91`)
- **U-05** Use sunscreen every day you will be outdoors or near windows. (`db/usage-guidance.ts:94`)
- **U-06** Sunscreen label warning: do not use on damaged or broken skin. (`db/usage-guidance.ts:97`)
- **U-07** Sunscreen label warning: for children under 6 months, ask a doctor. (`db/usage-guidance.ts:99`)
- **U-08** Mineral sunscreen formulas (zinc oxide, titanium dioxide) can leave a white cast. (`db/usage-guidance.ts:275`, `:277`)
- **U-09** Sunscreens with avobenzone can leave yellow-orange marks on light fabrics. (`db/usage-guidance.ts:279`)
- **U-10** About a nickel-sized amount covers the face and about one ounce covers the body. (`db/usage-guidance.ts:897`)

### U2. Monograph antifungals (shared text for clotrimazole, miconazole nitrate, tolnaftate, undecylenic acid)

- **U-11** Monograph antifungal directions call for twice-daily use, morning and night. (`db/usage-guidance.ts:111`, `:119`)
- **U-12** The monograph treatment course is 4 weeks for athlete's foot and ringworm. (`db/usage-guidance.ts:119`)
- **U-13** The monograph treatment course is 2 weeks for jock itch. (`db/usage-guidance.ts:119`)
- **U-14** For athlete's foot: wear well-fitting, ventilated shoes and change shoes and socks at least once daily. (`db/usage-guidance.ts:115`)
- **U-15** OTC topical antifungals are "not effective on the scalp or nails." (`db/usage-guidance.ts:122`)
- **U-16** For children under 2 years, ask a doctor. (`db/usage-guidance.ts:123`)
- **U-17** Vaginal miconazole products have different directions from the skin products. (`db/usage-guidance.ts:292`)

### U3. Terbinafine and butenafine (shared text)

- **U-18** Labels call for once- or twice-daily use, depending on the condition. (`db/usage-guidance.ts:299`, `:320`)
- **U-19** Terbinafine treatment courses are often shorter than those of older antifungals. (`db/usage-guidance.ts:307`)
- **U-20** Terbinafine and butenafine are not for use on nails or the scalp. (`db/usage-guidance.ts:310`, `:330`)
- **U-21** For children under 12, ask a doctor before using terbinafine or butenafine. (`db/usage-guidance.ts:311`, `:331`)

### U4. Tioconazole

- **U-22** Single-dose vaginal tioconazole products are typically labeled for use at bedtime. (`db/usage-guidance.ts:340`)
- **U-23** If this is your first episode of vaginal yeast symptoms, ask a doctor before use. (`db/usage-guidance.ts:347`)
- **U-24** Ask a doctor before use if pregnant. (`db/usage-guidance.ts:348`)
- **U-25** Vaginal tioconazole may weaken latex condoms and diaphragms. (`db/usage-guidance.ts:349`)

### U5. Antiperspirants (shared text for aluminum chlorohydrate and aluminum zirconium)

- **U-26** Many labels and dermatologists suggest applying antiperspirant to dry skin at bedtime. (`db/usage-guidance.ts:136`, `:931`)
- **U-27** Sweat glands are less active at bedtime. (`db/usage-guidance.ts:136`)
- **U-28** Antiperspirant label warning: do not use on broken skin. (`db/usage-guidance.ts:144`)
- **U-29** Antiperspirant label warning: ask a doctor before use if you have kidney disease. (`db/usage-guidance.ts:146`)

### U6. Benzoyl peroxide

- **U-30** Benzoyl peroxide can bleach hair and dyed fabrics, including towels and pillowcases. (`db/usage-guidance.ts:160`, `:171`)
- **U-31** Wash-off benzoyl peroxide is applied to wet skin, massaged, then rinsed. (`db/usage-guidance.ts:164`)
- **U-32** Use one to three times daily, per the label. (`db/usage-guidance.ts:167`)
- **U-33** Because excessive drying may occur, start with one application daily and increase to two or three times daily if needed. If dryness or peeling occurs, reduce to once a day or every other day. (`db/usage-guidance.ts:169`)
- **U-34** Avoid unnecessary sun exposure and use a sunscreen while using benzoyl peroxide. (`db/usage-guidance.ts:165`, `:173`)
- **U-35** Using other topical acne products at the same time may increase dryness or irritation. Same text for salicylic acid and sulfur. (`db/usage-guidance.ts:174`, `:196`, `:216`)
- **U-36** Do not use if you have very sensitive skin or are sensitive to benzoyl peroxide. (`db/usage-guidance.ts:175`)

### U7. Salicylic acid and sulfur

- **U-37** Many people keep leave-on salicylic acid products to the evening. (`db/usage-guidance.ts:185`)
- **U-38** Salicylic acid and sulfur for acne: one to three times daily, starting once daily and adjusting for dryness. (`db/usage-guidance.ts:192-194`, `:212-214`)
- **U-39** Consider not layering salicylic acid with a retinoid or other exfoliating acids in the same routine. (`db/usage-guidance.ts:198`)
- **U-40** Sulfur has a noticeable odor, which is why some people prefer to use it in the evening. (`db/usage-guidance.ts:206`, `:218`)

### U8. Adapalene

- **U-41** Retinoids are commonly applied in the evening because they can make skin more sensitive to the sun. Same text for retinol. (`db/usage-guidance.ts:226`, `:599`)
- **U-42** A pea-sized amount covers the face. (`db/usage-guidance.ts:229`, also `:841`)
- **U-43** OTC adapalene is used once a day, per the label. (`db/usage-guidance.ts:233`)
- **U-44** Many dermatologists suggest starting every other night or a few nights a week, then building up to nightly. (`db/usage-guidance.ts:235`)
- **U-45** Redness, dryness, itching or burning are more likely in the first few weeks. (`db/usage-guidance.ts:237`)
- **U-46** Avoid the eyes, lips and the corners of the nose and mouth. (`db/usage-guidance.ts:239`, also retinol `:610`)
- **U-47** Do not apply adapalene to cuts, abrasions, eczema or sunburned skin. (`db/usage-guidance.ts:240`)
- **U-48** If pregnant, planning pregnancy or breastfeeding, ask a doctor before using adapalene. (`db/usage-guidance.ts:241`)
- **U-49** For children under 12, ask a doctor before using adapalene. (`db/usage-guidance.ts:242`)

### U9. Azelaic acid (cosmetic)

- **U-50** No time-of-day restriction is widely recognized for azelaic acid. (`db/usage-guidance.ts:254`)
- **U-51** Mild tingling or stinging may occur, especially at first. (`db/usage-guidance.ts:263`)

### U10. Dandruff actives

- **U-52** For pyrithione zinc and selenium sulfide shampoos, time of day does not matter. (`db/usage-guidance.ts:359`, `:376`)
- **U-53** For best results, use dandruff shampoo at least twice a week. (`db/usage-guidance.ts:365`, `:382`)
- **U-54** Selenium sulfide may discolor bleached, tinted, gray or permed hair. (`db/usage-guidance.ts:385`)
- **U-55** Coal tar can increase sun sensitivity and the tendency to sunburn after use. (`db/usage-guidance.ts:394`, `:401`)
- **U-56** Do not use coal tar for prolonged periods without asking a doctor. (`db/usage-guidance.ts:402`)
- **U-57** Coal tar can stain fabrics, light hair and some surfaces. (`db/usage-guidance.ts:404`)
- **U-58** Ask a doctor before using coal tar if the condition covers a large area of the body. (`db/usage-guidance.ts:405`)

### U11. Anti-itch actives (hydrocortisone, pramoxine, diphenhydramine)

- **U-59** Adults and children 2 years and older: no more than 3 to 4 times daily. Under 2 years, ask a doctor. (`db/usage-guidance.ts:420-423`, `:435-438`, `:449-454`)
- **U-60** Do not use OTC hydrocortisone for diaper rash unless a doctor directs it. (`db/usage-guidance.ts:424`)
- **U-61** Stop use and ask a doctor if symptoms last more than 7 days, or clear up and come back within a few days. (`db/usage-guidance.ts:425`, `:439`)
- **U-62** Do not use topical diphenhydramine on large areas of the body, or on chickenpox or measles, unless a doctor directs it. (`db/usage-guidance.ts:452`)
- **U-63** Do not use topical diphenhydramine with any other diphenhydramine product, including oral ones. (`db/usage-guidance.ts:453`)

### U12. Skin protectants (petrolatum, colloidal oatmeal, dimethicone, allantoin, lanolin)

- **U-64** Skin protectants can be applied as often as needed. (`db/usage-guidance.ts:465`, `:471`, `:490`, `:504`, `:518`, `:532`)
- **U-65** A thin layer of petrolatum over moisturizer seals it in. (`db/usage-guidance.ts:468`, also `:886`)
- **U-66** Applying moisturizer to slightly damp skin after bathing is a common approach. (`db/usage-guidance.ts:469`, `:623`, `:730`, `:864`)
- **U-67** Skin protectant label warning: do not use on deep or puncture wounds, animal bites or serious burns. (`db/usage-guidance.ts:474`, `:507`, `:521`, `:536`)
- **U-68** Skin protectant label warning: stop use and ask a doctor if the condition worsens or lasts more than 7 days. (`db/usage-guidance.ts:475`, `:494`, `:508`, `:522`, `:537`)
- **U-69** Oatmeal baths can make the tub slippery. (`db/usage-guidance.ts:493`)
- **U-70** Some people are sensitive to wool-derived ingredients (lanolin). (`db/usage-guidance.ts:535`)

### U13. Cosmetic ingredients

- **U-71** Niacinamide is generally well tolerated and can be used morning or night. (`db/usage-guidance.ts:551`)
- **U-72** Niacinamide can cause mild redness or tingling, especially at higher concentrations. (`db/usage-guidance.ts:558`)
- **U-73** Many dermatologists suggest vitamin C in the morning, under sunscreen. (`db/usage-guidance.ts:567`)
- **U-74** Vitamin C products should be stored tightly closed, away from light and heat. (`db/usage-guidance.ts:571`)
- **U-75** Mild tingling is common with acidic vitamin C formulas. (`db/usage-guidance.ts:576`)
- **U-76** Vitamin C products can darken as they oxidize. (`db/usage-guidance.ts:577`)
- **U-77** Consider not applying vitamin C at the same time as benzoyl peroxide. (`db/usage-guidance.ts:578`)
- **U-78** Apply hyaluronic acid to slightly damp skin and follow with a moisturizer to hold in hydration. (`db/usage-guidance.ts:588-589`)
- **U-79** Hyaluronic acid, ceramides, squalane, peptides and panthenol are generally well tolerated. (`db/usage-guidance.ts:592`, `:626`, `:672`, `:682`, `:732`)
- **U-80** Retinol: use up to once nightly, starting two or three nights a week and increasing as tolerated. (`db/usage-guidance.ts:605-607`)
- **U-81** Dryness, flaking and redness are common when starting retinol. (`db/usage-guidance.ts:609`)
- **U-82** Consider alternating nights between retinol and exfoliating acids rather than layering them. (`db/usage-guidance.ts:611`)
- **U-83** Many people avoid retinoids during pregnancy or breastfeeding. (`db/usage-guidance.ts:612`)
- **U-84** Bakuchiol is a plant extract, not a retinoid. (`db/usage-guidance.ts:698`)
- **U-85** Plant extracts such as centella can occasionally cause sensitivity. (`db/usage-guidance.ts:722`)
- **U-86** Kojic acid can cause irritation or contact allergy in some people. (`db/usage-guidance.ts:745-747`)
- **U-87** Exfoliating acids (glycolic, mandelic, lactic) are often used in the evening. (`db/usage-guidance.ts:646`, `:756`, `:776`)
- **U-88** AHAs can increase sensitivity to the sun and the chance of sunburn. (`db/usage-guidance.ts:655`, `:765`, `:785`)
- **U-89** Use sunscreen while using an AHA and for a week afterward (FDA AHA sunburn-alert guidance). (`db/usage-guidance.ts:650`, `:760`, `:780`)
- **U-90** Leave-on AHA products are used a few times a week up to nightly. Start at two or three times a week. (`db/usage-guidance.ts:652-653`)
- **U-91** Stinging, redness or peeling can occur with AHAs. (`db/usage-guidance.ts:656`)

### U14. Formulation layering

- **U-92** Layer from thinnest to thickest: cleanser, toner, serum, gel, spot treatment, lotion, cream, ointment, then sunscreen last in the morning. (`db/usage-guidance.ts:800-901`; order also in `lib/regimen.ts:26-28`)
- **U-93** Cleanse with lukewarm water. (`db/usage-guidance.ts:805`)
- **U-94** Lotion is lighter than cream, so lotion goes on first if you use both. (`db/usage-guidance.ts:866`)
- **U-95** Ointment is the heaviest layer, so it goes last at night and before sunscreen in the morning. (`db/usage-guidance.ts:888`)
- **U-96** Spot treatments should dry before anything is applied over them. (`db/usage-guidance.ts:853`)
- **U-97** Keep body powders away from the face to avoid breathing them in. (`db/usage-guidance.ts:920`)

---

## C. Interaction cautions (shelf, routines, regimen)
Source: `lib/routine-conflicts.ts`. Shown whenever two linked products fall into the paired classes.

- **C-01** Retinoids and exfoliating acids both increase dryness and irritation. (`lib/routine-conflicts.ts:28`)
- **C-02** Using a retinoid and an exfoliating acid together is a common cause of a damaged skin barrier. (`lib/routine-conflicts.ts:28`)
- **C-03** Many people alternate nights, or split the retinoid and the acid between morning and evening. (`lib/routine-conflicts.ts:28`)
- **C-04** Benzoyl peroxide adds to retinoid irritation. (`lib/routine-conflicts.ts:33`)
- **C-05** Benzoyl peroxide "can break down tretinoin specifically." (`lib/routine-conflicts.ts:33`)
  - Possible issue: this note shows for every product in the retinoid class (`lib/routine-conflicts.ts:11`), which includes adapalene, retinol, retinal, hydroxypinacolone retinoate, tazarotene and trifarotene, not only tretinoin. Please also check whether benzoyl peroxide degrades adapalene, tazarotene, trifarotene or retinol, so the note can be split by retinoid.
- **C-06** Retinoids and benzoyl peroxide are often used at different times of day. (`lib/routine-conflicts.ts:33`)
- **C-07** Benzoyl peroxide is an oxidizer. (`lib/routine-conflicts.ts:38`)
- **C-08** Benzoyl peroxide can degrade vitamin C and reduce its effect. (`lib/routine-conflicts.ts:38`)
- **C-09** Benzoyl peroxide combined with an exfoliating acid can be more drying and irritating than either alone. (`lib/routine-conflicts.ts:43`)
- **C-10** Class grouping: salicylic acid (a BHA), lactobionic acid and gluconolactone (PHAs) are counted as "exfoliating acids" alongside glycolic, lactic and mandelic acid. (`lib/routine-conflicts.ts:12`)
- **C-11** Class grouping: retinol, retinal, adapalene, hydroxypinacolone retinoate, tretinoin, tazarotene and trifarotene are all counted as "retinoids." (`lib/routine-conflicts.ts:11`)
- **C-12** [internal, code logic] Wash-off cleansers are left out of the regimen conflict check because a wash-off product is on the skin only briefly, which isn't the stacking these cautions are about. (`lib/regimen.ts:201-203`)

---

## S. Default morning/night slot reasons
Source: `lib/regimen.ts` `suggestSlot`. Shown when a product is first added to a regimen.

- **S-01** "Set to morning: sunscreen protects during daylight hours." (`lib/regimen.ts:66`)
- **S-02** "Set to night: antiperspirant labels commonly direct applying it at bedtime." (`lib/regimen.ts:67`)
- **S-03** Retinoids are usually used in the evening. (`lib/regimen.ts:76`)
- **S-04** Leave-on acids (including salicylic acid, per C-10) are usually used in the evening. (`lib/regimen.ts:76`)
- **S-05** Vitamin C is usually applied in the morning. (`lib/regimen.ts:78`)
- **S-06** Vitamin C goes under sunscreen. (`lib/regimen.ts:78`)

---

## F. Ingredient flags and free-from definitions
Source: `db/ingredient-flags.ts`. A product passes a check when none of the listed names appear in its full ingredient list. The "explain" lines are shown on the checker and product pages.

- **F-01** [code comment, not shown] Fragrance is "the single most common contact allergen (NACDG/ACDS data)." (`db/ingredient-flags.ts:28-29`)
  - Possible issue: `db/contact-allergens.ts:718` (shown on the site) says nickel is "the most common contact allergen overall." The fragrance section intro (`db/contact-allergens.ts:73`) narrows it to "the most common cause of cosmetic contact allergy."
- **F-02** Fragrance-free means no "fragrance," "parfum" or "perfume" on the label. (`db/ingredient-flags.ts:30`)
- **F-03** Sulfate-free targets only sodium lauryl sulfate, sodium laureth sulfate, ammonium lauryl sulfate and ammonium laureth sulfate. Zinc sulfate and magnesium sulfate are unrelated ingredients, not harsh surfactants. (`db/ingredient-flags.ts:36-41`)
- **F-04** Dimethicone, cyclomethicone, cyclopentasiloxane, phenyl trimethicone and amodimethicone are silicones. (`db/ingredient-flags.ts:47`)
- **F-05** "Mineral oil-free" also excludes petrolatum and paraffinum liquidum. (`db/ingredient-flags.ts:49`)
- **F-06** Fungal acne (Malassezia / pityrosporum folliculitis) is caused by Malassezia yeast. (`db/ingredient-flags.ts:67`)
- **F-07** Malassezia feeds on fatty acids and their esters (C12–C24 chains). (`db/ingredient-flags.ts:67`, `:71-74`)
- **F-08** Malassezia feeds on polysorbates and sorbitan esters. (`db/ingredient-flags.ts:67`, `:70`)
- **F-09** Malassezia feeds on most plant oils and butters (olive, coconut, sunflower, jojoba, argan, almond, avocado, shea, cocoa, castor, grape seed, rosehip, sesame, soybean, and others listed). (`db/ingredient-flags.ts:67`, `:75-80`)
- **F-10** Fermented ingredients (ferments, Lactobacillus, Saccharomyces, Galactomyces, Bifida) feed Malassezia. (`db/ingredient-flags.ts:67`, `:82`)
- **F-11** Lanolin and tallow feed Malassezia. (`db/ingredient-flags.ts:84`)
- **F-12** Caprylic/capric triglyceride (medium-chain), squalane and fatty alcohols do not feed Malassezia. (`db/ingredient-flags.ts:67`)
- **F-13** Ethanol-type alcohols (alcohol, alcohol denat., SD alcohol, isopropyl alcohol) are drying. (`db/ingredient-flags.ts:91-92`)
- **F-14** Fatty alcohols such as cetyl and stearyl alcohol are emollients, not drying alcohols. (`db/ingredient-flags.ts:92`)
- **F-15** Essential oils, citrus-derived ingredients and named aromatic constituents (lavender, peppermint, menthol, camphor, eucalyptus, tea tree, citrus oils, rosemary, lemongrass, geranium, rose, jasmine, ylang-ylang, sandalwood, cinnamon, clove, thyme, clary sage, cedarwood) are a frequent irritant and sensitizer on reactive skin. (`db/ingredient-flags.ts:102-108`)
- **F-16** Oxybenzone and octinoxate are banned in Hawaii over coral-bleaching concerns. (`db/ingredient-flags.ts:115`)
- **F-17** Oxybenzone and octinoxate are banned in Key West over coral-bleaching concerns. (`db/ingredient-flags.ts:115`)
- **F-18** Oxybenzone and octinoxate are "the two UV filters" banned in those places. In other words, no other filters were banned there. (`db/ingredient-flags.ts:115`)
- **F-19** Beeswax, honey, propolis, royal jelly, lanolin, carmine, collagen, gelatin, keratin, elastin, tallow, silk, guanine, pearl, snail, placenta, casein, lactoferrin, whey, milk proteins and shellac are commonly sourced from animals. (`db/ingredient-flags.ts:123-127`)
- **F-20** Some of those animal-derived ingredients have plant-based versions. (`db/ingredient-flags.ts:123`)
- **F-21** Dye-free means no FD&C or D&C colorants. PEG-free means no PEG-/polyethylene glycol ingredients. (`db/ingredient-flags.ts:50-51`)

---

## P. Patch-test series and contact-allergen content
Sources: `lib/avoid-import.ts` only encodes allergen ids into share links. The clinical content it relies on lives in `db/patch-test-series.ts` (series and tray order) and `db/contact-allergens.ts` (allergen notes, families, cross-reactions), and both are covered here. If OpenEvidence lacks tray-order detail, mark the item Unsupported and note that the vendor sheet is the right source.

### P1. T.R.U.E. Test

- **P-01** The T.R.U.E. Test has 35 allergens on three panels, with 36 positions. Position 9 is the negative control. (`db/patch-test-series.ts:56-60`, `:101-102`, `:552`)
- **P-02** Panel 1 (positions 1–8, 10–12): nickel sulfate, wool alcohols, neomycin sulfate, potassium dichromate, caine mix, fragrance mix, colophony, paraben mix, balsam of Peru, ethylenediamine dihydrochloride, cobalt dichloride. (`db/patch-test-series.ts:64-74`)
- **P-03** Panel 2 (positions 13–24): p-tert-butylphenol formaldehyde resin, epoxy resin, carba mix, black rubber mix, MCI/MI, quaternium-15, methyldibromo glutaronitrile, p-phenylenediamine, formaldehyde, mercapto mix, thimerosal, thiuram mix. (`db/patch-test-series.ts:75-86`)
- **P-04** Panel 3 (positions 25–36): diazolidinyl urea, quinoline mix, tixocortol-21-pivalate, gold sodium thiosulfate, imidazolidinyl urea, budesonide, hydrocortisone-17-butyrate, mercaptobenzothiazole, bacitracin, parthenolide, disperse blue 106, bronopol. (`db/patch-test-series.ts:87-98`)
- **P-05** The T.R.U.E. Test quinoline mix is clioquinol and chlorquinaldol in equal parts. (`db/patch-test-series.ts:61`, `:88`)
- **P-06** The T.R.U.E. Test caine mix is benzocaine, dibucaine and tetracaine. (`db/patch-test-series.ts:61-62`, `:68`; `db/contact-allergens.ts:681-682`)
- **P-07** The T.R.U.E. Test "Fragrance mix" is Fragrance mix I. (`db/patch-test-series.ts:69`)
- **P-08** Source cited: T.R.U.E. TEST FDA package insert, rev. 08/2017. (`db/patch-test-series.ts:57-60`)

### P2. ACDS Core Series 2020 (90 allergens)

- **P-09** The ACDS Core Allergen Series 2020 has 90 allergens on 9 panels of 10 (Schalock et al., Dermatitis 2020;31(5):279-282). Numbering follows the Chemotechnique American Core Series AC-1000, where #66 is ethyleneurea melamine formaldehyde. (`db/patch-test-series.ts:279-283`, `:378-380`)
- **P-10** Positions 1–10: nickel sulfate, Amerchol L-101, neomycin sulfate, potassium dichromate, DMDM hydantoin, fragrance mix I, colophonium, paraben mix, methylisothiazolinone, balsam of Peru. (`db/patch-test-series.ts:285-294`)
- **P-11** Positions 11–20: ethylenediamine, cobalt chloride, PTBP formaldehyde resin, epoxy resin, carba mix, black rubber mix, MCI/MI, quaternium-15, hydroperoxides of linalool, PPD. (`db/patch-test-series.ts:295-304`)
- **P-12** Positions 21–30: formaldehyde, mercapto mix, bronopol, thiuram mix, diazolidinyl urea, benzocaine, tixocortol-21-pivalate, gold sodium thiosulfate, imidazolidinyl urea, budesonide. (`db/patch-test-series.ts:305-314`)
- **P-13** Positions 31–40: hydrocortisone-17-butyrate, MBT, bacitracin, fragrance mix II, disperse blue 106/124 mix, lidocaine, propylene glycol, IPBC, polymyxin B sulfate, cocamidopropyl betaine. (`db/patch-test-series.ts:315-324`)
- **P-14** Positions 41–50: mixed dialkyl thioureas, DMAPA, HEMA, oleamidopropyl dimethylamine, decyl glucoside, methyl methacrylate, lavender absolute, cinnamal, tocopherol, ethyl acrylate. (`db/patch-test-series.ts:325-334`)
- **P-15** Positions 51–60: oxidized tea tree oil, chlorhexidine digluconate, propolis, chloroxylenol, benzophenone-3, tosylamide formaldehyde resin, sesquiterpene lactone mix, cocamide DEA, hydroperoxides of limonene, benzalkonium chloride. (`db/patch-test-series.ts:335-344`)
- **P-16** Positions 61–70: benzophenone-4, sodium benzoate, sorbic acid, ylang-ylang oil, compositae mix II, ethyleneurea melamine formaldehyde, sorbitan sesquioleate, 1,3-diphenylguanidine, HICC, ethylhexylglycerin. (`db/patch-test-series.ts:345-354`)
- **P-17** Positions 71–80: triamcinolone acetonide, clobetasol-17-propionate, amidoamine, ethyl cyanoacrylate, phenoxyethanol, disperse orange 3, benzoic acid, BHT, octinoxate, benzyl alcohol. (`db/patch-test-series.ts:355-364`)
- **P-18** Positions 81–90: cetearyl alcohol, carmine, benzyl salicylate, disperse yellow 3, jasmine absolute, peppermint oil, pramoxine hydrochloride, shellac, lauryl polyglucose, chlorocresol. (`db/patch-test-series.ts:365-374`)

### P3. ACDS Core Series 2017 (80 allergens)

- **P-19** The ACDS core series in use before the 2020 update had 80 allergens on 8 panels of 10 (Schalock et al., Dermatitis 2017;28(2):141-143). (`db/patch-test-series.ts:104-107`, `:570`)
- **P-20** The 2017 tray order matches 2020 positions 1–80 except at three positions: #19 methyldibromo glutaronitrile (2020: hydroperoxides of linalool), #59 chlorocresol (2020: hydroperoxides of limonene), #69 cetearyl alcohol (2020: HICC). (`db/patch-test-series.ts:108-189`)

### P4. NAC-80

- **P-21** The North American 80 Comprehensive Series (NAC-80) is the NACDG screening series: 80 allergens on 8 panels of 10, numbered as on the Chemotechnique tray. (`db/patch-test-series.ts:191-193`, `:577`)
- **P-22** NAC-80 contents and order as listed at `db/patch-test-series.ts:195-274` (80 items, alphabetical by allergen within the petrolatum and then aqueous blocks). Check against the current NAC-80 tray.

### P5. What a positive maps to (shown on the clinician sheet and the patient import)

- **P-23** Wool alcohols, Amerchol L-101 and lanolin alcohol all mean avoiding lanolin. (`db/patch-test-series.ts:65`, `:110`, `:383-384`)
- **P-24** Tixocortol-21-pivalate is the marker for class A (hydrocortisone-type) corticosteroids. (`db/patch-test-series.ts:89`; `db/contact-allergens.ts:643`)
- **P-25** Budesonide and triamcinolone acetonide are markers for class B (acetonide-type) corticosteroids. (`db/patch-test-series.ts:92`, `:355`; `db/contact-allergens.ts:651`)
- **P-26** Hydrocortisone-17-butyrate and clobetasol-17-propionate are markers for class D (ester-type) corticosteroids. (`db/patch-test-series.ts:93`, `:356`; `db/contact-allergens.ts:669`)
- **P-27** Parthenolide, sesquiterpene lactone mix and compositae mix II all indicate compositae (daisy family) allergy. (`db/patch-test-series.ts:96`, `:341`, `:349`)
- **P-28** Amidoamine and dimethylaminopropylamine (DMAPA) positives mean avoiding cocamidopropyl betaine. (`db/patch-test-series.ts:326`, `:357`; `db/contact-allergens.ts:402`)
- **P-29** HEMA, methyl methacrylate, ethyl acrylate and ethyl cyanoacrylate positives all mean avoiding acrylates as one group. (`db/patch-test-series.ts:327`, `:330`, `:334`, `:358`)
- **P-30** A benzoic acid positive means avoiding sodium benzoate too. (`db/patch-test-series.ts:361`; `db/contact-allergens.ts:339`)
- **P-31** A sorbitan oleate positive means avoiding sorbitan sesquioleate (one entry). (`db/patch-test-series.ts:256`, `:447`)
- **P-32** Hydroperoxides of linalool and limonene positives mean avoiding linalool and limonene on labels. (`db/patch-test-series.ts:303`, `:343`)
- **P-33** IPPD is the black rubber mix marker. (`db/patch-test-series.ts:20`, `:227`)
- **P-34** A sodium metabisulfite positive means avoiding sulfites. (`db/patch-test-series.ts:258`)
- **P-35** Ethyleneurea melamine formaldehyde belongs with formaldehyde and formaldehyde releasers. (`db/patch-test-series.ts:350`, `:413`; `db/contact-allergens.ts:291-296`)
- **P-36** A formaldehyde positive is extended to all formaldehyde releasers by default. (`db/contact-allergens.ts:907`)
- **P-37** PPD and PTD positives are extended to all PPD-type dyes (PPD, PTD, aminophenols) by default. (`db/contact-allergens.ts:908-909`)
- **P-38** Glucoside and isothiazolinone positives are offered the whole family, but not ticked by default. (`db/contact-allergens.ts:910-914`)

### P6. Not-on-label allergens: where they're found (`NOT_ON_LABELS`)

- **P-39** Carba mix (rubber accelerators): rubber gloves, elastic waistbands, shoes, makeup sponges and other rubber goods. (`db/patch-test-series.ts:16`)
- **P-40** Thiuram mix: rubber gloves (the most common source), elastic, shoes, condoms and some pesticides. (`db/patch-test-series.ts:17`)
- **P-41** Mercapto mix: rubber shoes and insoles, gloves, elastic, rubber handles and swim gear. (`db/patch-test-series.ts:18`)
- **P-42** MBT: rubber shoes, gloves, elastic, and some adhesives and antifreeze. (`db/patch-test-series.ts:19`)
- **P-43** Black rubber mix (IPPD): tires, hoses, handles, boots, gym equipment and headphones. (`db/patch-test-series.ts:20`)
- **P-44** Mixed dialkyl thioureas: neoprene (wetsuits, knee and wrist braces, mouse pads, shoe insoles). (`db/patch-test-series.ts:21`)
- **P-45** Epoxy resin: two-part glues, paints, floor coatings and some electronics. Mainly an occupational allergen. (`db/patch-test-series.ts:22`)
- **P-46** PTBP formaldehyde resin: leather and shoe adhesives, watch straps, prosthetics, and some nail and wig glues. (`db/patch-test-series.ts:23`)
- **P-47** Disperse blue 106 and the 106/124 mix: dark synthetic clothing (polyester, acetate, nylon) in blue, black, brown and green, including linings, swimwear and leggings. (`db/patch-test-series.ts:24-26`)
- **P-48** 1,3-Diphenylguanidine: rubber and synthetic-rubber gloves, including many nitrile and neoprene gloves, and some shoes. (`db/patch-test-series.ts:27`)
- **P-49** Disperse orange 3 cross-reacts with PPD. (`db/patch-test-series.ts:28`)
- **P-50** Disperse yellow 3: synthetic clothing dyes in yellows, oranges, browns and greens. (`db/patch-test-series.ts:29`)

### P7. Allergen sections: intros (`db/contact-allergens.ts` `ALLERGEN_SECTIONS`)

- **P-51** Fragrance is the most common cause of cosmetic contact allergy. (`db/contact-allergens.ts:73`)
- **P-52** A label reading only "fragrance," "parfum," "aroma" or "flavor" can contain any of the named fragrance allergens, which then don't have to be named. (`db/contact-allergens.ts:73`; product page `app/product/[id]/page.tsx:309-312`)
- **P-53** About 1 in 6 leave-on and 1 in 4 rinse-off products contain a formaldehyde releaser. (`db/contact-allergens.ts:81`)
- **P-54** Formaldehyde-releaser strength runs quaternium-15 > diazolidinyl urea > DMDM hydantoin > imidazolidinyl urea > bronopol. (`db/contact-allergens.ts:81`)
- **P-55** Quaternium-15 is the strongest formaldehyde releaser. (`db/contact-allergens.ts:259`)
- **P-56** If you react to formaldehyde, avoid all releasers, because every releaser frees formaldehyde into the product. (`db/contact-allergens.ts:81`, `:770`)
- **P-57** Methylisothiazolinone allergy has risen sharply, mostly from rinse-off products and wet wipes. (`db/contact-allergens.ts:88`, `:320`)
- **P-58** Alkyl glucosides (decyl, lauryl, coco, caprylyl and others) cross-react with each other. (`db/contact-allergens.ts:95`, `:412`, `:806`)
- **P-59** Emollient and vehicle allergens matter more on broken or eczematous skin. (`db/contact-allergens.ts:101`)
- **P-60** Chemical (organic) UV filters cause contact and photocontact allergy. Mineral filters (titanium dioxide, zinc oxide) rarely do. (`db/contact-allergens.ts:108`, `:519`)
- **P-61** About 94% of "natural" personal-care products contain at least one contact allergen. (`db/contact-allergens.ts:114`)
- **P-62** Metals rarely appear on labels. They reach skin as pigments, impurities, or from applicators and packaging. (`db/contact-allergens.ts:138`)

### P8. Allergen notes: fragrances

- **P-63** Fragrance mix I contains eight chemicals: amyl cinnamal, cinnamal, cinnamyl alcohol, eugenol, isoeugenol, geraniol, hydroxycitronellal and oakmoss. (`db/contact-allergens.ts:785-788`)
- **P-64** Fragrance mix II contains six chemicals: citral, citronellol, coumarin, farnesol, hexyl cinnamal and HICC. (`db/contact-allergens.ts:791-794`)
- **P-65** People positive to a fragrance mix are usually told to avoid undisclosed "fragrance" entirely. (`db/contact-allergens.ts:161`)
- **P-66** Eugenol is a component of balsam of Peru and clove oil. (`db/contact-allergens.ts:184`)
- **P-67** Oakmoss is a lichen extract whose main allergens are atranol and chloroatranol. (`db/contact-allergens.ts:193`)
- **P-68** HICC (Lyral) has been banned in EU cosmetics since 2021. (`db/contact-allergens.ts:211`)
- **P-69** Balsam of Peru is made of many fragrance chemicals, including cinnamic acid, cinnamyl cinnamate, benzyl benzoate, benzoic acid, eugenol and vanillin. (`db/contact-allergens.ts:218`)
- **P-70** Limonene, linalool and tea tree oil are allergenic mainly once oxidized: hydroperoxides form as the product ages and is exposed to air. The fresh compounds are weak sensitizers. (`db/contact-allergens.ts:150`, `:220-221`, `:536`)
- **P-71** Balsam of Peru, benzyl alcohol, benzaldehyde and bisabolol are used for purposes other than scent, so they can appear in products labeled "unscented" or "fragrance-free." (`db/contact-allergens.ts:151`, `:218`, `:222`, `:225`, `:232`)
- **P-72** Benzyl alcohol is also used as a preservative and solvent. (`db/contact-allergens.ts:222`)
- **P-73** Bisabolol is a chamomile-derived soothing agent. (`db/contact-allergens.ts:232`)
- **P-74** HICC is also sold as "Lyral." MCI/MI is also sold as "Kathon CG." Oakmoss is "Evernia prunastri" on labels. (`db/contact-allergens.ts:15-16`, `:210`, `:311`)

### P9. Allergen notes: formaldehyde and preservatives

- **P-75** "Methylene glycol" is formaldehyde dissolved in water, the form used in keratin hair-smoothing treatments. (`db/contact-allergens.ts:252`)
- **P-76** Tosylamide/formaldehyde resin is common in nail polish. Reactions often appear on the eyelids, face and neck rather than the fingers. (`db/contact-allergens.ts:302`)
- **P-77** MCI/MI always contains MI. (`db/contact-allergens.ts:312`, `:782`)
- **P-78** Parabens rarely cause allergy on intact skin and matter more on damaged skin. (`db/contact-allergens.ts:336`)
- **P-79** Phenoxyethanol is a rare sensitizer but appears in a very large share of products. (`db/contact-allergens.ts:338`)
- **P-80** Thimerosal is a mercury compound, largely dropped from screening series for low current relevance. (`db/contact-allergens.ts:345`)
- **P-81** Chlorhexidine is in first-aid washes and mouthwash and can also cause immediate-type reactions. (`db/contact-allergens.ts:355`)
- **P-82** Benzisothiazolinone is mostly in household cleaners, paints and slimes. Cross-reactions with MI are uncommon. (`db/contact-allergens.ts:364`)
- **P-83** Octylisothiazolinone is a preservative in leather (furniture, shoes, gloves), paints and some cosmetics. (`db/contact-allergens.ts:372`)
- **P-84** Benzalkonium chloride is in first-aid products, eye drops, hand sanitizers and some hair conditioners, and is also an irritant. (`db/contact-allergens.ts:379`)
- **P-85** Potassium and other sorbate salts release sorbic acid. Polysorbates are unrelated. (`db/contact-allergens.ts:386`)
- **P-86** Ethylhexylglycerin is a preservative booster, often paired with phenoxyethanol, including in "preservative-free" products. (`db/contact-allergens.ts:393`)

### P10. Allergen notes: surfactants, emollients, UV filters

- **P-87** The real sensitizers in cocamidopropyl betaine are often the manufacturing residues amidoamine and DMAPA, which aren't listed on labels. (`db/contact-allergens.ts:402`)
- **P-88** Sorbitan sesquioleate is the emulsifier in patch-test fragrance preparations. (`db/contact-allergens.ts:420`)
- **P-89** Cocamide DEA is a foam booster in shampoos, hand soaps and dish soap, and is also in industrial cleaners and cutting fluids. (`db/contact-allergens.ts:429`)
- **P-90** Cocamide MEA is a different ingredient from cocamide DEA. (`db/contact-allergens.ts:429`)
- **P-91** Cetearyl alcohol is a mix of cetyl and stearyl alcohol. (`db/contact-allergens.ts:442`)
- **P-92** Propylene glycol is a weak allergen on intact skin and matters more on a damaged barrier. (`db/contact-allergens.ts:459`)
- **P-93** Oxybenzone is a well-documented photoallergen. (`db/contact-allergens.ts:469`)
- **P-94** Benzophenone-4 (sulisobenzone) is an emerging allergen. (`db/contact-allergens.ts:471`)
- **P-95** Tinosorb M (bisoctrizole) formulations contain decyl glucoside, which may be the true culprit in reactions to it. (`db/contact-allergens.ts:503`, `:806`)
- **P-96** Oleoyl tyrosine is found in tan-enhancing products. (`db/contact-allergens.ts:513`)

### P11. Allergen notes: botanicals, antioxidants, hair dyes

- **P-97** The patch-test marker for compositae allergy is sesquiterpene lactone mix. (`db/contact-allergens.ts:533`)
- **P-98** Chamomile, arnica, feverfew, calendula, yarrow, mugwort/artemisia and dandelion are compositae (Asteraceae) plants. (`db/contact-allergens.ts:528-531`)
- **P-99** Pure henna is a rare allergen. (`db/contact-allergens.ts:549`)
- **P-100** "Black henna" usually contains PPD, a potent sensitizer. (`db/contact-allergens.ts:549`, `:606`)
- **P-101** Bergamot oil is phototoxic as well as allergenic: its furanocoumarins cause a sunburn-like reaction and dark streaks after sun exposure. (`db/contact-allergens.ts:560`)
- **P-102** Colophonium (pine resin) is found in mascara, eyeliner, lip products, depilatory wax, nail products and adhesives (bandages, lash glue). (`db/contact-allergens.ts:571`)
- **P-103** Modified rosins such as glyceryl rosinate can still cross-react with colophonium. (`db/contact-allergens.ts:571`)
- **P-104** Tocopherol (vitamin E) is the most common inactive-ingredient allergen in best-selling sunscreens. (`db/contact-allergens.ts:580`)
- **P-105** Sulfites were an "Allergen of the Year" nominee, and how often a positive patch test explains a rash is still debated. (`db/contact-allergens.ts:587`)
- **P-106** BHT is a rare sensitizer but is in many lipsticks, creams and sunscreens. (`db/contact-allergens.ts:591`)
- **P-107** Gallates cross-react (propyl, octyl, dodecyl/lauryl gallate). (`db/contact-allergens.ts:597`)
- **P-108** Propyl gallate is food additive E310. (`db/contact-allergens.ts:597`)
- **P-109** PPD cross-reacts with toluene-2,5-diamine (PTD). (`db/contact-allergens.ts:606`, `:613`, `:812`)
- **P-110** Many PPD-allergic people react to PPD derivatives such as 2-methoxymethyl-p-phenylenediamine. (`db/contact-allergens.ts:606`)
- **P-111** PTD is often marketed as the "PPD-free" alternative. (`db/contact-allergens.ts:613`)
- **P-112** Aminophenols are frequent co-reactors with PPD. (`db/contact-allergens.ts:812`)
- **P-113** Persulfates (bleach boosters) can also cause hives and asthma. (`db/contact-allergens.ts:616`)

### P12. Allergen notes: medicaments and metals

- **P-114** Neomycin cross-reacts with framycetin, paromomycin and other aminoglycosides. (`db/contact-allergens.ts:625`)
- **P-115** Chlorquinaldol is a topical antiseptic in some combination steroid creams sold outside the US. (`db/contact-allergens.ts:633`)
- **P-116** Class A (hydrocortisone-type) corticosteroids include hydrocortisone, hydrocortisone acetate (including OTC hydrocortisone), tixocortol, prednisolone, methylprednisolone, prednisone and cortisone. (`db/contact-allergens.ts:636-644`)
- **P-117** Class B (acetonide-type) corticosteroids include budesonide, triamcinolone, fluocinolone acetonide, fluocinonide, desonide, amcinonide and halcinonide. (`db/contact-allergens.ts:648-650`)
- **P-118** Class C (non-esterified) corticosteroids include betamethasone, dexamethasone and desoximetasone, excluding their valerate and dipropionate esters. (`db/contact-allergens.ts:656-659`)
- **P-119** Class D (ester-type) corticosteroids include hydrocortisone 17-butyrate, valerate and probutate, clobetasol, clobetasone, betamethasone valerate and dipropionate, mometasone, fluticasone, methylprednisolone aceponate and prednicarbate. (`db/contact-allergens.ts:663-668`)
- **P-120** Corticosteroid allergy is class-based, but cross-reactions between classes occur. (`db/contact-allergens.ts:644`)
- **P-121** Budesonide also cross-reacts with some class D steroids. (`db/contact-allergens.ts:652`)
- **P-122** Benzocaine is in anti-itch, sunburn, teething and hemorrhoid products. (`db/contact-allergens.ts:676`)
- **P-123** Dibucaine is an amide anesthetic in OTC hemorrhoid and sunburn ointments. (`db/contact-allergens.ts:688`)
- **P-124** Tetracaine is an ester anesthetic that can cross-react with benzocaine. (`db/contact-allergens.ts:695`)
- **P-125** Ethylenediamine is a stabilizer in some prescription creams. (`db/contact-allergens.ts:706`)
- **P-126** Ethylenediamine can cross-react with hydroxyzine, cetirizine and aminophylline. (`db/contact-allergens.ts:706`)
- **P-127** The chelators EDTA and EDDS don't cross-react with ethylenediamine (so they aren't flagged). (`db/contact-allergens.ts:706`)
- **P-128** Topical diphenhydramine can cause the itchy rash it is used to treat. (`db/contact-allergens.ts:714`)
- **P-129** Nickel is the most common contact allergen overall, mostly from jewelry and metal applicators. (`db/contact-allergens.ts:718`; see F-01)
- **P-130** Cobalt allergy often occurs alongside nickel allergy. Cobalt is also used as a pigment. (`db/contact-allergens.ts:719`)
- **P-131** Chromium oxide green pigments are CI 77288/77289. (`db/contact-allergens.ts:725`)
- **P-132** Gold is a frequent positive patch test that is often not clinically relevant. Reactions mostly come from jewelry and dental work. (`db/contact-allergens.ts:735`)
- **P-133** Carmine is a red pigment made from insects that can also cause immediate allergic reactions. (`db/contact-allergens.ts:743`)
- **P-134** Acrylate thickeners (acrylates copolymer, carbomer) are in about 79% of best-selling sunscreens. (`db/contact-allergens.ts:752`)
- **P-135** Acrylate monomers in nail products and adhesives (HEMA, methyl methacrylate, ethyl cyanoacrylate) are the strong sensitizers. (`db/contact-allergens.ts:752`)
- **P-136** Shellac is a natural resin film former in mascara, eyeliner, hairspray and nail polish. (`db/contact-allergens.ts:760`)

---

## R. Red-flag "see a dermatologist first" criteria
Source: `components/red-flag-banner.tsx`. Shown above every product list and on product pages.

- **R-01** A changing lesion is a reason to see a board-certified dermatologist before self-treating. (`components/red-flag-banner.tsx:21`)
- **R-02** A bleeding lesion is a reason to see a dermatologist first. (`components/red-flag-banner.tsx:21`)
- **R-03** Rapid spread is a reason to see a dermatologist first. (`components/red-flag-banner.tsx:21`)
- **R-04** Pain is a reason to see a dermatologist first. (`components/red-flag-banner.tsx:21`)
- **R-05** Fever is a reason to see a dermatologist first. (`components/red-flag-banner.tsx:21`)
- **R-06** Eye involvement is a reason to see a dermatologist first. (`components/red-flag-banner.tsx:21`)
- **R-07** No improvement after 8–12 weeks of consistent use is a reason to see a dermatologist. (`components/red-flag-banner.tsx:21-22`)
  - Possible issue: the banner shows the same 8–12 week window above every product list, but the drafted label-based guidance uses much shorter windows for some categories: 7 days for hydrocortisone, pramoxine, diphenhydramine and skin protectants (`db/usage-guidance.ts:425`, `:475`), and 2–4 weeks for antifungals (`:119`). Please check whether 8–12 weeks is right for acne only, and what it should be for other concerns.
- **R-08** Missing-criteria check: ask OpenEvidence which standard red flags for self-treating skin conditions are not on this list (for example, signs of infection or widespread blistering). Record any additions under Corrected.

---

## B. About and methodology page
Source: `app/about/page.tsx`.

- **B-01** Actively matches self-reported skin concerns to "evidence-graded active ingredients." (`app/about/page.tsx:17-18`)
  - Possible issue: the same page (`:44-46`) says no evidence grade has been assigned yet. See also A-01.
- **B-02** [internal] Actively is run by Michael Tassavor, MD, a board-certified dermatologist. (`app/about/page.tsx:26`)
- **B-03** [internal] Derm Score raters must have verified ABD/AOBD certification and an NPI. (`app/about/page.tsx:45-46`)
- **B-04** ABD (American Board of Dermatology) and AOBD (American Osteopathic Board of Dermatology) are the US certifying boards for dermatologists. (`app/about/page.tsx:46`)
- **B-05** [internal] A Derm Score is shown only after at least 5 dermatologists have rated a product for a concern. (`app/about/page.tsx:47-48`)
- **B-06** [internal] User Score is the share of people who reported improvement, logged on Actively, marked "Early" until more than 5 people have logged an outcome. (`app/about/page.tsx:51-54`)
- **B-07** Most product and active-ingredient data comes from the FDA's openFDA drug label and NDC directory, which is regulatory data manufacturers file with the FDA. (`app/about/page.tsx:62-63`)
- **B-08** Ingredient summaries describe what a monograph active is and how it's typically used. They are not a clinical efficacy judgment. (`app/about/page.tsx:63-65`)
- **B-09** Niacinamide, vitamin C and similar cosmetic ingredients have no FDA drug status. (`app/about/page.tsx:69`)
- **B-10** [internal] Open Beauty Facts is a community-edited database under the Open Database License. (`app/about/page.tsx:74-75`)

---

## G. Product and ingredient page copy (strength ranges, EWG scores, label status)
Sources: `app/product/[id]/page.tsx`, `app/ingredient/[slug]/page.tsx`, `components/equivalence-list.tsx`, `lib/ewg.ts`.

- **G-01** "The monograph range is what the FDA permits for this active in an OTC product — a regulatory fact, not a rating." (`app/product/[id]/page.tsx:409`; also `app/ingredient/[slug]/page.tsx:234`)
- **G-02** A strength outside the monograph range may reflect how the label was filed rather than the product itself. (`app/product/[id]/page.tsx:410-411`)
- **G-03** For sunscreens, SPF and broad-spectrum protection are tested on each finished product, so the same filters at the same strength don't guarantee the same SPF. (`app/product/[id]/page.tsx:643`)
- **G-04** OTC drugs made under the same FDA monograph must meet the same conditions for that active, strength and use, so a store brand is held to the same standard as the name brand. (`components/equivalence-list.tsx:20`)
- **G-05** Actives sold OTC under an FDA-approved application (not a monograph) were approved on their own data, and generic versions are approved as equivalent to the original. (`components/equivalence-list.tsx:19`)
- **G-06** Inactive ingredients (the vehicle) can change texture, scent and how skin tolerates a product with the same active at the same strength. (`components/equivalence-list.tsx:22-23`; `app/product/[id]/page.tsx:642`)
- **G-07** EWG Skin Deep hazard bands: 1–2 low, 3–6 moderate, 7–10 high hazard. (`lib/ewg.ts:1-12`; shown as color on the badge)
- **G-08** EWG scores whole formulas, not single ingredients. (`app/ingredient/[slug]/page.tsx:352-353`)
- **G-09** Cosmetic ingredient lists run roughly from highest to lowest concentration, so an earlier position usually means more of that ingredient. (`app/ingredient/[slug]/page.tsx:374-375`)
- **G-10** Fragrance allergens that are part of "fragrance" or "parfum" don't have to be named on the label. (`app/product/[id]/page.tsx:309-312`; same claim as P-52)
- **G-11** Brand-sourced listings are shown with "this active has no OTC monograph status." (`app/product/[id]/page.tsx:551-552`)
  - Note for checking: this sentence appears on every brand-sourced product page, whichever active it contains. Confirm that every brand-direct product is a cosmetic active with no monograph.

---

## Item counts

| Section | Items |
|---|---|
| A. Actives and concerns | 137 |
| M. Monograph ranges | 37 |
| U. Usage guidance (not public) | 97 |
| C. Interaction cautions | 12 |
| S. Slot reasons | 6 |
| F. Flags and free-from | 21 |
| P. Patch test and allergens | 136 |
| R. Red flags | 8 |
| B. About page | 10 |
| G. Product and ingredient page copy | 11 |
| **Total** | **475** |

Out of scope for this list, but with clinical content that will need the same pass later: `db/pregnancy-lactation.ts`, `db/steroid-potency.ts`, `db/escalation-guidance.ts`, `db/handout-library/`, `db/rx.ts`, `lib/patch-test-reading.ts` (ICDRG grading), and the guide pages under `app/guide/`.
