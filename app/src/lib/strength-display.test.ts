// `npm test`: card text for FDA active lines the strength parser couldn't read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dosageFormLabel, firstIngredients, unparsedActivesLine } from "./strength-display";

test("names the actives and says the strength is unclear", () => {
  assert.equal(unparsedActivesLine("SALICYLIC ACID 1.8 mg/180mL"), "Salicylic Acid · strength unclear on the label");
  assert.equal(unparsedActivesLine("SALICYLIC ACID .14 mg/1"), "Salicylic Acid · strength unclear on the label");
  assert.equal(unparsedActivesLine("SALICYLIC ACID 1 mg/100mL; SULFUR 2 mg/100mL"), "Salicylic Acid · Sulfur · strength unclear on the label");
});

test("a stated percentage is left as printed", () => {
  assert.equal(unparsedActivesLine("Active Ingredient 2% Salicylic Acid"), null);
});

test("firstIngredients takes the first three names of a full list", () => {
  assert.equal(firstIngredients("Water, Glycerin, Cetearyl Alcohol, Petrolatum"), "Water, Glycerin, Cetearyl Alcohol…");
  assert.equal(firstIngredients("INGREDIENTS : AQUA/WATER, GLYCERIN"), "Aqua/Water, Glycerin");
  assert.equal(firstIngredients("Water, Parfum (Fragrance, Linalool), Glycerin, Dimethicone"), "Water, Parfum (Fragrance, Linalool), Glycerin…");
  assert.equal(firstIngredients("  "), null);
});

test("dosageFormLabel is sentence case and skips a generic form", () => {
  assert.equal(dosageFormLabel("AEROSOL, SPRAY"), "Aerosol, spray");
  assert.equal(dosageFormLabel("Gel"), "Gel");
  assert.equal(dosageFormLabel("OTC Product"), null);
  assert.equal(dosageFormLabel(null), null);
});
