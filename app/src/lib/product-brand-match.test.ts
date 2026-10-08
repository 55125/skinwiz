// `npm test`: reading the brand from a product name (lib/product-brand-match.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { KNOWN_BRANDS, brandEntries, brandFromName } from "./product-brand-match";

const brands = brandEntries([...KNOWN_BRANDS, "Kamedis"]);

test("finds the brand at the start of the name", () => {
  assert.equal(brandFromName("Neutrogena Adapalene 0.1% Acne Treatment", brands), "Neutrogena");
  assert.equal(brandFromName("CeraVe Developed with Dermatologists Acne Control Cleanser", brands), "CeraVe");
  assert.equal(brandFromName("First Aid Beauty FAB Acne Spot Treatment", brands), "First Aid Beauty");
  assert.equal(brandFromName("Clean and Clear Essentials Acne Toner", brands), "Clean & Clear");
  assert.equal(brandFromName("SKIN MEDICA Purifying Foaming Wash", brands), "SkinMedica");
  assert.equal(brandFromName("Paulas Choice Calm Redness Relief SPF 30", brands), "Paula's Choice");
});

test("needs a word boundary after the brand", () => {
  assert.equal(brandFromName("Oxy Clinical Advanced Face Wash", brands), "Oxy");
  assert.equal(brandFromName("Oxygen Bubble Mask", brands), null);
  assert.equal(brandFromName("Doveberry Lotion", brands), null);
});

test("no brand in the name: null", () => {
  assert.equal(brandFromName("Acne Control Face Wash", brands), null);
  assert.equal(brandFromName("Clear Acne Spot Treatment", brands), null);
});
