// Longitudinal outcome check-ins: scheduling (from shelf changes), sending
// (from the cron job) and recording answers (from one-tap email links).
// The pure rules live in checkin-schedule.ts.
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { checkins, concerns, outcomeObservations, people, products, shelfItems } from "@/db/schema";
import { iso, type Person } from "@/lib/identity";
import { logOutcome } from "@/lib/outcomes";
import { sendEmail, SEND_SPACING_MS } from "@/lib/email";
import { checkinEmail } from "@/lib/email-templates";
import { checkinAnswerUrl, settingsUrl, unsubscribeUrl } from "@/lib/email-links";
import {
  checkinDueDates,
  FALLBACK_SCORED_WEEKS,
  planDue,
  SCORED_WEEKS,
  scoreFromAnswer,
  type CheckinAnswer,
} from "@/lib/checkin-schedule";

const MAX_ATTEMPTS = 5;
const STALE_CLAIM_MS = 60 * 60_000;

function personByHome(homeSessionId: string): Person | null {
  return db.select().from(people).where(eq(people.homeSessionId, homeSessionId)).get() ?? null;
}

/**
 * Creates the 2/4/8/12-week series for one product. A series that was
 * cancelled (product removed, then opened again) restarts from the new
 * start date; an active or finished series is left alone.
 */
export function scheduleCheckins(personId: string, productId: string, concernId: string, start: Date, now: Date) {
  for (const { weeks, dueAt } of checkinDueDates(start)) {
    db.run(sql`INSERT INTO checkins (person_id, product_id, concern_id, weeks, started_at, due_at, status, attempts, created_at)
      VALUES (${personId}, ${productId}, ${concernId}, ${weeks}, ${iso(start)}, ${iso(dueAt)}, 'scheduled', 0, ${iso(now)})
      ON CONFLICT (person_id, product_id, weeks) DO UPDATE SET
        status = 'scheduled', started_at = excluded.started_at, due_at = excluded.due_at,
        concern_id = excluded.concern_id, attempts = 0, claimed_at = NULL, sent_at = NULL
      WHERE checkins.status = 'cancelled'`);
  }
}

export function cancelPendingCheckins(personId: string, productId: string) {
  db.update(checkins)
    .set({ status: "cancelled" })
    .where(and(eq(checkins.personId, personId), eq(checkins.productId, productId), eq(checkins.status, "scheduled")))
    .run();
}

type ShelfState = { status: string; opened: boolean } | undefined;

/**
 * Hook for the shelf API. "Started" means status own + opened (the "In use"
 * toggle on the product page): the transition into that state starts a
 * series. Moving it back to unopened, to the wishlist, or off the shelf
 * cancels what hasn't been sent. "Finished it" keeps the series -- someone
 * who used a product up still knows whether it worked.
 */
export function onShelfChange(sessionId: string, productId: string, concernId: string, prev: ShelfState, next: ShelfState, now: Date) {
  const person = personByHome(sessionId);
  if (!person) return;
  const wasInUse = prev?.status === "own" && prev.opened;
  const inUse = next?.status === "own" && next.opened;
  if (inUse && !wasInUse) {
    if (person.checkinsEnabled) scheduleCheckins(person.id, productId, concernId, now, now);
  } else if (!inUse && next?.status !== "empty") {
    cancelPendingCheckins(person.id, productId);
  }
}

