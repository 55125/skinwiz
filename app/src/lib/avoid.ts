import { cookies } from "next/headers";
import { avoidConflicts, normalizeAvoidId, type AvoidableProduct } from "@/lib/avoid-shared";

export { avoidedIngredientName } from "@/lib/avoid-shared";

// The visitor's personal "ingredients I avoid" list -- free-from check ids
// (db/ingredient-flags.ts) and contact allergen ids (db/contact-allergens.ts)
// kept in a cookie, no account needed, same posture as the anonymous session
// id in lib/session.ts. Read on every product card/page to flag conflicts,
// and offered as a one-click filter on listing pages. Never applied
// silently: a product that fails the list is marked, not hidden, unless the
// visitor applies the filter.
export const AVOID_COOKIE = "sw_avoid";
export const AVOID_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function sanitizeAvoidIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out = ids.flatMap((id) => {
    const valid = typeof id === "string" ? normalizeAvoidId(id) : undefined;
    return valid ? [valid] : [];
  });
  return [...new Set(out)];
}

export async function readAvoidIds(): Promise<string[]> {
  const raw = (await cookies()).get(AVOID_COOKIE)?.value;
  return raw ? sanitizeAvoidIds(raw.split(",")) : [];
}

export type AvoidVerdict =
  | { status: "unassessed" }
  | { status: "clear"; checked: number }
  | { status: "conflicts"; conflicts: string[]; possible: string[]; checked: number }
  | { status: "possible"; possible: string[]; checked: number };

// A null ingredient assessment must read as "couldn't check," never as
// "clear." "possible" = nothing listed, but an undisclosed fragrance could
// be hiding a fragrance allergen on the list.
export function avoidVerdict(product: AvoidableProduct, avoidIds: string[]): AvoidVerdict | null {
  if (avoidIds.length === 0) return null;
  const found = avoidConflicts(product, avoidIds);
  if (!found) return { status: "unassessed" };
  const checked = avoidIds.length;
  if (found.conflicts.length > 0) return { status: "conflicts", ...found, checked };
  if (found.possible.length > 0) return { status: "possible", possible: found.possible, checked };
  return { status: "clear", checked };
}
