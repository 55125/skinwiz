// What governments have done about specific ingredients, for the product
// page's "N ingredients banned by at least one authority" box, a softer
// "under review" line, and filters. Each action states who acted, what it
// covers and from when, and links the legal text, so a page can repeat a
// regulator's decision without making a health claim of its own.
//
// Three tiers, kept apart on purpose:
//   banned        a regulator prohibits the ingredient in a product category
//                 (cosmetics, OTC skin lighteners, ...). Future dates are
//                 kept and reported separately ("banned from 2027").
//   under review  a regulator limits how much may be used, has asked for
//                 more safety data, or requires a warning. Not a finding of
//                 harm.
//   local         a place bans sale for environmental reasons (Hawaii's
//                 reef rules). Shown on its own, never in the banned count.
// Consumer-preference filters (microplastics, cyclic silicones, ...) are
// free-from checks in db/ingredient-flags.ts, not here: they are not
// regulatory findings.
//
// Matching is by catalog ingredient id (the slug in product_ingredients), so
// it works for every product with a parsed list, not only contact allergens.
// Each pattern was checked against the catalog on the date in `checked`;
// copolymer fragments ("styrene" split from "styrene/acrylates copolymer")
// are deliberately not matched. Sources, catalog counts and the method are
// in the "Banned and restricted ingredients worldwide" doc
// (https://claude.ai/artifact/TGz2Fkd6PMvvMeqGqMPysx). Re-check before using
// a line in marketing.

export type AuthorityId = "eu" | "ca" | "wa" | "vt" | "jp" | "canada" | "fda" | "hi" | "p65";

export const AUTHORITIES: Record<AuthorityId, { name: string; short: string }> = {
  eu: { name: "European Union", short: "EU" },
  ca: { name: "California", short: "California" },
  wa: { name: "Washington State", short: "Washington" },
  vt: { name: "Vermont", short: "Vermont" },
  jp: { name: "Japan", short: "Japan" },
  canada: { name: "Health Canada", short: "Canada" },
  fda: { name: "US Food and Drug Administration", short: "FDA" },
  hi: { name: "Hawaii", short: "Hawaii" },
  p65: { name: "California Proposition 65", short: "Prop 65" },
};

export type ActionKind =
  | "ban" // prohibited in the covered products
  | "ban-leave-on" // prohibited in leave-on products; rinse-off allowed (often with a limit)
  | "ban-rinse-off" // prohibited in rinse-off products only (so far)
  | "limit" // allowed up to a concentration or in some product types: under review tier
  | "review" // regulator asked for data / proposed a change: under review tier
  | "warning" // a warning label is required: under review tier
  | "local-ban"; // sale banned in one place for environmental reasons

export type RegulatoryAction = {
  authority: AuthorityId;
  kind: ActionKind;
  /** What the rule covers, in a few words: "Cosmetics", "Leave-on cosmetics", "Sunscreens sold in Hawaii". */
  scope: string;
  /** First day the rule applies to new products (YYYY-MM-DD). Absent: in force for years. */
  from?: string;
  /** Last day existing stock may still be sold, when the law gives one. */
  sellThrough?: string;
  /** One sentence in plain words, checked against the source. */
  summary: string;
  law: string;
  url: string;
  /**
   * The rule covers cosmetics, and this jurisdiction regulates the product
   * as a medicine when the ingredient is its drug active (coal tar
   * shampoo, phenol in a medicated lip balm). Such a product is not counted.
   */
  drugActiveExempt?: boolean;
};

export type RegulatedSubstance = {
  id: string;
  name: string;
  /** Catalog ingredient ids (product_ingredients.ingredient_id) this covers. */
  match: RegExp;
  actions: RegulatoryAction[];
  /** UV filters: the "under review" line is held back on product pages until decided (see review doc). */
  sunscreenFilter?: boolean;
  checked: string;
};

// ---------------------------------------------------------------------------
// Sources

