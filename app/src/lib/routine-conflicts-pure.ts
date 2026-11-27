import { RETINOIDS, countsAtAnyPosition } from "@/lib/retinoids";

// The pure half of lib/routine-conflicts.ts (no DB), for client code and tests.
//
// Rule-of-thumb interaction checks for the products linked in a routine.
// These are irritation-stacking and stability cautions widely repeated in
// dermatology patient guidance -- worded as "consider," never as a verdict,
// and only ever computed from products a step actually links to (free-text
// steps can't be assessed). Not medical advice.
export type ClassId = "retinoid" | "exfoliant" | "benzoyl-peroxide" | "vitamin-c";

export const CLASS_IDS: Record<ClassId, string[]> = {
  retinoid: RETINOIDS,
  exfoliant: ["glycolic-acid", "lactic-acid", "mandelic-acid", "salicylic-acid", "lactobionic-acid", "gluconolactone", "capryloyl-salicylic-acid", "betaine-salicylate"],
  "benzoyl-peroxide": ["benzoyl-peroxide"],
  "vitamin-c": ["vitamin-c", "l-ascorbic-acid"],
};

export const CLASS_LABEL: Record<ClassId, string> = {
  retinoid: "a retinoid",
  exfoliant: "an exfoliating acid",
  "benzoyl-peroxide": "benzoyl peroxide",
  "vitamin-c": "vitamin C",
};

export const RULES: { a: ClassId; b: ClassId; note: string }[] = [
  {
    a: "retinoid",
    b: "exfoliant",
    note: "Both increase dryness and irritation, and using them together is a common cause of a damaged skin barrier. Many people alternate nights or split them between morning and evening.",
  },
  {
    a: "retinoid",
    b: "benzoyl-peroxide",
    note: "Benzoyl peroxide adds to retinoid irritation, and it can break down tretinoin and retinol (tazarotene's label warns it may too). Adapalene is stable with it. Often used at different times of day.",
  },
  {
    a: "benzoyl-peroxide",
    b: "vitamin-c",
    note: "Benzoyl peroxide is an oxidizer and can degrade vitamin C, reducing its effect.",
  },
  {
    a: "benzoyl-peroxide",
    b: "exfoliant",
    note: "Stacking them can be more drying and irritating than either alone.",
  },
];

// A trace amount far down a cosmetic list isn't a meaningful dose; drug-label
// actives (position <= 0) and potent retinoids (lib/retinoids.ts) always count.
const MAX_COSMETIC_POSITION = 12;

/** classesOf for an ingredient list already in hand (pure, for tests). */
export function classesFromIngredients(rows: { ingredientId: string; position: number }[]): Set<ClassId> {
  const out = new Set<ClassId>();
  for (const r of rows) {
    if (r.position > MAX_COSMETIC_POSITION && !countsAtAnyPosition(r.ingredientId)) continue;
    for (const [cls, ids] of Object.entries(CLASS_IDS) as [ClassId, string[]][]) {
      if (ids.includes(r.ingredientId)) out.add(cls);
    }
  }
  return out;
}

