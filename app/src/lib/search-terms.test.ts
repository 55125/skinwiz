// `npm test`: how typed searches become terms (lib/search-terms.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSearch } from "./search-terms";

const alts = (q: string) => parseSearch(q).terms.map((t) => t.alts);

test("each word is its own term, in any order across columns", () => {
  assert.deepEqual(alts("cerave resurfacing retinol"), [["cerave"], ["resurfacing"], ["retinol"]]);
  assert.deepEqual(alts("The Ordinary glycolic acid 7%"), [["glycolic"], ["ordinary"], ["7%"]]);
});

test("phrases and synonyms match what labels say", () => {
  assert.deepEqual(alts("glycolic acid toner"), [["glycolic"], ["toner", "toning", "tonic"]]);
  assert.deepEqual(alts("aha toner")[0], ["glycolic", "lactic", "mandelic", "aha"]);
  assert.deepEqual(alts("vitamin c serum")[0], ["vitamin c", "ascorbic", "ascorbyl"]);
  assert.ok(alts("eczema kids")[1].includes("baby"));
  assert.deepEqual(alts("paula's choice")[0], ["paula's", "paulas"]);
});

test("brand spellings people type find the real names", () => {
  assert.deepEqual(alts("olay regenerates")[1], ["regenerist", "regenerat"]);
  assert.ok(alts("loreal")[0].includes("l'oreal"));
  // Accented searches also match the plain-ASCII rows.
  assert.deepEqual(alts("l’oréal night")[0], ["l'oréal", "loréal", "l'oreal", "loreal"]);
});

test("short words only match at the start of a word", () => {
  const [spf] = parseSearch("spf").terms;
  assert.equal(spf.wordStart, true);
  assert.equal(parseSearch("retinol").terms[0].wordStart, false);
});

test("topic searches carry a hint", () => {
  assert.deepEqual(parseSearch("HSA").terms, []);
  assert.deepEqual(parseSearch("hsa").hints, ["hsa"]);
  assert.deepEqual(parseSearch("tretinoin").hints, ["rx-retinoid"]);
  assert.deepEqual(parseSearch("eczema kids").hints, ["kids"]);
});
