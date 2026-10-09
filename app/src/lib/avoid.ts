import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { personAvoidLists } from "@/db/schema";
import { personForSession } from "@/lib/identity";
import { readDeviceSessionId } from "@/lib/session";
import { avoidConflicts, normalizeAvoidId, type AvoidableProduct } from "@/lib/avoid-shared";
import { getNotOnLabel } from "@/db/patch-test-series";

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

// Stored next to the avoid ids: patch-test positives that never appear on a
// label (rubber accelerators, epoxy, textile dyes; db/patch-test-series.ts).
// Kept so the patient's list remembers them, but never used to check
// products, so readAvoidIds leaves them out.
function sanitizeStoredIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const avoid = sanitizeAvoidIds(ids);
  const off = ids.filter((id): id is string => typeof id === "string" && !!getNotOnLabel(id));
  return [...new Set([...avoid, ...off])];
}

const isOffLabel = (id: string) => !!getNotOnLabel(id);

async function readCookieIds(): Promise<string[]> {
  const raw = (await cookies()).get(AVOID_COOKIE)?.value;
  return raw ? sanitizeStoredIds(raw.split(",")) : [];
}

async function signedInPersonId(): Promise<string | null> {
  const device = await readDeviceSessionId();
  return device ? (personForSession(device)?.id ?? null) : null;
}

function savedIds(personId: string): string[] | null {
  const row = db.select().from(personAvoidLists).where(eq(personAvoidLists.personId, personId)).get();
  return row ? sanitizeStoredIds(row.ids) : null;
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
  else store.set(AVOID_COOKIE, ids.join(","), { httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production", maxAge: AVOID_COOKIE_MAX_AGE });
}

/**
 * The avoid list: a signed-in person's saved list (so it follows them to
 * every device), otherwise this browser's cookie. Cached per request, since
 * every product card asks.
 */
const readStoredIds = cache(async (): Promise<string[]> => {
  const personId = await signedInPersonId();
  const saved = personId ? savedIds(personId) : null;
  return saved ?? (await readCookieIds());
});

export const readAvoidIds = cache(async (): Promise<string[]> => (await readStoredIds()).filter((id) => !isOffLabel(id)));

/** Patch-test positives kept on the list for reference only (not on labels). */
export const readNotOnLabelIds = cache(async (): Promise<string[]> => (await readStoredIds()).filter(isOffLabel));

/**
 * Replaces the list: in the cookie, and on the account when signed in. The
 * not-on-label entries are kept as they are unless `notOnLabel` is given.
 * Route handlers only.
 */
export async function writeAvoidIds(ids: string[], notOnLabel?: string[]): Promise<void> {
  const off = notOnLabel ?? (await readNotOnLabelIds());
  const stored = sanitizeStoredIds([...ids.filter((id) => !isOffLabel(id)), ...off.filter(isOffLabel)]);
  await setCookieIds(stored);
  const personId = await signedInPersonId();
  if (personId) saveIds(personId, stored);
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
