// Read access to the prescription rows (products.isRx) -- the only module
// besides queries.ts getRxProduct that selects them. Callers: the flag-gated
// /rx reference pages and the clinician handout builder. Nothing here is
// reachable from a consumer listing, search or the sitemap.
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { products, rxLabelSections } from "@/db/schema";

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

/** "Tretinoin 0.025% cream" -- generic + strength + vehicle, the way a prescriber writes it. */
export function rxDisplayName(p: Pick<RxProduct, "genericName" | "strengthText" | "dosageForm" | "brandName">): string {
  const generic = p.genericName?.trim() || p.brandName;
  const strengths = (p.strengthText ?? "")
    .split(";")
    .map((s) => s.trim().match(/(\d[\d.]*\s*(?:%|mg|mcg|ug|g)(?![a-z]).*)$/i)?.[1] ?? "")
    .filter(Boolean);
  const form = (p.dosageForm ?? "").toLowerCase().replace(/^aerosol, /, "").replace(/, augmented$/, " (augmented)");
  const words = [generic, strengths.join(" / "), form].filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
