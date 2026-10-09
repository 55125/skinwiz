// `npm test`: card text for FDA active lines the strength parser couldn't read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dosageFormLabel, firstIngredients, labelAmounts, labelQuantityCount, unparsedActivesLine } from "./strength-display";

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

test("labelAmounts keeps the label's own weight-per-volume amount per active", () => {
  assert.deepEqual(labelAmounts("SALICYLIC ACID 20 mg/mL"), { "salicylic-acid": "20 mg/mL" });
  assert.deepEqual(labelAmounts("OCTISALATE 4.5 g/50mL; HOMOSALATE 9 g/50mL"), { octisalate: "4.5 g/50mL", homosalate: "9 g/50mL" });
  assert.deepEqual(labelAmounts("SULFUR 1.4 g in 14 g"), { sulfur: "1.4 g in 14 g" });
});

test("labelQuantityCount counts each stated amount once", () => {
  assert.equal(labelQuantityCount("SALICYLIC ACID 20 mg/mL"), 1);
  assert.equal(labelQuantityCount("Active ingredients Purpose Avobenzone 3% Sunscreen Homosalate 8% Sunscreen"), 2);
  assert.equal(labelQuantityCount("AZELAIC ACID 10 g/100g; MADECASSOSIDE .055 g/100g; LAVANDIN OIL .03 g/100g"), 3);
  assert.equal(labelQuantityCount("SULFUR 1.4 g in 14 g"), 1);
  assert.equal(labelQuantityCount(null), 0);
});

test("labelAmounts skips percents and per-package amounts", () => {
  assert.deepEqual(labelAmounts("Active ingredient Benzoyl peroxide 10%"), {});
  assert.deepEqual(labelAmounts("SALICYLIC ACID 2 g"), {});
  assert.deepEqual(labelAmounts(null), {});
});
