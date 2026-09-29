import { and, eq } from "drizzle-orm";
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
