import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { productAvailability } from "@/db/schema";
import { productOrigin } from "@/lib/origin";
import { inStockQuoteProductIds } from "@/lib/prices/store";
import {
  classifyAvailability,
  popularityScore,
  POPULAR_MIN_SCORE,
  POPULAR_WINDOW_DAYS,
  type Availability,
  type DiscontinuedReason,
  type Shelf,
} from "@/lib/availability-rules";

// lib/availability-rules.ts applied to every listed product, from one pass
// over the catalog, price lookups, retailer links, admin overrides and the
// site's own statistics. Kept in memory as JSON id lists that search binds
// as single parameters (the same approach as lib/origin.ts). Prices refresh
// once a day and the catalog only on a reseed, so 10 minutes is plenty. An
// admin override rebuilds it on the next read: the index remembers the
// overrides table's state, which is cheap to check (route handlers and pages
// can hold separate copies of this module, so an in-memory reset alone
// wouldn't reach the page).
const TTL_MS = 10 * 60_000;
/** A price source counts only while it is still finding products (see the retail rule). */
const SOURCE_HEALTHY_MS = 7 * 86_400_000;

type Index = {
  at: number;
  overridesStamp: string;
  byId: Map<string, Availability>;
  importJson: string;
  discontinuedJson: string;
  inStockJson: string;
  popularJson: string;
};

let cached: Index | null = null;

export function resetAvailabilityIndex(): void {
  cached = null;
}

function overridesStamp(): string {
  const r = db.get<{ n: number; last: string | null }>(sql`SELECT COUNT(*) AS n, MAX(updated_at) AS last FROM product_availability`);
  return `${r?.n ?? 0}|${r?.last ?? ""}`;
}

function build(now: Date, stamp: string): Index {
  const rows = db.all<{ id: string; brandName: string; manufacturer: string | null; dataSource: string; labelDate: string | null }>(sql`
    SELECT p.id, p.brand_name AS brandName, p.manufacturer, p.data_source AS dataSource, l.effective_time AS labelDate
    FROM products p LEFT JOIN label_sections l ON l.spl_set_id = p.spl_set_id
    WHERE p.is_rx = 0 AND p.canonical_id IS NULL
  `);
  // Merged duplicates (lib/canonical.ts) are the same product: their data
  // sources, offers and lookups count for the canonical.
  const canonicalOf = new Map<string, string>();
  const sources = new Map<string, string[]>();
  for (const r of db.all<{ id: string; c: string; dataSource: string }>(sql`
    SELECT id, canonical_id AS c, data_source AS dataSource FROM products WHERE canonical_id IS NOT NULL AND is_rx = 0
  `)) {
    canonicalOf.set(r.id, r.c);
    (sources.get(r.c) ?? sources.set(r.c, []).get(r.c)!).push(r.dataSource);
  }
  const canon = (id: string) => canonicalOf.get(id) ?? id;

  const offers = new Set<string>([
    ...inStockQuoteProductIds(now),
    ...db.all<{ id: string }>(sql`SELECT DISTINCT product_id AS id FROM affiliate_links WHERE is_demo = 0`).map((r) => r.id),
    ...db.all<{ id: string }>(sql`SELECT DISTINCT product_id AS id FROM manual_affiliate_links`).map((r) => r.id),
  ].map(canon));

  const checks = db.all<{ productId: string; source: string; status: string; lastMatchedAt: string | null }>(sql`
    SELECT product_id AS productId, source, status, last_matched_at AS lastMatchedAt FROM price_checks
  `);
  const healthyCutoff = new Date(now.getTime() - SOURCE_HEALTHY_MS).toISOString();
  const healthy = new Set(
    db
      .all<{ source: string }>(sql`SELECT source FROM price_checks GROUP BY source HAVING MAX(last_matched_at) >= ${healthyCutoff}`)
      .map((r) => r.source),
  );
  const carried = new Set<string>();
  const lastMatched = new Map<string, string>();
  for (const c of checks) {
    const id = canon(c.productId);
    if (c.status === "matched" || c.status === "listed") carried.add(id);
    if (healthy.has(c.source) && c.lastMatchedAt && c.lastMatchedAt > (lastMatched.get(id) ?? "")) lastMatched.set(id, c.lastMatchedAt);
  }

  const overrides = new Map(db.select().from(productAvailability).all().map((o) => [o.productId, o]));

  const byId = new Map<string, Availability>();
  const imports: string[] = [];
  const discontinued: string[] = [];
  const inStock: string[] = [];
  for (const r of rows) {
    const o = overrides.get(r.id);
    const a = classifyAvailability(
      {
        dataSources: [r.dataSource, ...(sources.get(r.id) ?? [])],
        origin: productOrigin(r),
        labelDate: r.labelDate,
        usOffer: offers.has(r.id),
        carriedNow: carried.has(r.id),
        lastMatchedAt: lastMatched.get(r.id) ?? null,
        override: o?.status === "discontinued" || o?.status === "available" ? o.status : null,
        overrideNote: o?.note,
      },
      now,
    );
    byId.set(r.id, a);
    if (a.shelf === "import") imports.push(r.id);
    if (a.shelf === "discontinued") discontinued.push(r.id);
    if (a.inStock) inStock.push(r.id);
  }

  return {
    at: now.getTime(),
    overridesStamp: stamp,
    byId,
    importJson: JSON.stringify(imports),
    discontinuedJson: JSON.stringify(discontinued),
    inStockJson: JSON.stringify(inStock),
    popularJson: JSON.stringify(popularIds(now, canon)),
  };
}

