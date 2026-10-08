// `npm test`: card text for FDA active lines the strength parser couldn't read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { unparsedActivesLine } from "./strength-display";

test("names the actives and says the strength is unclear", () => {
  assert.equal(unparsedActivesLine("SALICYLIC ACID 1.8 mg/180mL"), "Salicylic Acid · strength unclear on the label");
  assert.equal(unparsedActivesLine("SALICYLIC ACID .14 mg/1"), "Salicylic Acid · strength unclear on the label");
  assert.equal(unparsedActivesLine("SALICYLIC ACID 1 mg/100mL; SULFUR 2 mg/100mL"), "Salicylic Acid · Sulfur · strength unclear on the label");
});

test("a stated percentage is left as printed", () => {
  assert.equal(unparsedActivesLine("Active Ingredient 2% Salicylic Acid"), null);
});
