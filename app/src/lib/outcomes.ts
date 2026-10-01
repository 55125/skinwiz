import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { audienceOutcomes } from "@/db/schema";

export type OutcomeInput = { improved: boolean; weeksUsed: number | null };

export function getSessionOutcome(productId: string, concernId: string, sessionId: string): OutcomeInput | null {
  const row = db
    .select({ improved: audienceOutcomes.improved, weeksUsed: audienceOutcomes.weeksUsed })
    .from(audienceOutcomes)
    .where(
      and(
        eq(audienceOutcomes.productId, productId),
        eq(audienceOutcomes.concernId, concernId),
        eq(audienceOutcomes.sessionId, sessionId),
      ),
    )
    .get();
  return row ? { improved: row.improved, weeksUsed: row.weeksUsed } : null;
}

// Upsert on the (product, concern, session) unique index -- a visitor who
// answers again replaces their earlier answer, the same way changing a
// routine vote works, so one person can never count twice toward the score.
export function logOutcome(productId: string, concernId: string, sessionId: string, input: OutcomeInput) {
  db.insert(audienceOutcomes)
    .values({ productId, concernId, sessionId, improved: input.improved, weeksUsed: input.weeksUsed })
    .onConflictDoUpdate({
      target: [audienceOutcomes.productId, audienceOutcomes.concernId, audienceOutcomes.sessionId],
      set: { improved: input.improved, weeksUsed: input.weeksUsed },
    })
    .run();
}

// Which of these products this visitor has already logged an outcome for
// (for each product's own concern), in one query -- the shelf page uses it
// to ask only about the ones still unanswered.
export function getLoggedProductIds(sessionId: string, items: { productId: string; concernId: string }[]): Set<string> {
  if (items.length === 0) return new Set();
  const rows = db
    .select({ productId: audienceOutcomes.productId, concernId: audienceOutcomes.concernId })
    .from(audienceOutcomes)
    .where(
      and(
        eq(audienceOutcomes.sessionId, sessionId),
        inArray(audienceOutcomes.productId, items.map((i) => i.productId)),
      ),
    )
    .all();
  const wanted = new Set(items.map((i) => `${i.productId}\u0000${i.concernId}`));
  return new Set(rows.filter((r) => wanted.has(`${r.productId}\u0000${r.concernId}`)).map((r) => r.productId));
}
