// `npm test`: brand-origin matching for the header's region picker (lib/origin-shared.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { brandOrigin, parseOrigin, productNameOrigin } from "./origin-shared";

test("brands match whole words, ignoring case, accents and punctuation", () => {
  assert.equal(brandOrigin("COSRX"), "kr");
  assert.equal(brandOrigin("Round Lab | SEORIN"), "kr");
  assert.equal(brandOrigin("Dr. Jart+"), "kr");
  assert.equal(brandOrigin("Bioré"), "jp");
  assert.equal(brandOrigin("La roche - posay"), "eu");
  assert.equal(brandOrigin("L'Oréal Paris"), "eu");
  assert.equal(brandOrigin("NAKED SUNDAYS"), "au");
  assert.equal(brandOrigin("9055-7588 Quebec Inc. DBA Attitude"), "ca");
  assert.equal(brandOrigin("The Ordinary"), "ca");
});

test("US brands and US arms of foreign groups have no origin", () => {
  for (const b of ["CeraVe", "Neutrogena", "L'Oreal USA Products", "Coppertone", "COSMAX USA", "Kao USA", "Tatcha", "Naked Turtle Sunscreen", "Biorepair Plus"])
    assert.equal(brandOrigin(b), null, b);
  assert.equal(brandOrigin(null), null);
});

test("whole-brand entries don't catch everyday words", () => {
  assert.equal(brandOrigin("Simple"), "eu");
  assert.equal(brandOrigin("Simple Solutions"), null);
  assert.equal(brandOrigin("AHC"), "kr");
});

test("a product name that starts with a listed brand counts when the brand doesn't", () => {
  assert.equal(productNameOrigin("Kao USA", "Biore UV Aqua Rich Watery Essence"), "jp");
  assert.equal(productNameOrigin("Kao USA", "Jergens Natural Glow"), null);
  assert.equal(productNameOrigin("The Founders", "Anua Heartleaf Silky Moisture Mild Sunscreen"), "kr");
  // Only at the start: a store brand "compared to" one isn't that brand.
  assert.equal(productNameOrigin("CVS Health", "Compare to Nivea Creme"), null);
});

test("parseOrigin accepts only known ids", () => {
  assert.equal(parseOrigin("kr"), "kr");
  assert.equal(parseOrigin("cn"), undefined);
  assert.equal(parseOrigin(undefined), undefined);
});
