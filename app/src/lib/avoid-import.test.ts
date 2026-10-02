// Share-link encoding and avoid-list merging: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALLERGEN_GROUPS, CONTACT_ALLERGENS } from "../db/contact-allergens";
import { NOT_ON_LABELS } from "../db/patch-test-series";
import {
  IMPORT_CODES,
  MAX_CODE_LENGTH,
  buildImportPath,
  cleanDate,
  cleanDetails,
  decodeImportCode,
  encodeImportCode,
  mergeAvoidIds,
} from "./avoid-import";

test("every allergen, family and not-on-label id has exactly one code", () => {
  assert.equal(new Set(IMPORT_CODES).size, IMPORT_CODES.length, "duplicate code");
  const codes = new Set(IMPORT_CODES);
  for (const id of [...CONTACT_ALLERGENS.map((a) => a.id), ...ALLERGEN_GROUPS.map((g) => g.id), ...NOT_ON_LABELS.map((n) => n.id)]) {
    assert.ok(codes.has(id), `${id} has no import code; append it to IMPORT_CODES`);
  }
});

test("codes are stable: printed sheets keep decoding the same way", () => {
  // Golden values. If these fail, IMPORT_CODES was reordered -- append instead.
  assert.equal(encodeImportCode(["fragrance"]), "1AQ");
  assert.equal(IMPORT_CODES[0], "fragrance");
  assert.equal(IMPORT_CODES[60], "lanolin");
  assert.equal(IMPORT_CODES[133], "disperse-dye-mix");
  const decoded = decodeImportCode(encodeImportCode(["lanolin", "nickel"]));
  assert.ok(decoded.ok);
  assert.deepEqual(decoded.avoidIds, ["lanolin", "nickel"]);
});

test("round trip, every id at once and one at a time", () => {
  const all = decodeImportCode(encodeImportCode(IMPORT_CODES));
  assert.ok(all.ok);
  assert.equal(all.avoidIds.length + all.notOnLabel.length, IMPORT_CODES.length);
  assert.equal(all.unknown, 0);
  for (const id of IMPORT_CODES) {
    const one = decodeImportCode(encodeImportCode([id]));
    assert.ok(one.ok);
    assert.deepEqual([...one.avoidIds, ...one.notOnLabel], [id]);
  }
  const code = encodeImportCode(IMPORT_CODES);
  assert.ok(code.length <= 30, `full code is ${code.length} chars`);
});

test("unknown ids are dropped on encode and counted on decode", () => {
  const decoded = decodeImportCode(encodeImportCode(["lanolin", "not-a-thing", "carba-mix"]));
  assert.ok(decoded.ok);
  assert.deepEqual(decoded.avoidIds, ["lanolin"]);
  assert.deepEqual(decoded.notOnLabel, ["carba-mix"]);
  // A bit past the end of the table: a link from a newer version.
  const future = decodeImportCode("1" + "A".repeat(39) + "B");
  assert.ok(future.ok);
  assert.equal(future.unknown, 1);
  assert.deepEqual(future.avoidIds, []);
});

test("bad and oversized codes are rejected", () => {
  assert.deepEqual(decodeImportCode(undefined), { ok: false, reason: "missing" });
  assert.deepEqual(decodeImportCode(""), { ok: false, reason: "missing" });
  assert.deepEqual(decodeImportCode("2AQ"), { ok: false, reason: "invalid" });
  assert.deepEqual(decodeImportCode("1A=Q"), { ok: false, reason: "invalid" });
  assert.deepEqual(decodeImportCode("1" + "A".repeat(MAX_CODE_LENGTH)), { ok: false, reason: "too-long" });
  assert.equal(decodeImportCode("1" + "_".repeat(MAX_CODE_LENGTH - 1)).ok, true);
});

test("details are cleaned and capped; the import path carries no name field", () => {
  assert.equal(cleanDate("2026-10-02"), "2026-10-02");
  assert.equal(cleanDate("2026-02-30"), undefined);
  assert.equal(cleanDate("10/02/2026"), undefined);
  const d = cleanDetails({ clinic: "  Smith\nDermatology  ", note: "x".repeat(500), date: "nope" });
  assert.equal(d.clinic, "Smith Dermatology");
  assert.equal(d.note?.length, 140);
  assert.equal(d.date, undefined);
  const path = buildImportPath(["lanolin", "carba-mix"], { clinic: "Smith Derm", date: "2026-10-02" });
  const url = new URL(path, "https://activelyskin.com");
  assert.equal(url.pathname, "/avoid/import");
  assert.deepEqual([...url.searchParams.keys()], ["a", "c", "d"]);
  const back = decodeImportCode(url.searchParams.get("a"));
  assert.ok(back.ok);
  assert.deepEqual(back.avoidIds, ["lanolin"]);
  assert.ok(path.length < 120);
});

test("merging keeps the existing list and reports what was already there", () => {
  const r = mergeAvoidIds(["fragrance-free", "lanolin", "formaldehyde-and-releasers"], ["lanolin", "quaternium-15", "nickel", "nickel"]);
  assert.deepEqual(r.merged, ["fragrance-free", "lanolin", "formaldehyde-and-releasers", "quaternium-15", "nickel"]);
  assert.deepEqual(r.added, ["quaternium-15", "nickel"]);
  assert.deepEqual(r.already, ["lanolin"]);
  assert.deepEqual(r.coveredBy, { "quaternium-15": "formaldehyde-and-releasers" });
  assert.deepEqual(mergeAvoidIds([], ["parabens"]).merged, ["parabens"]);
  assert.deepEqual(mergeAvoidIds(["parabens"], []).merged, ["parabens"]);
});
