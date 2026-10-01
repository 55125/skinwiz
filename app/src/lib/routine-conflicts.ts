import { getIngredientsForProduct } from "@/lib/queries";

// Rule-of-thumb interaction checks for the products linked in a routine.
// These are irritation-stacking and stability cautions widely repeated in
// dermatology patient guidance -- worded as "consider," never as a verdict,
// and only ever computed from products a step actually links to (free-text
// steps can't be assessed). Not medical advice.
export type ClassId = "retinoid" | "exfoliant" | "benzoyl-peroxide" | "vitamin-c";

export const CLASS_IDS: Record<ClassId, string[]> = {
  retinoid: ["retinol-cosmetic", "retinal", "adapalene", "hydroxypinacolone-retinoate", "tretinoin", "tazarotene", "trifarotene"],
  exfoliant: ["glycolic-acid", "lactic-acid", "mandelic-acid", "salicylic-acid", "lactobionic-acid", "gluconolactone"],
  "benzoyl-peroxide": ["benzoyl-peroxide"],
  "vitamin-c": ["vitamin-c", "l-ascorbic-acid"],
};

const CLASS_LABEL: Record<ClassId, string> = {
  retinoid: "a retinoid",
  exfoliant: "an exfoliating acid",
  "benzoyl-peroxide": "benzoyl peroxide",
  "vitamin-c": "vitamin C",
};

const RULES: { a: ClassId; b: ClassId; note: string }[] = [
  {
    a: "retinoid",
    b: "exfoliant",
    note: "Both increase dryness and irritation, and using them together is a common cause of a damaged skin barrier. Many people alternate nights or split them between morning and evening.",
  },
  {
    a: "retinoid",
    b: "benzoyl-peroxide",
    note: "Benzoyl peroxide adds to retinoid irritation, and it can break down tretinoin specifically. Often used at different times of day.",
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

export type RoutineConflict = { a: { productId: string; brand: string; cls: string }; b: { productId: string; brand: string; cls: string }; note: string };

// A trace amount far down a cosmetic list isn't a meaningful dose; drug-label
// actives (position <= 0) always count.
const MAX_COSMETIC_POSITION = 12;

export function classesOf(productId: string): Set<ClassId> {
  const out = new Set<ClassId>();
  for (const r of getIngredientsForProduct(productId)) {
    if (r.position > MAX_COSMETIC_POSITION) continue;
    for (const [cls, ids] of Object.entries(CLASS_IDS) as [ClassId, string[]][]) {
      if (ids.includes(r.ingredientId)) out.add(cls);
    }
  }
  return out;
}

export function findRoutineConflicts(steps: { productId: string | null; productBrandName: string | null }[]): RoutineConflict[] {
  const linked = new Map<string, { brand: string; classes: Set<ClassId> }>();
  for (const s of steps) {
    if (s.productId && !linked.has(s.productId)) {
      linked.set(s.productId, { brand: s.productBrandName ?? "a linked product", classes: classesOf(s.productId) });
    }
  }
  const entries = [...linked.entries()];
  const out: RoutineConflict[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [pa, A] = entries[i];
      const [pb, B] = entries[j];
      for (const rule of RULES) {
        for (const [x, y] of [[A, B], [B, A]] as const) {
          if (!x.classes.has(rule.a) || !y.classes.has(rule.b)) continue;
          const first = x === A ? { id: pa, ...A } : { id: pb, ...B };
          const second = x === A ? { id: pb, ...B } : { id: pa, ...A };
          if (out.some((c) => c.note === rule.note && ((c.a.productId === first.id && c.b.productId === second.id) || (c.a.productId === second.id && c.b.productId === first.id)))) continue;
          out.push({
            a: { productId: first.id, brand: first.brand, cls: CLASS_LABEL[rule.a] },
            b: { productId: second.id, brand: second.brand, cls: CLASS_LABEL[rule.b] },
            note: rule.note,
          });
        }
      }
    }
  }
  return out;
}
