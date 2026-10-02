// `npm test`: the EHR chart note (lib/chart-note.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChartNote, scrubDoNotUse, toAscii, type ChartNoteVersion } from "./chart-note";
import { generateClaimToken } from "./handout-codes";

const version: ChartNoteVersion = {
  ref: "AB12-CD34",
  title: "Your acne plan",
  createdAt: "2026-10-02T15:00:00.000Z",
  content: {
    steps: [
      { key: "s1", slot: "am", label: "Benzoyl peroxide wash", productId: "x1", kind: "otc", productName: "PanOxyl Acne Foaming Wash 4%", directions: "Lather, leave 1–2 minutes, rinse." },
      { key: "s2", slot: "both", label: "Moisturizer", productId: null, kind: "generic", productName: null, directions: "" },
      { key: "s3", slot: "am", label: "Sunscreen", productId: "x2", kind: "otc", productName: "Daily SPF 30", directions: "Every morning; reapply q.d. outdoors." },
      { key: "s4", slot: "pm", label: "Topical retinoid", productId: "rx1", kind: "rx", productName: "Tretinoin 0.025% cream (Retin-A)", directions: "Pea-sized amount to face nightly, .5 g max" },
    ],
    stopRules: ["Severe redness or peeling.", "You become pregnant."],
    avoidCode: null,
  },
};

const DO_NOT_USE = [/\bq\.?\s?d\.?\b/i, /\bq\.?\s?o\.?\s?d\.?\b/i, /\bI\.?U\b/, /\d\s*U\b/, /\bMSO4\b|\bMgSO4\b|\bMS\b/, /\d\.0(?!\d)/, /(^|[^\d])\.\d/];

test("full note: AM/PM steps, Rx on its own line, stop rules, ref -- ASCII with CRLF", () => {
  const note = buildChartNote(version, { date: new Date(2026, 9, 2) });
  assert.match(note, /^Skincare plan given via Actively \(ref AB12-CD34\), 10\/02\/2026/);
  assert.match(note, /\r\nAM: 1\) Benzoyl peroxide wash: PanOxyl Acne Foaming Wash 4% - Lather, leave 1-2 minutes, rinse 2\) Moisturizer 3\) Sunscreen: Daily SPF 30/);
  assert.match(note, /\r\nPM: 1\) Moisturizer/);
  assert.match(note, /\r\nRx: Tretinoin 0\.025% cream \(Retin-A\) - Pea-sized amount to face nightly, 0\.5 g max \(every night\)/);
  assert.match(note, /\r\nStop and call if: Severe redness or peeling; You become pregnant\./);
  assert.match(note, /Patient education: written handout \+ QR provided\.$/);
  assert.ok(/^[\x20-\x7e\r\n]*$/.test(note), "ASCII only");
  assert.ok(!/[*#_`<>]/.test(note.replace(/\(ref [A-Z0-9-]+\)/, "")), "no markdown or HTML symbols");
  assert.equal(note.split("\r\n").length, note.split("\n").length, "every line break is CRLF");
});

test("one-line short form", () => {
  const short = buildChartNote(version, { short: true, abbreviations: true, date: new Date(2026, 9, 2) });
  assert.equal(
    short,
    "Actively skincare plan AB12-CD34 provided 10/02/2026: Benzoyl peroxide wash qAM, Moisturizer BID, Sunscreen qAM, Tretinoin 0.025% cream qHS.",
  );
  assert.ok(!short.includes("\n"));
});

test("abbreviation toggle uses standard sig shorthand and never a do-not-use abbreviation", () => {
  for (const abbreviations of [false, true]) {
    for (const short of [false, true]) {
      const note = buildChartNote(version, { abbreviations, short });
      for (const re of DO_NOT_USE) assert.ok(!re.test(note), `${re} in ${abbreviations ? "abbreviated" : "plain"} ${short ? "short" : "full"} note:\n${note}`);
    }
  }
  assert.match(buildChartNote(version, { abbreviations: true }), /qAM|qHS|BID/);
  assert.doesNotMatch(buildChartNote(version, { abbreviations: false }), /qAM|qHS|BID/);
  assert.equal(scrubDoNotUse("apply QD, 1.0 g, then QOD; 10 U; .25%"), "apply daily, 1 g, then every other day; 10 units; 0.25%");
});

test("never contains a printout's claim token or any patient field", () => {
  const token = generateClaimToken();
  // Even if a caller hands over an object carrying extra fields, only the
  // version's own fields are read.
  const polluted = { ...version, token, patientName: "Jane Q Patient", dob: "01/02/1990", url: `https://activelyskin.com/h/${token}` } as ChartNoteVersion;
  for (const opts of [{}, { short: true }, { abbreviations: true }]) {
    const note = buildChartNote(polluted, opts);
    assert.ok(!note.includes(token), "claim token");
    assert.ok(!note.includes("/h/"), "claim URL");
    assert.ok(!/Jane|Patient Q|01\/02\/1990/.test(note), "patient fields");
  }
});

test("toAscii folds typography", () => {
  assert.equal(toAscii("“Don’t” — 2–3× ≥15 café"), "\"Don't\" - 2-3 >=15 cafe");
});
