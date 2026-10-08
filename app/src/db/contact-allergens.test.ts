// Regression cases for contact-allergen matching: `npm test`. Each case is a
// label name, the allergens it must match and ones it must not -- mostly the
// near-misses a substring match gets wrong.
import { test } from "node:test";
import assert from "node:assert/strict";
import { allergenFinding, allergensInIngredient, computeAllergenHits, parsePatchTestResults } from "./contact-allergens";
import { splitIngredientList } from "./ingredient-parse";

const NAMES: [string, string[], string[]][] = [
  ["Isoeugenol", ["isoeugenol"], ["eugenol"]],
  ["Hexyl Cinnamal", ["hexyl-cinnamal"], ["cinnamal"]],
  ["Amyl Cinnamal", ["amyl-cinnamal"], ["cinnamal"]],
  ["Cinnamal", ["cinnamal"], []],
  ["Kathon CG", ["mci-mi", "methylisothiazolinone"], []],
  ["Methylchloroisothiazolinone/Methylisothiazolinone", ["mci-mi", "methylisothiazolinone"], []],
  ["Lyral", ["hicc"], []],
  ["Hydroxyisohexyl 3-Cyclohexene Carboxaldehyde", ["hicc"], []],
  ["Parfum (Fragrance)", ["fragrance"], []],
  ["Fragrance-Free", [], ["fragrance"]],
  ["Sodium Methylparaben", ["parabens"], []],
  ["Quaternium 15", ["quaternium-15"], []],
  ["Polyquaternium-10", [], ["quaternium-15"]],
  ["Tosylamide/Formaldehyde Resin", ["tosylamide-formaldehyde-resin"], ["formaldehyde"]],
  ["PEG-75 Lanolin", ["lanolin"], []],
  ["Tocopheryl Acetate", ["tocopherol"], []],
  ["Polypropylene Glycol", [], ["propylene-glycol"]],
  ["Propanediol", [], ["propylene-glycol"]],
  ["Acrylates/C10-30 Alkyl Acrylate Crosspolymer", ["acrylates"], []],
  ["Ammonium Acryloyldimethyltaurate/VP Copolymer", [], ["acrylates"]],
  ["Hydrocortisone Acetate", ["corticosteroid-class-a"], ["corticosteroid-class-d"]],
  ["Hydrocortisone Butyrate", ["corticosteroid-class-d"], ["corticosteroid-class-a"]],
  ["Chrysanthemum Parthenium (Feverfew) Extract", ["compositae"], []],
  ["Caprylyl/Capryl Glucoside", ["other-alkyl-glucosides"], []],
  ["Ascorbyl Glucoside", [], ["other-alkyl-glucosides"]],
  ["Benzyl Benzoate", ["benzyl-benzoate"], ["sodium-benzoate"]],
  ["Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine", ["bemotrizinol"], ["hydroxyethyl-triazine"]],
  ["Hexahydro-1,3,5-Tris(2-Hydroxyethyl)Triazine", ["hydroxyethyl-triazine"], []],
  ["Toluene-2,5-Diamine Sulfate", ["ptd"], []],
  ["Mentha Citrata Bergamot Mint", [], ["bergamot"]],
  ["Ethyl Linalool", [], ["linalool"]],
  ["Pterocarpus Santalinus (Red Sandalwood) Extract", [], ["sandalwood"]],
  ["Water", [], []],
];

test("label names map to the right allergens", () => {
  for (const [name, must, mustNot] of NAMES) {
    const got = allergensInIngredient(name);
    for (const id of must) assert.ok(got.includes(id), `${name} should match ${id}, got ${got.join(", ")}`);
    for (const id of mustNot) assert.ok(!got.includes(id), `${name} should not match ${id}`);
  }
});

test("whole-list matching survives chemical locants and flags hidden fragrance", () => {
  const hits = computeAllergenHits("Water, Polysorbate 20, 2-Bromo-2-Nitropropane-1,3-Diol, 1,2-Hexanediol, Parfum, DMDM Hydantoin")!;
  assert.deepEqual([...hits].sort(), ["bronopol", "dmdm-hydantoin", "fragrance"]);
  assert.equal(allergenFinding(hits, "fragrance-mix-1")?.level, "may-contain");
  assert.equal(allergenFinding(hits, "formaldehyde-releasers")?.level, "contains");
  assert.equal(allergenFinding(hits, "isothiazolinones"), null);
  assert.equal(computeAllergenHits("Salicylic Acid 2%"), null);
});

test("the ingredient splitter keeps locants together", () => {
  assert.deepEqual(splitIngredientList("Water, 1,2-Hexanediol, Glycerin").map((s) => s.trim()), ["Water", "1,2-Hexanediol", "Glycerin"]);
});

test("patch-test results sheets", () => {
  const read = (line: string) => parsePatchTestResults(line)[0];
  assert.deepEqual(read("Fragrance mix I 8% pet +").ids, ["fragrance-mix-1"]);
  assert.deepEqual(read("Fragrance mix II 14% pet +").ids, ["fragrance-mix-2"]);
  assert.deepEqual(read("Amerchol L-101 50% pet ++").ids, ["lanolin"]);
  assert.deepEqual(read("Tixocortol-21-pivalate 0.1% pet +").ids, ["corticosteroid-class-a"]);
  assert.deepEqual(read("MI").ids, ["methylisothiazolinone"]);
  assert.deepEqual(read("Carba mix 3% pet +").ids, []);
  assert.equal(read("Quaternium-15 2% pet negative").negative, true);
  assert.equal(read("Quaternium-15 2% pet -").negative, true);
  assert.equal(read("Methylisothiazolinone 0.2% aq +++").negative, false);
  assert.equal(parsePatchTestResults("Kathon CG, Lyral; Nickel sulfate").length, 3);
});
