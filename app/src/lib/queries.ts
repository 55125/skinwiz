import { and, eq, inArray, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db/client";
import {
  concerns,
  products,
  actives,
  evidenceNotes,
  affiliateLinks,
  videoLinks,
  activeChemData,
  ewgScores,
  ingredients,
  productIngredients,
} from "@/db/schema";
import { concernIdToNiche } from "@/db/actives";
import { getFreeFromCheck } from "@/db/ingredient-flags";
import { allergenBlockers, resolveAllergenId } from "@/db/contact-allergens";

// Shared by getProductsForConcern and searchProducts -- one membership
// check per selected free-from id, ANDed together, so a product must satisfy every
// checked filter (e.g. "fragrance-free" AND "paraben-free"), not just one.
// freeFromFlags is null for unassessed products (see ingredient-flags.ts),
// so those simply never match any filter here -- they're not silently
// treated as passing.
// Contact allergen ids (db/contact-allergens.ts) take the inverse route: the
// product must have been assessed and contain none of the allergen's
// blockers -- its group members, plus an undisclosed fragrance when one of
// them is a fragrance allergen.
function freeFromWhereClauses(freeFromIds: string[]): SQL[] {
  return freeFromIds.map((id) => {
    const allergenId = getFreeFromCheck(id) ? undefined : resolveAllergenId(id);
    if (!allergenId) return jsonArrayContains(products.freeFromFlags, id);
    const blockers = allergenBlockers(allergenId);
    return sql`(${products.allergenHits} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM json_each(${products.allergenHits}) WHERE json_each.value IN (${sql.join(
      blockers.map((b) => sql`${b}`),
      sql`, `,
    )})))`;
  });
}

/** How many assessed products list each contact allergen. */
export function getAllergenProductCounts(): Map<string, number> {
  const rows = db.all<{ id: string; n: number }>(sql`
    SELECT json_each.value AS id, COUNT(*) AS n FROM products, json_each(products.allergen_hits) GROUP BY json_each.value
  `);
  return new Map(rows.map((r) => [r.id, r.n]));
}

/** Products free of an allergen or group, counted per concern. */
export function getFreeOfAllergenByConcern(id: string): { id: string; name: string; n: number }[] {
  return db.all<{ id: string; name: string; n: number }>(sql`
    SELECT c.id AS id, c.name AS name, COUNT(*) AS n
    FROM products JOIN concerns c ON c.id = products.concern_id
    WHERE ${and(...freeFromWhereClauses([id]))}
    GROUP BY c.id ORDER BY n DESC
  `);
}

export function getAssessedProductCount(): number {
  return db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM products WHERE allergen_hits IS NOT NULL`)!.n;
}

// Exact membership test on a JSON-array text column, so URL-supplied ids
// can't act as LIKE wildcards. json_each(NULL) yields no rows, which keeps
// unassessed products out of every filter.
function jsonArrayContains(column: SQLWrapper, value: string): SQL {
  return sql`EXISTS (SELECT 1 FROM json_each(${column}) WHERE json_each.value = ${value})`;
}

function likeContains(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
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
    .where(jsonArrayContains(actives.categories, niche))
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
    clauses.push(jsonArrayContains(products.activeIds, activeId));
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
export type BrowseFilters = { concernId?: string; dataSources?: string[]; activeId?: string; freeFromIds?: string[] };

export function browseWhere(filters: BrowseFilters): SQL | undefined {
  const clauses = [...freeFromWhereClauses(filters.freeFromIds ?? [])];
  if (filters.concernId) clauses.push(eq(products.concernId, filters.concernId));
  if (filters.dataSources && filters.dataSources.length > 0) clauses.push(inArray(products.dataSource, filters.dataSources));
  if (filters.activeId) clauses.push(jsonArrayContains(products.activeIds, filters.activeId));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

export function browseProducts(filters: BrowseFilters, page: number, sort?: "name") {
  const offset = (page - 1) * PAGE_SIZE;
  const whereClause = browseWhere(filters);

  const q = db.select().from(products).where(whereClause);
  const rows = (sort === "name" ? q.orderBy(products.brandName) : q).limit(PAGE_SIZE).offset(offset).all();
  const [{ count }] = db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause).all();

  return { rows, total: count, pageSize: PAGE_SIZE, page };
}

// Sorting by profile match needs a score per product, so this scores every
// assessed (full-ingredient-list) product in the filtered set, then pages
// the sorted result. Unassessed products have no score and are left out --
// the caller says so rather than ranking them as if they were middling.
export function browseProductsByMatch(
  filters: BrowseFilters,
  page: number,
  score: (rows: (typeof products.$inferSelect)[]) => Map<string, number>,
) {
  const base = browseWhere(filters);
  const whereClause = base ? and(base, sql`${products.freeFromFlags} IS NOT NULL`) : sql`${products.freeFromFlags} IS NOT NULL`;
  const all = db.select().from(products).where(whereClause).limit(20000).all();
  const scores = score(all);
  const ranked = all
    .filter((p) => scores.has(p.id))
    .sort((a, b) => scores.get(b.id)! - scores.get(a.id)! || a.brandName.localeCompare(b.brandName));
  return { rows: ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: ranked.length, pageSize: PAGE_SIZE, page };
}

// Top actives across the WHOLE catalog (no concern scoping) -- the browse
// page's sidebar active-ingredient filter needs this since it isn't
// anchored to one concern the way /concern/[slug]'s chips are.
export function getAllActives() {
  return db.select().from(actives).orderBy(actives.canonicalName).all();
}

export function countProducts(): number {
  return db.select({ count: sql<number>`count(*)` }).from(products).get()!.count;
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

export type EwgScore = typeof ewgScores.$inferSelect;

export function getEwgScoresForProducts(productIds: string[]): Map<string, EwgScore> {
  if (productIds.length === 0) return new Map();
  const rows = db.select().from(ewgScores).where(inArray(ewgScores.productId, productIds)).all();
  return new Map(rows.map((r) => [r.productId, r]));
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
  const needle = likeContains(q);
  // Also matches activeIngredientText (the raw FDA/manufacturer ingredient
  // list) -- without this, searching "niacinamide" found the active-
  // ingredient badge but zero products, since most product names don't
  // literally contain the ingredient name. Caught by testing the search
  // page with a real ingredient query before considering this done.
  const clauses = [
    sql`(${products.brandName} LIKE ${needle} ESCAPE '\\' OR ${products.manufacturer} LIKE ${needle} ESCAPE '\\' OR ${products.activeIngredientText} LIKE ${needle} ESCAPE '\\')`,
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
  return db
    .select()
    .from(actives)
    .where(sql`${actives.canonicalName} LIKE ${likeContains(q)} ESCAPE '\\'`)
    .all();
}

// Autocomplete: matches product/brand names only (not ingredient text, which
// makes every suggestion for "water" a wall of unrelated products). Name
// prefix hits rank first, then verified-tier sources, then shorter names.
// Over-fetches then dedupes on name because a variant (travel vs. full size)
// or a re-listed product would otherwise fill the dropdown with lookalikes.
export function suggestProducts(q: string, limit = 6) {
  const needle = likeContains(q);
  const prefix = `${needle.slice(1)}`; // drops the leading % -> "q%"
  const rows = db
    .select({
      id: products.id,
      brandName: products.brandName,
      manufacturer: products.manufacturer,
      dataSource: products.dataSource,
    })
    .from(products)
    .where(sql`(${products.brandName} LIKE ${needle} ESCAPE '\\' OR ${products.manufacturer} LIKE ${needle} ESCAPE '\\')`)
    .orderBy(
      sql`CASE WHEN ${products.brandName} LIKE ${prefix} ESCAPE '\\' THEN 0 WHEN ${products.manufacturer} LIKE ${prefix} ESCAPE '\\' THEN 1 ELSE 2 END`,
      sql`CASE ${products.dataSource} WHEN 'brand_direct' THEN 0 WHEN 'openfda' THEN 1 WHEN 'dailymed' THEN 2 ELSE 3 END`,
      sql`LENGTH(${products.brandName})`,
    )
    .limit(limit * 6)
    .all();
  const seen = new Set<string>();
  const out: typeof rows = [];
  for (const r of rows) {
    const key = `${r.brandName.toLowerCase()}|${(r.manufacturer ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length === limit) break;
  }
  return out;
}

// Ingredients with a single product are mostly typos and one-off label
// junk (see db/ingredient-parse.ts), so they stay out of suggestions.
export function suggestIngredients(q: string, limit = 4) {
  const needle = likeContains(q);
  return db
    .select({ id: ingredients.id, name: ingredients.name, productCount: ingredients.productCount })
    .from(ingredients)
    .where(sql`${ingredients.name} LIKE ${needle} ESCAPE '\\' AND ${ingredients.productCount} >= ${MIN_PUBLIC_PRODUCTS}`)
    .orderBy(
      sql`CASE WHEN ${ingredients.name} LIKE ${needle.slice(1)} ESCAPE '\\' THEN 0 ELSE 1 END`,
      sql`CASE WHEN ${ingredients.id} IN (SELECT id FROM actives) THEN 0 ELSE 1 END`,
      sql`${ingredients.productCount} DESC`,
    )
    .limit(limit)
    .all();
}

// "Top" here means "verified-tier first, then a rotating sample" — there's
// no real popularity or quality signal yet (Derm Score / User Score are
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

// ---------------------------------------------------------------------------
// Ingredient pages (/ingredient/[slug], /ingredients) -- see
// db/ingredient-parse.ts for how names are normalized into these rows.
// ---------------------------------------------------------------------------

// Below this many products an ingredient page still resolves (every
// ingredient on a product page is a link) but is left out of the index,
// suggestions and sitemap, and marked noindex.
export const MIN_PUBLIC_PRODUCTS = 2;
export const INGREDIENT_PAGE_SIZE = 24;

export type Ingredient = typeof ingredients.$inferSelect;

export function getIngredient(id: string): Ingredient | undefined {
  return db.select().from(ingredients).where(eq(ingredients.id, id)).get();
}

export function getIngredientsForProduct(productId: string) {
  return db
    .select({
      position: productIngredients.position,
      ingredientId: productIngredients.ingredientId,
      rawName: productIngredients.rawName,
      isActive: productIngredients.isActive,
      productCount: ingredients.productCount,
    })
    .from(productIngredients)
    .innerJoin(ingredients, eq(ingredients.id, productIngredients.ingredientId))
    .where(eq(productIngredients.productId, productId))
    .orderBy(productIngredients.position)
    .all();
}

// Products containing an ingredient: where it is a labelled active first,
// then higher-trust sources, then earlier in the list (INCI order is
// roughly descending concentration, so an earlier slot is a real signal
// for cosmetic sources).
export function getProductsForIngredient(id: string, page: number, concernId?: string) {
  const offset = (page - 1) * INGREDIENT_PAGE_SIZE;
  const membership = sql`${products.id} IN (SELECT product_id FROM product_ingredients WHERE ingredient_id = ${id})`;
  const where = concernId ? and(membership, eq(products.concernId, concernId)) : membership;
  const rows = db
    .select({ product: products, position: productIngredients.position, isActive: productIngredients.isActive })
    .from(productIngredients)
    .innerJoin(products, eq(products.id, productIngredients.productId))
    .where(and(eq(productIngredients.ingredientId, id), concernId ? eq(products.concernId, concernId) : undefined))
    .orderBy(
      sql`${productIngredients.isActive} DESC`,
      sql`CASE ${products.dataSource} WHEN 'brand_direct' THEN 0 WHEN 'openfda' THEN 1 WHEN 'dailymed' THEN 2 ELSE 3 END`,
      sql`CASE WHEN ${productIngredients.position} > 0 THEN ${productIngredients.position} ELSE 0 END`,
      products.brandName,
    )
    .limit(INGREDIENT_PAGE_SIZE)
    .offset(offset)
    .all();
  const [{ count }] = db.select({ count: sql<number>`count(*)` }).from(products).where(where).all();
  return { rows, total: count, pageSize: INGREDIENT_PAGE_SIZE };
}

export function getIngredientConcernCounts(id: string) {
  return db.all<{ concernId: string; name: string; count: number }>(sql`
    SELECT c.id AS concernId, c.name AS name, COUNT(*) AS count
    FROM product_ingredients pi
    JOIN products p ON p.id = pi.product_id
    JOIN concerns c ON c.id = p.concern_id
    WHERE pi.ingredient_id = ${id}
    GROUP BY c.id
    ORDER BY count DESC
  `);
}

export function getIngredientStats(id: string) {
  // Position statistics only mean something for cosmetic INCI lists, where
  // order follows concentration; drug-label inactive lists don't guarantee it.
  const s = db.get<{
    products: number;
    brands: number;
    asActive: number;
    inciLists: number;
    topFive: number;
    avgPosition: number | null;
    bySource: string;
  }>(sql`
    SELECT
      COUNT(*) AS products,
      COUNT(DISTINCT LOWER(COALESCE(p.manufacturer, ''))) AS brands,
      SUM(pi.is_active) AS asActive,
      SUM(CASE WHEN p.data_source IN ('open_beauty_facts','brand_direct') THEN 1 ELSE 0 END) AS inciLists,
      SUM(CASE WHEN p.data_source IN ('open_beauty_facts','brand_direct') AND pi.position BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS topFive,
      AVG(CASE WHEN p.data_source IN ('open_beauty_facts','brand_direct') THEN pi.position END) AS avgPosition,
      '' AS bySource
    FROM product_ingredients pi
    JOIN products p ON p.id = pi.product_id
    WHERE pi.ingredient_id = ${id}
  `)!;
  return s;
}

export function getIngredientTopBrands(id: string, limit = 8) {
  return db.all<{ manufacturer: string; count: number }>(sql`
    SELECT p.manufacturer AS manufacturer, COUNT(*) AS count
    FROM product_ingredients pi
    JOIN products p ON p.id = pi.product_id
    WHERE pi.ingredient_id = ${id} AND p.manufacturer IS NOT NULL AND p.manufacturer != ''
    GROUP BY LOWER(p.manufacturer)
    ORDER BY count DESC, p.manufacturer
    LIMIT ${limit}
  `);
}

// Parsed label strengths for a tracked active (FDA rows only -- cosmetic
// sources never disclose concentrations).
export function getActiveStrengthStats(activeId: string) {
  const expr = strengthExpr(activeId);
  return db.get<{ n: number; min: number | null; max: number | null }>(sql`
    SELECT COUNT(${expr}) AS n, MIN(${expr}) AS min, MAX(${expr}) AS max FROM products
  `)!;
}

export function getEvidenceNotesForActive(activeId: string) {
  return db
    .select({
      concernId: evidenceNotes.concernId,
      concernName: concerns.name,
      summary: evidenceNotes.summary,
      typicalConcentrationText: evidenceNotes.typicalConcentrationText,
      evidenceGrade: evidenceNotes.evidenceGrade,
      needsClinicianReview: evidenceNotes.needsClinicianReview,
    })
    .from(evidenceNotes)
    .innerJoin(concerns, eq(concerns.id, evidenceNotes.concernId))
    .where(eq(evidenceNotes.activeId, activeId))
    .all();
}

export function getActive(id: string) {
  return db.select().from(actives).where(eq(actives.id, id)).get();
}

export function getActiveChemData(activeId: string) {
  return db.select().from(activeChemData).where(eq(activeChemData.activeId, activeId)).get();
}

// Mean of EWG's own per-product scores over the products we carry that
// contain this ingredient. A product-level figure, not an ingredient score:
// EWG rates whole formulas, and most catalog products have no EWG row.
export function getIngredientEwgSummary(id: string) {
  return db.get<{ n: number; avg: number | null; min: number | null; max: number | null }>(sql`
    SELECT COUNT(*) AS n, AVG(e.ewg_score) AS avg, MIN(e.ewg_score) AS min, MAX(e.ewg_score) AS max
    FROM product_ingredients pi
    JOIN ewg_scores e ON e.product_id = pi.product_id
    WHERE pi.ingredient_id = ${id}
  `)!;
}

// Index page: one letter (or digits) at a time, most-used first.
export function listIngredients(letter: string, page: number, pageSize = 120) {
  const where =
    letter === "0-9"
      ? sql`${ingredients.name} GLOB '[0-9]*'`
      : sql`UPPER(SUBSTR(${ingredients.name}, 1, 1)) = ${letter}`;
  const clause = and(where, sql`${ingredients.productCount} >= ${MIN_PUBLIC_PRODUCTS}`);
  const rows = db
    .select()
    .from(ingredients)
    .where(clause)
    .orderBy(sql`${ingredients.name} COLLATE NOCASE`)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();
  const [{ count }] = db.select({ count: sql<number>`count(*)` }).from(ingredients).where(clause).all();
  return { rows, total: count, pageSize };
}

export function getIngredientLetters(): string[] {
  return db
    .all<{ l: string }>(sql`
      SELECT DISTINCT CASE WHEN name GLOB '[0-9]*' THEN '0-9' ELSE UPPER(SUBSTR(name, 1, 1)) END AS l
      FROM ingredients WHERE product_count >= ${MIN_PUBLIC_PRODUCTS}
    `)
    .map((r) => r.l)
    .filter((l) => l === "0-9" || /^[A-Z]$/.test(l))
    .sort((a, b) => (a === "0-9" ? -1 : b === "0-9" ? 1 : a.localeCompare(b)));
}

export function getPopularIngredients(limit = 12) {
  return db
    .select()
    .from(ingredients)
    .where(sql`${ingredients.productCount} >= ${MIN_PUBLIC_PRODUCTS}`)
    .orderBy(sql`${ingredients.productCount} DESC`)
    .limit(limit)
    .all();
}

export function getPublicIngredientIds(): { id: string }[] {
  return db
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(sql`${ingredients.productCount} >= ${MIN_PUBLIC_PRODUCTS}`)
    .all();
}

// The FDA lists one product under several codes (usually pack sizes), which
// makes identical pages. Listings with the same name, labeler, form and
// strength collapse to the lowest id: that page is the canonical URL and the
// only one in the sitemap. Same SQL as canonicalProductIds() below.
export function getCanonicalProductId(p: typeof products.$inferSelect): string {
  const row = db.get<{ id: string }>(sql`
    SELECT min(id) AS id FROM products
    WHERE brand_name = ${p.brandName}
      AND manufacturer IS ${p.manufacturer}
      AND dosage_form IS ${p.dosageForm}
      AND strength_key IS ${p.strengthKey}`);
  return row?.id ?? p.id;
}

export function canonicalProductIds(): string[] {
  return db
    .all<{ id: string }>(sql`SELECT min(id) AS id FROM products GROUP BY brand_name, manufacturer, dosage_form, strength_key`)
    .map((r) => r.id);
}
