import { test } from "node:test";
import assert from "node:assert/strict";
import data from "./starter-routines.json";
import { CONCERN_DEFINITIONS } from "./actives";

const concernIds = new Set(CONCERN_DEFINITIONS.map((c) => c.id));

test("every starter routine names a real concern, has steps, and cites an https source", () => {
  const titles = new Set<string>();
  for (const r of data) {
    assert.ok(concernIds.has(r.concernId), `${r.title}: unknown concern ${r.concernId}`);
    assert.ok(r.steps.length >= 3 && r.steps.every((s) => s.trim()), `${r.title}: needs at least 3 non-empty steps`);
    assert.match(r.sourceUrl, /^https:\/\//, `${r.title}: source must be an https URL`);
    assert.ok(r.sourceName && r.sourceTitle, `${r.title}: source needs a name and title`);
    assert.ok(!titles.has(r.title), `duplicate title ${r.title} (titles are the seeding key)`);
    titles.add(r.title);
  }
});

test("every concern has at least one starter routine", () => {
  for (const id of concernIds) assert.ok(data.some((r) => r.concernId === id), `no starter routine for ${id}`);
});
