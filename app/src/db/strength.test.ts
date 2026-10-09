import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStrengths } from "./strength";

test("structured and ;-separated lines", () => {
  assert.deepEqual(parseStrengths("BENZOYL PEROXIDE 50 mg/mL"), { "benzoyl-peroxide": 5 });
  assert.deepEqual(parseStrengths("TITANIUM DIOXIDE 38.5 mg in 1 mL; ZINC OXIDE 50 mg in 1 mL"), { "titanium-dioxide": 3.85, "zinc-oxide": 5 });
});

test("comma-separated Drug Facts lines give each active its own percent", () => {
  // Used to give all four the last percent (10).
  assert.deepEqual(parseStrengths("Active ingredients Avobenzone 3%, Homosalate 10%, Octisalate 5%, Octocrylene 10%"), {
    avobenzone: 3,
    homosalate: 10,
    octisalate: 5,
    octocrylene: 10,
  });
  assert.deepEqual(parseStrengths("Active ingredients Titanium Dioxide 3.2%, Zinc Oxide 21.6%"), { "titanium-dioxide": 3.2, "zinc-oxide": 21.6 });
});

test("unseparated and loosely punctuated lines", () => {
  assert.deepEqual(parseStrengths("Active ingredients Avobenzone 3%, Octinoxate 7.5% Octisalate 5%, Oxybenzone 4%"), {
    avobenzone: 3,
    octinoxate: 7.5,
    octisalate: 5,
    oxybenzone: 4,
  });
  assert.deepEqual(parseStrengths("Active Ingredients: Titanium Dioxide: 4% Zinc Oxide: 5.5%"), { "titanium-dioxide": 4, "zinc-oxide": 5.5 });
  assert.deepEqual(parseStrengths("Lip Balm: Avobenzone…3.0% Octinoxate...7.5%"), { avobenzone: 3, octinoxate: 7.5 });
  assert.deepEqual(parseStrengths("Zinc Oxide 12%, Titanium Dioxide 6%, Homosalate14%"), { "zinc-oxide": 12, "titanium-dioxide": 6, homosalate: 14 });
});

test("a % inside a structured substance name is not a strength", () => {
  assert.deepEqual(parseStrengths("DIMETHICONE CROSSPOLYMER (450000 MPA.S AT 12% IN CYCLOPENTASILOXANE) 100 mg in 1 g"), { dimethicone: 10 });
});
