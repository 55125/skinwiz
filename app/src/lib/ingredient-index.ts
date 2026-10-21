import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { actives, ingredients } from "@/db/schema";
import { MIN_PUBLIC_PRODUCTS } from "@/lib/queries";
import { allergensInIngredient } from "@/db/contact-allergens";
import { checksFailedByIngredient } from "@/db/ingredient-flags";

// Which ingredient pages search engines are asked to index. Most of the ~13k
// public ingredients are inactives with nothing on their page but a product
// list, and thousands of those near-empty pages count against the whole site.
// A page is indexed when it says something of its own -- a tracked active
// (evidence notes), a contact allergen, an ingredient a free-from check flags
// -- or when enough products list it that the list itself is worth finding.
// The rest stay reachable and followed, just noindex and out of the sitemap.
export const MIN_INDEXED_PRODUCTS = 10;

type IngredientRow = { id: string; name: string; aliases: string[]; productCount: number };

export function isIndexableIngredient(i: IngredientRow, isActive: boolean): boolean {
  if (i.productCount < MIN_PUBLIC_PRODUCTS) return false;
  if (isActive || i.productCount >= MIN_INDEXED_PRODUCTS) return true;
  const names = [i.name, ...i.aliases];
  return names.some((n) => allergensInIngredient(n).length > 0) || checksFailedByIngredient(names).length > 0;
}

export function getIndexableIngredientIds(): string[] {
  const activeIds = new Set(db.select({ id: actives.id }).from(actives).all().map((a) => a.id));
  return db
    .select()
    .from(ingredients)
    .where(sql`${ingredients.productCount} >= ${MIN_PUBLIC_PRODUCTS}`)
    .all()
    .filter((i) => isIndexableIngredient(i, activeIds.has(i.id)))
    .map((i) => i.id);
}