// Shelf timestamps are SQLite current_timestamp style ("YYYY-MM-DD HH:MM:SS", UTC).
function parseShelfTime(s: string): Date | null {
  const d = new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * On sign-in or when check-ins are switched on: start series for products
 * already in use. The start date is when the shelf row last changed (in
 * practice when it was marked opened), never later than now.
 */
export function scheduleForOpenedShelf(person: Person, now: Date): number {
  if (!person.checkinsEnabled) return 0;
  const rows = db
    .select({ productId: shelfItems.productId, updatedAt: shelfItems.updatedAt, concernId: products.concernId })
    .from(shelfItems)
    .innerJoin(products, eq(products.id, shelfItems.productId))
    .where(and(eq(shelfItems.sessionId, person.homeSessionId), eq(shelfItems.status, "own"), eq(shelfItems.opened, true)))
    .all();
  const existing = new Set(
    db.select({ productId: checkins.productId }).from(checkins).where(eq(checkins.personId, person.id)).all().map((r) => r.productId),
  );
  let n = 0;
  for (const r of rows) {
    if (existing.has(r.productId)) continue;
    const t = parseShelfTime(r.updatedAt);
    const start = t && t.getTime() < now.getTime() ? t : now;
    scheduleCheckins(person.id, r.productId, r.concernId, start, now);
    n++;
  }
  return n;
}

export type CheckinRunResult = { emailsSent: number; checkinsSent: number; skipped: number; expired: number; cancelled: number; failed: number; deferred: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sendDueCheckins(now: Date, opts: { maxEmails?: number; spacingMs?: number } = {}): Promise<CheckinRunResult> {
  const maxEmails = opts.maxEmails ?? 100;
  const spacingMs = opts.spacingMs ?? SEND_SPACING_MS;
  const result: CheckinRunResult = { emailsSent: 0, checkinsSent: 0, skipped: 0, expired: 0, cancelled: 0, failed: 0, deferred: 0 };

  // A run that died mid-send leaves rows "sending"; retry them. The provider
  // idempotency key stops a duplicate if the first attempt actually went out.
  db.update(checkins)
    .set({ status: "scheduled" })
    .where(and(eq(checkins.status, "sending"), lte(checkins.claimedAt, iso(new Date(now.getTime() - STALE_CLAIM_MS)))))
    .run();

  const due = db
    .select({ id: checkins.id, personId: checkins.personId, productId: checkins.productId, weeks: checkins.weeks, dueAt: checkins.dueAt })
    .from(checkins)
    .innerJoin(people, eq(people.id, checkins.personId))
    .where(and(eq(checkins.status, "scheduled"), lte(checkins.dueAt, iso(now)), eq(people.checkinsEnabled, true)))
    .all();
  const plan = planDue(due, now);
  if (plan.skip.length) db.update(checkins).set({ status: "skipped" }).where(inArray(checkins.id, plan.skip)).run();
  if (plan.expire.length) db.update(checkins).set({ status: "expired" }).where(inArray(checkins.id, plan.expire)).run();
  result.skipped = plan.skip.length;
  result.expired = plan.expire.length;

  const byPerson = new Map<string, number[]>();
  for (const r of plan.send) byPerson.set(r.personId, [...(byPerson.get(r.personId) ?? []), r.id]);

  for (const [personId, ids] of byPerson) {
    if (result.emailsSent + result.failed >= maxEmails) {
      result.deferred += ids.length;
      continue;
    }
    const person = db.select().from(people).where(eq(people.id, personId)).get();
    if (!person) continue;
    // Claim: only rows still "scheduled" move, so overlapping runs can't both send.
    const claimed = db
      .update(checkins)
      .set({ status: "sending", claimedAt: iso(now), attempts: sql`${checkins.attempts} + 1` })
      .where(and(inArray(checkins.id, ids), eq(checkins.status, "scheduled")))
      .returning()
      .all();
    if (!claimed.length) continue;

    // Still on the shelf (in use or finished)? Otherwise drop it quietly.
    const onShelf = new Set(
      db
        .select({ productId: shelfItems.productId })
        .from(shelfItems)
        .where(and(eq(shelfItems.sessionId, person.homeSessionId), inArray(shelfItems.status, ["own", "empty"])))
        .all()
        .map((r) => r.productId),
    );
    const info = new Map(
      db
        .select({ id: products.id, brandName: products.brandName, concernName: concerns.name })
        .from(products)
        .innerJoin(concerns, eq(concerns.id, products.concernId))
        .where(inArray(products.id, claimed.map((c) => c.productId)))
        .all()
        .map((p) => [p.id, p]),
    );
    const sendable = claimed.filter((c) => onShelf.has(c.productId) && info.has(c.productId));
    const dropped = claimed.filter((c) => !sendable.includes(c)).map((c) => c.id);
    if (dropped.length) {
      db.update(checkins).set({ status: "cancelled" }).where(inArray(checkins.id, dropped)).run();
      result.cancelled += dropped.length;
    }
    if (!sendable.length) continue;

    const fmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
    const email = checkinEmail(
      sendable.map((c) => ({
        brandName: info.get(c.productId)!.brandName,
        concernName: info.get(c.productId)!.concernName,
        weeks: c.weeks,
        startedOn: fmt.format(new Date(c.startedAt)),
        answerUrl: (a) => checkinAnswerUrl(c.id, a, now),
      })),
      unsubscribeUrl(person.id, "checkins", now),
      settingsUrl(),
    );
    const sendIds = sendable.map((c) => c.id);
    const res = await sendEmail({
      to: person.email,
      ...email,
      category: "checkins",
      unsubscribeUrl: unsubscribeUrl(person.id, "checkins", now),
      idempotencyKey: `checkins-${sendIds.join("-")}`,
    });
    if (res.ok) {
      db.update(checkins).set({ status: "sent", sentAt: iso(now) }).where(inArray(checkins.id, sendIds)).run();
      result.emailsSent++;
      result.checkinsSent += sendIds.length;
    } else {
      console.error(`[checkins] send to person ${person.id} failed: ${res.error}`);
      const giveUp = !res.retryable || sendable.every((c) => c.attempts >= MAX_ATTEMPTS);
      db.update(checkins).set({ status: giveUp ? "failed" : "scheduled" }).where(inArray(checkins.id, sendIds)).run();
      result.failed++;
    }
    if (spacingMs) await sleep(spacingMs);
  }
  return result;
}

export function getCheckin(id: number) {
  return (
    db
      .select({ checkin: checkins, brandName: products.brandName, concernName: concerns.name })
      .from(checkins)
      .leftJoin(products, eq(products.id, checkins.productId))
      .leftJoin(concerns, eq(concerns.id, checkins.concernId))
      .where(eq(checkins.id, id))
      .get() ?? null
  );
}

export function getObservationForCheckin(checkinId: number) {
  return db.select().from(outcomeObservations).where(eq(outcomeObservations.checkinId, checkinId)).get() ?? null;
}

/**
 * Records (or corrects) the answer to one check-in, then feeds the 8-week
 * answer into audience_outcomes -- see scoreFromAnswer in checkin-schedule.ts
 * for the rule. Returns false if the check-in no longer exists (e.g. the
 * person deleted their data).
 */
export function recordCheckinAnswer(checkinId: number, answer: CheckinAnswer, reaction: boolean | null, now: Date): boolean {
  const row = db.select().from(checkins).where(eq(checkins.id, checkinId)).get();
  if (!row) return false;
  const person = db.select().from(people).where(eq(people.id, row.personId)).get();
  if (!person) return false;
  db.transaction((tx) => {
    tx.insert(outcomeObservations)
      .values({
        checkinId,
        personId: row.personId,
        productId: row.productId,
        concernId: row.concernId,
        weeks: row.weeks,
        answer,
        reaction,
        observedAt: iso(now),
      })
      .onConflictDoUpdate({ target: outcomeObservations.checkinId, set: { answer, reaction, observedAt: iso(now) } })
      .run();
    if (answer === "stopped") {
      tx.update(checkins)
        .set({ status: "cancelled" })
        .where(and(eq(checkins.personId, row.personId), eq(checkins.productId, row.productId), eq(checkins.status, "scheduled")))
        .run();
    }
  });

  const improved = scoreFromAnswer(answer);
  if (improved === null) return true;
  let feeds = row.weeks === SCORED_WEEKS;
  if (row.weeks === FALLBACK_SCORED_WEEKS) {
    const at8 = db
      .select({ id: outcomeObservations.id })
      .from(outcomeObservations)
      .where(
        and(
          eq(outcomeObservations.personId, row.personId),
          eq(outcomeObservations.productId, row.productId),
          eq(outcomeObservations.weeks, SCORED_WEEKS),
        ),
      )
      .get();
    feeds = !at8;
  }
  if (feeds) logOutcome(row.productId, row.concernId, person.homeSessionId, { improved, weeksUsed: row.weeks });
  return true;
}
