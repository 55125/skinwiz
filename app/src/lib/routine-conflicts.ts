import { getIngredientsForProduct } from "@/lib/queries";
import { CLASS_LABEL, RULES, classesFromIngredients, type ClassId } from "@/lib/routine-conflicts-pure";

export { CLASS_IDS, CLASS_LABEL, RULES, classesFromIngredients, type ClassId } from "@/lib/routine-conflicts-pure";


export type RoutineConflict = { a: { productId: string; brand: string; cls: string }; b: { productId: string; brand: string; cls: string }; note: string };

export function classesOf(productId: string): Set<ClassId> {
  return classesFromIngredients(getIngredientsForProduct(productId));
}

/**
 * `classes` stands in for the ingredient list when a step has none, like the
 * regimen's "prescription retinoid from my doctor" (productId is then just a
 * key for the step).
 */
export function findRoutineConflicts(
  steps: { productId: string | null; productBrandName: string | null; classes?: Set<ClassId> }[],
): RoutineConflict[] {
  const linked = new Map<string, { brand: string; classes: Set<ClassId> }>();
  for (const s of steps) {
    if (s.productId && !linked.has(s.productId)) {
      linked.set(s.productId, { brand: s.productBrandName ?? "a linked product", classes: s.classes ?? classesOf(s.productId) });
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
