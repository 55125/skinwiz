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
  manualAffiliateLinks,
  productBarcodes,
} from "@/db/schema";
import { isAllowedManualLinkUrl } from "@/lib/manual-links";
import { concernIdToNiche } from "@/db/actives";
import { getFreeFromCheck } from "@/db/ingredient-flags";
import { allergenBlockers, resolveAllergenId } from "@/db/contact-allergens";
import { hsaEligibleIdsJson } from "@/lib/otc-index";
import { displayablePrice, parsePackageDescription, unitPrice } from "@/lib/equivalence";
import { getDisplayQuotesFor } from "@/lib/prices/store";
import { compareLivePrices, type LivePrice } from "@/lib/prices/unit";
import { RX_CONCERN_ID } from "@/db/rx";
import { isDailymedImageUrl } from "@/lib/image-urls";
import { LISTED, inProductGroup } from "@/lib/canonical";

// Prescription rows (products.isRx) are reference/handout data and must never
// reach a consumer listing, search, count, score, equivalence list or the
// sitemap. Every consumer query below includes this clause (or its raw-SQL
// twin `is_rx = 0`); rx-exclusion.test.ts seeds an Rx row and checks each
// one. Rx rows are read only through getRxProduct / lib/rx-catalog.ts.
export const OTC_ONLY: SQL = sql`${products.isRx} = 0`;

// What a listing may show: OTC and not a merged duplicate (lib/canonical.ts).
// Every listing, search, count and the sitemap uses this (raw-SQL twin:
// `is_rx = 0 AND canonical_id IS NULL`); product-merges.test.ts seeds a
// duplicate and checks each one. getProduct() still finds duplicates, so
// their pages can redirect and user rows saved under them keep resolving.
export const LISTED_OTC: SQL = and(OTC_ONLY, LISTED)!;

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

// Products that are assessed (full ingredient list) and contain none of
// these ingredients, neither in the list nor as a labelled active. Used by
// the pregnancy filter; unassessed products are left out, as with every
// filter here -- "couldn't check" is never "clear".
function excludesIngredientsClause(ids: string[]): SQL {
  if (ids.length === 0) return sql`${products.freeFromFlags} IS NOT NULL`;
  const list = sql.join(ids.map((i) => sql`${i}`), sql`, `);
  return sql`(${products.freeFromFlags} IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM product_ingredients pi WHERE pi.product_id = ${products.id} AND pi.ingredient_id IN (${list}))
    AND NOT EXISTS (SELECT 1 FROM json_each(${products.activeIds}) WHERE json_each.value IN (${list})))`;
}

/** Every ingredient id in the catalog (for matching slug patterns in code). */
export function getAllIngredientIds(): string[] {
  return db.all<{ id: string }>(sql`SELECT id FROM ingredients`).map((r) => r.id);
}

/** How many assessed products list each contact allergen. */
export function getAllergenProductCounts(): Map<string, number> {
  const rows = db.all<{ id: string; n: number }>(sql`
    SELECT json_each.value AS id, COUNT(*) AS n FROM products, json_each(products.allergen_hits)
    WHERE products.is_rx = 0 AND products.canonical_id IS NULL GROUP BY json_each.value
  `);
  return new Map(rows.map((r) => [r.id, r.n]));
}

/** Products free of an allergen or group, counted per concern. */
export function getFreeOfAllergenByConcern(id: string): { id: string; name: string; n: number }[] {
  return db.all<{ id: string; name: string; n: number }>(sql`
    SELECT c.id AS id, c.name AS name, COUNT(*) AS n
    FROM products JOIN concerns c ON c.id = products.concern_id
    WHERE ${and(LISTED_OTC, ...freeFromWhereClauses([id]))}
    GROUP BY c.id ORDER BY n DESC
  `);
}

/** Products clear of every id in a list, counted per concern. */
export function getSafeProductsByConcern(ids: string[]): { id: string; name: string; n: number }[] {
  if (ids.length === 0) return [];
  return db.all<{ id: string; name: string; n: number }>(sql`
    SELECT c.id AS id, c.name AS name, COUNT(*) AS n
    FROM products JOIN concerns c ON c.id = products.concern_id
    WHERE ${and(LISTED_OTC, ...freeFromWhereClauses(ids))}
    GROUP BY c.id ORDER BY n DESC
  `);
}

