// IndexNow change detection (lib/indexnow.ts). `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { batches, fingerprint, indexNowKey, planChanges, submittableHost } from "./indexnow";

const NOW = "2026-11-16T08:00:00.000Z";

test("first run records every page without a change date", () => {
  const plan = planChanges(new Map([["https://a/x", "h1"], ["https://a/y", ""]]), new Map(), NOW);
  assert.equal(plan.insert.length, 2);
  assert.ok(plan.insert.every((r) => r.changedAt === null && r.submittedAt === null));
  assert.deepEqual(plan.update, []);
  assert.deepEqual(plan.removed, []);
});

test("later runs queue new, changed and removed pages only", () => {
  const stored = new Map([["https://a/same", "h"], ["https://a/edited", "old"], ["https://a/gone", "g"]]);
  const current = new Map([["https://a/same", "h"], ["https://a/edited", "new"], ["https://a/added", ""]]);
  const plan = planChanges(current, stored, NOW);
  assert.deepEqual(plan.insert, [{ url: "https://a/added", hash: "", changedAt: NOW, submittedAt: null }]);
  assert.deepEqual(plan.update, [{ url: "https://a/edited", hash: "new", changedAt: NOW, submittedAt: null }]);
  assert.deepEqual(plan.removed, ["https://a/gone"]);
});

test("fingerprints follow the content", () => {
  assert.equal(fingerprint({ a: 1 }), fingerprint({ a: 1 }));
  assert.notEqual(fingerprint({ a: 1 }), fingerprint({ a: 2 }));
});

test("only the public https site submits", () => {
  assert.equal(submittableHost("https://activelyskin.com"), "activelyskin.com");
  assert.equal(submittableHost("http://localhost:3000"), null);
  assert.equal(submittableHost("https://skinwiz-production.up.railway.app"), null);
  assert.equal(submittableHost("not a url"), null);
});

test("the key must look like an IndexNow key", () => {
  assert.equal(indexNowKey({}), null);
  assert.equal(indexNowKey({ INDEXNOW_KEY: "short" }), null);
  assert.equal(indexNowKey({ INDEXNOW_KEY: "has spaces in it" }), null);
  assert.equal(indexNowKey({ INDEXNOW_KEY: " 0123456789abcdef0123456789abcdef " }), "0123456789abcdef0123456789abcdef");
});

test("batches split at the limit", () => {
  assert.deepEqual(batches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.equal(batches(Array.from({ length: 25_000 }, (_, i) => i)).length, 3);
});
