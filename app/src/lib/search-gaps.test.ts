// `npm test`: the admin no-results list drops terms the catalog now answers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stillMissing } from "./search-gaps";

const rows = [
  { label: "rogaine", n: 3 },
  { label: "cantabria", n: 2 },
  { label: "olay regenerates", n: 2 },
];

test("terms that find products now are removed, the rest keep order and counts", () => {
  const counts: Record<string, number> = { rogaine: 4, "olay regenerates": 16 };
  assert.deepEqual(stillMissing(rows, (t) => counts[t] ?? 0), [{ label: "cantabria", n: 2 }]);
});

test("a term that can't be searched stays listed", () => {
  assert.deepEqual(stillMissing([{ label: "x", n: 1 }], () => { throw new Error("boom"); }), [{ label: "x", n: 1 }]);
});
