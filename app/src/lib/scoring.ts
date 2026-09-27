import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dermRatings, audienceOutcomes } from "@/db/schema";

// project.md §5: "Minimum rater count (e.g. 5+) before a score displays
// publicly; show the rater count." Same logic applies to the audience side
// so a single early adopter's outcome can't masquerade as a score.
export const MIN_DERM_RATERS = 5;
export const MIN_AUDIENCE_OUTCOMES = 10;

export type ScoreResult =
  | { status: "scored"; score: number; count: number }
  | { status: "pending"; count: number; needed: number };

export function getDermScore(productId: string, concernId: string): ScoreResult {
  const rows = db
    .select({ score: dermRatings.score })
    .from(dermRatings)
    .where(and(eq(dermRatings.productId, productId), eq(dermRatings.concernId, concernId)))
    .all();

  if (rows.length < MIN_DERM_RATERS) {
    return { status: "pending", count: rows.length, needed: MIN_DERM_RATERS - rows.length };
  }
  const avg = rows.reduce((sum, r) => sum + r.score, 0) / rows.length;
  return { status: "scored", score: Math.round(avg), count: rows.length };
}

export function getAudienceScore(productId: string, concernId: string): ScoreResult {
  const rows = db
    .select({ improved: audienceOutcomes.improved })
    .from(audienceOutcomes)
    .where(and(eq(audienceOutcomes.productId, productId), eq(audienceOutcomes.concernId, concernId)))
    .all();

  if (rows.length < MIN_AUDIENCE_OUTCOMES) {
    return { status: "pending", count: rows.length, needed: MIN_AUDIENCE_OUTCOMES - rows.length };
  }
  const improvedCount = rows.filter((r) => r.improved).length;
  const pct = Math.round((improvedCount / rows.length) * 100);
  return { status: "scored", score: pct, count: rows.length };
}

export function scoreColorClass(score: number): string {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
