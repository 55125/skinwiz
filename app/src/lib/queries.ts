import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { concerns, products, actives, evidenceNotes, affiliateLinks, videoLinks } from "@/db/schema";
import { concernIdToNiche } from "@/db/actives";

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
