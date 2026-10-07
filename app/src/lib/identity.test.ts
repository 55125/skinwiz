// Sign-in tokens, session merge, check-in scheduling/answers and deletion
// against a throwaway SQLite database: `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type Mods = {
  db: typeof import("@/db/client").db;
  identity: typeof import("./identity");
  checkins: typeof import("./checkins");
  sql: typeof import("drizzle-orm").sql;
};
let m: Mods;

const T0 = new Date("2026-01-05T10:00:00Z");
const mins = (n: number) => new Date(T0.getTime() + n * 60_000);
const WEEK = 7 * 24 * 60 * 60_000;

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-test-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  const { db } = await import("@/db/client");
  const { sql } = await import("drizzle-orm");
  m = { db, sql, identity: await import("./identity"), checkins: await import("./checkins") };
  db.run(sql`INSERT INTO concerns (id, name, description) VALUES ('acne', 'Acne', '')`);
  for (const id of ["p1", "p2", "p3"]) {
    db.run(sql`INSERT INTO products (id, concern_id, brand_name) VALUES (${id}, 'acne', ${"Product " + id})`);
  }
});

const count = (q: ReturnType<typeof import("drizzle-orm").sql>) => (m.db.get<{ n: number }>(q) as { n: number }).n;

function shelf(session: string, product: string, status: string, opened: boolean, updatedAt: string) {
  m.db.run(m.sql`INSERT INTO shelf_items (session_id, product_id, status, opened, updated_at)
    VALUES (${session}, ${product}, ${status}, ${opened ? 1 : 0}, ${updatedAt})`);
}

test("sign-in tokens are single use and expire after 15 minutes", () => {
  const { createSignInToken, consumeSignInToken, peekSignInToken } = m.identity;
  const t1 = createSignInToken("a@example.com", "dev-a", T0);
  assert.equal(count(m.sql`SELECT count(*) AS n FROM email_tokens WHERE token_hash = ${t1}`), 0, "raw token is not stored");
  assert.equal(peekSignInToken(t1, mins(1))?.email, "a@example.com");
  assert.deepEqual(consumeSignInToken(t1, mins(1)), { email: "a@example.com", requestSessionId: "dev-a" });
  assert.equal(consumeSignInToken(t1, mins(2)), null, "second use fails");
  const t2 = createSignInToken("a@example.com", "dev-a", T0);
  assert.equal(consumeSignInToken(t2, mins(15)), null, "expired at 15 minutes");
  assert.equal(consumeSignInToken("not-a-token", mins(1)), null);
  assert.equal(m.identity.recentTokenCount("a@example.com", mins(1)), 2);
});

test("signing in creates a person and moves the requesting browser's shelf under them", () => {
  shelf("dev-a", "p1", "own", true, "2026-01-01 10:00:00");
  shelf("dev-a", "p2", "want", false, "2026-01-01 10:00:00");
  const { person, created } = m.identity.completeSignIn({ email: "a@example.com", requestSessionId: "dev-a", deviceSessionId: "dev-a", now: T0 });
  assert.ok(created);
  assert.notEqual(person.homeSessionId, "dev-a", "home id is never a cookie value");
  assert.equal(m.identity.resolveSessionId("dev-a"), person.homeSessionId);
  assert.equal(count(m.sql`SELECT count(*) AS n FROM shelf_items WHERE session_id = ${person.homeSessionId}`), 2);
  assert.equal(count(m.sql`SELECT count(*) AS n FROM shelf_items WHERE session_id = 'dev-a'`), 0);
});

test("opening the link on a new device adopts the identity and merges that device's shelf (newer row wins)", () => {
  // The phone had p2 as owned+opened more recently than the laptop's "want", and its own p3.
  shelf("dev-b", "p2", "own", true, "2026-01-04 10:00:00");
  shelf("dev-b", "p3", "empty", false, "2026-01-02 10:00:00");
  m.db.run(m.sql`INSERT INTO audience_outcomes (product_id, concern_id, session_id, improved, created_at) VALUES ('p1', 'acne', 'dev-b', 1, '2026-01-03 00:00:00')`);
  const { person, created } = m.identity.completeSignIn({ email: "a@example.com", requestSessionId: "dev-b", deviceSessionId: "dev-b", now: mins(10) });
  assert.ok(!created);
  assert.equal(m.identity.resolveSessionId("dev-b"), person.homeSessionId);
  assert.equal(m.identity.resolveSessionId("dev-a"), person.homeSessionId);
  const rows = m.db.all<{ product_id: string; status: string }>(
    m.sql`SELECT product_id, status FROM shelf_items WHERE session_id = ${person.homeSessionId} ORDER BY product_id`,
  );
  assert.deepEqual(rows.map((r) => [r.product_id, r.status]), [["p1", "own"], ["p2", "own"], ["p3", "empty"]]);
  assert.equal(count(m.sql`SELECT count(*) AS n FROM audience_outcomes WHERE session_id = ${person.homeSessionId}`), 1);
  assert.equal(count(m.sql`SELECT count(*) AS n FROM shelf_items WHERE session_id = 'dev-b'`), 0);
});

