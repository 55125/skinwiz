import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { concerns, products, actives, evidenceNotes, affiliateLinks, videoLinks } from "@/db/schema";
import { concernIdToNiche } from "@/db/actives";

// Shared by getProductsForConcern and searchProducts -- one LIKE per
// selected free-from id, ANDed together, so a product must satisfy every
// checked filter (e.g. "fragrance-free" AND "paraben-free"), not just one.
// freeFromFlags is null for unassessed products (see ingredient-flags.ts),
// so those simply never match any filter here -- they're not silently
// treated as passing.
function freeFromWhereClauses(freeFromIds: string[]): SQL[] {
  return freeFromIds.map((id) => sql`${products.freeFromFlags} LIKE ${"%\"" + id + "\"%"}`);
}

export function getConcerns() {
  return db.select().from(concerns).all();
}

export function getConcern(id: string) {
  return db.select().from(concerns).where(eq(concerns.id, id)).get();
}

export function getActivesForConcern(concernId: string) {
  const niche = concernIdToNiche(concernId);
  return db
    .select()
    .from(actives)
    .where(sql`${actives.categories} LIKE ${"%\"" + niche + "\"%"}`)
    .all();
}

const PAGE_SIZE = 24;

export function getProductsForConcern(concernId: string, page: number, activeId?: string, freeFromIds: string[] = []) {
  const offset = (page - 1) * PAGE_SIZE;
  const clauses = [eq(products.concernId, concernId), ...freeFromWhereClauses(freeFromIds)];
  if (activeId) clauses.push(sql`${products.activeIds} LIKE ${"%\"" + activeId + "\"%"}`);
  const whereClause = and(...clauses);

  const rows = db.select().from(products).where(whereClause).limit(PAGE_SIZE).offset(offset).all();
  const [{ count }] = db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause).all();

  return { rows, total: count, pageSize: PAGE_SIZE, page };
}

export function getProduct(id: string) {
  return db.select().from(products).where(eq(products.id, id)).get();
}

// concernId is required, not just activeIds — some actives (e.g. salicylic
// acid) have an evidence note per concern they're recognized for (acne AND
// antidandruff). Without this filter a product would show evidence notes
// for concerns it has nothing to do with.
export function getEvidenceNotesForActives(activeIds: string[], concernId: string) {
  if (activeIds.length === 0) return [];
  return db
    .select({
      activeId: evidenceNotes.activeId,
      activeName: actives.canonicalName,
      summary: evidenceNotes.summary,
      typicalConcentrationText: evidenceNotes.typicalConcentrationText,
      evidenceGrade: evidenceNotes.evidenceGrade,
      needsClinicianReview: evidenceNotes.needsClinicianReview,
    })
    .from(evidenceNotes)
    .innerJoin(actives, eq(actives.id, evidenceNotes.activeId))
    .where(and(inArray(evidenceNotes.activeId, activeIds), eq(evidenceNotes.concernId, concernId)))
    .all();
}

export function getAffiliateLinksForProduct(productId: string) {
  return db.select().from(affiliateLinks).where(eq(affiliateLinks.productId, productId)).all();
}

// Real cached YouTube results (see db/fetch-youtube-videos.ts) — empty for
// almost every product until that script has been run with a real API key.
export function getVideoLinksForProduct(productId: string) {
  return db.select().from(videoLinks).where(eq(videoLinks.productId, productId)).all();
}

// Plain substring search, not FTS5 — at ~16k rows a LIKE scan is still fast
// enough for this catalog size, and it avoids standing up a virtual table
// + keeping it in sync with every reseed. Revisit if the catalog grows an
// order of magnitude or search feels slow in practice.
const SEARCH_LIMIT = 40;

export function searchProducts(
  q: string,
  filters: { concernId?: string; dataSources?: string[]; freeFromIds?: string[] } = {},
) {
  const needle = `%${q}%`;
  // Also matches activeIngredientText (the raw FDA/manufacturer ingredient
  // list) -- without this, searching "niacinamide" found the active-
  // ingredient badge but zero products, since most product names don't
  // literally contain the ingredient name. Caught by testing the search
  // page with a real ingredient query before considering this done.
  const clauses = [
    sql`(${products.brandName} LIKE ${needle} OR ${products.manufacturer} LIKE ${needle} OR ${products.activeIngredientText} LIKE ${needle})`,
    ...freeFromWhereClauses(filters.freeFromIds ?? []),
  ];
  if (filters.concernId) clauses.push(eq(products.concernId, filters.concernId));
  if (filters.dataSources && filters.dataSources.length > 0) clauses.push(inArray(products.dataSource, filters.dataSources));

  return db
    .select()
    .from(products)
    .where(and(...clauses))
    .limit(SEARCH_LIMIT)
    .all();
}

export function searchActives(q: string) {
  const needle = `%${q}%`;
  return db.select().from(actives).where(sql`${actives.canonicalName} LIKE ${needle}`).all();
}

// "Top" here means "verified-tier first, then a rotating sample" — there's
// no real popularity or quality signal yet (Derm Score / Audience Score are
// still empty for every product, see lib/scoring.ts), so this deliberately
// does NOT claim to be a quality ranking. The UI must caption it honestly.
// RANDOM() within each tier gives a rotating showcase rather than the same
// 8 products forever, cheap enough at this catalog size.
export function getTopProducts(limit = 8) {
  return db
    .select()
    .from(products)
    .orderBy(
      sql`CASE ${products.dataSource} WHEN 'brand_direct' THEN 0 WHEN 'openfda' THEN 1 WHEN 'dailymed' THEN 2 ELSE 3 END`,
      sql`RANDOM()`,
    )
    .limit(limit)
    .all();
}

// Real signal, not a proxy like getTopProducts: which actives actually
// appear on the most catalog products. json_each explodes the activeIds
// JSON array column so this can be one query instead of N.
export function getTopActives(limit = 8) {
  return db.all<{ activeId: string; canonicalName: string; productCount: number }>(sql`
    SELECT a.id as activeId, a.canonical_name as canonicalName, COUNT(*) as productCount
    FROM products p, json_each(p.active_ids) je
    JOIN actives a ON a.id = je.value
    GROUP BY a.id
    ORDER BY productCount DESC
    LIMIT ${limit}
  `);
}
