// `npm test`: the Strength filter's chips on concern pages -- one per label strength, or ranges.
import { test } from "node:test";
import assert from "node:assert/strict";
import { inStrengthRange, parseStrengthParam, strengthChoices, strengthLabel } from "./strength-bands";

const labels = (opts: { pct: number; count: number }[], selected?: string) =>
  strengthChoices(opts, parseStrengthParam(selected)).map((c) => `${c.label} (${c.count})`);

test("a few common strengths stay one chip each; rare ones get none", () => {
  const bpo = [
    { pct: 2.5, count: 49 },
    { pct: 3.69, count: 1 },
    { pct: 5, count: 69 },
    { pct: 10, count: 53 },
  ];
  assert.deepEqual(labels(bpo), ["2.5% (49)", "5% (69)", "10% (53)"]);
  assert.deepEqual(labels(bpo, "3.69"), ["2.5% (49)", "5% (69)", "10% (53)", "3.69% (1)"]);
});

test("many near-duplicate strengths become even ranges that count every product", () => {
  const zinc = [0.5, 1, 3, 4.9, 5, 6, 7.5, 10, 12, 15, 18.6, 19.8, 20, 20.2, 22, 24.08, 25].map((pct) => ({ pct, count: 5 }));
  assert.deepEqual(labels(zinc), ["Up to 5% (25)", "5–10% (15)", "10–15% (10)", "15–20% (15)", "20–25% (20)"]);
});

test("outliers past 95% of products share one Over range instead of stretching the rest", () => {
  const octinoxate = [
    ...[0.5, 1, 2, 3, 4, 5, 6, 6.5, 7, 7.5].map((pct) => ({ pct, count: 30 })),
    { pct: 20.83, count: 3 },
    { pct: 24.24, count: 4 },
  ];
  assert.deepEqual(labels(octinoxate), ["Up to 2% (90)", "2–4% (60)", "4–6% (60)", "6–8% (90)", "Over 8% (7)"]);
});

test("an old single-strength link on a ranged active is kept as its own chip", () => {
  const zinc = Array.from({ length: 12 }, (_, i) => ({ pct: i * 2 + 1, count: 4 }));
  assert.equal(labels(zinc, "21").at(-1), "21% (4)");
  assert.equal(labels(zinc, "20-25").filter((l) => l.startsWith("20–25%")).length, 1);
});

test("the strength param round-trips and rejects junk", () => {
  assert.deepEqual(parseStrengthParam("20"), { lo: 20, hi: 20 });
  assert.deepEqual(parseStrengthParam("5-10"), { lo: 5, hi: 10 });
  assert.deepEqual(parseStrengthParam("25-"), { lo: 25, hi: null });
  for (const bad of ["", "abc", "10-5", "-5", "1-2-3", "5-x"]) assert.equal(parseStrengthParam(bad), undefined, bad);
  assert.equal(strengthLabel({ lo: 2.5, hi: 5 }), "2.5–5%");
  assert.ok(inStrengthRange(10, { lo: 5, hi: 10 }));
  assert.ok(!inStrengthRange(5, { lo: 5, hi: 10 }));
});