test("a browser signed in as someone else switches over without merging their data", () => {
  m.identity.completeSignIn({ email: "b@example.com", requestSessionId: "dev-c", deviceSessionId: "dev-c", now: T0 });
  const b = m.identity.personForSession("dev-c")!;
  shelf(b.homeSessionId, "p3", "own", false, "2026-01-01 00:00:00");
  const { person: a } = m.identity.completeSignIn({ email: "a@example.com", requestSessionId: "dev-c", deviceSessionId: "dev-c", now: T0 });
  assert.equal(m.identity.personForSession("dev-c")?.id, a.id);
  assert.equal(count(m.sql`SELECT count(*) AS n FROM shelf_items WHERE session_id = ${b.homeSessionId}`), 1, "b's shelf untouched");
  m.identity.unlinkSession("dev-c");
  assert.equal(m.identity.resolveSessionId("dev-c"), "dev-c");
});

test("a link requested from another browser never signs that browser in", () => {
  // An attacker requests a link for someone else's address; the owner opens it.
  shelf("attacker", "p1", "own", false, "2026-01-01 00:00:00");
  const owner = m.identity.personForSession("dev-a")!;
  const { person } = m.identity.completeSignIn({ email: "a@example.com", requestSessionId: "attacker", deviceSessionId: "dev-a", now: mins(20) });
  assert.equal(person.id, owner.id);
  assert.equal(m.identity.personForSession("attacker"), null, "requesting browser stays anonymous");
  assert.equal(count(m.sql`SELECT count(*) AS n FROM shelf_items WHERE session_id = 'attacker'`), 1, "its data is not merged");
  // Nor can a signed-in requester take over a new address through it.
  const { person: c } = m.identity.completeSignIn({ email: "c@example.com", requestSessionId: "dev-a", deviceSessionId: "victim-phone", now: mins(21) });
  assert.notEqual(c.id, owner.id, "a new person, not an email change for the requester");
  assert.equal(m.identity.personForSession("dev-a")?.email, "a@example.com");
});

test("opening a product schedules 2/4/8/12-week check-ins; the job sends the due one; the 8-week answer feeds the User Score", async () => {
  const person = m.identity.personForSession("dev-a")!;
  const home = person.homeSessionId;
  m.checkins.onShelfChange(home, "p1", "acne", undefined, { status: "own", opened: true }, T0);
  assert.equal(count(m.sql`SELECT count(*) AS n FROM checkins WHERE person_id = ${person.id} AND product_id = 'p1'`), 4);

  const quiet = console.log;
  console.log = () => {};
  const early = await m.checkins.sendDueCheckins(new Date(T0.getTime() + WEEK), { spacingMs: 0 });
  const r2 = await m.checkins.sendDueCheckins(new Date(T0.getTime() + 2 * WEEK + 60_000), { spacingMs: 0 });
  const again = await m.checkins.sendDueCheckins(new Date(T0.getTime() + 2 * WEEK + 120_000), { spacingMs: 0 });
  console.log = quiet;
  assert.equal(early.checkinsSent, 0);
  assert.equal(r2.checkinsSent, 1);
  assert.equal(again.checkinsSent, 0, "idempotent");

  const eight = m.db.get<{ id: number }>(m.sql`SELECT id FROM checkins WHERE person_id = ${person.id} AND product_id = 'p1' AND weeks = 8`)!;
  assert.ok(m.checkins.recordCheckinAnswer(eight.id, "better", false, new Date(T0.getTime() + 8 * WEEK)));
  const out = m.db.get<{ improved: number; weeks_used: number }>(
    m.sql`SELECT improved, weeks_used FROM audience_outcomes WHERE session_id = ${home} AND product_id = 'p1'`,
  )!;
  assert.deepEqual([out.improved, out.weeks_used], [1, 8]);
  // Correcting the answer updates both the observation and the score input.
  m.checkins.recordCheckinAnswer(eight.id, "worse", true, new Date(T0.getTime() + 8 * WEEK + 1000));
  assert.equal(count(m.sql`SELECT count(*) AS n FROM outcome_observations WHERE checkin_id = ${eight.id}`), 1);
  assert.equal(count(m.sql`SELECT improved AS n FROM audience_outcomes WHERE session_id = ${home} AND product_id = 'p1'`), 0);

  // Taking it off the shelf cancels what hasn't been sent.
  m.checkins.onShelfChange(home, "p1", "acne", { status: "own", opened: true }, undefined, T0);
  assert.equal(count(m.sql`SELECT count(*) AS n FROM checkins WHERE person_id = ${person.id} AND status = 'scheduled'`), 0);
});

test("deleting the email removes the person, links and everything stored under them", () => {
  const person = m.identity.personForSession("dev-a")!;
  m.identity.deletePersonAndData(person.id);
  assert.equal(m.identity.getPerson(person.id), null);
  assert.equal(m.identity.resolveSessionId("dev-a"), "dev-a");
  for (const table of ["shelf_items", "audience_outcomes", "regimen_items"]) {
    assert.equal(count(m.sql`SELECT count(*) AS n FROM ${m.sql.identifier(table)} WHERE session_id = ${person.homeSessionId}`), 0, table);
  }
  for (const table of ["checkins", "outcome_observations", "person_sessions"]) {
    assert.equal(count(m.sql`SELECT count(*) AS n FROM ${m.sql.identifier(table)} WHERE person_id = ${person.id}`), 0, table);
  }
  assert.equal(count(m.sql`SELECT count(*) AS n FROM email_tokens WHERE email = 'a@example.com'`), 0);
  assert.ok(m.identity.personForSession("dev-c") === null);
  assert.ok(m.identity.getPerson(m.db.get<{ id: string }>(m.sql`SELECT id FROM people WHERE email = 'b@example.com'`)!.id), "other people untouched");
});