// Product page visits (one per visitor per day) and retailer clicks from
// product pages, over the last POPULAR_WINDOW_DAYS. analytics_events holds
// no personal data (schema.ts), and visitors who opted out aren't in it.
function popularIds(now: Date, canon: (id: string) => string): string[] {
  const since = new Date(now.getTime() - POPULAR_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const score = new Map<string, { views: number; clicks: number }>();
  const entry = (id: string) => score.get(id) ?? score.set(id, { views: 0, clicks: 0 }).get(id)!;
  for (const r of db.all<{ path: string; n: number }>(sql`
    SELECT path, COUNT(DISTINCT visitor || day) AS n FROM analytics_events
    WHERE kind = 'pageview' AND day >= ${since} AND path LIKE '/product/%' GROUP BY path
  `)) {
    let id: string;
    try {
      id = decodeURIComponent(r.path.slice("/product/".length).split("/")[0]);
    } catch {
      continue;
    }
    if (id) entry(canon(id)).views += r.n;
  }
  for (const r of db.all<{ id: string; n: number }>(sql`
    SELECT product_id AS id, COUNT(*) AS n FROM analytics_events
    WHERE kind = 'outbound' AND day >= ${since} AND product_id IS NOT NULL GROUP BY product_id
  `)) {
    entry(canon(r.id)).clicks += r.n;
  }
  return [...score].filter(([, s]) => popularityScore(s.views, s.clicks) >= POPULAR_MIN_SCORE).map(([id]) => id);
}

function index(now = new Date()): Index {
  const stamp = overridesStamp();
  if (cached && cached.overridesStamp === stamp && now.getTime() - cached.at < TTL_MS && now.getTime() >= cached.at) return cached;
  cached = build(now, stamp);
  return cached;
}

/** A listed product's availability (a canonical id; anything else reads as plain "us"). */
export function availabilityOf(productId: string): Availability {
  return index().byId.get(productId) ?? { shelf: "us", inStock: false, discontinued: null };
}

export function shelfOf(productId: string): Shelf {
  return availabilityOf(productId).shelf;
}

/** JSON arrays of ids for SQL: id IN (SELECT value FROM json_each(?)). */
export function importIdsJson(): string {
  return index().importJson;
}
export function discontinuedIdsJson(): string {
  return index().discontinuedJson;
}
export function inStockIdsJson(): string {
  return index().inStockJson;
}
export function popularIdsJson(): string {
  return index().popularJson;
}

/** Counts for /admin. */
export function availabilitySummary(): { inStock: number; imports: number; discontinued: Record<DiscontinuedReason["kind"], number> } {
  const out = { inStock: 0, imports: 0, discontinued: { manual: 0, retail: 0, label: 0 } };
  for (const a of index().byId.values()) {
    if (a.inStock) out.inStock++;
    if (a.shelf === "import") out.imports++;
    if (a.discontinued) out.discontinued[a.discontinued.kind]++;
  }
  return out;
}
