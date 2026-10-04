import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { audienceOutcomes } from "@/db/schema";
import { canonicalIdsOf, inProductGroup, productGroupsFor } from "@/lib/canonical";

export type OutcomeInput = { improved: boolean; weeksUsed: number | null };

// Outcome rows keep the product id they were logged under; a merged
// duplicate (lib/canonical.ts) is the same product, so reads and the upsert
// below match the product's whole group.

export function getSessionOutcome(productId: string, concernId: string, sessionId: string): OutcomeInput | null {
  const row = db
    .select({ improved: audienceOutcomes.improved, weeksUsed: audienceOutcomes.weeksUsed })
    .from(audienceOutcomes)
    .where(
      and(
        inProductGroup(audienceOutcomes.productId, productId),
        eq(audienceOutcomes.concernId, concernId),
        eq(audienceOutcomes.sessionId, sessionId),
      ),
    )
    .orderBy(audienceOutcomes.id)
    .all()
    .at(-1);
  return row ? { improved: row.improved, weeksUsed: row.weeksUsed } : null;
}

// Upsert on the (product, concern, session) unique index -- a visitor who
// answers again replaces their earlier answer, the same way changing a
// routine vote works, so one person can never count twice toward the score.
// An earlier answer saved under a merged duplicate's id is the one replaced.
export function logOutcome(productId: string, concernId: string, sessionId: string, input: OutcomeInput) {
  const existing = db
    .select({ id: audienceOutcomes.id })
    .from(audienceOutcomes)
    .where(
      and(
        inProductGroup(audienceOutcomes.productId, productId),
        eq(audienceOutcomes.concernId, concernId),
        eq(audienceOutcomes.sessionId, sessionId),
      ),
    )
    .get();
  if (existing) {
    db.update(audienceOutcomes).set({ improved: input.improved, weeksUsed: input.weeksUsed }).where(eq(audienceOutcomes.id, existing.id)).run();
    return;
  }
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
  return new Set(getSessionOutcomes(sessionId, items).keys());
}

// This visitor's own answers for these products (for each product's own
// concern) -- the shelf uses it to point anyone who said "didn't help" to the
// "When OTC isn't enough" guidance for that concern. Keyed by the ids asked
// about, whichever group member the answer was saved under.
export function getSessionOutcomes(sessionId: string, items: { productId: string; concernId: string }[]): Map<string, OutcomeInput> {
  if (items.length === 0) return new Map();
  const canonical = canonicalIdsOf(items.map((i) => i.productId));
  const groups = productGroupsFor([...new Set(canonical.values())]);
  const ownerOf = new Map<string, string>();
  for (const [c, ids] of groups) for (const id of ids) ownerOf.set(id, c);
  const rows = db
    .select({ productId: audienceOutcomes.productId, concernId: audienceOutcomes.concernId, improved: audienceOutcomes.improved, weeksUsed: audienceOutcomes.weeksUsed })
    .from(audienceOutcomes)
    .where(and(eq(audienceOutcomes.sessionId, sessionId), inArray(audienceOutcomes.productId, [...ownerOf.keys()])))
    .orderBy(audienceOutcomes.id)
    .all();
  const answers = new Map<string, OutcomeInput>();
  for (const r of rows) answers.set(`${ownerOf.get(r.productId)}\u0000${r.concernId}`, { improved: r.improved, weeksUsed: r.weeksUsed });
  const out = new Map<string, OutcomeInput>();
  for (const i of items) {
    const a = answers.get(`${canonical.get(i.productId)}\u0000${i.concernId}`);
    if (a) out.set(i.productId, a);
  }
  return out;
}
