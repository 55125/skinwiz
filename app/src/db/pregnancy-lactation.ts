// Pregnancy & breastfeeding classification of skincare ingredients.
//
// DRAFT -- authored by Claude (AI) for review by the site's board-certified
// dermatologist. Shown only while FEATURES.PREGNANCY_MODE is on
// (lib/feature-flags.ts), which is off in production until sign-off; the
// review copy is review/clinical-content-review.html.
//
// What this is: a screen of a product's published ingredient list against
// mainstream published guidance (ACOG, AAD, peer-reviewed reviews, NIH
// LactMed). What it is not: medical clearance. Every surface that shows it
// says "talk to your OB or dermatologist".
//
// Levels:
//   avoid   -- mainstream guidance says don't use it during this time
//              (often precautionary: little absorption, but no reason to take
//              the chance when alternatives exist)
//   caution -- acceptable in limited use, or there isn't enough data to say;
//              worth asking about
//   ok      -- generally considered acceptable in normal use
//
// Matching uses the same slug patterns as the profile boosters
// (lib/profile-shared.ts boosterHit): exact slug, "prefix*" or
// "*contains*". The first entry whose patterns hit an ingredient claims it,
// so specific entries come before broad ones. Salicylate *esters* used as
// emollients, fragrance or sunscreen filters (butyloctyl, benzyl, tridecyl,
// ethylhexyl = octisalate, homosalate) are deliberately NOT salicylic acid
// and are never matched by the salicylic-acid entry.

import { boosterHit } from "@/lib/profile-shared";

export type SafetyLevel = "avoid" | "caution" | "ok";

export type Classification = { level: SafetyLevel; note: string };

export type PregnancyEntry = {
  id: string;
  name: string;
  patterns: string[];
  pregnancy: Classification;
  lactation: Classification;
  /** Overrides for rinse-off products (cleansers, shampoos), where contact time is a minute or two. */
  washOff?: { pregnancy?: Classification; lactation?: Classification };
  sources: string[];
};

// --- Shared sources -----------------------------------------------------------
const ACOG = "ACOG patient FAQ: Skin Conditions During Pregnancy (acog.org)";
const MURASE_PREG =
  "Murase JE, Heller MM, Butler DC. Safety of dermatologic medications in pregnancy and lactation: Part I. Pregnancy. J Am Acad Dermatol. 2014;70(3):401.e1-14";
const BUTLER_LACT =
  "Butler DC, Heller MM, Murase JE. Safety of dermatologic medications in pregnancy and lactation: Part II. Lactation. J Am Acad Dermatol. 2014;70(3):417.e1-10";
const MINOXIDIL_LABEL = "FDA-approved OTC minoxidil Drug Facts (women's 2% solution and 5% foam): do not use if pregnant or breastfeeding";
const BOZZO = "Bozzo P, Chua-Gocheco A, Einarson A. Safety of skin care products during pregnancy. Can Fam Physician. 2011;57(6):665-7";
const CHIEN = "Chien AL, Qi J, Rainer B, Sachs DL, Helfrich YR. Treatment of acne in pregnancy. J Am Board Fam Med. 2016;29(2):254-62";
const AAD_ACNE_PREG = "AAD public guidance on treating acne during pregnancy (aad.org)";
const LACTMED = (drug: string) => `LactMed, NIH Drugs and Lactation Database: ${drug}`;
const CHI_COCHRANE =
  "Chi CC, Wang SH, Wojnarowska F, et al. Safety of topical corticosteroids in pregnancy. Cochrane Database Syst Rev. 2015;(10):CD007346";
const CDC_STI = "CDC Sexually Transmitted Infections Treatment Guidelines, 2021: vulvovaginal candidiasis in pregnancy (topical azoles)";
const MATTA =
  "Matta MK, et al. Effect of sunscreen application on plasma concentration of sunscreen active ingredients. JAMA. 2020;323(3):256-267";
