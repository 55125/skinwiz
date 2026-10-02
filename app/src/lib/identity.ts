// Optional email identity on top of the anonymous session cookie. See the
// `people` table comment in db/schema.ts for the model: a person's data lives
// under people.homeSessionId; each browser that signed in keeps its own
// sw_session cookie and person_sessions maps it to the person.
import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { emailTokens, people, personSessions } from "@/db/schema";
import { generateToken, hashToken, SIGN_IN_TTL_MS } from "@/lib/tokens";

export type Person = typeof people.$inferSelect;

export const iso = (d: Date) => d.toISOString();

// --- session resolution ---------------------------------------------------

export function personForSession(sessionId: string): Person | null {
  const row = db
    .select({ person: people })
    .from(personSessions)
    .innerJoin(people, eq(people.id, personSessions.personId))
    .where(eq(personSessions.sessionId, sessionId))
    .get();
  return row?.person ?? null;
}

/** The session id this browser's data is stored under: its person's home id once signed in. */
export function resolveSessionId(deviceSessionId: string): string {
  return personForSession(deviceSessionId)?.homeSessionId ?? deviceSessionId;
}

export function getPerson(personId: string): Person | null {
  return db.select().from(people).where(eq(people.id, personId)).get() ?? null;
}

// --- sign-in tokens -------------------------------------------------------

/** Links sent to one address in the last hour -- the per-address send limit. */
export function recentTokenCount(email: string, now: Date, windowMs = 60 * 60_000): number {
  const since = iso(new Date(now.getTime() - windowMs));
  return db
    .select({ id: emailTokens.id })
    .from(emailTokens)
    .where(and(eq(emailTokens.email, email), gt(emailTokens.createdAt, since)))
    .all().length;
}

export function createSignInToken(email: string, requestSessionId: string | null, now: Date): string {
  const token = generateToken();
  db.insert(emailTokens)
    .values({
      tokenHash: hashToken(token),
      email,
      requestSessionId,
      expiresAt: iso(new Date(now.getTime() + SIGN_IN_TTL_MS)),
      createdAt: iso(now),
    })
    .run();
  return token;
}

/** Read-only check for the confirmation page (doesn't use the token up). */
export function peekSignInToken(token: string, now: Date): { email: string } | null {
  const row = db
    .select({ email: emailTokens.email })
    .from(emailTokens)
    .where(and(eq(emailTokens.tokenHash, hashToken(token)), isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, iso(now))))
    .get();
  return row ?? null;
}

/**
 * Single use, enforced by the database: the UPDATE only matches an unused,
 * unexpired row, so two concurrent clicks can't both succeed.
 */
export function consumeSignInToken(token: string, now: Date): { email: string; requestSessionId: string | null } | null {
  const rows = db
    .update(emailTokens)
    .set({ usedAt: iso(now) })
    .where(and(eq(emailTokens.tokenHash, hashToken(token)), isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, iso(now))))
    .returning({ email: emailTokens.email, requestSessionId: emailTokens.requestSessionId })
    .all();
  return rows[0] ?? null;
}

// --- merging --------------------------------------------------------------

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Moves every session-keyed row from one session id to another. Where both
 * sides have a row for the same thing (unique index), one survives so a
 * person never counts twice: the newer shelf entry / outcome wins; for
 * regimen slots, votes and reports the destination's row is kept.
 */
export function mergeSessionInto(from: string, to: string, tx: Pick<Tx, "run"> = db) {
  if (from === to) return;
  // Newer-wins tables: drop the destination row first when the source one is newer.
  tx.run(sql`DELETE FROM shelf_items WHERE session_id = ${to} AND product_id IN (
    SELECT f.product_id FROM shelf_items f WHERE f.session_id = ${from} AND f.updated_at > shelf_items.updated_at)`);
  tx.run(sql`DELETE FROM audience_outcomes WHERE session_id = ${to} AND EXISTS (
    SELECT 1 FROM audience_outcomes f WHERE f.session_id = ${from} AND f.product_id = audience_outcomes.product_id
      AND f.concern_id = audience_outcomes.concern_id AND f.created_at > audience_outcomes.created_at)`);
  // Regimens move whole (items belong to a regimen, so they never collide);
  // if the destination already has an active regimen it stays the active one.
  tx.run(sql`UPDATE regimens SET active = 0 WHERE session_id = ${from}
    AND EXISTS (SELECT 1 FROM regimens WHERE session_id = ${to} AND active = 1)`);
  tx.run(sql`UPDATE regimens SET session_id = ${to} WHERE session_id = ${from}`);
  // A claimed clinician plan follows its owner too, so the QR keeps opening
  // it on every device the person signs in on.
  tx.run(sql`UPDATE handout_instances SET claimed_session_id = ${to} WHERE claimed_session_id = ${from}`);
  for (const table of ["shelf_items", "audience_outcomes", "regimen_items", "routine_votes", "routine_reports"]) {
    // OR IGNORE leaves conflicting rows behind under `from`; they're the losers.
    tx.run(sql`UPDATE OR IGNORE ${sql.identifier(table)} SET session_id = ${to} WHERE session_id = ${from}`);
    tx.run(sql`DELETE FROM ${sql.identifier(table)} WHERE session_id = ${from}`);
  }
  tx.run(sql`UPDATE routines SET session_id = ${to} WHERE session_id = ${from}`);
}

function aliasOf(sessionId: string, tx: Pick<Tx, "select">): string | null {
  return (
    tx.select({ personId: personSessions.personId }).from(personSessions).where(eq(personSessions.sessionId, sessionId)).get()
      ?.personId ?? null
  );
}

