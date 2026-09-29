// Concentration ranges the FDA OTC monographs permit for each active, so a
// product's parsed strength (db/strength.ts) can be shown against the
// published regulatory range -- a factual comparison to a public rule, not
// an efficacy judgment or a recommendation. Actives with no monograph
// (cosmetic ingredients like niacinamide, or azelaic acid, which is
// prescription-only at drug strengths in the US) have no entry here and
// get no badge.
//
// Sources, by 21 CFR part: acne 333 subpart D; sunscreen 352 (as reflected
// in the 2019 proposed rule / current enforcement); antifungal 333 subpart
// C; dandruff/seb derm/psoriasis 358 subpart H; external analgesic
// (hydrocortisone, pramoxine, diphenhydramine) 348; skin protectant 347;
// antiperspirant 350. A range here is "what the monograph permits," which
// is a wider statement than "what's typical." Worth a dermatologist's
// read-through before it's treated as authoritative on the site.
export type MonographRange = { min: number; max: number; cfr: string };

export const MONOGRAPH_RANGES: Record<string, MonographRange> = {
  // Acne -- 21 CFR 333.310
  "benzoyl-peroxide": { min: 2.5, max: 10, cfr: "21 CFR 333.310" },
  "salicylic-acid": { min: 0.5, max: 2, cfr: "21 CFR 333.310" },
  sulfur: { min: 3, max: 10, cfr: "21 CFR 333.310" },
  // Adapalene 0.1% is an approved NDA switch (2016), not a monograph entry;
  // 0.1% is the only OTC strength.
  adapalene: { min: 0.1, max: 0.1, cfr: "NDA 021753 (Rx-to-OTC switch)" },

  // Sunscreen -- 21 CFR 352.10 maxima
  avobenzone: { min: 2, max: 3, cfr: "21 CFR 352.10" },
  octisalate: { min: 0, max: 5, cfr: "21 CFR 352.10" },
  octocrylene: { min: 0, max: 10, cfr: "21 CFR 352.10" },
  homosalate: { min: 0, max: 15, cfr: "21 CFR 352.10" },
  octinoxate: { min: 0, max: 7.5, cfr: "21 CFR 352.10" },
  oxybenzone: { min: 0, max: 6, cfr: "21 CFR 352.10" },
  ensulizole: { min: 0, max: 4, cfr: "21 CFR 352.10" },
  meradimate: { min: 0, max: 5, cfr: "21 CFR 352.10" },
  "titanium-dioxide": { min: 0, max: 25, cfr: "21 CFR 352.10" },
  // Zinc oxide: up to 25% as a sunscreen; 1-25% as a skin protectant.
  "zinc-oxide": { min: 0, max: 25, cfr: "21 CFR 352.10 / 347.10" },

  // Antifungal -- 21 CFR 333.210
  clotrimazole: { min: 1, max: 1, cfr: "21 CFR 333.210" },
  "miconazole-nitrate": { min: 2, max: 2, cfr: "21 CFR 333.210" },
  tolnaftate: { min: 1, max: 1, cfr: "21 CFR 333.210" },
  terbinafine: { min: 1, max: 1, cfr: "NDA 020980 (Rx-to-OTC switch)" },
  butenafine: { min: 1, max: 1, cfr: "NDA 020524 (Rx-to-OTC switch)" },
  "undecylenic-acid": { min: 10, max: 25, cfr: "21 CFR 333.210" },

  // Dandruff / seborrheic dermatitis / psoriasis -- 21 CFR 358.710
  "pyrithione-zinc": { min: 0.3, max: 2, cfr: "21 CFR 358.710" },
  "selenium-sulfide": { min: 1, max: 1, cfr: "21 CFR 358.710" },
  "coal-tar": { min: 0.5, max: 5, cfr: "21 CFR 358.710" },

  // External analgesic -- 21 CFR 348.10
  hydrocortisone: { min: 0.25, max: 1, cfr: "21 CFR 348.10" },
  pramoxine: { min: 0.5, max: 1, cfr: "21 CFR 348.10" },
  diphenhydramine: { min: 1, max: 2, cfr: "21 CFR 348.10" },

  // Skin protectant -- 21 CFR 347.10
  petrolatum: { min: 30, max: 100, cfr: "21 CFR 347.10" },
  "colloidal-oatmeal": { min: 0.007, max: 100, cfr: "21 CFR 347.10" },
  dimethicone: { min: 1, max: 30, cfr: "21 CFR 347.10" },
  allantoin: { min: 0.5, max: 2, cfr: "21 CFR 347.10" },
  lanolin: { min: 12.5, max: 50, cfr: "21 CFR 347.10" },

  // Antiperspirant -- 21 CFR 350.10
  "aluminum-chlorohydrate": { min: 0, max: 25, cfr: "21 CFR 350.10" },
  "aluminum-zirconium-complex": { min: 0, max: 20, cfr: "21 CFR 350.10" },
};

export type MonographStatus = "within" | "below" | "above";

export function monographStatus(activeId: string, pct: number): { status: MonographStatus; range: MonographRange } | null {
  const range = MONOGRAPH_RANGES[activeId];
  if (!range) return null;
  const status: MonographStatus = pct < range.min ? "below" : pct > range.max ? "above" : "within";
  return { status, range };
}

export function formatRange(range: MonographRange): string {
  const fmt = (n: number) => `${n}%`;
  if (range.min === range.max) return fmt(range.max);
  if (range.min === 0) return `up to ${fmt(range.max)}`;
  return `${fmt(range.min)}–${fmt(range.max)}`;
}
