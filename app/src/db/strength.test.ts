import { test } from "node:test";
import assert from "node:assert/strict";
import { labelFirstStrengths, parseStrengths } from "./strength";

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

test("labelFirstStrengths: the printed Drug Facts percent beats a structured unit slip", () => {
  // "1 g/mL" on a 1% clotrimazole solution read as 100%
  assert.deepEqual(labelFirstStrengths("CLOTRIMAZOLE 1 g/mL", "Active ingredient Clotrimazole USP, 1%"), { clotrimazole: 1 });
  // "4.5 g/50mL" on a 4.5% sunscreen read as 9%
  assert.deepEqual(
    labelFirstStrengths("OCTISALATE 4.5 g/50mL; AVOBENZONE 2.7 g/50mL", "ACTIVE INGREDIENTS Avobenzone 2.7% Octisalate 4.5%"),
    { octisalate: 4.5, avobenzone: 2.7 },
  );
});

test("labelFirstStrengths: the structured field fills what the label line doesn't give", () => {
  assert.deepEqual(labelFirstStrengths("ZINC OXIDE 20 g/100g; TITANIUM DIOXIDE 5 g/100g", "Zinc Oxide 20%"), { "zinc-oxide": 20, "titanium-dioxide": 5 });
  assert.deepEqual(labelFirstStrengths("SALICYLIC ACID 2 g/100mL", "Active ingredient: see carton"), { "salicylic-acid": 2 });
  assert.equal(labelFirstStrengths("", null), null);
});

test("labelFirstStrengths: drops a unit slip no label line can correct", () => {
  assert.equal(labelFirstStrengths("SALICYLIC ACID 2 g in 2 mL", ""), null);
  assert.equal(labelFirstStrengths("TITANIUM DIOXIDE 4.95 g in 9.9 g; ZINC OXIDE 1 g in 9.9 g", null)?.["titanium-dioxide"], undefined);
  // petrolatum's monograph runs to 100%
  assert.deepEqual(labelFirstStrengths("PETROLATUM 100 g/100g", null), { petrolatum: 100 });
});
