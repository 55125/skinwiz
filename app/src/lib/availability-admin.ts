import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { productAvailability } from "@/db/schema";
import { canonicalIdOf } from "@/lib/canonical";
import { resetAvailabilityIndex } from "@/lib/availability";

// /admin's manual availability calls (schema.ts productAvailability).

export type AvailabilityAction = "discontinued" | "available" | "clear";

/** A product id from what the owner pasted: the id itself, or a product page URL or path. */
export function parseProductRef(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/\/product\/([^/?#\s]+)/);
  let id = m ? m[1] : s;
  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }
  return id.length > 0 && id.length <= 200 ? id : null;
}

/** Apply one call; false when no OTC product has that id. */
export function setAvailability(ref: string, action: AvailabilityAction, note: string | null, now = new Date()): boolean {
  const raw = parseProductRef(ref);
  if (!raw) return false;
  const id = canonicalIdOf(raw);
  const exists = db.get<{ id: string }>(sql`SELECT id FROM products WHERE id = ${id} AND is_rx = 0`);
  if (!exists) return false;
  if (action === "clear") {
    db.delete(productAvailability).where(eq(productAvailability.productId, id)).run();
  } else {
    const row = { status: action, note: note?.trim().slice(0, 300) || null, updatedAt: now.toISOString() };
    db.insert(productAvailability)
      .values({ productId: id, ...row })
      .onConflictDoUpdate({ target: productAvailability.productId, set: row })
      .run();
  }
  resetAvailabilityIndex();
  return true;
}

/** The latest manual calls, with product names, for /admin. */
export function listAvailabilityOverrides(limit = 50) {
  return db
    .select({
      productId: productAvailability.productId,
      status: productAvailability.status,
      note: productAvailability.note,
      updatedAt: productAvailability.updatedAt,
      name: sql<string | null>`(SELECT brand_name FROM products WHERE id = ${productAvailability.productId})`,
    })
    .from(productAvailability)
    .orderBy(desc(productAvailability.updatedAt))
    .limit(limit)
    .all();
}