const FDA_SUNSCREEN_2019 = "FDA proposed rule on OTC sunscreen drug products, 84 FR 6204 (Feb 26, 2019): only zinc oxide and titanium dioxide proposed GRASE";
const NO_DATA = "No pregnancy or lactation studies identified by the drafter; classification is precautionary";

const KEEP_OFF_BREAST = "Don't apply it to the breast or nipple area, and keep treated skin from touching the baby's skin.";

export const PREGNANCY_ENTRIES: PregnancyEntry[] = [
  // --- Retinoids --------------------------------------------------------------
  {
    id: "rx-retinoids",
    name: "Prescription retinoids (tretinoin, tazarotene, trifarotene)",
    patterns: ["tretinoin", "tazarotene", "trifarotene", "retinoic-acid", "isotretinoin"],
    pregnancy: {
      level: "avoid",
      note: "Topical retinoids are avoided during pregnancy. Absorption through the skin is low, but oral retinoids cause birth defects, and tazarotene's label lists pregnancy as a contraindication.",
    },
    lactation: {
      level: "caution",
      note: `Little reaches the bloodstream from topical use, so many sources consider it low risk while breastfeeding; ask first. ${KEEP_OFF_BREAST}`,
    },
    sources: [ACOG, MURASE_PREG, BUTLER_LACT, LACTMED("tretinoin; tazarotene"), "Tazarotene prescribing information (pregnancy contraindication)"],
  },
  {
    id: "adapalene",
    name: "Adapalene",
    patterns: ["adapalene"],
    pregnancy: {
      level: "avoid",
      note: "Adapalene is a retinoid, and topical retinoids are avoided during pregnancy as a precaution, even though very little is absorbed. The OTC Drug Facts label also tells you to ask a doctor if pregnant.",
    },
    lactation: {
      level: "caution",
      note: `Poorly absorbed, so LactMed rates it low risk while breastfeeding; ask first. ${KEEP_OFF_BREAST}`,
    },
    sources: [ACOG, MURASE_PREG, AAD_ACNE_PREG, LACTMED("adapalene"), "Differin Gel 0.1% OTC Drug Facts label"],
  },
  {
    id: "retinyl-esters",
    name: "Retinyl esters (retinyl palmitate, acetate, propionate)",
    // Listed before retinol so the "retinol-palmitate" label typo lands here,
    // and explicit so retinyl retinoate (a retinol hybrid) does not.
    patterns: ["retinyl-palmitate", "retinyl-palimtate", "retinol-palmitate", "*retinyl-palmitate*", "retinyl-acetate", "retinyl-propionate", "retinyl-linoleate", "retinyl", "retinyl-cholecalciferol-tocopherol"],
    pregnancy: {
      level: "caution",
      note: "A much weaker vitamin A form, often used in small amounts as an antioxidant. Some guidance groups all vitamin A derivatives together and suggests avoiding them; others don't. Worth asking about, especially in a leave-on product used daily.",
    },
    lactation: {
      level: "ok",
      note: "Skincare amounts are generally considered acceptable while breastfeeding.",
    },
    sources: [BOZZO, MURASE_PREG],
  },

  {
    id: "retinol",
    name: "Retinol and retinaldehyde",
    patterns: ["retinol-cosmetic", "retinol", "retinol-*", "retinal", "retinaldehyde", "hydroxypinacolone-retinoate", "retinyl-retinoate", "*retinoyl*"],
    pregnancy: {
      level: "avoid",
      note: "Cosmetic retinoids are usually avoided during pregnancy along with prescription ones. That's a precaution: there's no evidence of harm from skincare use, but there's no reason to take the chance when alternatives exist.",
    },
    lactation: {
      level: "caution",
      note: `Absorption from skincare use is very low; many dermatologists consider it acceptable while breastfeeding, but ask first. ${KEEP_OFF_BREAST}`,
    },
    sources: [ACOG, BOZZO, MURASE_PREG],
  },
  // --- Pigment ----------------------------------------------------------------
  {
    id: "hydroquinone",
    name: "Hydroquinone",
    patterns: ["hydroquinone"],
    pregnancy: {
      level: "avoid",
      note: "A relatively large share (roughly a third or more) is absorbed through the skin. Studies haven't shown birth defects, but it's generally avoided during pregnancy because of that absorption and the lack of need.",
    },
    lactation: {
      level: "caution",
      note: "Because absorption is relatively high and there's little data, other options are usually preferred while breastfeeding.",
    },
    sources: [
      MURASE_PREG,
      BUTLER_LACT,
      BOZZO,
      "Kaplan YC, Ozsarfati J, Nickel C, Koren G. Reproductive outcomes following hydroquinone use in human pregnancy. J Cosmet Dermatol (systematic review)",
      LACTMED("hydroquinone"),
    ],
  },
  {
    id: "arbutin",
    name: "Arbutin and alpha-arbutin",
    patterns: ["alpha-arbutin", "arbutin", "a-arbutin", "*arbutin*"],
    pregnancy: {
      level: "caution",
      note: "No pregnancy data. Arbutin can break down to small amounts of hydroquinone, so some dermatologists suggest skipping it until after pregnancy.",
    },
    lactation: { level: "caution", note: "No lactation data; ask first." },
    sources: [NO_DATA],
  },
  {
    id: "kojic-acid",
    name: "Kojic acid",
    patterns: ["kojic-*"],
    pregnancy: { level: "caution", note: "No pregnancy data for skincare use. Worth asking about before starting it." },
    lactation: { level: "caution", note: "No lactation data; ask first." },
    sources: [NO_DATA],
  },
  {
    id: "tranexamic-acid",
    name: "Tranexamic acid (topical)",
    patterns: ["tranexamic-acid*"],
    pregnancy: {
      level: "caution",
      note: "No data on topical skincare use in pregnancy. Little is expected to be absorbed, but there's no study to point to; ask first.",
    },
    lactation: { level: "caution", note: "No data on topical use while breastfeeding; ask first." },
    sources: [NO_DATA],
  },
  {
    id: "bakuchiol",
    name: "Bakuchiol",
    patterns: ["bakuchiol", "*bakuchiol*"],
    pregnancy: {
      level: "caution",
      note: "Often marketed as a pregnancy-safe retinol alternative, but there are no pregnancy safety studies behind that claim.",
    },
    lactation: { level: "caution", note: "No lactation data; ask first." },
    sources: [NO_DATA],
  },

  // --- Acids ------------------------------------------------------------------
  {
    id: "salicylic-acid",
    name: "Salicylic acid (BHA)",
    patterns: ["salicylic-acid", "*salicylic-acid*", "betaine-salicylate", "sodium-salicylate", "salicylic"],
    pregnancy: {
      level: "caution",
      note: "Low-strength (up to 2%) products used on limited areas, like the face, are generally considered acceptable. High-strength peels and applying it over large areas or under occlusion are avoided.",
    },
    lactation: {
      level: "ok",
      note: `Topical use is unlikely to affect a breastfed baby. ${KEEP_OFF_BREAST}`,
    },
    washOff: {
      pregnancy: {
        level: "ok",
        note: "Rinse-off cleansers and shampoos with low-strength salicylic acid are generally considered acceptable during pregnancy.",
      },
    },
    sources: [ACOG, BOZZO, MURASE_PREG, CHIEN, LACTMED("salicylic acid (topical)")],
  },
  {
    id: "willow-bark",
    name: "Willow bark extract",
    patterns: ["*willow-bark*"],
    pregnancy: {
      level: "ok",
      note: "A plant extract containing salicin, a salicylic-acid relative, in small amounts. Not the same as a salicylic acid treatment; generally not a concern in skincare amounts.",
    },
    lactation: { level: "ok", note: "Generally not a concern in skincare amounts." },
    sources: [NO_DATA],
  },
  {
    id: "alpha-hydroxy-acids",
    name: "Glycolic, lactic and mandelic acid (AHAs)",
    patterns: ["glycolic-acid", "lactic-acid", "mandelic-acid", "l-mandelic-acid"],
    pregnancy: {
      level: "ok",
      note: "OTC-strength AHAs are generally considered acceptable during pregnancy; little is absorbed. In-office peels are a separate question for your doctor.",
    },
    lactation: { level: "ok", note: "Generally considered acceptable while breastfeeding." },
    sources: [ACOG, BOZZO, CHIEN],
  },
  {
    id: "azelaic-acid",
    name: "Azelaic acid",
    patterns: ["azelaic-acid"],
    pregnancy: { level: "ok", note: "Generally considered one of the preferred options for acne and dark spots during pregnancy; little is absorbed." },
    lactation: { level: "ok", note: `Considered acceptable while breastfeeding. ${KEEP_OFF_BREAST}` },
    sources: [ACOG, AAD_ACNE_PREG, MURASE_PREG, CHIEN, LACTMED("azelaic acid")],
  },

  // --- Acne -------------------------------------------------------------------
  {
    id: "benzoyl-peroxide",
    name: "Benzoyl peroxide",
    patterns: ["benzoyl-peroxide", "benzoyl-peroxide-gel"],
    pregnancy: {
      level: "ok",
      note: "Generally considered acceptable during pregnancy in normal use; only a small amount is absorbed, and the body breaks it down to benzoic acid.",
    },
    lactation: { level: "ok", note: `Considered acceptable while breastfeeding. ${KEEP_OFF_BREAST}` },
    sources: [ACOG, AAD_ACNE_PREG, MURASE_PREG, CHIEN, LACTMED("benzoyl peroxide")],
  },
  {
    id: "sulfur",
    name: "Sulfur",
    patterns: ["sulfur", "colloidal-sulfur"],
    pregnancy: { level: "ok", note: "Topical sulfur is generally considered acceptable during pregnancy." },
    lactation: { level: "ok", note: "Generally considered acceptable while breastfeeding." },
    sources: [MURASE_PREG, CHIEN],
  },
  {
    id: "niacinamide",
    name: "Niacinamide",
    patterns: ["niacinamide"],
    pregnancy: { level: "ok", note: "A form of vitamin B3; generally considered acceptable in skincare during pregnancy." },
    lactation: { level: "ok", note: "Generally considered acceptable while breastfeeding." },
    sources: [CHIEN],
  },
  {
    id: "vitamin-c",
    name: "Vitamin C (ascorbic acid and derivatives)",
    patterns: ["vitamin-c", "l-ascorbic-acid", "ascorbic-acid", "*ascorb*"],
    pregnancy: { level: "ok", note: "Generally considered acceptable in skincare during pregnancy." },
    lactation: { level: "ok", note: "Generally considered acceptable while breastfeeding." },
    sources: [BOZZO],
  },

  // --- Sun --------------------------------------------------------------------
  {
    id: "mineral-sunscreen",
    name: "Mineral sunscreen filters (zinc oxide, titanium dioxide)",
    patterns: ["zinc-oxide", "titanium-dioxide"],
    pregnancy: {
      level: "ok",
      note: "Generally considered acceptable, and sun protection matters during pregnancy (melasma often appears or worsens).",
    },
    lactation: { level: "ok", note: "Generally considered acceptable while breastfeeding." },
    sources: [ACOG, BOZZO, FDA_SUNSCREEN_2019],
  },
  {
    id: "oxybenzone",
    name: "Oxybenzone (benzophenone-3)",
    patterns: ["oxybenzone", "benzophenone-3"],
    pregnancy: {
      level: "caution",
      note: "It's absorbed in measurable amounts, and a few observational studies have raised questions; the evidence is weak and mixed. Using sunscreen still matters; a mineral or other filter is an easy swap if you'd rather.",
    },
    lactation: {
      level: "ok",
      note: "Small amounts have been found in breast milk; no harm has been shown. A mineral sunscreen is an option if you'd rather avoid it.",
    },
    sources: [
      MATTA,
      FDA_SUNSCREEN_2019,
      "Ghazipura M, et al. Exposure to benzophenone-3 and reproductive toxicity: a systematic review of human and animal studies. Reprod Toxicol. 2017;73:175-183",
    ],
  },
  {
    id: "chemical-sunscreen",
    name: "Other chemical sunscreen filters (avobenzone, homosalate, octisalate, octocrylene, octinoxate, ensulizole)",
    patterns: ["avobenzone", "homosalate", "octisalate", "octocrylene", "octinoxate", "ensulizole", "meradimate"],
    pregnancy: {
      level: "ok",
      note: "Absorbed in small measurable amounts; the FDA has asked for more safety data but hasn't found harm. Generally considered acceptable, and sun protection matters during pregnancy.",
    },
    lactation: { level: "ok", note: "Generally considered acceptable while breastfeeding." },
    sources: [MATTA, FDA_SUNSCREEN_2019],
  },
  {
    id: "dihydroxyacetone",
    name: "Dihydroxyacetone (self-tanner)",
    patterns: ["dihydroxyacetone"],
    pregnancy: {
      level: "ok",
      note: "Stays in the outer skin layer. Lotions are generally considered acceptable; spray tans are best avoided because the FDA hasn't approved DHA for inhalation.",
    },
    lactation: { level: "ok", note: "Generally considered acceptable; avoid inhaling spray tans." },
    sources: [BOZZO, "FDA consumer page on sunless tanners and bronzers (DHA not approved for inhalation or mucous membranes)"],
  },

  // --- Scalp ------------------------------------------------------------------
  {
    id: "coal-tar",
    name: "Coal tar",
    patterns: ["coal-tar*"],
    pregnancy: {
      level: "avoid",
      note: "Coal tar contains compounds that are a concern in animal studies, so it's generally avoided during pregnancy.",
    },
    lactation: { level: "caution", note: `Little data; often avoided while breastfeeding, or used briefly. ${KEEP_OFF_BREAST}` },
    sources: [MURASE_PREG, BUTLER_LACT],
  },
  {
    id: "dandruff-shampoo-actives",
    name: "Zinc pyrithione, selenium sulfide and ketoconazole shampoos",
    patterns: ["pyrithione-zinc", "zinc-pyrithione", "selenium-sulfide", "ketoconazole"],
    pregnancy: {
      level: "ok",
      note: "As a rinse-off shampoo, very little is absorbed; generally considered acceptable during pregnancy.",
    },
    lactation: { level: "ok", note: "As a rinse-off shampoo, generally considered acceptable while breastfeeding." },
    sources: [MURASE_PREG, BUTLER_LACT, LACTMED("ketoconazole (topical); selenium sulfide")],
  },

  // --- Antifungal / itch ---------------------------------------------------------
  {
    id: "topical-azoles",
    name: "Clotrimazole, miconazole and tioconazole",
    patterns: ["clotrimazole", "miconazole*", "tioconazole"],
    pregnancy: {
      level: "ok",
      note: "Topical azole antifungals are the usual choice during pregnancy, including for yeast infections; little is absorbed. Ask your OB before treating a vaginal yeast infection yourself.",
    },
    lactation: { level: "ok", note: `Considered acceptable while breastfeeding. ${KEEP_OFF_BREAST}` },
    sources: [MURASE_PREG, CDC_STI, LACTMED("clotrimazole; miconazole")],
  },
  {
    id: "other-antifungals",
    name: "Terbinafine, butenafine, tolnaftate and undecylenic acid",
    patterns: ["terbinafine*", "butenafine*", "tolnaftate", "undecylenic-acid"],
    pregnancy: {
      level: "ok",
      note: "Very little is absorbed from skin use and no harm has been reported, though pregnancy data are limited (more for terbinafine than the others).",
    },
    lactation: { level: "ok", note: `Generally considered acceptable while breastfeeding. ${KEEP_OFF_BREAST}` },
    sources: [MURASE_PREG, BUTLER_LACT, LACTMED("terbinafine")],
  },
  {
    id: "hydrocortisone",
    name: "Hydrocortisone (OTC 0.5–1%)",
    patterns: ["hydrocortisone*"],
    pregnancy: {
      level: "ok",
      note: "Low-strength topical steroids like OTC hydrocortisone are generally considered acceptable during pregnancy. Large amounts of strong prescription steroids are a separate question.",
    },
    lactation: { level: "ok", note: "Considered acceptable while breastfeeding; if used on the nipple area, wipe it off before nursing." },
    sources: [CHI_COCHRANE, MURASE_PREG, LACTMED("hydrocortisone (topical)")],
  },
  {
    id: "itch-anesthetics",
    name: "Pramoxine and topical diphenhydramine",
    patterns: ["pramoxine*", "diphenhydramine*"],
    pregnancy: {
      level: "ok",
      note: "Generally considered acceptable for short use on small areas; data are limited. Follow the label's limits on area and duration.",
    },
    lactation: { level: "ok", note: "Generally considered acceptable for short use on small areas." },
    sources: [MURASE_PREG],
  },
  {
    id: "aluminum-antiperspirant",
    name: "Aluminum antiperspirant salts",
    patterns: ["aluminum-chlorohydrate", "aluminum-zirconium-*", "aluminum-chloride"],
    pregnancy: { level: "ok", note: "Very little is absorbed through intact underarm skin; generally considered acceptable." },
    lactation: { level: "ok", note: "Generally considered acceptable while breastfeeding." },
    sources: [BOZZO],
  },
  {
    id: "minoxidil",
    name: "Minoxidil",
    patterns: ["minoxidil"],
    pregnancy: { level: "avoid", note: "The OTC label says women should not use it while pregnant. Some is absorbed through the scalp." },
    lactation: { level: "avoid", note: "The OTC label says women should not use it while breastfeeding." },
    sources: [MINOXIDIL_LABEL],
  },
];

