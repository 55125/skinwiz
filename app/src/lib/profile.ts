import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { eq, sql } from "drizzle-orm";
import { personProfiles } from "@/db/schema";
import { personForSession } from "@/lib/identity";
import { readDeviceSessionId } from "@/lib/session";
import { avoidedIngredientName, type AvoidableProduct } from "@/lib/avoid-shared";
import {
  PROFILE_COOKIE,
  PROFILE_COOKIE_MAX_AGE,
  accountPart,
  hasProfileData,
  matchProduct,
  mergeProfiles,
  parseProfile,
  sanitizeProfile,
  serializeProfile,
  withLocalFlags,
  type Profile,
  type ProductIngredient,
} from "@/lib/profile-shared";

export * from "@/lib/profile-shared";

async function readCookieProfile(): Promise<Profile> {
  return parseProfile((await cookies()).get(PROFILE_COOKIE)?.value);
}

async function signedInPersonId(): Promise<string | null> {
  const device = await readDeviceSessionId();
  return device ? (personForSession(device)?.id ?? null) : null;
}

function savedProfile(personId: string): Profile | null {
  const row = db.select().from(personProfiles).where(eq(personProfiles.personId, personId)).get();
  return row ? sanitizeProfile(row.profile) : null;
}

function saveProfile(personId: string, profile: Profile, now = new Date()) {
  const stored = accountPart(profile);
  const value = { skin: stored.skin, concerns: stored.concerns, likes: stored.likes, dislikes: stored.dislikes };
  db.insert(personProfiles)
    .values({ personId, profile: value, updatedAt: now.toISOString() })
    .onConflictDoUpdate({ target: personProfiles.personId, set: { profile: value, updatedAt: now.toISOString() } })
    .run();
}

async function setCookieProfile(profile: Profile) {
  const store = await cookies();
  if (!hasProfileData(profile)) store.delete(PROFILE_COOKIE);
  else store.set(PROFILE_COOKIE, serializeProfile(profile), { httpOnly: true, sameSite: "lax", maxAge: PROFILE_COOKIE_MAX_AGE });
}

/**
 * The skin profile: a signed-in person's saved profile (so it follows them to
 * every device) with this browser's pregnancy and breastfeeding answers, which
 * are never saved to the account; otherwise this browser's cookie.
 */
export const readProfile = cache(async (): Promise<Profile> => {
  const local = await readCookieProfile();
  const personId = await signedInPersonId();
  const saved = personId ? savedProfile(personId) : null;
  return saved ? withLocalFlags(saved, local) : local;
});

/** Replaces the profile: in the cookie, and on the account (minus the pregnancy answers) when signed in. Route handlers only. */
export async function writeProfile(profile: Profile): Promise<void> {
  await setCookieProfile(profile);
  const personId = await signedInPersonId();
  if (personId) saveProfile(personId, profile);
}

/** At sign-in: this browser's profile and the account's become one, in both places. */
export async function adoptProfileOnSignIn(personId: string): Promise<void> {
  const local = await readCookieProfile();
  const merged = mergeProfiles(savedProfile(personId), local);
  if (hasProfileData(merged) || savedProfile(personId)) saveProfile(personId, merged);
  await setCookieProfile(merged);
}

/** Batch-load ingredient ids for many products in one query. */
export function getIngredientMembership(productIds: string[]): Map<string, ProductIngredient[]> {
  const out = new Map<string, ProductIngredient[]>();
  if (productIds.length === 0) return out;
  const rows = db.all<{ pid: string; iid: string; pos: number; act: number }>(sql`
    SELECT product_id AS pid, ingredient_id AS iid, position AS pos, is_active AS act
    FROM product_ingredients WHERE product_id IN (${sql.join(productIds.map((i) => sql`${i}`), sql`, `)})
  `);
  for (const r of rows) {
    const list = out.get(r.pid) ?? out.set(r.pid, []).get(r.pid)!;
    list.push({ id: r.iid, position: r.pos, isActive: !!r.act });
  }
  return out;
}

export function avoidLabelsFor(avoidIds: string[]): { id: string; name: string }[] {
  return avoidIds.map((id) => ({ id, name: avoidedIngredientName(id) }));
}

export function getIngredientNames(ids: string[]): Record<string, string> {
  if (ids.length === 0) return {};
  const rows = db.all<{ id: string; name: string }>(sql`
    SELECT id, name FROM ingredients WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
  `);
  return Object.fromEntries(rows.map((r) => [r.id, r.name]));
}

/** Score many products at once (chunked ingredient lookups); products with no score are omitted. */
export function scoreProducts(
  rows: ({ id: string } & AvoidableProduct)[],
  profile: Profile,
  avoidIds: string[],
): Map<string, number> {
  const labels = avoidLabelsFor(avoidIds);
  const out = new Map<string, number>();
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const membership = getIngredientMembership(chunk.map((r) => r.id));
    for (const r of chunk) {
      const m = matchProduct(r, membership.get(r.id), profile, labels);
      if (m) out.set(r.id, m.score);
    }
  }
  return out;
}
