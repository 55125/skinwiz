import { pregnancyAvoidIds, pregnancyFindings, type PregnancyFinding } from "@/db/pregnancy-lactation";
import { getAllIngredientIds } from "@/lib/queries";
import { stepTypeOf } from "@/lib/regimen";
import type { products } from "@/db/schema";

// Server-side glue for pregnancy & breastfeeding mode (gated by
// FEATURES.PREGNANCY_MODE). The classification itself lives in
// db/pregnancy-lactation.ts.

/** ?pregnancy=hide on /browse and /concern/[slug] drops products with an avoid-level ingredient. */
export const PREGNANCY_FILTER_PARAM = "pregnancy";
export const PREGNANCY_FILTER_VALUE = "hide";

let avoidCache: string[] | null = null;
/** Catalog ingredient ids classified "avoid" in pregnancy (plus the canonical active ids), computed once per process. */
export function pregnancyAvoidIngredientIds(): string[] {
  if (!avoidCache) {
    avoidCache = [...new Set([...pregnancyAvoidIds(getAllIngredientIds()), ...pregnancyAvoidIds(["adapalene", "retinol-cosmetic"])])];
  }
  return avoidCache;
}

type Product = typeof products.$inferSelect;

/** Classified ingredients in a product; rinse-off products (cleansers, shampoos) get their wash-off levels. */
export function productPregnancyFindings(product: Product, ingredients: { ingredientId: string; position: number }[]): PregnancyFinding[] {
  const step = stepTypeOf(product);
  const washOff = step === "cleanser" || step === "scalp";
  return pregnancyFindings(
    ingredients.map((r) => ({ id: r.ingredientId, position: r.position })),
    product.activeIds ?? [],
    { washOff },
  );
}
