import { test } from "node:test";
import assert from "node:assert/strict";
import { avoidIdsFrom, chambersFor, getSeries, nextGrade, readingWriteUp, type Grade } from "./patch-test-reading";

test("T.R.U.E. Test chambers: 36 positions, 9 is the negative control, 12 per panel", () => {
  const ch = chambersFor(getSeries("true-test"));
  assert.equal(ch.length, 36);
  assert.deepEqual(ch.map((c) => c.number), Array.from({ length: 36 }, (_, i) => i + 1));
  assert.equal(ch[8].item, null);
  assert.equal(ch[0].item?.name.toLowerCase().includes("nickel"), true);
  for (const panel of ["Panel 1", "Panel 2", "Panel 3"]) assert.equal(ch.filter((c) => c.group === panel).length, 12, panel);
});

test("taps cycle neg -> ?+ -> + -> ++ -> +++ -> IR -> neg", () => {
  let g: Grade = "neg";
  const seen = [];
  for (let i = 0; i < 6; i++) seen.push((g = nextGrade(g)));
  assert.deepEqual(seen, ["?+", "+", "++", "+++", "IR", "neg"]);
});

test("positives become avoid ids; doubtfuls only when asked; write-up lists each group", () => {
  const series = getSeries("true-test");
  const ch = chambersFor(series);
  const grades: Record<string, Grade> = { "1": "++", "6": "?+", "2": "IR", control: "neg" };
  const strict = avoidIdsFrom(ch, grades, false);
  assert.ok(strict.includes("nickel"));
  assert.ok(!strict.some((id) => id.startsWith("fragrance-mix")));
  assert.ok(avoidIdsFrom(ch, grades, true).length > strict.length);
  const text = readingWriteUp({ series, chambers: ch, grades, day: "d3", readDate: "2026-10-02" });
  assert.match(text, /Day 3 \(72 h\), read 2026-10-02/);
  assert.match(text, /Positive \(1\):\n- Nickel.*\(Panel 1, #1\): \+\+/);
  assert.match(text, /Doubtful \(1\):/);
  assert.match(text, /Irritant \(1\):/);
  assert.match(text, /Negative: 32 of 35 allergens\./);
  assert.match(text, /Negative control: negative\./);
});

test("other series are numbered 1..n with no control", () => {
  const ch = chambersFor(getSeries("core"));
  assert.ok(ch.length > 30);
  assert.ok(ch.every((c, i) => c.number === i + 1 && c.item));
});

test("ACDS core 2020 reads by position: 90 chambers, 9 panels on the back, clinic-set split", async () => {
  const { backSpec } = await import("./patch-test-reading");
  const series = getSeries("acds-2020");
  const ch = chambersFor(series);
  assert.equal(ch.length, 90);
  assert.ok(ch.every((c, i) => c.number === i + 1 && c.item));
  const spec = backSpec(series)!;
  assert.deepEqual(spec.left.map((p) => p.label), ["I", "II", "III", "IV", "V"]);
  assert.deepEqual(spec.right.map((p) => p.label), ["VI", "VII", "VIII", "IX"]);
  assert.equal(spec.rows, 5);
  const four = backSpec(series, { leftCount: 4, numbering: "rows" })!;
  assert.equal(four.left.length, 4);
  assert.equal(four.numbering, "rows");
  assert.equal(backSpec(series, { leftCount: 99, numbering: "columns" })!.right.length, 1);
  assert.equal(backSpec(getSeries("core")), null);
  const text = readingWriteUp({ series, chambers: ch, grades: { "66": "+" }, day: "d4" });
  assert.match(text, /Ethyleneurea melamine formaldehyde \(Panel VII, #66\): \+/);
});
