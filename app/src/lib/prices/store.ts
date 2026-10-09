// Reads and writes for live price quotes. Every read returns nothing while
// live prices are disabled (config.ts), skips quotes older than 72h, and
// only ever returns OTC products (is_rx = 0) -- so a stored row can't reach
// a page by accident. Non-affiliate quotes are shown only from direct
// retailer sources (Kroger), whose links are plain product pages.
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { priceChecks, priceQuotes, productBarcodes, products, productViews } from "@/db/schema";
import { inProductGroup, productGroupsFor } from "@/lib/canonical";
import {
  ERROR_RETRY_MS,
  livePricesEnabled,
  MISS_RETRY_MAX_MS,
  MISS_RETRY_MS,
  PRICE_DISPLAY_MAX_AGE_MS,
  PRICE_STALE_MS,
} from "./config";
import type { LookupProduct, LookupResult, PriceQuote, PriceSourceId } from "./types";
import type { PackageSize } from "@/lib/equivalence";

type Row = typeof priceQuotes.$inferSelect;

function fromRow(r: Row): PriceQuote {
  const pack =
    r.packAmount != null && r.packAmount > 0 && (r.packUnit === "g" || r.packUnit === "mL" || r.packUnit === "count")
      ? ({ amount: r.packAmount, unit: r.packUnit } as PackageSize)
      : null;
  return {
    productId: r.productId,
    source: r.source as PriceSourceId,
    merchantId: r.merchantId,
    merchantName: r.merchantName,
    price: r.price,
    retailPrice: r.retailPrice,
    currency: r.currency,
    url: r.url,
    affiliatable: r.affiliatable,
    matchType: r.matchType as PriceQuote["matchType"],
    matchConfidence: r.matchConfidence,
    offerName: r.offerName,
    pack,
    fetchedAt: r.fetchedAt,
    availability: r.availability === "in_stock" || r.availability === "low" || r.availability === "out_of_stock" ? r.availability : null,
    location: r.location,
  };
}

/** Sources whose quotes are plain retailer links, shown without an affiliate program. */
export const DIRECT_SOURCES: PriceSourceId[] = ["kroger"];

const displayable = (cutoff: string) =>
  and(
    sql`${priceQuotes.fetchedAt} >= ${cutoff}`,
    or(eq(priceQuotes.affiliatable, true), inArray(priceQuotes.source, DIRECT_SOURCES)),
    eq(priceQuotes.currency, "USD"),
    sql`${priceQuotes.price} > 0`,
    sql`${priceQuotes.productId} IN (SELECT id FROM products WHERE is_rx = 0)`,
  );

/** Fresh quotes for one product, cheapest first. Empty while disabled. */
export function getDisplayQuotes(productId: string, now = new Date()): PriceQuote[] {
  if (!livePricesEnabled()) return [];
  const cutoff = new Date(now.getTime() - PRICE_DISPLAY_MAX_AGE_MS).toISOString();
  // The product's merged duplicates (lib/canonical.ts) are the same product:
  // their quotes count too, the cheapest per merchant.
  const seen = new Set<string>();
  return db
    .select()
    .from(priceQuotes)
    .where(and(inProductGroup(priceQuotes.productId, productId), displayable(cutoff)))
    .orderBy(priceQuotes.price, priceQuotes.merchantName)
    .all()
    .filter((r) => !seen.has(r.merchantId) && !!seen.add(r.merchantId))
    .map(fromRow);
}

/** Every fresh quote for many products (cheapest first per product). Empty while disabled. */
export function getDisplayQuotesFor(productIds: string[], now = new Date()): PriceQuote[] {
  if (productIds.length === 0 || !livePricesEnabled()) return [];
  const cutoff = new Date(now.getTime() - PRICE_DISPLAY_MAX_AGE_MS).toISOString();
  const out: PriceQuote[] = [];
  for (let i = 0; i < productIds.length; i += 500) {
    out.push(
      ...db
        .select()
        .from(priceQuotes)
        .where(and(inArray(priceQuotes.productId, productIds.slice(i, i + 500)), displayable(cutoff)))
        .orderBy(priceQuotes.price)
        .all()
        .map(fromRow),
    );
  }
  return out.sort((a, b) => a.price - b.price);
}

/** Product ids with a fresh displayable quote that isn't out of stock. Empty while disabled. */
export function inStockQuoteProductIds(now = new Date()): string[] {
  if (!livePricesEnabled()) return [];
  const cutoff = new Date(now.getTime() - PRICE_DISPLAY_MAX_AGE_MS).toISOString();
  return db
    .selectDistinct({ productId: priceQuotes.productId })
    .from(priceQuotes)
    .where(and(displayable(cutoff), sql`coalesce(${priceQuotes.availability}, '') <> 'out_of_stock'`))
    .all()
    .map((r) => r.productId);
}

/** The cheapest fresh quote per product. */
export function getBestQuotes(productIds: string[], now = new Date()): Map<string, PriceQuote> {
  const best = new Map<string, PriceQuote>();
  for (const q of getDisplayQuotesFor(productIds, now)) if (!best.has(q.productId)) best.set(q.productId, q);
  return best;
}

