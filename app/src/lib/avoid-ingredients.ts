import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { canonicalSlug } from "@/db/ingredient-parse";
import { avoidedIngredientId, ingredientAvoidId, type ListsIngredient } from "@/lib/avoid-shared";

// The server side of "ing:" avoid ids (lib/avoid-shared.ts): any ingredient
// page can go on the avoid list, and products are checked against their own
// ingredient lines (product_ingredients) rather than a precomputed flag.

// Which products list each avoided ingredient. The catalog only changes on a
// reseed, which runs before the app starts, so one load per ingredient per
// process. An avoid list is a handful of ingredients; the biggest (water)
// is about 12k product ids.
const productsListing = new Map<string, Set<string>>();

function productsWith(ingredientId: string): Set<string> {
  let ids = productsListing.get(ingredientId);
  if (!ids) {
    const rows = db.all<{ id: string }>(sql`SELECT DISTINCT product_id AS id FROM product_ingredients WHERE ingredient_id = ${ingredientId}`);
    ids = new Set(rows.map((r) => r.id));
    productsListing.set(ingredientId, ids);
  }
  return ids;
}

export const listsIngredient: ListsIngredient = (productId, ingredientId) => productsWith(ingredientId).has(productId);

/**
 * An "ing:" id with its ingredient mapped to the page it lives on now (an
 * older spelling's page may have been merged into another), or undefined
 * when there's no such ingredient.
 */
export function resolveIngredientAvoidId(id: string): string | undefined {
  const ingredient = avoidedIngredientId(id);
  if (!ingredient) return undefined;
  const current = canonicalSlug(ingredient);
  const row = db.get<{ id: string }>(sql`SELECT id FROM ingredients WHERE id = ${current}`);
  return row ? ingredientAvoidId(row.id) : undefined;
}

/** The ingredient page's own name, for "Contains Iron Oxides". */
export function avoidedIngredientPageName(id: string): string | undefined {
  const ingredient = avoidedIngredientId(id);
  if (!ingredient) return undefined;
  return db.get<{ name: string }>(sql`SELECT name FROM ingredients WHERE id = ${ingredient}`)?.name;
}
