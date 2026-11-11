import { getFreeFromCheck } from "@/db/ingredient-flags";
import { allergenFinding, allergenLabel, allergenMembers, resolveAllergenId } from "@/db/contact-allergens";

// Pure avoid-list logic (no cookies), shared by server code and the
// client-side profile scoring. An avoid id is a free-from check id
// (db/ingredient-flags.ts), a contact allergen / allergen group id
// (db/contact-allergens.ts), or "ing:" plus any ingredient page's id
// ("ing:iron-oxides"); the three are stored differently per product.

export type AvoidableProduct = {
  freeFromFlags: string[] | null;
  allergenHits?: string[] | null;
  id?: string;
  /** The product's ingredient ids, when the caller already has them (a pasted list, the match score). */
  ingredientIds?: string[] | null;
};

/** Whether a product lists an ingredient (server side: product_ingredients). */
export type ListsIngredient = (productId: string, ingredientId: string) => boolean;

const INGREDIENT_PREFIX = "ing:";
const INGREDIENT_AVOID_ID = /^ing:[a-z0-9][a-z0-9-]{0,79}$/;

export function ingredientAvoidId(ingredientId: string): string {
  return `${INGREDIENT_PREFIX}${ingredientId}`;
}

/** The ingredient id an "ing:" avoid id stands for, else undefined. */
export function avoidedIngredientId(id: string): string | undefined {
  return INGREDIENT_AVOID_ID.test(id) ? id.slice(INGREDIENT_PREFIX.length) : undefined;
}

/** A valid avoid id with legacy contact-allergen ids mapped forward, or undefined. */
export function normalizeAvoidId(id: string): string | undefined {
  if (avoidedIngredientId(id)) return id;
  return getFreeFromCheck(id) ? id : resolveAllergenId(id);
}

// "Fragrance-free" -> "fragrance", for "Contains fragrance" wording. An
// ingredient reads from its id here; server code has the page's own name
// (lib/avoid.ts).
export function avoidedIngredientName(id: string): string {
  const ingredient = avoidedIngredientId(id);
  if (ingredient) return ingredient.replace(/-/g, " ");
  const check = getFreeFromCheck(id);
  if (check) return check.avoidName ?? check.label.replace(/-free$/i, "").toLowerCase();
  return allergenLabel(id) ?? id;
}

/**
 * The ingredients behind a product's avoid conflicts, named once each: a
 * group on the list ("Formaldehyde and all releasers") becomes the members
 * the label actually has ("DMDM hydantoin"), so two overlapping groups
 * don't read as two hits. `name` turns any other avoid id into its name.
 */
export function avoidConflictNames(conflicts: string[], allergenHits: string[] | null | undefined, name: (id: string) => string): string[] {
  const hits = new Set(allergenHits ?? []);
  const out: string[] = [];
  for (const id of conflicts) {
    const members = allergenMembers(id).filter((m) => m !== id && hits.has(m));
    for (const n of members.length > 0 ? members.map((m) => allergenLabel(m) ?? m) : [name(id)]) if (!out.includes(n)) out.push(n);
  }
  return out;
}

/**
 * Which avoid ids a product conflicts with: `conflicts` are listed on the
 * label; `possible` are fragrance allergens an undisclosed fragrance could be
 * hiding. null when there's no full ingredient list -- "couldn't check,"
 * never "clear."
 */
export function avoidConflicts(
  product: AvoidableProduct,
  avoidIds: string[],
  listsIngredient?: ListsIngredient,
): { conflicts: string[]; possible: string[] } | null {
  const flags = product.freeFromFlags;
  const hits = product.allergenHits;
  if (!flags) return null;
  const conflicts: string[] = [];
  const possible: string[] = [];
  for (const id of avoidIds) {
    const ingredient = avoidedIngredientId(id);
    if (ingredient) {
      let listed: boolean;
      if (product.ingredientIds) listed = product.ingredientIds.includes(ingredient);
      else if (listsIngredient && product.id) listed = listsIngredient(product.id, ingredient);
      else return null; // nothing to check it against
      if (listed) conflicts.push(id);
      continue;
    }
    if (getFreeFromCheck(id)) {
      if (!flags.includes(id)) conflicts.push(id);
      continue;
    }
    // Seeded before allergen hits existed: can't say either way.
    if (!hits) return null;
    const finding = allergenFinding(hits, id);
    if (finding?.level === "contains") conflicts.push(id);
    else if (finding) possible.push(id);
  }
  return { conflicts, possible };
}

/** The `free` filter param as valid ids, legacy contact-allergen ids mapped forward. */
export function parseFreeParam(free: string | undefined): string[] {
  const ids = (free ?? "").split(",").flatMap((id) => {
    const valid = normalizeAvoidId(id.trim());
    return valid ? [valid] : [];
  });
  return [...new Set(ids)];
}
