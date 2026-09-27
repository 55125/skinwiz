import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { concerns, products, actives, evidenceNotes, affiliateLinks } from "@/db/schema";

export function getConcerns() {
  return db.select().from(concerns).all();
}

export function getConcern(id: string) {
  return db.select().from(concerns).where(eq(concerns.id, id)).get();
}

export function getActivesForConcern(concernId: string) {
  const category = concernId === "sun-protection" ? "sunscreen" : "acne";
  return db.select().from(actives).where(eq(actives.category, category)).all();
}

const PAGE_SIZE = 24;

export function getProductsForConcern(concernId: string, page: number, activeId?: string) {
  const offset = (page - 1) * PAGE_SIZE;
  const whereClause = activeId
    ? and(eq(products.concernId, concernId), sql`${products.activeIds} LIKE ${"%\"" + activeId + "\"%"}`)
    : eq(products.concernId, concernId);

  const rows = db.select().from(products).where(whereClause).limit(PAGE_SIZE).offset(offset).all();
  const [{ count }] = db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause).all();

  return { rows, total: count, pageSize: PAGE_SIZE, page };
}

export function getProduct(id: string) {
  return db.select().from(products).where(eq(products.id, id)).get();
}

export function getEvidenceNotesForActives(activeIds: string[]) {
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
    .where(inArray(evidenceNotes.activeId, activeIds))
    .all();
}

export function getAffiliateLinksForProduct(productId: string) {
  return db.select().from(affiliateLinks).where(eq(affiliateLinks.productId, productId)).all();
}