/**
 * Called after a sign-in token was consumed. `deviceSessionId` is the browser
 * that opened the link; `requestSessionId` the one that asked for it (the same
 * browser, or another device). Rules:
 *  - The address already belongs to a person -> sign in as them.
 *  - It doesn't, and the requesting browser was already signed in -> that
 *    person changes their email to this one.
 *  - Otherwise a new person is created.
 * Each involved browser that was anonymous has its data merged into the
 * person and is linked. A browser signed in as someone else is switched over
 * without merging (its data belongs to that other person) -- but only the
 * browser that opened the link; a requester signed in elsewhere is left alone.
 */
export function completeSignIn(input: {
  email: string;
  requestSessionId: string | null;
  deviceSessionId: string;
  now: Date;
}): { person: Person; created: boolean; emailChanged: boolean } {
  const { email, requestSessionId, deviceSessionId, now } = input;
  return db.transaction((tx) => {
    let person = tx.select().from(people).where(eq(people.email, email)).get() ?? null;
    let created = false;
    let emailChanged = false;
    const requester = requestSessionId ? aliasOf(requestSessionId, tx) : null;
    if (!person && requester) {
      tx.update(people).set({ email, emailVerifiedAt: iso(now) }).where(eq(people.id, requester)).run();
      person = tx.select().from(people).where(eq(people.id, requester)).get()!;
      emailChanged = true;
    }
    if (!person) {
      person = {
        id: randomUUID(),
        email,
        homeSessionId: randomUUID(),
        emailVerifiedAt: iso(now),
        checkinsEnabled: true,
        safetyAlertsEnabled: true,
        createdAt: iso(now),
      };
      tx.insert(people).values(person).run();
      created = true;
    }
    const sessions = [...new Set([requestSessionId, deviceSessionId].filter((s): s is string => !!s))];
    for (const sid of sessions) {
      const current = aliasOf(sid, tx);
      if (current === person.id) continue;
      if (current === null) {
        mergeSessionInto(sid, person.homeSessionId, tx);
        tx.insert(personSessions).values({ sessionId: sid, personId: person.id, linkedAt: iso(now) }).run();
      } else if (sid === deviceSessionId) {
        tx.update(personSessions).set({ personId: person.id, linkedAt: iso(now) }).where(eq(personSessions.sessionId, sid)).run();
      }
    }
    return { person, created, emailChanged };
  });
}

export function unlinkSession(deviceSessionId: string) {
  db.delete(personSessions).where(eq(personSessions.sessionId, deviceSessionId)).run();
}

export type Preferences = { checkinsEnabled?: boolean; safetyAlertsEnabled?: boolean };

export function updatePreferences(personId: string, prefs: Preferences) {
  const set: Preferences = {};
  if (typeof prefs.checkinsEnabled === "boolean") set.checkinsEnabled = prefs.checkinsEnabled;
  if (typeof prefs.safetyAlertsEnabled === "boolean") set.safetyAlertsEnabled = prefs.safetyAlertsEnabled;
  if (Object.keys(set).length) db.update(people).set(set).where(eq(people.id, personId)).run();
}

/**
 * "Delete my email and data": the person, every linked device, and every row
 * stored under their home session -- shelf, regimen, outcome reports (which
 * leave the User Score), votes, reports, routines they posted -- plus their
 * check-ins, observations, recall notices and any pending sign-in links.
 */
export function deletePersonAndData(personId: string) {
  db.transaction((tx) => {
    const person = tx.select().from(people).where(eq(people.id, personId)).get();
    if (!person) return;
    const home = person.homeSessionId;
    const mine = sql`(SELECT id FROM routines WHERE session_id = ${home})`;
    tx.run(sql`DELETE FROM routine_votes WHERE routine_id IN ${mine}`);
    tx.run(sql`DELETE FROM routine_reports WHERE routine_id IN ${mine}`);
    tx.run(sql`DELETE FROM routine_steps WHERE routine_id IN ${mine}`);
    for (const table of ["shelf_items", "regimen_items", "audience_outcomes", "routine_votes", "routine_reports", "routines"]) {
      tx.run(sql`DELETE FROM ${sql.identifier(table)} WHERE session_id = ${home}`);
    }
    tx.run(sql`DELETE FROM regimen_step_states WHERE regimen_id IN (SELECT id FROM regimens WHERE session_id = ${home})`);
    tx.run(sql`DELETE FROM regimens WHERE session_id = ${home}`);
    // Claimed printouts stay claimed (the clinic's counts don't change) but
    // belong to no one any more: the QR shows the neutral "already saved" page.
    tx.run(sql`UPDATE handout_instances SET claimed_session_id = NULL WHERE claimed_session_id = ${home}`);
    // A clinician profile is unlinked, not deleted: handouts already in
    // patients' hands keep working. (It holds only public NPPES data and clinic text.)
    tx.run(sql`UPDATE clinicians SET person_id = NULL WHERE person_id = ${personId}`);
    for (const table of ["outcome_observations", "recall_notifications", "checkins", "person_avoid_lists", "person_sessions"]) {
      tx.run(sql`DELETE FROM ${sql.identifier(table)} WHERE person_id = ${personId}`);
    }
    tx.run(sql`DELETE FROM email_tokens WHERE email = ${person.email}`);
    tx.run(sql`DELETE FROM people WHERE id = ${personId}`);
  });
}

export function purgeExpiredTokens(now: Date): number {
  const cutoff = iso(new Date(now.getTime() - 24 * 60 * 60_000));
  return db.run(sql`DELETE FROM email_tokens WHERE expires_at < ${cutoff}`).changes;
}
