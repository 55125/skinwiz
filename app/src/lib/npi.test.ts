// `npm test`: NPI check digit and NPPES response parsing (lib/npi.ts).
// Fixtures only; never calls the live registry.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isDermatologyTaxonomy, isValidNpi, judgeNpi, lastNameMatches, normalizeNpi, parseNppesResponse } from "./npi";

// CMS's published example NPI (passes the Luhn check with the 80840 prefix).
const NPI = "1234567893";

// Shape of a real NPPES v2.1 response (synthetic person).
const fixture = (over: Record<string, unknown> = {}, tax: unknown[] = [{ code: "207N00000X", desc: "Dermatology", primary: true, state: "CA", license: "X1" }]) => ({
  result_count: 1,
  results: [
    {
      number: NPI,
      enumeration_type: "NPI-1",
      basic: { first_name: "JANE", last_name: "O'NEILL-GARCÍA", credential: "M.D.", status: "A", ...over },
      taxonomies: tax,
      addresses: [{ address_purpose: "LOCATION", state: "CA" }],
    },
  ],
});

test("NPI check digit (Luhn over 80840 + the number)", () => {
  assert.equal(isValidNpi(NPI), true);
  assert.equal(isValidNpi("1234567890"), false);
  assert.equal(isValidNpi("123456789"), false);
  assert.equal(isValidNpi("12345678931"), false);
  assert.equal(isValidNpi("abcdefghij"), false);
  assert.equal(normalizeNpi(" 1234-567 893 "), NPI);
  assert.equal(normalizeNpi("12345"), null);
  assert.equal(normalizeNpi(1234567893), null);
});

test("parses an NPPES individual record", () => {
  const r = parseNppesResponse(fixture(), NPI)!;
  assert.equal(r.enumerationType, "NPI-1");
  assert.equal(r.active, true);
  assert.equal(r.firstName, "Jane");
  assert.equal(r.lastName, "O'Neill-García");
  assert.equal(r.credential, "M.D.");
  assert.equal(r.taxonomyCode, "207N00000X");
  assert.equal(r.taxonomyDesc, "Dermatology");
  assert.equal(r.state, "CA");
  assert.equal(r.isDermatology, true);
});

test("primary taxonomy wins for display; any 207N code counts as dermatology", () => {
  const r = parseNppesResponse(
    fixture({}, [
      { code: "363A00000X", desc: "Physician Assistant", primary: true, state: "TX" },
      { code: "207ND0101X", desc: "MOHS-Micrographic Surgery", primary: false, state: "TX" },
    ]),
    NPI,
  )!;
  assert.equal(r.taxonomyDesc, "Physician Assistant");
  assert.equal(r.state, "TX");
  assert.equal(r.isDermatology, true);
  assert.equal(isDermatologyTaxonomy("207NP0225X"), true);
  assert.equal(isDermatologyTaxonomy("207R00000X"), false);
});

test("empty, error and mismatched-number responses parse to null", () => {
  assert.equal(parseNppesResponse({ result_count: 0, results: [] }, NPI), null);
  assert.equal(parseNppesResponse({ Errors: [{ description: "Invalid" }] }, NPI), null);
  assert.equal(parseNppesResponse(null, NPI), null);
  assert.equal(parseNppesResponse(fixture(), "1679643928"), null);
});

test("verification rules: active individual, matching last name", () => {
  const rec = parseNppesResponse(fixture(), NPI)!;
  assert.deepEqual(judgeNpi(NPI, "oneill garcia", rec), { ok: true, record: rec }, "accents, case, hyphens, apostrophes ignored");
  assert.equal(judgeNpi(NPI, "Smith", rec).ok, false);
  assert.deepEqual(judgeNpi(NPI, "Smith", rec), { ok: false, reason: "name-mismatch" });
  assert.deepEqual(judgeNpi("1234567890", "x", rec), { ok: false, reason: "checksum" });
  assert.deepEqual(judgeNpi(NPI, "O'Neill-Garcia", null), { ok: false, reason: "not-found" });
  assert.deepEqual(judgeNpi(NPI, "O'Neill-Garcia", "unavailable"), { ok: false, reason: "unavailable" });
  assert.deepEqual(judgeNpi(NPI, "O'Neill-Garcia", { ...rec, enumerationType: "NPI-2" }), { ok: false, reason: "organization" });
  assert.deepEqual(judgeNpi(NPI, "O'Neill-Garcia", parseNppesResponse(fixture({ status: "D" }), NPI)), { ok: false, reason: "inactive" });
  assert.equal(lastNameMatches("a", { lastName: "A" }), false, "one letter is not a match");
});
