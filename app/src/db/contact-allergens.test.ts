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
  ["Acrylates/C10-30 Alkyl Acrylate Crosspolymer", ["acrylate-polymers"], ["acrylate-monomers"]],
  ["Ammonium Acryloyldimethyltaurate/VP Copolymer", [], ["acrylate-polymers", "acrylate-monomers"]],
  ["Carbomer", ["acrylate-polymers"], ["acrylate-monomers"]],
  ["Polymethyl Methacrylate", ["acrylate-polymers"], ["acrylate-monomers"]],
  ["Methyl Methacrylate Crosspolymer", ["acrylate-polymers"], ["acrylate-monomers"]],
  ["Hydroxyethyl Acrylate/Sodium Acryloyldimethyl Taurate Copolymer", ["acrylate-polymers"], ["acrylate-monomers"]],
  ["Glyceryl Acrylate/Acrylic Acid Copolymer", ["acrylate-polymers"], ["acrylate-monomers"]],
  ["Methyl Methacrylate", ["acrylate-monomers"], ["acrylate-polymers"]],
  ["Hydroxyethyl Methacrylate", ["acrylate-monomers"], ["acrylate-polymers"]],
  ["HEMA", ["acrylate-monomers"], ["acrylate-polymers"]],
  ["Ethyl Cyanoacrylate", ["acrylate-monomers"], ["acrylate-polymers"]],
  ["Di-HEMA Trimethylhexyl Dicarbamate", ["acrylate-monomers"], ["acrylate-polymers"]],
  ["Hydrocortisone Acetate", ["corticosteroid-class-a"], ["corticosteroid-class-d2"]],
  ["Hydrocortisone Butyrate", ["corticosteroid-class-d2"], ["corticosteroid-class-a", "corticosteroid-class-d1"]],
  ["Methylchloroisothiazolinone", ["mci-mi", "methylisothiazolinone"], []],
  ["Gentamicin Sulfate", ["neomycin"], []],
  ["Betamethasone 17,21-Dipropionate", ["corticosteroid-class-d1"], ["corticosteroid-class-c"]],
  ["Betamethasone Sodium Phosphate", ["corticosteroid-class-c"], ["corticosteroid-class-d1"]],
  ["Halobetasol Propionate", ["corticosteroid-class-d1"], ["corticosteroid-class-d2"]],
  ["Alclometasone Dipropionate", ["corticosteroid-class-d1"], ["corticosteroid-class-d2"]],
  ["Clocortolone Pivalate", ["corticosteroid-class-c"], ["corticosteroid-class-d1", "corticosteroid-class-d2"]],
  ["Diflorasone Diacetate", ["corticosteroid-class-d1"], ["corticosteroid-class-d2"]],
  ["Flurandrenolide", ["corticosteroid-class-b"], []],
  ["Clobetasol Propionate", ["corticosteroid-class-d1"], ["corticosteroid-class-d2"]],
  ["Prednicarbate", ["corticosteroid-class-d2"], ["corticosteroid-class-d1", "corticosteroid-class-a"]],
  ["Methenamine", ["methenamine"], []],
  ["Quaternium-15 (Methenamine 3-Chloroallylochloride)", ["quaternium-15"], ["methenamine"]],
  ["MDM Hydantoin", ["mdm-hydantoin"], ["dmdm-hydantoin"]],
  ["4,4-Dimethyloxazolidine", ["dimethyl-oxazolidine"], []],
  ["7-Ethylbicyclooxazolidine", ["ethylbicyclooxazolidine"], ["dimethyl-oxazolidine"]],
  ["Polyoxymethylene Urea", ["polyoxymethylene-urea"], []],
  ["Tris(Hydroxymethyl)Nitromethane", ["tris-nitro"], []],
  ["DMDM Hydantoin", ["dmdm-hydantoin"], ["mdm-hydantoin"]],
  ["Myroxylon Pereirae (Balsam Peru) Resin", ["balsam-of-peru"], ["tolu-balsam"]],
  ["Myroxylon Balsamum Var. Pereirae Resin", ["balsam-of-peru"], ["tolu-balsam"]],
  ["Myroxylon Balsamum (Balsam Tolu) Resin", ["tolu-balsam"], ["balsam-of-peru"]],
  ["Styrax Benzoin Gum", ["benzoin"], []],
  ["Sodium Benzoate", ["sodium-benzoate"], ["benzoin"]],
  ["Cinnamomum Zeylanicum Bark Oil", ["cinnamon"], ["cinnamal"]],
  ["Cinnamomum Camphora (Camphor) Bark Oil", [], ["cinnamon"]],
  ["Eugenia Caryophyllus (Clove) Bud Oil", ["clove"], ["eugenol"]],
  ["Trifolium Pratense (Clover) Flower Extract", [], ["clove"]],
  ["Beta-Caryophyllene", [], ["clove"]],
  ["Procaine HCl", ["other-ester-caines"], ["benzocaine"]],
  ["Centaurea Cyanus Flower Water", ["compositae"], []],
  ["Arctium Lappa Root Extract", ["compositae"], []],
  ["Helianthus Annuus (Sunflower) Seed Oil", [], ["compositae"]],
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
  assert.deepEqual(read("Methylchloroisothiazolinone/methylisothiazolinone 0.02% aq ++").ids, ["mci-mi"]);
  assert.deepEqual(read("Methylchloroisothiazolinone 0.01% aq +").ids, ["mci-mi"]);
  assert.deepEqual(read("Carba mix 3% pet +").ids, []);
  assert.equal(read("Quaternium-15 2% pet negative").negative, true);
  assert.equal(read("Quaternium-15 2% pet -").negative, true);
  assert.equal(read("Methylisothiazolinone 0.2% aq +++").negative, false);
  assert.equal(parsePatchTestResults("Kathon CG, Lyral; Nickel sulfate").length, 3);
});

