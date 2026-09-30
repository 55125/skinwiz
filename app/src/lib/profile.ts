import { cookies } from "next/headers";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { avoidedIngredientName } from "@/lib/avoid";
import { PROFILE_COOKIE, parseProfile, type Profile, type ProductIngredient } from "@/lib/profile-shared";

export * from "@/lib/profile-shared";

export async function readProfile(): Promise<Profile> {
  return parseProfile((await cookies()).get(PROFILE_COOKIE)?.value);
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