/** Replace a product's quotes from one source with a fresh lookup, and book the next check. */
export function saveLookup(productId: string, source: PriceSourceId, result: LookupResult, now: Date): void {
  const at = now.toISOString();
  const prev = db
    .select({ misses: priceChecks.misses })
    .from(priceChecks)
    .where(and(eq(priceChecks.productId, productId), eq(priceChecks.source, source)))
    .get();
  const misses = result.status === "miss" ? (prev?.misses ?? 0) + 1 : 0;
  const wait = result.status !== "miss" ? PRICE_STALE_MS : Math.min(MISS_RETRY_MAX_MS, MISS_RETRY_MS * 2 ** (misses - 1));
  const found = result.status === "matched" || result.status === "listed";
  db.transaction((tx) => {
    tx.delete(priceQuotes).where(and(eq(priceQuotes.productId, productId), eq(priceQuotes.source, source))).run();
    for (const q of result.quotes) {
      tx.insert(priceQuotes)
        .values({
          productId,
          source,
          merchantId: q.merchantId,
          merchantName: q.merchantName,
          price: q.price,
          retailPrice: q.retailPrice,
          currency: q.currency,
          url: q.url,
          affiliatable: q.affiliatable,
          matchType: q.matchType,
          matchConfidence: q.matchConfidence,
          offerName: q.offerName,
          packAmount: q.pack?.amount ?? null,
          packUnit: q.pack?.unit ?? null,
          fetchedAt: q.fetchedAt,
          availability: q.availability ?? null,
          location: q.location ?? null,
        })
        .onConflictDoNothing()
        .run();
    }
    upsertCheck(tx, productId, source, at, result.status, misses, new Date(now.getTime() + wait).toISOString(), found ? at : undefined);
  });
}

/** A transient failure for one product: keep its quotes, retry in an hour. */
export function saveLookupError(productId: string, source: PriceSourceId, now: Date): void {
  const prev = db
    .select({ misses: priceChecks.misses })
    .from(priceChecks)
    .where(and(eq(priceChecks.productId, productId), eq(priceChecks.source, source)))
    .get();
  upsertCheck(db, productId, source, now.toISOString(), "error", prev?.misses ?? 0, new Date(now.getTime() + ERROR_RETRY_MS).toISOString());
}

function upsertCheck(
  tx: Pick<typeof db, "insert">,
  productId: string,
  source: string,
  checkedAt: string,
  status: string,
  misses: number,
  nextCheckAt: string,
  lastMatchedAt?: string,
) {
  // lastMatchedAt only ever moves forward: a miss or an error keeps it.
  const matched = lastMatchedAt ? { lastMatchedAt } : {};
  tx.insert(priceChecks)
    .values({ productId, source, checkedAt, status, misses, nextCheckAt, ...matched })
    .onConflictDoUpdate({ target: [priceChecks.productId, priceChecks.source], set: { checkedAt, status, misses, nextCheckAt, ...matched } })
    .run();
}

// At most one write per product per hour per process; nothing at all while
// disabled. Called from the product page, so it must never throw.
const VIEW_WRITE_MS = 3_600_000;
const lastViewWrite = new Map<string, number>();

export function recordProductView(productId: string, now = new Date()): void {
  if (!livePricesEnabled()) return;
  const t = now.getTime();
  if (t - (lastViewWrite.get(productId) ?? 0) < VIEW_WRITE_MS) return;
  if (lastViewWrite.size > 50_000) lastViewWrite.clear();
  lastViewWrite.set(productId, t);
  try {
    const at = now.toISOString();
    db.insert(productViews)
      .values({ productId, lastViewedAt: at })
      .onConflictDoUpdate({ target: productViews.productId, set: { lastViewedAt: at } })
      .run();
  } catch {
    // A busy database must not break the page.
  }
}

/** What the sources need for each product (OTC only), in the order given. */
export function loadLookupProducts(ids: string[]): LookupProduct[] {
  if (ids.length === 0) return [];
  const rows = db
    .select({
      id: products.id,
      brandName: products.brandName,
      manufacturer: products.manufacturer,
      dosageForm: products.dosageForm,
      dataSource: products.dataSource,
      sourceUrl: products.sourceUrl,
      packageDescription: products.packageDescription,
      strengths: products.strengths,
    })
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.isRx, false)))
    .all();
  // A product's merged duplicates' barcodes are its aliases (lib/canonical.ts).
  const groups = productGroupsFor(ids);
  const ownerOf = new Map<string, string>();
  for (const [c, members] of groups) for (const m of members) if (!ownerOf.has(m)) ownerOf.set(m, c);
  const codes = db
    .select()
    .from(productBarcodes)
    .where(inArray(productBarcodes.productId, [...ownerOf.keys()]))
    .orderBy(productBarcodes.rank, productBarcodes.productId)
    .all();
  const byProduct = new Map<string, { barcode: string; source: string }[]>();
  for (const c of codes) {
    const owner = ownerOf.get(c.productId)!;
    const list = byProduct.get(owner) ?? byProduct.set(owner, []).get(owner)!;
    if (!list.some((x) => x.barcode === c.barcode)) list.push({ barcode: c.barcode, source: c.source });
  }
  const byId = new Map(rows.map((r) => [r.id, { ...r, barcodes: byProduct.get(r.id) ?? [] }]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}
