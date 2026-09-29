import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { concerns, products, actives, evidenceNotes, affiliateLinks, videoLinks, activeChemData, ewgScores } from "@/db/schema";
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

// json_extract path for one active's parsed strength; the id goes in as a
// bound parameter (inside the path string), never spliced into SQL.
function strengthExpr(activeId: string): SQL {
  return sql`json_extract(${products.strengths}, ${'$."' + activeId + '"'})`;
}

export function getProductsForConcern(
  concernId: string,
  page: number,
  activeId?: string,
  freeFromIds: string[] = [],
  strengthPct?: number,
) {
  const offset = (page - 1) * PAGE_SIZE;
  const clauses = [eq(products.concernId, concernId), ...freeFromWhereClauses(freeFromIds)];
  if (activeId) {
    clauses.push(sql`${products.activeIds} LIKE ${"%\"" + activeId + "\"%"}`);
    if (strengthPct !== undefined) clauses.push(sql`${strengthExpr(activeId)} = ${strengthPct}`);
  }
  const whereClause = and(...clauses);

  const rows = db.select().from(products).where(whereClause).limit(PAGE_SIZE).offset(offset).all();
  const [{ count }] = db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause).all();

  return { rows, total: count, pageSize: PAGE_SIZE, page };
}

// The general catalog browser (/browse) -- every filter here is optional,
// unlike getProductsForConcern where concernId is required. Same query
// shape otherwise (paginated rows + a real COUNT(*), not a capped length).
export function browseProducts(
  filters: { concernId?: string; dataSources?: string[]; activeId?: string; freeFromIds?: string[] },
  page: number,
) {
  const offset = (page - 1) * PAGE_SIZE;
  const clauses = [...freeFromWhereClauses(filters.freeFromIds ?? [])];
  if (filters.concernId) clauses.push(eq(products.concernId, filters.concernId));
  if (filters.dataSources && filters.dataSources.length > 0) clauses.push(inArray(products.dataSource, filters.dataSources));
  if (filters.activeId) clauses.push(sql`${products.activeIds} LIKE ${"%\"" + filters.activeId + "\"%"}`);
  const whereClause = clauses.length > 0 ? and(...clauses) : undefined;

  const rows = db.select().from(products).where(whereClause).limit(PAGE_SIZE).offset(offset).all();
  const [{ count }] = db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause).all();

  return { rows, total: count, pageSize: PAGE_SIZE, page };
}

// Top actives across the WHOLE catalog (no concern scoping) -- the browse
// page's sidebar active-ingredient filter needs this since it isn't
// anchored to one concern the way /concern/[slug]'s chips are.
export function getAllActives() {
  return db.select().from(actives).orderBy(actives.canonicalName).all();
}

export function getProduct(id: string) {
  return db.select().from(products).where(eq(products.id, id)).get();
}

// Distinct parsed strengths one active appears at within a concern, for the
// strength chips on /concern/[slug]. Only rows with a parsed value count --
// cosmetic and unparsed rows aren't "0%", they're unknown.
export function getStrengthOptionsForActive(concernId: string, activeId: string): { pct: number; count: number }[] {
  const expr = strengthExpr(activeId);
  return db
    .select({ pct: sql<number>`${expr}`, count: sql<number>`count(*)` })
    .from(products)
    .where(and(eq(products.concernId, concernId), sql`${expr} IS NOT NULL`))
    .groupBy(expr)
    .orderBy(expr)
    .all();
}

// "Same actives at the same strengths, same form" -- the store-brand /
// generic-equivalent list. Exact-key equality (see schema.ts strengthKey),
// so only rows whose every active has a parsed strength can match. Other
// manufacturers first: the point is finding an alternative, not the same
// brand's other package sizes.
export function getEquivalentProducts(product: typeof products.$inferSelect, limit = 8) {
  if (!product.strengthKey) return { rows: [], total: 0 };
  const clauses = [eq(products.strengthKey, product.strengthKey), sql`${products.id} != ${product.id}`];
  if (product.dosageForm) clauses.push(eq(products.dosageForm, product.dosageForm));
  const whereClause = and(...clauses);
  const sameMaker = sql`CASE WHEN ${products.manufacturer} = ${product.manufacturer ?? ""} THEN 1 ELSE 0 END`;
  const rows = db.select().from(products).where(whereClause).orderBy(sameMaker, products.brandName).limit(limit).all();
  const [{ count }] = db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause).all();
  return { rows, total: count };
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
      // Purely structural reference data (compound id/formula), not
      // editorial text -- see db/enrich-pubchem.ts for why this doesn't
      // need the same clinician-review gate evidenceGrade does, and why
      // it's null for botanicals/polymers rather than a guess.
      pubchemCid: activeChemData.pubchemCid,
      molecularFormula: activeChemData.molecularFormula,
    })
    .from(evidenceNotes)
    .innerJoin(actives, eq(actives.id, evidenceNotes.activeId))
    .leftJoin(activeChemData, eq(activeChemData.activeId, evidenceNotes.activeId))
    .where(and(inArray(evidenceNotes.activeId, activeIds), eq(evidenceNotes.concernId, concernId)))
    .all();
}

// EWG Skin Deep's own hazard score, keyed 1:1 by productId (unlike
// activeChemData, which is per-active) -- see db/enrich-ewg.ts. Missing
// row means unmatched/unassessed, not a guessed score.
export function getEwgScoreForProduct(productId: string) {
  return db.select().from(ewgScores).where(eq(ewgScores.productId, productId)).get();
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

function buildSearchWhere(q: string, filters: { concernId?: string; dataSources?: string[]; freeFromIds?: string[] }) {
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
  return and(...clauses);
}

export function searchProducts(
  q: string,
  filters: { concernId?: string; dataSources?: string[]; freeFromIds?: string[] } = {},
) {
  return db
    .select()
    .from(products)
    .where(buildSearchWhere(q, filters))
    .limit(SEARCH_LIMIT)
    .all();
}

// Separate COUNT(*) query, same reason getProductsForConcern has one --
// searchProducts is capped at SEARCH_LIMIT, so productResults.length can
// never tell a user whether a filter actually narrowed anything (it reads
// "40" whether 40 or 4,000 products match). Real bug: the search page
// never had this, so a filter chip visibly doing nothing to the count made
// filtering look broken even when the underlying query was correct.
export function searchProductsCount(
  q: string,
  filters: { concernId?: string; dataSources?: string[]; freeFromIds?: string[] } = {},
) {
  const [{ count }] = db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(buildSearchWhere(q, filters))
    .all();
  return count;
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
