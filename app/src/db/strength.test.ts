import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStrengths } from "./strength";

test("parseStrengths: semicolon-separated structured line", () => {
  assert.deepEqual(parseStrengths("AVOBENZONE 3 g/100mL; HOMOSALATE 10 g/100mL"), { avobenzone: 3, homosalate: 10 });
});

test("parseStrengths: comma-joined Drug Facts line gives each active its own percent", () => {
  assert.deepEqual(
    parseStrengths("Active ingredients Avobenzone 3%, Homosalate 10%, Octisalate 5%, Octocrylene 2.7%"),
    { avobenzone: 3, homosalate: 10, octisalate: 5, octocrylene: 2.7 },
  );
});

test("parseStrengths: comma after a mass/volume unit and a parenthesised percent", () => {
  assert.deepEqual(parseStrengths("ZINC OXIDE 25 g/100g, TITANIUM DIOXIDE 5 g/100g"), { "zinc-oxide": 25, "titanium-dioxide": 5 });
  assert.deepEqual(parseStrengths("Avobenzone (3%), Octisalate (5%)"), { avobenzone: 3, octisalate: 5 });
});

test("parseStrengths: kit parts separated by a pipe", () => {
  assert.deepEqual(
    parseStrengths("Salicylic acid 0.5% | Avobenzone 3%, Homosalate 10%"),
    { "salicylic-acid": 0.5, avobenzone: 3, homosalate: 10 },
  );
});

test("parseStrengths: a thousands separator is not a segment break", () => {
  assert.deepEqual(parseStrengths("SALICYLIC ACID 2,000 mg/100g"), null);
});

test("parseStrengths: several percents in one unseparated segment", () => {
  assert.deepEqual(
    parseStrengths("Active ingredients Avobenzone 3% Homosalate 15% Octisalate 5% Octocrylene 10%"),
    { avobenzone: 3, homosalate: 15, octisalate: 5, octocrylene: 10 },
  );
  assert.deepEqual(parseStrengths("Active Ingredients: Titanium Dioxide: 4% Zinc Oxide: 5.5%"), { "titanium-dioxide": 4, "zinc-oxide": 5.5 });
});
