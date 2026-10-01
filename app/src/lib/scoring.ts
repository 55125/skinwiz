import { and, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { dermRatings, audienceOutcomes } from "@/db/schema";

// project.md §5: "Minimum rater count (e.g. 5+) before a score displays
// publicly; show the rater count." Same logic applies to the audience side
// so a single early adopter's outcome can't masquerade as a score.
export const MIN_DERM_RATERS = 5;
// The user side starts showing early to get the score off zero, but the
// report count stays hidden (UI shows "Early") until it's past
// USER_COUNT_SHOWN_ABOVE, so "80% from 3" can't read as a settled verdict.
// Pending text never shows a count either, since "2 more needed" leaks it.
export const MIN_AUDIENCE_OUTCOMES = 3;
export const USER_COUNT_SHOWN_ABOVE = 5;

export type ScoreResult =
  | { status: "scored"; score: number; count: number }
  | { status: "pending"; count: number; needed: number };

export type ProductScores = { derm: ScoreResult; audience: ScoreResult };

type ScoreKey = { productId: string; concernId: string };
const keyOf = (productId: string, concernId: string) => `${productId}\u0000${concernId}`;

function toResult(count: number, min: number, score: number | null): ScoreResult {
  if (count < min || score === null) return { status: "pending", count, needed: min - count };
  return { status: "scored", score: Math.round(score), count };
}

// One query per score type for a whole page of products. Derm scores count
// distinct raters (the unique index enforces one row per rater, this keeps
// the rule if it's ever relaxed) and ignore out-of-range scores.
export function getScoresForProducts(items: ScoreKey[]): Map<string, ProductScores> {
  const productIds = [...new Set(items.map((i) => i.productId))];
  const derm = new Map<string, { raters: number; avg: number | null }>();
  const audience = new Map<string, { n: number; improved: number }>();

  if (productIds.length > 0) {
    const dermRows = db
      .select({
        productId: dermRatings.productId,
        concernId: dermRatings.concernId,
        raters: sql<number>`count(distinct ${dermRatings.raterId})`,
        avg: sql<number | null>`avg(${dermRatings.score})`,
      })
      .from(dermRatings)
      .where(and(inArray(dermRatings.productId, productIds), sql`${dermRatings.score} between 0 and 100`))
      .groupBy(dermRatings.productId, dermRatings.concernId)
      .all();
    for (const r of dermRows) derm.set(keyOf(r.productId, r.concernId), { raters: r.raters, avg: r.avg });

    const audienceRows = db
      .select({
        productId: audienceOutcomes.productId,
        concernId: audienceOutcomes.concernId,
        n: sql<number>`count(*)`,
        improved: sql<number>`sum(${audienceOutcomes.improved})`,
      })
      .from(audienceOutcomes)
      .where(inArray(audienceOutcomes.productId, productIds))
      .groupBy(audienceOutcomes.productId, audienceOutcomes.concernId)
      .all();
    for (const r of audienceRows) audience.set(keyOf(r.productId, r.concernId), { n: r.n, improved: r.improved });
  }

  const result = new Map<string, ProductScores>();
  for (const { productId, concernId } of items) {
    const d = derm.get(keyOf(productId, concernId));
    const a = audience.get(keyOf(productId, concernId));
    result.set(productId, {
      derm: toResult(d?.raters ?? 0, MIN_DERM_RATERS, d?.avg ?? null),
      audience: toResult(a?.n ?? 0, MIN_AUDIENCE_OUTCOMES, a && a.n > 0 ? (a.improved / a.n) * 100 : null),
    });
  }
  return result;
}

// amber-700, not 600: 600 measured ~3.2:1 on white, below WCAG AA.
// Flip once the dermatologist panel is rating products. Until then an unscored
// Derm Score reads "coming soon" rather than implying raters are on the way.
export const DERM_PANEL_LAUNCHED = false;

export function scoreColorClass(score: number): string {
  if (score >= 75) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 50) return "text-amber-700 dark:text-amber-400";
  return "text-red-700 dark:text-red-400";
}