// --- Matching -----------------------------------------------------------------


export type PregnancyFinding = {
  entry: PregnancyEntry;
  /** Ingredient slugs (or active ids) in the product that matched. */
  matched: string[];
  /** Best (lowest-number) list position of the match; <= 0 means a labelled drug active. */
  position: number;
  pregnancy: Classification;
  lactation: Classification;
};

/** The entry that claims an ingredient slug, if any (first match wins). */
export function pregnancyEntryFor(id: string): PregnancyEntry | undefined {
  return PREGNANCY_ENTRIES.find((e) => e.patterns.some((p) => boosterHit(p, id)));
}

/**
 * Every classified ingredient in a product, one finding per entry. `ingredients`
 * is the product's ingredient rows; `activeIds` (the label's canonical actives)
 * are folded in as position 0 so drug-label-only products are still checked.
 */
export function pregnancyFindings(
  ingredients: { id: string; position: number }[],
  activeIds: string[] = [],
  opts: { washOff?: boolean } = {},
): PregnancyFinding[] {
  const byEntry = new Map<string, PregnancyFinding>();
  const all = [...ingredients, ...activeIds.map((id) => ({ id, position: 0 }))];
  for (const ing of all) {
    const entry = pregnancyEntryFor(ing.id);
    if (!entry) continue;
    const f = byEntry.get(entry.id);
    if (f) {
      if (!f.matched.includes(ing.id)) f.matched.push(ing.id);
      f.position = Math.min(f.position, ing.position);
      continue;
    }
    byEntry.set(entry.id, {
      entry,
      matched: [ing.id],
      position: ing.position,
      pregnancy: (opts.washOff && entry.washOff?.pregnancy) || entry.pregnancy,
      lactation: (opts.washOff && entry.washOff?.lactation) || entry.lactation,
    });
  }
  return [...byEntry.values()];
}

const RANK: Record<SafetyLevel, number> = { avoid: 0, caution: 1, ok: 2 };
export function levelRank(level: SafetyLevel): number {
  return RANK[level];
}

/** Ingredient slugs (from a candidate list) whose pregnancy level is "avoid" -- for listing filters. */
export function pregnancyAvoidIds(candidateIds: Iterable<string>): string[] {
  const out: string[] = [];
  for (const id of candidateIds) {
    if (pregnancyEntryFor(id)?.pregnancy.level === "avoid") out.push(id);
  }
  return out;
}
