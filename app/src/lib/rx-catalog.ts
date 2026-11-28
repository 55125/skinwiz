// Read access to the prescription rows (products.isRx) -- the only module
// besides queries.ts getRxProduct that selects them. Callers: the flag-gated
// /rx reference pages, the clinician handout builder, and (flag on) the
// separate "Prescription medicines" section and code lookup of /search.
// Nothing here feeds a consumer listing, filter, product grid or the sitemap.
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { parseProductCode } from "@/lib/product-codes";
import { db } from "@/db/client";
import { products, rxLabelSections, rxVehicles } from "@/db/schema";
import { rxDisplayName } from "@/lib/rx-catalog-pure";

export type RxProduct = typeof products.$inferSelect;
export type RxLabel = typeof rxLabelSections.$inferSelect;

export function getRxLabel(splSetId: string | null | undefined): RxLabel | null {
  if (!splSetId) return null;
  return db.select().from(rxLabelSections).where(eq(rxLabelSections.splSetId, splSetId)).get() ?? null;
}

const IS_RX = eq(products.isRx, true);

/** Every Rx row, grouped for the /rx index (ordered by group, generic, strength). */
export function listRxProducts(): RxProduct[] {
  return db.select().from(products).where(IS_RX).orderBy(asc(products.rxGroup), asc(products.genericName), asc(products.strengthText), asc(products.dosageForm), asc(products.brandName)).all();
}

export function countRx(): number {
  return db.select({ n: sql<number>`count(*)` }).from(products).where(IS_RX).get()!.n;
}

function likeContains(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Rx search for the handout builder. Informational-only rows (isotretinoin)
 * are never returned: no handout can include them. One row per generic +
 * strength + form + brand, so 20 ANDA labelers of the same tretinoin cream
 * don't fill the list; the brand-name listing (NDA) sorts first.
 */
export function searchRxForHandout(q: string, limit = 20): RxProduct[] {
  const needle = likeContains(q.trim());
  const rows = db
    .select()
    .from(products)
    .where(
      and(
        IS_RX,
        eq(products.informationalOnly, false),
        sql`(${products.genericName} LIKE ${needle} ESCAPE '\\' OR ${products.brandName} LIKE ${needle} ESCAPE '\\' OR ${products.strengthText} LIKE ${needle} ESCAPE '\\')`,
      ),
    )
    .orderBy(
      sql`CASE WHEN ${products.marketingCategory} = 'NDA' THEN 0 ELSE 1 END`,
      asc(products.genericName),
      asc(products.strengthText),
      asc(products.dosageForm),
    )
    .limit(limit * 8)
    .all();
  const seen = new Set<string>();
  const out: RxProduct[] = [];
  for (const r of rows) {
    const key = `${r.strengthText}|${r.dosageForm}|${r.brandName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

export { rxDisplayName };

/**
 * Prescription rows a barcode, NDC or set id names (the box's UPC carries
 * the NDC), for /search while prescription pages are on. Product NDCs only:
 * Rx rows have no stored retail barcodes.
 */
export function lookupRxByCode(q: string): RxProduct[] {
  const code = parseProductCode(q);
  if (!code) return [];
  const where = or(
    code.productNdcs.length ? inArray(products.id, code.productNdcs) : undefined,
    code.setId ? eq(sql`lower(${products.splSetId})`, code.setId) : undefined,
  );
  if (!where) return [];
  return db.select().from(products).where(and(IS_RX, where)).orderBy(asc(products.brandName)).limit(20).all();
}

/**
 * Keyword search for the "Prescription medicines" section of /search: one
 * row per generic + strength + form (the brand-name listing first), so 20
 * labelers of one tretinoin cream show once. Never mixed into product results.
 */
export function searchRxPublic(q: string, limit = 12): RxProduct[] {
  const trimmed = q.trim();
  if (trimmed.length < 3) return [];
  const needle = likeContains(trimmed);
  const esc = trimmed.replace(/[\\%_]/g, (c) => `\\${c}`);
  const rows = db
    .select()
    .from(products)
    .where(and(IS_RX, sql`(${products.genericName} LIKE ${needle} ESCAPE '\\' OR ${products.brandName} LIKE ${needle} ESCAPE '\\')`))
    // The generic itself first ("tretinoin"), then generics starting with
    // the words, then any whole-word match, then the rest ("isotretinoin").
    .orderBy(
      sql`CASE WHEN lower(${products.genericName}) = lower(${trimmed}) THEN 0
               WHEN lower(${products.genericName}) LIKE lower(${`${esc}%`}) ESCAPE '\\' THEN 1
               WHEN (' ' || lower(${products.genericName}) || ' ' || lower(${products.brandName})) LIKE lower(${`% ${esc}%`}) ESCAPE '\\' THEN 2
               ELSE 3 END`,
      sql`CASE WHEN ${products.marketingCategory} = 'NDA' THEN 0 ELSE 1 END`,
      asc(products.genericName),
      asc(products.strengthText),
      asc(products.dosageForm),
    )
    .limit(limit * 30)
    .all();
  const seen = new Set<string>();
  const out: RxProduct[] = [];
  for (const r of rows) {
    const key = rxDisplayName(r).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

export type RxVehicle = { names: string[]; allergenHits: string[] };

/** Every Rx label's inactive ingredients and vehicle allergen ids, by product id (rx_vehicles). */
export function rxVehicleMap(): Map<string, RxVehicle> {
  return new Map(
    db
      .select({ id: rxVehicles.productId, names: rxVehicles.names, hits: rxVehicles.allergenHits })
      .from(rxVehicles)
      .all()
      .map((r) => [r.id, { names: r.names ?? [], allergenHits: r.hits ?? [] }]),
  );
}
