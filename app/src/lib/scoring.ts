import { and, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { dermRatings, audienceOutcomes } from "@/db/schema";
import { canonicalIdsOf, productGroupsFor } from "@/lib/canonical";

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
// distinct raters and ignore out-of-range scores. A product's merged
// duplicates (lib/canonical.ts) are the same product, so their ratings and
// outcomes count toward it -- one vote per rater / per session across them.
export function getScoresForProducts(items: ScoreKey[]): Map<string, ProductScores> {
  const productIds = [...new Set(items.map((i) => i.productId))];
  const derm = new Map<string, { raters: Set<number>; sum: number; n: number }>();
  const audience = new Map<string, Map<string, boolean>>();

  if (productIds.length > 0) {
    const canonical = canonicalIdsOf(productIds);
    const groups = productGroupsFor([...new Set(canonical.values())]);
    const ownerOf = new Map<string, string>(); // any group member -> the canonical
    for (const [c, ids] of groups) for (const id of ids) ownerOf.set(id, c);
    const allIds = [...ownerOf.keys()];

    const dermRows = db
      .select({ productId: dermRatings.productId, concernId: dermRatings.concernId, raterId: dermRatings.raterId, score: dermRatings.score })
      .from(dermRatings)
      .where(and(inArray(dermRatings.productId, allIds), sql`${dermRatings.score} between 0 and 100`))
      .all();
    for (const r of dermRows) {
      const k = keyOf(ownerOf.get(r.productId)!, r.concernId);
      const d = derm.get(k) ?? derm.set(k, { raters: new Set(), sum: 0, n: 0 }).get(k)!;
      d.raters.add(r.raterId);
      d.sum += r.score;
      d.n++;
    }

    const audienceRows = db
      .select({ productId: audienceOutcomes.productId, concernId: audienceOutcomes.concernId, sessionId: audienceOutcomes.sessionId, improved: audienceOutcomes.improved })
      .from(audienceOutcomes)
      .where(inArray(audienceOutcomes.productId, allIds))
      .orderBy(audienceOutcomes.id)
      .all();
    for (const r of audienceRows) {
      const k = keyOf(ownerOf.get(r.productId)!, r.concernId);
      (audience.get(k) ?? audience.set(k, new Map()).get(k)!).set(r.sessionId, r.improved);
    }

    const result = new Map<string, ProductScores>();
    for (const { productId, concernId } of items) {
      const d = derm.get(keyOf(canonical.get(productId)!, concernId));
      const a = audience.get(keyOf(canonical.get(productId)!, concernId));
      const improved = a ? [...a.values()].filter(Boolean).length : 0;
      result.set(productId, {
        derm: toResult(d?.raters.size ?? 0, MIN_DERM_RATERS, d && d.n > 0 ? d.sum / d.n : null),
        audience: toResult(a?.size ?? 0, MIN_AUDIENCE_OUTCOMES, a && a.size > 0 ? (improved / a.size) * 100 : null),
      });
    }
    return result;
  }
  return new Map();
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