test("label spellings seen in the catalog, and short pasted lists", async () => {
  const { allergensInList } = await import("./contact-allergens");
  assert.deepEqual(allergensInIngredient("methyisothiazolinone"), ["methylisothiazolinone"]);
  assert.deepEqual(allergensInIngredient("Methylchloroisothiazolone"), ["mci-mi", "methylisothiazolinone"]);
  assert.deepEqual(allergensInIngredient("Cocoamidopropyl Betaine"), ["cocamidopropyl-betaine"]);
  assert.deepEqual(allergensInIngredient("Paraformaldehyde"), ["formaldehyde"]);
  assert.deepEqual(allergensInIngredient("Hydrocortisone 17-Valerate"), ["corticosteroid-class-d2"]);
  assert.deepEqual(allergensInIngredient("Betamethasone 17-Valerate"), ["corticosteroid-class-d1"]);
  assert.deepEqual(allergensInIngredient("Ensulizole"), ["other-uv-filters"]);
  // Under the 60-character floor for catalog text, but a whole list when pasted.
  assert.equal(computeAllergenHits("Water, Glycerin, Parfum, Methylisothiazolinone"), null);
  assert.ok(allergensInList("Water, Glycerin, Parfum, Methylisothiazolinone").includes("methylisothiazolinone"));
});

test("labels without spaces after commas, and 'X-free' claims", () => {
  const hits = computeAllergenHits("Water,Glycerin,Benzophenone-3,4-Methylbenzylidene Camphor,Quaternium-15,1,2-Hexanediol,Dimethicone");
  assert.ok(hits?.includes("oxybenzone") && hits.includes("quaternium-15"), String(hits));
  assert.deepEqual(computeAllergenHits("Water, Glycerin, 2-Bromo-2-Nitropropane-1,3-Diol, Dimethicone. Paraben-free, nickel free."), ["bronopol"]);
  assert.ok(computeAllergenHits("Water, Glycerin, Dimethicone, Methylparaben, Phenoxyethanol, Tocopherol")?.includes("parabens"));
});

test("cross-reactor groups: old ids keep their meaning, tosylamide resin is out of the formaldehyde groups", async () => {
  const { allergenMembers, allergensInList, PATCH_TEST_FAMILY } = await import("./contact-allergens");
  assert.deepEqual(allergenMembers("corticosteroid-class-d"), ["corticosteroid-class-d1", "corticosteroid-class-d2"]);
  assert.deepEqual(allergenMembers("acrylates"), ["acrylate-monomers", "acrylate-polymers"]);
  assert.ok(!allergenMembers("formaldehyde-and-releasers").includes("tosylamide-formaldehyde-resin"));
  assert.ok(!allergenMembers("formaldehyde-releasers").includes("tosylamide-formaldehyde-resin"));
  assert.ok(allergenMembers("formaldehyde-releasers").includes("methenamine"));
  assert.equal(PATCH_TEST_FAMILY["corticosteroid-class-d2"].id, "hydrocortisone-type-steroids");
  // Monomer and polymer judged per ingredient within one list.
  const hits = allergensInList("Ethyl Acetate, Butyl Acetate, Methyl Methacrylate Crosspolymer, HEMA, Carbomer");
  assert.ok(hits.includes("acrylate-monomers") && hits.includes("acrylate-polymers"));
  const polymersOnly = allergensInList("Water, Glycerin, Methyl Methacrylate Crosspolymer, Acrylates Copolymer, Carbomer, Phenoxyethanol");
  assert.ok(!polymersOnly.includes("acrylate-monomers") && polymersOnly.includes("acrylate-polymers"));
});

test("an MI or MCI/MI positive ticks the isothiazolinone family by default; the new releasers join the releaser groups", async () => {
  const { PATCH_TEST_FAMILY, allergenMembers } = await import("./contact-allergens");
  assert.deepEqual(PATCH_TEST_FAMILY["methylisothiazolinone"], { id: "isothiazolinones", byDefault: true });
  assert.deepEqual(PATCH_TEST_FAMILY["mci-mi"], { id: "isothiazolinones", byDefault: true });
  for (const id of ["dimethyl-oxazolidine", "ethylbicyclooxazolidine", "polyoxymethylene-urea", "tris-nitro"]) {
    assert.ok(allergenMembers("formaldehyde-releasers").includes(id), id);
    assert.ok(allergenMembers("formaldehyde-and-releasers").includes(id), id);
  }
});
