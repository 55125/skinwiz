// Check-in scheduling rules: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkinDueDates, planDue, scoreFromAnswer, WEEK_MS, type DueRow } from "./checkin-schedule";

const start = new Date("2026-01-01T09:00:00Z");
const at = (weeks: number, extraMs = 0) => new Date(start.getTime() + weeks * WEEK_MS + extraMs);

test("series is due at 2, 4, 8 and 12 weeks after starting", () => {
  const due = checkinDueDates(start);
  assert.deepEqual(due.map((d) => d.weeks), [2, 4, 8, 12]);
  assert.deepEqual(due.map((d) => d.dueAt.toISOString()), [at(2), at(4), at(8), at(12)].map((d) => d.toISOString()));
});

function rows(personId: string, productId: string, firstId: number): DueRow[] {
  return checkinDueDates(start).map((d, i) => ({ id: firstId + i, personId, productId, weeks: d.weeks, dueAt: d.dueAt.toISOString() }));
}

test("nothing is sent before it's due", () => {
  const plan = planDue(rows("p", "x", 1), at(2, -1));
  assert.deepEqual(plan, { send: [], skip: [], expire: [] });
});

test("the 2-week check-in is sent once due", () => {
  const plan = planDue(rows("p", "x", 1), at(2, 60_000));
  assert.deepEqual(plan.send.map((r) => r.weeks), [2]);
  assert.deepEqual(plan.skip, []);
});

test("after downtime only the latest due point is sent; earlier ones are skipped", () => {
  const plan = planDue(rows("p", "x", 1), at(8, 3_600_000));
  assert.deepEqual(plan.send.map((r) => r.weeks), [8]);
  assert.deepEqual(plan.skip.sort(), [1, 2]);
  assert.deepEqual(plan.expire, []);
});

test("check-ins far past due are expired instead of sent", () => {
  const plan = planDue(rows("p", "x", 1), at(12 + 4));
  assert.deepEqual(plan.send, []);
  assert.deepEqual(plan.expire.sort(), [1, 2, 3, 4]);
});

test("each person/product series is planned independently", () => {
  const plan = planDue([...rows("p", "x", 1), ...rows("p", "y", 11), ...rows("q", "x", 21)], at(4, 1000));
  assert.deepEqual(plan.send.map((r) => r.id).sort((a, b) => a - b), [2, 12, 22]);
});

test("answers map to the User Score: better helps, same/worse don't, stopped isn't scored", () => {
  assert.equal(scoreFromAnswer("better"), true);
  assert.equal(scoreFromAnswer("same"), false);
  assert.equal(scoreFromAnswer("worse"), false);
  assert.equal(scoreFromAnswer("stopped"), null);
});