export function getAssessedProductCount(): number {
  return db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM products WHERE allergen_hits IS NOT NULL AND is_rx = 0 AND canonical_id IS NULL`)!.n;
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

// The hidden "rx" concern (db/rx.ts) holds the prescription rows; it is never
// a browsable concern.
export function getConcerns() {
  return db.select().from(concerns).where(sql`${concerns.id} != ${RX_CONCERN_ID}`).all();
}

export function getConcern(id: string) {
  if (id === RX_CONCERN_ID) return undefined;
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
  excludeIngredientIds?: string[],
) {
  const offset = (page - 1) * PAGE_SIZE;
  const clauses = [LISTED_OTC, eq(products.concernId, concernId), ...freeFromWhereClauses(freeFromIds)];
  if (excludeIngredientIds) clauses.push(excludesIngredientsClause(excludeIngredientIds));
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
export type BrowseFilters = {
  concernId?: string;
  dataSources?: string[];
  activeId?: string;
  freeFromIds?: string[];
  hsaOnly?: boolean;
  excludeIngredientIds?: string[];
};

export function browseWhere(filters: BrowseFilters): SQL | undefined {
  const clauses = [LISTED_OTC, ...freeFromWhereClauses(filters.freeFromIds ?? [])];
  if (filters.excludeIngredientIds) clauses.push(excludesIngredientsClause(filters.excludeIngredientIds));
  if (filters.concernId) clauses.push(eq(products.concernId, filters.concernId));
  if (filters.dataSources && filters.dataSources.length > 0) clauses.push(inArray(products.dataSource, filters.dataSources));
  if (filters.activeId) clauses.push(jsonArrayContains(products.activeIds, filters.activeId));
  // The eligible set is computed in lib/otc-index.ts (label-text rules for
  // sunscreens), bound here as one JSON array parameter.
  if (filters.hsaOnly) clauses.push(sql`${products.id} IN (SELECT value FROM json_each(${hsaEligibleIdsJson()}))`);
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
// Scoring the whole set takes ~0.5-1s of blocking CPU on the full catalog, so
// with a cacheKey (everything the score depends on) the ranked ids are kept
// for 10 minutes: the next pages and repeat visits only fetch their 24 rows.
const rankedIdsCache = new Map<string, { at: number; ids: string[] }>();
const RANKED_TTL_MS = 10 * 60_000;
const RANKED_MAX = 100;

export function browseProductsByMatch(
  filters: BrowseFilters,
  page: number,
  score: (rows: (typeof products.$inferSelect)[]) => Map<string, number>,
  cacheKey?: string,
) {
  const hit = cacheKey ? rankedIdsCache.get(cacheKey) : undefined;
  if (hit && Date.now() - hit.at < RANKED_TTL_MS) {
    const pageIds = hit.ids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const byId = new Map(
      (pageIds.length ? db.select().from(products).where(inArray(products.id, pageIds)).all() : []).map((r) => [r.id, r]),
    );
    const rows = pageIds.flatMap((id) => byId.get(id) ?? []);
    return { rows, total: hit.ids.length, pageSize: PAGE_SIZE, page };
  }
  const base = browseWhere(filters);
  const whereClause = base ? and(base, sql`${products.freeFromFlags} IS NOT NULL`) : sql`${products.freeFromFlags} IS NOT NULL`;
  const all = db.select().from(products).where(whereClause).limit(20000).all();
  const scores = score(all);
  const ranked = all
    .filter((p) => scores.has(p.id))
    .sort((a, b) => scores.get(b.id)! - scores.get(a.id)! || a.brandName.localeCompare(b.brandName));
  if (cacheKey) {
    if (rankedIdsCache.size >= RANKED_MAX) rankedIdsCache.clear();
    rankedIdsCache.set(cacheKey, { at: Date.now(), ids: ranked.map((p) => p.id) });
  }
  return { rows: ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: ranked.length, pageSize: PAGE_SIZE, page };
}

// Top actives across the WHOLE catalog (no concern scoping) -- the browse
// page's sidebar active-ingredient filter needs this since it isn't
// anchored to one concern the way /concern/[slug]'s chips are.
export function getAllActives() {
  return db.select().from(actives).orderBy(actives.canonicalName).all();
}

export function countProducts(): number {
  return db.select({ count: sql<number>`count(*)` }).from(products).where(LISTED_OTC).get()!.count;
}

/** An OTC/cosmetic product by id -- undefined for an Rx row, so every consumer page and API refuses them. */
export function getProduct(id: string) {
  return db.select().from(products).where(and(eq(products.id, id), OTC_ONLY)).get();
}

/** A prescription row by id (the /rx pages and clinician handouts only). */
export function getRxProduct(id: string) {
  return db.select().from(products).where(and(eq(products.id, id), eq(products.isRx, true))).get();
}

/** Either kind -- only for code that then decides per product (handouts, regimen edits). */
export function getAnyProduct(id: string) {
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
    .where(and(LISTED_OTC, eq(products.concernId, concernId), sql`${expr} IS NOT NULL`))
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
  const clauses = [LISTED_OTC, eq(products.strengthKey, product.strengthKey), sql`${products.id} != ${product.id}`];
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

// Live prices only: affiliate rows are synthetic demo data until a real feed
// is wired in (schema.ts affiliateLinks), and a demo price must never read as
// a real one -- so this filters isDemo in SQL and again via displayablePrice.
// Fresh live-price quotes (lib/prices; only while enabled, never older than
// 72h) join them. Keyed by the caller's group id: the offer with the lowest
// price per unit among that group's ids (per ounce before per item), or the
// lowest price when no size is known. Per-unit uses the offer title's own
// size, else the priced listing's NDC package size. Empty while no live
// price exists, which hides every price column built on it.
export function getLivePrices(idGroups: Map<string, string[]>, now = new Date()): Map<string, LivePrice> {
  const all = [...new Set([...idGroups.values()].flat())];
  if (all.length === 0) return new Map();
  const rows = db
    .select({ productId: affiliateLinks.productId, price: affiliateLinks.price, isDemo: affiliateLinks.isDemo, buyUrl: affiliateLinks.buyUrl })
    .from(affiliateLinks)
    .where(
      and(
        inArray(affiliateLinks.productId, all),
        eq(affiliateLinks.isDemo, false),
        sql`${affiliateLinks.productId} IN (SELECT id FROM products WHERE is_rx = 0)`,
      ),
    )
    .all();
  const quotes = getDisplayQuotesFor(all, now);
  if (rows.length === 0 && quotes.length === 0) return new Map();

  const packages = getPackageDescriptions([...new Set([...rows.map((r) => r.productId), ...quotes.map((q) => q.productId)])]);
  const offers = new Map<string, LivePrice[]>();
  const add = (o: LivePrice) => (offers.get(o.productId) ?? offers.set(o.productId, []).get(o.productId)!).push(o);
  for (const r of rows) {
    const price = displayablePrice(r);
    if (price == null) continue;
    const perUnit = unitPrice(price, parsePackageDescription(packages.get(r.productId)));
    add({ price, productId: r.productId, perUnit, merchantName: null, url: r.buyUrl, fetchedAt: null });
  }
  for (const q of quotes) {
    const price = displayablePrice({ price: q.price, isDemo: false, fetchedAt: q.fetchedAt }, now);
    if (price == null) continue;
    // Only the offer's own stated size: our first NDC package can be a
    // sample (Differin's is a 2 g blister), so guessing would skew per-oz.
    const perUnit = unitPrice(price, q.pack ?? null);
    add({ price, productId: q.productId, perUnit, merchantName: q.merchantName, url: q.url, fetchedAt: q.fetchedAt });
  }

  const out = new Map<string, LivePrice>();
  for (const [key, ids] of idGroups) {
    const pick = ids.flatMap((id) => offers.get(id) ?? []).sort(compareLivePrices)[0];
    if (pick) out.set(key, pick);
  }
  return out;
}

/** products.packageDescription for each id that has one (price per ounce). */
export function getPackageDescriptions(ids: string[]): Map<string, string> {
  if (ids.length === 0) return new Map();
  const rows = db
    .select({ id: products.id, d: products.packageDescription })
    .from(products)
    .where(and(inArray(products.id, ids), OTC_ONLY))
    .all();
  return new Map(rows.filter((r) => r.d).map((r) => [r.id, r.d!]));
}

// Never for a prescription row: no buy or affiliate link on Rx, ever
// (business-plan.md §3). The seed never inserts one; this is the second lock.
// Covers the product's merged duplicates too (lib/canonical.ts): a buy link
// recorded against any listing of the product belongs on its one page.
export function getAffiliateLinksForProduct(productId: string) {
  return dedupeBy(
    db
      .select()
      .from(affiliateLinks)
      .where(and(inProductGroup(affiliateLinks.productId, productId), sql`${affiliateLinks.productId} IN (SELECT id FROM products WHERE is_rx = 0)`))
      .orderBy(affiliateLinks.id)
      .all(),
    (l) => l.buyUrl,
  );
}

function dedupeBy<T>(rows: T[], key: (r: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = key(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Affiliate rows for many products at once (OTC only, same lock as above). */
export function getAffiliateLinksForProducts(productIds: string[]) {
  if (productIds.length === 0) return [];
  return db
    .select()
    .from(affiliateLinks)
    .where(and(inArray(affiliateLinks.productId, productIds), sql`${affiliateLinks.productId} IN (SELECT id FROM products WHERE is_rx = 0)`))
    .all();
}

// Hand-made affiliate links (tools/affiliate_feeds/manual_links.csv). OTC
// only, and the host allowlist is checked again here, so neither an Rx row
// nor a non-affiliate URL can reach the page even if one got into the table.
// Also the merged duplicates' links (union, one per URL).
export function getManualLinksForProduct(productId: string) {
  return dedupeBy(
    db
      .select()
      .from(manualAffiliateLinks)
      .where(and(inProductGroup(manualAffiliateLinks.productId, productId), sql`${manualAffiliateLinks.productId} IN (SELECT id FROM products WHERE is_rx = 0)`))
      .orderBy(manualAffiliateLinks.retailer, manualAffiliateLinks.id)
      .all()
      .filter((l) => isAllowedManualLinkUrl(l.url)),
    (l) => l.url,
  );
}

// Real cached YouTube results (see db/fetch-youtube-videos.ts) — empty for
// almost every product until that script has been run with a real API key.
export function getVideoLinksForProduct(productId: string) {
  return dedupeBy(db.select().from(videoLinks).where(inProductGroup(videoLinks.productId, productId)).all(), (v) => v.videoId);
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
    LISTED_OTC,
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
    .where(and(LISTED_OTC, sql`(${products.brandName} LIKE ${needle} ESCAPE '\\' OR ${products.manufacturer} LIKE ${needle} ESCAPE '\\')`))
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
    .where(LISTED_OTC)
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
    WHERE p.is_rx = 0 AND p.canonical_id IS NULL
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
  const where = concernId ? and(LISTED_OTC, membership, eq(products.concernId, concernId)) : and(LISTED_OTC, membership);
  const rows = db
    .select({ product: products, position: productIngredients.position, isActive: productIngredients.isActive })
    .from(productIngredients)
    .innerJoin(products, eq(products.id, productIngredients.productId))
    .where(and(LISTED_OTC, eq(productIngredients.ingredientId, id), concernId ? eq(products.concernId, concernId) : undefined))
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
    WHERE pi.ingredient_id = ${id} AND p.is_rx = 0 AND p.canonical_id IS NULL
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
    WHERE pi.ingredient_id = ${id} AND p.is_rx = 0 AND p.canonical_id IS NULL
  `)!;
  return s;
}