const EU_ANNEX_II = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02009R1223-20260501";
const EU = {
  consolidated: { law: "EU Cosmetics Regulation 1223/2009, Annex II (consolidated text of 1 May 2026)", url: EU_ANNEX_II },
  r2019_831: { law: "Commission Regulation (EU) 2019/831", url: "https://eur-lex.europa.eu/eli/reg/2019/831/oj" },
  r2014_358: { law: "Commission Regulation (EU) No 358/2014", url: "https://eur-lex.europa.eu/eli/reg/2014/358/oj" },
  r2014_1003: { law: "Commission Regulation (EU) No 1003/2014", url: "https://eur-lex.europa.eu/eli/reg/2014/1003/oj" },
  r2016_1198: { law: "Commission Regulation (EU) 2016/1198", url: "https://eur-lex.europa.eu/eli/reg/2016/1198/oj" },
  r2017_1224: { law: "Commission Regulation (EU) 2017/1224", url: "https://eur-lex.europa.eu/eli/reg/2017/1224/oj" },
  r2017_1410: { law: "Commission Regulation (EU) 2017/1410", url: "https://eur-lex.europa.eu/eli/reg/2017/1410/oj" },
  r2021_1902: { law: "Commission Regulation (EU) 2021/1902", url: "https://eur-lex.europa.eu/eli/reg/2021/1902/oj" },
  r2023_1490: { law: "Commission Regulation (EU) 2023/1490", url: "https://eur-lex.europa.eu/eli/reg/2023/1490/oj" },
  r2024_996: { law: "Commission Regulation (EU) 2024/996", url: "https://eur-lex.europa.eu/eli/reg/2024/996/oj" },
  r2025_877: { law: "Commission Regulation (EU) 2025/877", url: "https://eur-lex.europa.eu/eli/reg/2025/877/oj" },
  r2026_78: { law: "Commission Regulation (EU) 2026/78", url: "https://eur-lex.europa.eu/eli/reg/2026/78/oj" },
  reach_d4d5d6: { law: "REACH Annex XVII entry 70, as replaced by Commission Regulation (EU) 2024/1328", url: "https://eur-lex.europa.eu/eli/reg/2024/1328/oj" },
  reach_pfhxa: { law: "REACH Annex XVII entry 79, Commission Regulation (EU) 2024/2462", url: "https://eur-lex.europa.eu/eli/reg/2024/2462/oj" },
  edList: {
    law: "European Commission priority list of potential endocrine disruptors in cosmetics",
    url: "https://single-market-economy.ec.europa.eu/sectors/cosmetics/cosmetic-products-specific-topics/endocrine-disruptors_en",
  },
};
const CA_108980 = { law: "California Health and Safety Code § 108980 (AB 2762, AB 496)", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=108980" };
const CA_PFAS = { law: "California Health and Safety Code § 108981.5 (AB 2771)", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=108981.5" };
const WA_RCW = { law: "RCW 70A.560.020 (Toxic-Free Cosmetics Act)", url: "https://app.leg.wa.gov/RCW/default.aspx?cite=70A.560.020" };
const WA_WAC = { law: "WAC 173-339-110 (WSR 25-18-057)", url: "https://app.leg.wa.gov/WAC/default.aspx?cite=173-339-110" };
const VT = { law: "9 V.S.A. § 2494b", url: "https://legislature.vermont.gov/statutes/section/09/063/02494b" };
const JP = { law: "Japan Standards for Cosmetics (MHW Notification No. 331 of 2000), Appendix 1", url: "https://www.mhlw.go.jp/content/001257665.pdf" };
const CANADA = {
  law: "Health Canada Cosmetic Ingredient Hotlist",
  url: "https://www.canada.ca/en/health-canada/services/consumer-product-safety/cosmetics/cosmetic-ingredient-hotlist-prohibited-restricted-ingredients/hotlist.html",
};
const FDA_COSMETICS = { law: "21 CFR Part 700 (FDA prohibited and restricted cosmetic ingredients)", url: "https://www.fda.gov/cosmetics/cosmetics-laws-regulations/prohibited-restricted-ingredients-cosmetics" };
const FDA_HQ = {
  law: "CARES Act OTC monograph reform; FDA skin-lightener actions",
  url: "https://www.fda.gov/drugs/drug-safety-and-availability/fda-works-protect-consumers-potentially-harmful-otc-skin-lightening-products",
};
const FDA_WASH = { law: "FDA final rule on consumer antiseptic washes (81 FR 61106)", url: "https://www.federalregister.gov/d/2016-21337" };
const FDA_SUNSCREEN_2019 = { law: "FDA proposed rule on OTC sunscreens (84 FR 6204)", url: "https://www.federalregister.gov/d/2019-03019" };
const HI = { law: "Hawaii Revised Statutes § 342D-21 (Act 104, 2018)", url: "https://data.capitol.hawaii.gov/hrscurrent/Vol06_Ch0321-0344/HRS0342D/HRS_0342D-0021.htm" };
const P65 = (slug: string) => ({ law: "California Proposition 65 list", url: `https://oehha.ca.gov/proposition-65/chemicals/${slug}` });

const CHECKED = "2026-11-11";

// Reused action builders --------------------------------------------------

const eu = (kind: ActionKind, summary: string, src: { law: string; url: string }, dates: { from?: string; sellThrough?: string } = {}, scope = "Cosmetics"): RegulatoryAction => ({
  authority: "eu",
  kind,
  scope,
  summary,
  ...src,
  ...dates,
});
const caBan2025 = (what: string): RegulatoryAction => ({
  authority: "ca",
  kind: "ban",
  scope: "Cosmetics",
  from: "2025-01-01",
  summary: `California bans ${what} intentionally added to cosmetics from January 1, 2025.`,
  ...CA_108980,
});
const caBan2027 = (what: string): RegulatoryAction => ({
  authority: "ca",
  kind: "ban",
  scope: "Cosmetics",
  from: "2027-01-01",
  summary: `California bans ${what} intentionally added to cosmetics from January 1, 2027.`,
  ...CA_108980,
});
const waBan2025 = (what: string): RegulatoryAction => ({
  authority: "wa",
  kind: "ban",
  scope: "Cosmetics",
  from: "2025-01-01",
  sellThrough: "2025-12-31",
  summary: `Washington bans ${what} intentionally added to cosmetics from January 1, 2025.`,
  ...WA_RCW,
});
const waReleaser: RegulatoryAction = {
  authority: "wa",
  kind: "ban",
  scope: "Cosmetics",
  from: "2027-01-01",
  sellThrough: "2027-12-31",
  summary: "Washington bans this formaldehyde releaser in cosmetics from January 1, 2027; stores may sell existing stock through December 31, 2027.",
  ...WA_WAC,
};
const vtBan = (what: string, from = "2026-01-01"): RegulatoryAction => ({
  authority: "vt",
  kind: "ban",
  scope: "Cosmetics and menstrual products",
  from,
  summary: `Vermont bans ${what} intentionally added to cosmetics and menstrual products from ${from === "2026-01-01" ? "January 1, 2026" : "July 1, 2027"}.`,
  ...VT,
});
const jpBan = (what: string, extra: Partial<RegulatoryAction> = {}): RegulatoryAction => ({
  authority: "jp",
  kind: "ban",
  scope: "Cosmetics",
  summary: `Japan's Standards for Cosmetics list ${what} among ingredients cosmetics may not contain.`,
  ...JP,
  ...extra,
});
const canadaBan = (what: string, extra: Partial<RegulatoryAction> = {}): RegulatoryAction => ({
  authority: "canada",
  kind: "ban",
  scope: "Cosmetics",
  summary: `Health Canada lists ${what} as prohibited in cosmetics.`,
  ...CANADA,
  ...extra,
});
const edReview = (what: string): RegulatoryAction => ({
  authority: "eu",
  kind: "review",
  scope: "Cosmetics",
  summary: `The European Commission put ${what} on its priority list of possible endocrine disruptors in cosmetics for safety review. That is a review, not a finding of harm.`,
  ...EU.edList,
});
const fdaSunscreenData = (what: string): RegulatoryAction => ({
  authority: "fda",
  kind: "review",
  scope: "Sunscreens",
  summary: `FDA's 2019 sunscreen proposal said there wasn't enough data to call ${what} safe and effective and asked makers for more; it did not find the filter unsafe, and the filter is still allowed.`,
  ...FDA_SUNSCREEN_2019,
});

// ---------------------------------------------------------------------------
// Registry

export const REGULATED_SUBSTANCES: RegulatedSubstance[] = [
  // ---- Formaldehyde and releasers --------------------------------------
  {
    id: "formaldehyde",
    name: "Formaldehyde (incl. methylene glycol, paraformaldehyde)",
    match: /^(formaldehyde|formalin|methylene-glycol|paraformaldehyde)$/,
    actions: [
      eu("ban", "The EU has banned formaldehyde, paraformaldehyde and methylene glycol in cosmetics since 2019.", EU.r2019_831, { from: "2019-06-12" }),
      caBan2025("formaldehyde, paraformaldehyde and methylene glycol"),
      waBan2025("formaldehyde and methylene glycol"),
      vtBan("formaldehyde and methylene glycol"),
      jpBan("formalin"),
    ],
    checked: CHECKED,
  },
  {
    id: "quaternium-15",
    name: "Quaternium-15",
    match: /^quaternium-15(-cis-form)?$/,
    actions: [
      eu("ban", "The EU banned quaternium-15 in cosmetics in 2019 after part of it was classified as a possible carcinogen.", EU.r2019_831, { from: "2019-06-12" }),
      caBan2025("quaternium-15"),
      vtBan("quaternium-15"),
      waReleaser,
    ],
    checked: CHECKED,
  },
  {
    id: "wa-formaldehyde-releasers",
    name: "Formaldehyde releasers on Washington's list",
    match:
      /^(dmdm-hydantoin|diazolidinyl-urea|imidazolidinyl-urea|tosylamide-formaldehyde-resin|2-bromo-2-nitropropane-1-3-diol|bronopol|sodium-hydroxymethylglycinate|polyoxymethylene-urea|polyoxymethylene-melamine|5-bromo-5-nitro-1-3-dioxane|bronidox|7-ethylbicyclooxazolidine|benzylhemiformal|dimethyl-oxazolidine|mdm-hydantoin|methenamine|methylal|tetramethylol-glycoluril|tris-hydroxymethyl-nitromethane|tris-nitro)$/,
    actions: [waReleaser],
    checked: CHECKED,
  },

  // ---- Preservatives -----------------------------------------------------
  {
    id: "methylisothiazolinone",
    name: "Methylisothiazolinone (MI)",
    match: /^methylisothiazolinone$/,
    actions: [
      eu("ban-leave-on", "The EU has banned methylisothiazolinone in leave-on cosmetics since February 12, 2017, and limits it to 0.0015% in rinse-off products.", EU.r2016_1198, { from: "2017-02-12" }, "Leave-on cosmetics"),
      { authority: "canada", kind: "ban-leave-on", scope: "Leave-on cosmetics", summary: "Health Canada prohibits methylisothiazolinone in leave-on cosmetics and limits it in rinse-off products.", ...CANADA },
    ],
    checked: CHECKED,
  },
  {
    id: "methylchloroisothiazolinone",
    name: "Methylchloroisothiazolinone (MCI, with MI)",
    match: /methylchloroisothiazolinone/,
    actions: [
      eu("ban-leave-on", "The EU has allowed the MCI/MI mixture only in rinse-off cosmetics since 2015 (sell-through April 16, 2016).", EU.r2014_1003, { from: "2015-07-16", sellThrough: "2016-04-15" }, "Leave-on cosmetics"),
      { authority: "canada", kind: "ban-leave-on", scope: "Leave-on cosmetics", summary: "Health Canada does not permit the MCI/MI mixture in leave-on cosmetics.", ...CANADA },
    ],
    checked: CHECKED,
  },
  {
    id: "banned-parabens",
    name: "Isopropyl-, isobutyl-, phenyl-, benzyl- and pentylparaben",
    match: /^(isopropylparaben|isobutylparaben|phenylparaben|benzylparaben|pentylparaben)$/,
    actions: [
      eu("ban", "The EU banned these five parabens in cosmetics in 2014 because their safety couldn't be shown.", EU.r2014_358, { from: "2014-10-30", sellThrough: "2015-07-29" }),
      caBan2025("isopropylparaben and isobutylparaben"),
      vtBan("isopropylparaben and isobutylparaben"),
    ],
    checked: CHECKED,
  },
  {
    id: "zinc-pyrithione",
    name: "Zinc pyrithione",
    match: /^(pyrithione-zinc|zinc-pyrithione)$/,
    actions: [
      eu("ban", "The EU has banned zinc pyrithione in cosmetics, including anti-dandruff shampoo, since March 1, 2022, after it was classified as toxic to reproduction.", EU.r2021_1902, { from: "2022-03-01" }),
    ],
    checked: CHECKED,
  },
  {
    id: "triclosan",
    name: "Triclosan",
    match: /^triclosan$/,
    actions: [
      waBan2025("triclosan"),
      vtBan("triclosan"),
      { authority: "fda", kind: "ban", scope: "Consumer antibacterial soaps and washes", from: "2017-09-06", summary: "FDA ruled in 2016 that consumer antibacterial washes may no longer contain triclosan, from September 6, 2017.", ...FDA_WASH },
      edReview("triclosan"),
    ],
    checked: CHECKED,
  },
  {
    id: "triclocarban",
    name: "Triclocarban",
    match: /^triclocarban$/,
    actions: [
      { authority: "fda", kind: "ban", scope: "Consumer antibacterial soaps and washes", from: "2017-09-06", summary: "FDA ruled in 2016 that consumer antibacterial washes may no longer contain triclocarban, from September 6, 2017.", ...FDA_WASH },
      edReview("triclocarban"),
    ],
    checked: CHECKED,
  },
  {
    id: "boric-acid-borates",
    name: "Boric acid and borates (incl. sodium borate, borax)",
    match: /^(boric-acid|sodium-borate|borax|sodium-tetraborate(-decahydrate|-pentahydrate)?|disodium-tetraborate|potassium-borate|zinc-borate|mea-borate|mipa-borate|trioctyldodecyl-borate|disodium-octaborate(-tetrahydrate)?)$/,
    actions: [
      eu("ban", "The EU has banned boric acid and borates, including sodium borate, in cosmetics since 2019 after they were classified as toxic to reproduction.", EU.r2019_831, { from: "2019-06-12" }),
      caBan2027("boric acid and borates, including sodium borate"),
      jpBan("boric acid"),
    ],
    checked: CHECKED,
  },
  {
    id: "phenol",
    name: "Phenol",
    match: /^phenol$/,
    actions: [eu("ban", "Phenol is on the EU list of substances banned in cosmetics.", EU.consolidated, {}, "Cosmetics")].map((a) => ({ ...a, drugActiveExempt: true })),
    checked: CHECKED,
  },

  // ---- Fragrance ingredients ---------------------------------------------
  {
    id: "lilial",
    name: "Butylphenyl methylpropional (lilial)",
    match: /^(butylphenyl-methylpropional|lilial|lily-aldehyde)$/,
    actions: [
      eu("ban", "The EU has banned butylphenyl methylpropional (lilial) in cosmetics since March 1, 2022, after it was classified as toxic to reproduction.", EU.r2021_1902, { from: "2022-03-01" }),
      caBan2027("lily aldehyde (butylphenyl methylpropional)"),
    ],
    checked: CHECKED,
  },
  {
    id: "hicc",
    name: "Hydroxyisohexyl 3-cyclohexene carboxaldehyde (HICC, Lyral)",
    match: /^(hydroxyisohexyl-3-cyclohexene-carboxaldehyde|hydroxyisohexyl-3-cyclohexene|lyral)$/,
    actions: [
      eu("ban", "The EU banned HICC (Lyral), a strong fragrance allergen, in cosmetics: no new products from August 23, 2019, off shelves from August 23, 2021.", EU.r2017_1410, { from: "2019-08-23", sellThrough: "2021-08-22" }),
    ],
    checked: CHECKED,
  },
  {
    id: "bay-seed-oil",
    name: "Bay laurel seed oil (Laurus nobilis seed oil)",
    match: /^laurus-nobilis-seed-oil$/,
    actions: [
      eu("ban", "Oil from bay laurel seeds is on the EU list of substances banned in cosmetics (leaf oil and extract are not).", EU.consolidated),
      caBan2027("oil from the seeds of Laurus nobilis"),
    ],
    checked: CHECKED,
  },
  {
    id: "nitro-musks",
    name: "Musk ambrette, musk tibetene, musk moskene, musk xylene",
    match: /^musk-(ambrette|tibetene|moskene|xylene)$/,
    actions: [caBan2027("musk ambrette, musk tibetene, musk moskene and musk xylene")],
    checked: CHECKED,
  },

  // ---- UV filters ------------------------------------------------------------
  {
    id: "4-mbc",
    name: "4-Methylbenzylidene camphor (enzacamene, 4-MBC)",
    match: /^(enzacamene|4-methylbenzylidene-camphor)$/,
    actions: [
      eu("ban", "The EU banned the UV filter 4-MBC in cosmetics, including sunscreen: no new products from May 1, 2025, off shelves from May 1, 2026.", EU.r2024_996, { from: "2025-05-01", sellThrough: "2026-04-30" }),
    ],
    checked: CHECKED,
  },

  // ---- Skin lighteners -------------------------------------------------------
  {
    id: "hydroquinone",
    name: "Hydroquinone",
    match: /^hydroquinone$/,
    actions: [
      eu("ban", "The EU bans hydroquinone in cosmetics; the only exception is professional artificial-nail systems.", EU.consolidated),
      {
        authority: "fda",
        kind: "ban",
        scope: "Over-the-counter skin lighteners",
        summary: "Since the 2020 CARES Act, FDA treats over-the-counter hydroquinone skin lighteners as unapproved drugs that can't legally be sold; hydroquinone is prescription-only in the US.",
        ...FDA_HQ,
      },
    ],
    checked: CHECKED,
  },
  {
    id: "mercury",
    name: "Mercury compounds (incl. thimerosal)",
    match: /^(mercury|mercurous-chloride|mercuric-chloride|ammoniated-mercury|thimerosal|thiomersal|phenylmercuric-acetate|phenyl-mercuric-acetate)$/,
    actions: [
      { authority: "fda", kind: "limit", scope: "Cosmetics", summary: "FDA allows mercury compounds only in eye-area products at up to 65 ppm, when no other preservative works; other cosmetics with mercury are adulterated.", ...FDA_COSMETICS },
      caBan2025("mercury"),
      waBan2025("mercury and mercury compounds"),
      vtBan("mercury and mercury compounds"),
      canadaBan("mercury and its compounds"),
      jpBan("mercury and its compounds"),
    ],
    checked: CHECKED,
  },

  // ---- Silicones -------------------------------------------------------------
  {
    id: "d4",
    name: "Cyclotetrasiloxane (D4)",
    match: /^(cyclotetrasiloxane|octamethylcyclotetrasiloxane)$/,
    actions: [
      eu("ban", "The EU banned cyclotetrasiloxane (D4) in cosmetics in 2019 after it was classified as possibly toxic to fertility.", EU.r2019_831, { from: "2019-06-12" }),
      caBan2027("cyclotetrasiloxane (D4)"),
      vtBan("octamethylcyclotetrasiloxane (D4)", "2027-07-01"),
    ],
    checked: CHECKED,
  },
  {
    id: "d5",
    name: "Cyclopentasiloxane (D5)",
    match: /^cyclopentasiloxane$/,
    actions: [
      eu("ban-rinse-off", "EU law has barred cyclopentasiloxane (D5) at 0.1% or more in wash-off cosmetics since January 31, 2020, over its persistence in the environment.", EU.reach_d4d5d6, { from: "2020-01-31" }, "Wash-off cosmetics"),
      eu("ban", "From June 6, 2027 the EU bars cyclopentasiloxane (D5) at 0.1% or more in all cosmetics, including leave-on products, over its persistence in the environment.", EU.reach_d4d5d6, { from: "2027-06-06" }),
      edReview("cyclopentasiloxane (D5)"),
    ],
    checked: CHECKED,
  },
  {
    id: "d6",
    name: "Cyclohexasiloxane (D6)",
    match: /^cyclohexasiloxane$/,
    actions: [
      eu("ban-rinse-off", "EU law bars cyclohexasiloxane (D6) at 0.1% or more in wash-off cosmetics from June 6, 2026, over its persistence in the environment.", EU.reach_d4d5d6, { from: "2026-06-06" }, "Wash-off cosmetics"),
      eu("ban", "From June 6, 2027 the EU bars cyclohexasiloxane (D6) at 0.1% or more in all cosmetics, including leave-on products.", EU.reach_d4d5d6, { from: "2027-06-06" }),
    ],
    checked: CHECKED,
  },
  {
    id: "cyclomethicone",
    name: "Cyclomethicone (a D4/D5/D6 blend)",
    match: /^cyclomethicone(-4|-5)?$/,
    actions: [
      eu("ban-rinse-off", "Cyclomethicone is a blend of cyclic silicones; EU law has barred its D4 and D5 at 0.1% or more in wash-off cosmetics since January 31, 2020.", EU.reach_d4d5d6, { from: "2020-01-31" }, "Wash-off cosmetics"),
      eu("ban", "From June 6, 2027 the EU bars D4, D5 and D6, the parts of cyclomethicone, at 0.1% or more in all cosmetics.", EU.reach_d4d5d6, { from: "2027-06-06" }),
      edReview("cyclomethicone"),
    ],
    checked: CHECKED,
  },

  // ---- PFAS ------------------------------------------------------------------
  {
    id: "pfas",
    name: "PFAS (perfluorinated ingredients such as PTFE)",
    // Clearly per- or polyfluorinated ingredients. Ingredients with a single
    // CF3 group (trifluoroacetate peptide salts, trifluoropropyl silicones,
    // HFO propellants) meet the broad state definitions too but are left to
    // the review doc, not counted.
    match:
      /^(ptfe|polytetrafluoroethylene|perfluorodecalin|perfluorohexane|perfluoromethylcyclopentane|perfluorodimethylcyclohexane|perfluoroperhydrophenanthrene|perfluorohexylethyl-triethoxysilane|methyl-perfluorobutyl-ether|methyl-perfluoroisobutyl-ether|c9-15-fluoroalcohol-phosphate|polyperfluoromethylisopropyl-ether|polyperfluoroethoxymethoxy-difluoroethyl-peg-phosphate|perfluorononyl-dimethicone|perfluorooctyl-triethoxysilane|ammonium-c6-16-perfluoroalkylethyl-phosphate)$/,
    actions: [
      { authority: "ca", kind: "ban", scope: "Cosmetics", from: "2025-01-01", summary: "California bans intentionally added PFAS in cosmetics from January 1, 2025.", ...CA_PFAS },
      waBan2025("PFAS"),
      vtBan("PFAS"),
      eu("limit", "From October 10, 2026 the EU limits PFHxA and related PFAS in cosmetics to trace levels.", EU.reach_pfhxa, { from: "2026-10-10" }),
    ],
    checked: CHECKED,
  },

  // ---- Phthalates ------------------------------------------------------------
  {
    id: "ortho-phthalates",
    name: "Phthalates (ortho-phthalates, e.g. DBP, DEHP, DEP)",
    // Not terephthalates or naphthalates, which are different chemicals.
    match: /^(dibutyl-phthalate|diethylhexyl-phthalate|diethyl-phthalate|dimethyl-phthalate|butyl-benzyl-phthalate|benzyl-butyl-phthalate|butyl-octyl-phthalate|diisononyl-phthalate|diisobutyl-phthalate|dep|dbp|dehp)$/,
    actions: [
      caBan2025("dibutyl phthalate and diethylhexyl phthalate"),
      waBan2025("ortho-phthalates"),
      vtBan("ortho-phthalates"),
      eu("ban", "The EU bans dibutyl phthalate and diethylhexyl phthalate (not diethyl phthalate) in cosmetics.", EU.consolidated),
    ],
    checked: CHECKED,
  },

  // ---- Hair dye and nail ingredients -----------------------------------------
  {
    id: "phenylenediamine-mo",
    name: "m- and o-Phenylenediamine",
    match: /^(m-phenylenediamine|o-phenylenediamine|1-3-phenylenediamine|1-2-phenylenediamine)$/,
    actions: [
      caBan2025("m- and o-phenylenediamine and their salts"),
      waBan2025("m- and o-phenylenediamine and their salts"),
      vtBan("m- and o-phenylenediamine and their salts"),
      eu("ban", "The EU bans m- and o-phenylenediamine in cosmetics.", EU.consolidated),
    ],
    checked: CHECKED,
  },
  {
    id: "tpo",
    name: "Trimethylbenzoyl diphenylphosphine oxide (TPO)",
    match: /^(trimethylbenzoyl-diphenylphosphine-oxide|tpo)$/,
    actions: [eu("ban", "The EU banned TPO, used in gel nail polish, in cosmetics from September 1, 2025, after it was classified as toxic to reproduction.", EU.r2025_877, { from: "2025-09-01" })],
    checked: CHECKED,
  },
  {
    id: "dimethyl-p-toluidine",
    name: "N,N-Dimethyl-p-toluidine (dimethyltolylamine)",
    match: /^(n-n-dimethyl-p-toluidine|dimethyl-p-toluidine|dimethyltolylamine)$/,
    actions: [eu("ban", "The EU banned N,N-dimethyl-p-toluidine, used in nail products, in cosmetics from September 1, 2025.", EU.r2025_877, { from: "2025-09-01" })],
    checked: CHECKED,
  },
  {
    id: "toluene",
    name: "Toluene",
    match: /^toluene$/,
    actions: [vtBan("toluene", "2027-07-01")],
    checked: CHECKED,
  },
  {
    id: "thioglycolate-esters",
    name: "Thioglycolic acid esters (e.g. glyceryl thioglycolate)",
    match: /^(glyceryl-thioglycolate|isooctyl-thioglycolate)$/,
    actions: [canadaBan("thioglycolic acid esters such as glyceryl thioglycolate (added February 2025, for skin sensitization)")],
    checked: CHECKED,
  },
  {
    id: "ca-2027-dyes",
    name: "Basic and disperse dyes on California's 2027 list (incl. methylene blue)",
    match: /^(basic-green-1|basic-blue-7|basic-violet-4|basic-blue-3|basic-blue-9|methylene-blue|disperse-blue-1|disperse-blue-3|malachite-green)$/,
    actions: [caBan2027("these dyes, including basic blue 9 (methylene blue)")],
    checked: CHECKED,
  },

  // ---- Others --------------------------------------------------------------
  {
    id: "phytonadione",
    name: "Phytonadione (vitamin K1)",
    match: /^(phytonadione|phytomenadione|phylloquinone|vitamin-k1?|phytonadione-vit)$/,
    actions: [
      eu("ban", "Phytonadione (vitamin K1) is on the EU list of substances banned in cosmetics, because it can cause skin allergy.", EU.consolidated),
      caBan2027("phytonadione (vitamin K1)"),
    ],
    checked: CHECKED,
  },
  {
    id: "nano-silver",
    name: "Nano silver",
    match: /^nano-silver$/,
    actions: [eu("ban", "The EU banned nano-sized silver (1–100 nm) in cosmetics from May 1, 2026.", EU.r2026_78, { from: "2026-05-01" })],
    checked: CHECKED,
  },
  {
    id: "coal-tar",
    name: "Coal tar",
    match: /^coal-tar(-solution)?$/,
    actions: [
      eu("ban", "Crude and refined coal tars are on the EU list of substances banned in cosmetics.", EU.consolidated),
      canadaBan("crude and refined coal tars"),
    ].map((a) => ({ ...a, drugActiveExempt: true })),
    checked: CHECKED,
  },
  {
    id: "benzophenone",
    name: "Benzophenone (not benzophenone-3)",
    match: /^benzophenone$/,
    actions: [
      eu("ban", "The EU banned benzophenone in cosmetics from December 1, 2023.", EU.r2023_1490, { from: "2023-12-01" }),
      { authority: "p65", kind: "warning", scope: "Consumer products sold in California", from: "2012-06-22", summary: "Benzophenone is on California's Proposition 65 list as a chemical known to the state to cause cancer, so products with it may need a warning.", ...P65("benzophenone") },
    ],
    checked: CHECKED,
  },
  {
    id: "melamine",
    name: "Melamine",
    match: /^melamine$/,
    actions: [eu("ban", "The EU banned melamine in cosmetics from December 1, 2023.", EU.r2023_1490, { from: "2023-12-01" })],
    checked: CHECKED,
  },
  {
    id: "dmso",
    name: "Dimethyl sulfoxide (DMSO)",
    match: /^dimethyl-sulfoxide$/,
    actions: [eu("ban", "Dimethyl sulfoxide is on the EU list of substances banned in cosmetics.", EU.consolidated)],
    checked: CHECKED,
  },
  {
    id: "catalase",
    name: "Catalase",
    match: /^catalase$/,
    actions: [eu("ban", "Catalase is on the EU list of substances banned in cosmetics.", EU.consolidated)],
    checked: CHECKED,
  },

  // ---- Under review only -----------------------------------------------------
  {
    id: "cocamide-dea",
    name: "Cocamide DEA",
    match: /^(cocamide-dea|cocoamide-dea|coconut-dea|cocamide-diethanolamine)$/,
    actions: [
      { authority: "p65", kind: "warning", scope: "Consumer products sold in California", from: "2012-06-22", summary: "Cocamide DEA (coconut oil diethanolamine condensate) is on California's Proposition 65 list as a chemical known to the state to cause cancer, based on an IARC 'possible carcinogen' rating.", ...P65("coconut-oil-diethanolamine-condensate") },
    ],
    checked: CHECKED,
  },
  {
    id: "diethanolamine",
    name: "Diethanolamine (DEA)",
    match: /^(diethanolamine|dea)$/,
    actions: [
      { authority: "p65", kind: "warning", scope: "Consumer products sold in California", from: "2012-06-22", summary: "Diethanolamine is on California's Proposition 65 list as a chemical known to the state to cause cancer, based on an IARC 'possible carcinogen' rating.", ...P65("diethanolamine") },
    ],
    checked: CHECKED,
  },
  {
    id: "kojic-acid",
    name: "Kojic acid",
    match: /^kojic-acid$/,
    actions: [eu("limit", "Since 2025 the EU allows kojic acid only in face and hand products, at up to 1%.", EU.r2024_996, { from: "2025-02-01", sellThrough: "2025-10-31" }), edReview("kojic acid")],
    checked: CHECKED,
  },
  {
    id: "arbutin",
    name: "Arbutin and alpha-arbutin",
    match: /^(alpha-arbutin|arbutin)$/,
    actions: [eu("limit", "Since 2025 the EU limits alpha-arbutin to 2% in face cream and 0.5% in body lotion, and arbutin to 7% in face cream.", EU.r2024_996, { from: "2025-02-01", sellThrough: "2025-10-31" })],
    checked: CHECKED,
  },
  {
    id: "retinol",
    name: "Retinol, retinyl acetate and retinyl palmitate",
    match: /^(retinol|retinyl-acetate|retinyl-palmitate)$/,
    actions: [
      eu("limit", "The EU limits vitamin A in cosmetics to 0.3% retinol equivalent (0.05% in body lotion) for new products from November 1, 2025, and for all products on shelves from May 1, 2027, with a vitamin A intake warning.", EU.r2024_996, { from: "2025-11-01", sellThrough: "2027-04-30" }),
      { authority: "canada", kind: "limit", scope: "Cosmetics", summary: "Health Canada lowered its limits on retinol and its esters in cosmetics in February 2025.", ...CANADA },
    ],
    checked: CHECKED,
  },
  {
    id: "retinal",
    name: "Retinal (retinaldehyde)",
    match: /^(retinal|retinaldehyde)$/,
    actions: [{ authority: "canada", kind: "limit", scope: "Cosmetics", summary: "Health Canada added retinal to its restricted list in February 2025, with low concentration limits.", ...CANADA }],
    checked: CHECKED,
  },
  {
    id: "genistein-daidzein",
    name: "Genistein and daidzein",
    match: /^(genistein|daidzein)$/,
    actions: [eu("limit", "Since 2025 the EU limits genistein to 0.007% and daidzein to 0.02% in cosmetics.", EU.r2024_996, { from: "2025-02-01", sellThrough: "2025-10-31" }), edReview("genistein and daidzein")],
    checked: CHECKED,
  },
  {
    id: "ed-review-parabens",
    name: "Propylparaben, butylparaben and methylparaben",
    match: /^(propylparaben|butylparaben|methylparaben|sodium-propylparaben|propylparaben-sodium|sodium-butylparaben|sodium-methylparaben|methylparaben-sodium)$/,
    actions: [edReview("this paraben")],
    checked: CHECKED,
  },
  {
    id: "ed-review-other",
    name: "Resorcinol, BHT, BHA and benzyl salicylate",
    match: /^(resorcinol|bht|butylated-hydroxytoluene|bha|butylated-hydroxyanisole|benzyl-salicylate)$/,
    actions: [edReview("this ingredient")],
    checked: CHECKED,
  },
  {
    id: "oxybenzone",
    name: "Oxybenzone (benzophenone-3)",
    match: /^(oxybenzone|benzophenone-3)$/,
    sunscreenFilter: true,
    actions: [
      { authority: "hi", kind: "local-ban", scope: "Sunscreens sold in Hawaii", from: "2021-01-01", summary: "Hawaii has banned the sale of sunscreens with oxybenzone without a prescription since January 1, 2021, over concern for coral reefs.", ...HI },
      edReview("oxybenzone (benzophenone-3)"),
      fdaSunscreenData("oxybenzone"),
    ],
    checked: CHECKED,
  },
  {
    id: "octinoxate",
    name: "Octinoxate (ethylhexyl methoxycinnamate)",
    match: /^(octinoxate|ethylhexyl-methoxycinnamate|octyl-methoxycinnamate)$/,
    sunscreenFilter: true,
    actions: [
      { authority: "hi", kind: "local-ban", scope: "Sunscreens sold in Hawaii", from: "2021-01-01", summary: "Hawaii has banned the sale of sunscreens with octinoxate without a prescription since January 1, 2021, over concern for coral reefs.", ...HI },
      edReview("octinoxate"),
      fdaSunscreenData("octinoxate"),
    ],
    checked: CHECKED,
  },
  {
    id: "fda-2019-filters",
    name: "Sunscreen filters FDA asked for more data on",
    match: /^(avobenzone|homosalate|octisalate|octocrylene|ensulizole|cinoxate|dioxybenzone|meradimate|padimate-o|sulisobenzone)$/,
    sunscreenFilter: true,
    actions: [fdaSunscreenData("this filter")],
    checked: CHECKED,
  },
  {
    id: "paba-trolamine",
    name: "PABA and trolamine salicylate",
    match: /^(aminobenzoic-acid|paba|p-aminobenzoic-acid|trolamine-salicylate)$/,
    sunscreenFilter: true,
    actions: [
      {
        authority: "fda",
        kind: "review",
        scope: "Sunscreens",
        summary: "FDA's 2019 sunscreen proposal said PABA and trolamine salicylate are not safe and effective as sunscreen actives; the proposal has not been finalized.",
        ...FDA_SUNSCREEN_2019,
      },
    ],
    checked: CHECKED,
  },
];

// ---------------------------------------------------------------------------
// Queries

const BAN_KINDS: ActionKind[] = ["ban", "ban-leave-on", "ban-rinse-off"];
const REVIEW_KINDS: ActionKind[] = ["limit", "review", "warning"];

export type ProductContext = {
  /** Rinse-off product (cleanser, shampoo, conditioner, toothpaste, mouthwash). */
  rinseOff: boolean;
  /** Ingredient ids that are the product's drug actives (product_ingredients.is_active). */
  activeIngredientIds?: string[];
  /** For tests; defaults to today. */
  today?: string;
};

export type SubstanceStatus = {
  substance: RegulatedSubstance;
  /** The product's ingredient ids this substance matched. */
  ingredientIds: string[];
  /** Bans that apply to this product today. */
  banned: RegulatoryAction[];
  /** Bans that apply to this product from a later date. */
  bannedLater: RegulatoryAction[];
  /** Limits, reviews and warnings. */
  review: RegulatoryAction[];
  /** Place-specific environmental bans (Hawaii). */
  local: RegulatoryAction[];
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function appliesToProduct(a: RegulatoryAction, ctx: ProductContext, isActive: boolean): boolean {
  if (a.kind === "ban-leave-on" && ctx.rinseOff) return false;
  if (a.kind === "ban-rinse-off" && !ctx.rinseOff) return false;
  if (a.drugActiveExempt && isActive) return false;
  return true;
}

const MATCH_CACHE = new Map<string, RegulatedSubstance[]>();

/** The substances an ingredient id falls under. */
export function substancesForIngredient(ingredientId: string): RegulatedSubstance[] {
  const hit = MATCH_CACHE.get(ingredientId);
  if (hit) return hit;
  const out = REGULATED_SUBSTANCES.filter((s) => s.match.test(ingredientId));
  MATCH_CACHE.set(ingredientId, out);
  return out;
}

/** Regulatory status of each regulated substance in a product, most serious first. */
export function regulatoryStatusFor(ingredientIds: string[], ctx: ProductContext): SubstanceStatus[] {
  const today = ctx.today ?? todayIso();
  const actives = new Set(ctx.activeIngredientIds ?? []);
  const found = new Map<string, SubstanceStatus>();
  for (const iid of new Set(ingredientIds)) {
    for (const s of substancesForIngredient(iid)) {
      let st = found.get(s.id);
      if (!st) {
        st = { substance: s, ingredientIds: [], banned: [], bannedLater: [], review: [], local: [] };
        found.set(s.id, st);
      }
      st.ingredientIds.push(iid);
    }
  }
  for (const st of found.values()) {
    const isActive = st.ingredientIds.every((i) => actives.has(i));
    for (const a of st.substance.actions) {
      if (BAN_KINDS.includes(a.kind)) {
        if (!appliesToProduct(a, ctx, isActive)) continue;
        if (!a.from || a.from <= today) st.banned.push(a);
        else st.bannedLater.push(a);
      } else if (REVIEW_KINDS.includes(a.kind)) st.review.push(a);
      else if (a.kind === "local-ban") st.local.push(a);
    }
    // A ban already in force makes a later one by the same authority redundant.
    st.bannedLater = st.bannedLater.filter((a) => !st.banned.some((b) => b.authority === a.authority));
  }
  const rank = (s: SubstanceStatus) => (s.banned.length ? 0 : s.bannedLater.length ? 1 : s.review.length ? 2 : 3);
  return [...found.values()]
    .filter((s) => s.banned.length || s.bannedLater.length || s.review.length || s.local.length)
    .sort((a, b) => rank(a) - rank(b) || b.banned.length - a.banned.length || a.substance.name.localeCompare(b.substance.name));
}

/** Counts for the product-page box: "N ingredients banned by at least one authority". */
export function regulatorySummary(statuses: SubstanceStatus[]): { banned: number; bannedLater: number; underReview: number; local: number } {
  return {
    banned: statuses.filter((s) => s.banned.length).length,
    bannedLater: statuses.filter((s) => !s.banned.length && s.bannedLater.length).length,
    underReview: statuses.filter((s) => !s.banned.length && !s.bannedLater.length && s.review.length && !s.substance.sunscreenFilter).length,
    local: statuses.filter((s) => s.local.length).length,
  };
}

/**
 * Catalog ingredient ids banned somewhere today in all products of a type
 * (a plain "ban"), for a "no banned ingredients" filter. Leave-on/rinse-off
 * bans need the product type, so they are left to the product page.
 */
export function bannedIngredientIds(allIngredientIds: string[], today = todayIso()): string[] {
  return allIngredientIds.filter((id) =>
    substancesForIngredient(id).some((s) => s.actions.some((a) => a.kind === "ban" && !a.drugActiveExempt && (!a.from || a.from <= today))),
  );
}

export function getRegulatedSubstance(id: string): RegulatedSubstance | undefined {
  return REGULATED_SUBSTANCES.find((s) => s.id === id);
}
