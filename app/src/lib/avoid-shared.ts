import { getFreeFromCheck } from "@/db/ingredient-flags";
import { allergenFinding, allergenLabel, resolveAllergenId } from "@/db/contact-allergens";

// Pure avoid-list logic (no cookies), shared by server code and the
// client-side profile scoring. An avoid id is either a free-from check id
// (db/ingredient-flags.ts) or a contact allergen / allergen group id
// (db/contact-allergens.ts); the two are stored differently per product.

export type AvoidableProduct = { freeFromFlags: string[] | null; allergenHits?: string[] | null };

/** A valid avoid id with legacy contact-allergen ids mapped forward, or undefined. */
export function normalizeAvoidId(id: string): string | undefined {
  return getFreeFromCheck(id) ? id : resolveAllergenId(id);
}

// "Fragrance-free" -> "fragrance", for "Contains fragrance" wording.
export function avoidedIngredientName(id: string): string {
  const check = getFreeFromCheck(id);
  if (check) return check.avoidName ?? check.label.replace(/-free$/i, "").toLowerCase();
  return allergenLabel(id) ?? id;
}

/**
 * Which avoid ids a product conflicts with: `conflicts` are listed on the
 * label; `possible` are fragrance allergens an undisclosed fragrance could be
 * hiding. null when there's no full ingredient list -- "couldn't check,"
 * never "clear."
 */
export function avoidConflicts(product: AvoidableProduct, avoidIds: string[]): { conflicts: string[]; possible: string[] } | null {
  const flags = product.freeFromFlags;
  const hits = product.allergenHits;
  if (!flags) return null;
  const conflicts: string[] = [];
  const possible: string[] = [];
  for (const id of avoidIds) {
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
