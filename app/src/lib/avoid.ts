import { cookies } from "next/headers";
import { FREE_FROM_CHECKS, getFreeFromCheck } from "@/db/ingredient-flags";

// The visitor's personal "ingredients I avoid" list -- a set of free-from
// check ids (db/ingredient-flags.ts) kept in a cookie, no account needed,
// same posture as the anonymous session id in lib/session.ts. Read on
// every product card/page to flag conflicts, and offered as a one-click
// filter on listing pages. Never applied silently: a product that fails
// the list is marked, not hidden, unless the visitor applies the filter.
export const AVOID_COOKIE = "sw_avoid";
export const AVOID_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const VALID_IDS = new Set(FREE_FROM_CHECKS.map((c) => c.id));

export function sanitizeAvoidIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && VALID_IDS.has(id)))];
}

export async function readAvoidIds(): Promise<string[]> {
  const raw = (await cookies()).get(AVOID_COOKIE)?.value;
  return raw ? sanitizeAvoidIds(raw.split(",")) : [];
}

// "Fragrance-free" -> "fragrance", for "Contains fragrance" wording.
export function avoidedIngredientName(checkId: string): string {
  const check = getFreeFromCheck(checkId);
  if (check?.avoidName) return check.avoidName;
  return (check?.label ?? checkId).replace(/-free$/i, "").toLowerCase();
}

export type AvoidVerdict =
  | { status: "unassessed" }
  | { status: "clear"; checked: number }
  | { status: "conflicts"; conflicts: string[]; checked: number };

// freeFromFlags lists the checks that HOLD (the product is free of X), or
// null when there was no full ingredient list to assess -- see schema.ts.
// A null must read as "couldn't check," never as "clear."
export function avoidVerdict(freeFromFlags: string[] | null | undefined, avoidIds: string[]): AvoidVerdict | null {
  if (avoidIds.length === 0) return null;
  if (!freeFromFlags) return { status: "unassessed" };
  const conflicts = avoidIds.filter((id) => !freeFromFlags.includes(id));
  return conflicts.length > 0
    ? { status: "conflicts", conflicts, checked: avoidIds.length }
    : { status: "clear", checked: avoidIds.length };
}
