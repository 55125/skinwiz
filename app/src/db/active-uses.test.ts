import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIVE_DEFINITIONS } from "./actives";
import { ACTIVE_USES } from "./active-uses";

test("every tracked active says what it is used for", () => {
  const missing = ACTIVE_DEFINITIONS.filter((a) => !ACTIVE_USES[a.id]?.trim()).map((a) => a.id);
  assert.deepEqual(missing, []);
});

test("no use is written for an active that isn't tracked", () => {
  const ids = new Set(ACTIVE_DEFINITIONS.map((a) => a.id));
  assert.deepEqual(Object.keys(ACTIVE_USES).filter((id) => !ids.has(id)), []);
});

test("uses read as sentences and make no cure claims", () => {
  for (const [id, use] of Object.entries(ACTIVE_USES)) {
    assert.match(use, /^[A-Z0-9].*\.$/, id);
    assert.doesNotMatch(use, /\b(cures?|heals?|eliminates?|erases?|reverses?)\b/i, id);
  }
});
