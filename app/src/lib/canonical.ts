// Duplicate listings (products.canonical_id, set by the seed from
// tools/catalog_pipeline/output/product_merges.csv). One source of truth for
// "which row stands for this product":
//
//  - LISTED keeps duplicates out of every listing, search, count and the
//    sitemap (combined with OTC_ONLY in lib/queries.ts).
//  - A duplicate's page 308s to its canonical (app/product/[id]/page.tsx).
//  - User rows (shelf, regimens, check-ins, recall matches...) keep the id
//    they were saved with and are resolved through canonicalIdOf() /
//    resolvedProductId() at read time, so removing a merge (deleting its CSV
//    row and reseeding) restores everything exactly as it was.
//
// The seed flattens chains, so a canonical_id always names a row whose own
// canonical_id is null: one hop is enough everywhere below.
import { inArray, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";

/** Not a merged duplicate. */
export const LISTED: SQL = sql`${products.canonicalId} IS NULL`;

/** The listed product an id stands for (itself when it isn't a duplicate or doesn't exist). */
export function canonicalIdOf(id: string): string {
  const row = db.get<{ c: string | null }>(sql`SELECT canonical_id AS c FROM products WHERE id = ${id}`);
  return row?.c ?? id;
}

/** canonicalIdOf for many ids at once. */
export function canonicalIdsOf(ids: string[]): Map<string, string> {
  const out = new Map(ids.map((id) => [id, id]));
  if (ids.length === 0) return out;
  const rows = db
    .select({ id: products.id, c: products.canonicalId })
    .from(products)
    .where(inArray(products.id, [...new Set(ids)]))
    .all();
  for (const r of rows) if (r.c) out.set(r.id, r.c);
  return out;
}

/** Every id that is this product: the canonical first, then its duplicates (sorted). */
export function productGroupIds(id: string): string[] {
  const canonical = canonicalIdOf(id);
  const dups = db
    .all<{ id: string }>(sql`SELECT id FROM products WHERE canonical_id = ${canonical} ORDER BY id`)
    .map((r) => r.id);
  return [canonical, ...dups];
}

/** Group ids for several canonical ids at once: canonical id -> [canonical, ...duplicates]. */
export function productGroupsFor(canonicalIds: string[]): Map<string, string[]> {
  const out = new Map(canonicalIds.map((id) => [id, [id]]));
  if (canonicalIds.length === 0) return out;
  const rows = db
    .select({ id: products.id, c: products.canonicalId })
    .from(products)
    .where(inArray(products.canonicalId, [...new Set(canonicalIds)]))
    .orderBy(products.id)
    .all();
  for (const r of rows) out.get(r.c!)?.push(r.id);
  return out;
}

/**
 * Product rows for stored ids (a plan's steps, a handout's products), keyed by
 * the stored id but holding the listed product each stands for. Missing ids
 * are left out, as a plain lookup would.
 */
export function productsByStoredId(ids: string[]): Map<string, typeof products.$inferSelect> {
  const out = new Map<string, typeof products.$inferSelect>();
  if (ids.length === 0) return out;
  const canonical = canonicalIdsOf(ids);
  const rows = db
    .select()
    .from(products)
    .where(inArray(products.id, [...new Set([...canonical.values()])]))
    .all();
  const byId = new Map(rows.map((p) => [p.id, p]));
  for (const id of ids) {
    const p = byId.get(canonical.get(id)!);
    if (p) out.set(id, p);
  }
  return out;
}

/** SQL for the listed id a stored product-id column points at (one hop, see above). */
export function resolvedProductId(column: SQLWrapper): SQL {
  return sql`COALESCE((SELECT p_c.canonical_id FROM products p_c WHERE p_c.id = ${column}), ${column})`;
}

/** SQL: the stored product-id column is this product or one of its duplicates. */
export function inProductGroup(column: SQLWrapper, id: string): SQL {
  const ids = productGroupIds(id);
  return sql`${column} IN (${sql.join(
    ids.map((i) => sql`${i}`),
    sql`, `,
  )})`;
}
