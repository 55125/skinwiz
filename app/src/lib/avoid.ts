import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { personAvoidLists } from "@/db/schema";
import { personForSession } from "@/lib/identity";
import { readDeviceSessionId } from "@/lib/session";
import { avoidConflicts, normalizeAvoidId, type AvoidableProduct } from "@/lib/avoid-shared";

export { avoidedIngredientName } from "@/lib/avoid-shared";

// The visitor's personal "ingredients I avoid" list -- free-from check ids
// (db/ingredient-flags.ts) and contact allergen ids (db/contact-allergens.ts)
// kept in a cookie, no account needed, same posture as the anonymous session
// id in lib/session.ts. Once someone signs in with their email it is also
// saved to their account (person_avoid_lists) and read from there. Read on every product card/page to flag conflicts,
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

async function readCookieIds(): Promise<string[]> {
  const raw = (await cookies()).get(AVOID_COOKIE)?.value;
  return raw ? sanitizeAvoidIds(raw.split(",")) : [];
}

async function signedInPersonId(): Promise<string | null> {
  const device = await readDeviceSessionId();
  return device ? (personForSession(device)?.id ?? null) : null;
}

function savedIds(personId: string): string[] | null {
  const row = db.select().from(personAvoidLists).where(eq(personAvoidLists.personId, personId)).get();
  return row ? sanitizeAvoidIds(row.ids) : null;
}

function saveIds(personId: string, ids: string[], now = new Date()) {
  db.insert(personAvoidLists)
    .values({ personId, ids, updatedAt: now.toISOString() })
    .onConflictDoUpdate({ target: personAvoidLists.personId, set: { ids, updatedAt: now.toISOString() } })
    .run();
}

async function setCookieIds(ids: string[]) {
  const store = await cookies();
  if (ids.length === 0) store.delete(AVOID_COOKIE);
  else store.set(AVOID_COOKIE, ids.join(","), { httpOnly: true, sameSite: "lax", maxAge: AVOID_COOKIE_MAX_AGE });
}

/**
 * The avoid list: a signed-in person's saved list (so it follows them to
 * every device), otherwise this browser's cookie. Cached per request, since
 * every product card asks.
 */
export const readAvoidIds = cache(async (): Promise<string[]> => {
  const personId = await signedInPersonId();
  const saved = personId ? savedIds(personId) : null;
  return saved ?? (await readCookieIds());
});

/** Replaces the list: in the cookie, and on the account when signed in. Route handlers only. */
export async function writeAvoidIds(ids: string[]): Promise<void> {
  await setCookieIds(ids);
  const personId = await signedInPersonId();
  if (personId) saveIds(personId, ids);
}

/** At sign-in: this browser's list and the account's list become one, in both places. */
export async function adoptAvoidListOnSignIn(personId: string): Promise<void> {
  const merged = [...new Set([...(savedIds(personId) ?? []), ...(await readCookieIds())])];
  saveIds(personId, merged);
  await setCookieIds(merged);
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