export function getIngredientTopBrands(id: string, limit = 8) {
  return db.all<{ manufacturer: string; count: number }>(sql`
    SELECT p.manufacturer AS manufacturer, COUNT(*) AS count
    FROM product_ingredients pi
    JOIN products p ON p.id = pi.product_id
    WHERE pi.ingredient_id = ${id} AND p.is_rx = 0 AND p.canonical_id IS NULL AND p.manufacturer IS NOT NULL AND p.manufacturer != ''
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
    SELECT COUNT(${expr}) AS n, MIN(${expr}) AS min, MAX(${expr}) AS max FROM products WHERE is_rx = 0 AND canonical_id IS NULL
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
    JOIN products p ON p.id = pi.product_id
    WHERE pi.ingredient_id = ${id} AND p.canonical_id IS NULL
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

// One product, one URL: a merged duplicate's canonical is the row it was
// merged into (tools/catalog_pipeline/build_product_merges.py, which also
// folds in the old exact-match rule -- same name, labeler, form and strength
// -- after checking the ingredient lists agree). Only listed rows are in the
// sitemap.
export function getCanonicalProductId(p: typeof products.$inferSelect): string {
  return p.canonicalId ?? p.id;
}

export function canonicalProductIds(): string[] {
  return db
    .select({ id: products.id })
    .from(products)
    .where(LISTED_OTC)
    .orderBy(products.id)
    .all()
    .map((r) => r.id);
}

/** Rows merged into this product (lib/canonical.ts): its other listings, for aliases and the best image. */
export function getMergedDuplicates(id: string) {
  return db.select().from(products).where(and(eq(products.canonicalId, id), OTC_ONLY)).orderBy(products.id).all();
}

/** Retail barcodes (not the NDC-derived guesses) recorded for any of these ids. */
export function getRetailBarcodes(ids: string[]): string[] {
  if (ids.length === 0) return [];
  return db
    .selectDistinct({ barcode: productBarcodes.barcode })
    .from(productBarcodes)
    .where(and(inArray(productBarcodes.productId, ids), sql`${productBarcodes.source} != 'ndc_derived'`))
    .orderBy(productBarcodes.barcode)
    .all()
    .map((r) => r.barcode);
}

/**
 * The image a merged product's page shows: a retail photo (Open Beauty Facts
 * or the brand's site) from any of its listings before DailyMed label
 * artwork, the canonical's own first within each kind.
 */
export function bestProductImage(product: { imageUrl: string | null }, duplicates: { imageUrl: string | null }[]): string | null {
  const all = [product, ...duplicates].filter((p) => p.imageUrl);
  return (all.find((p) => !isDailymedImageUrl(p.imageUrl)) ?? all[0])?.imageUrl ?? null;
}
