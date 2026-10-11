// `npm test`: pet mode's species-toxicity list and isolation (db/pet.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { catCaution, forSpecies, petWarnings } from "./pet";

const product = (o: Partial<Parameters<typeof catCaution>[0]>) => ({
  species: ["dog"],
  notForCats: false,
  activeIngredientText: null,
  inactiveIngredientText: null,
  actives: [],
  ...o,
});

test("a dog-only permethrin spot-on is dangerous for cats", () => {
  const p = product({ activeIngredientText: "Permethrin 44.88%", actives: [{ name: "Permethrin", pct: 44.88 }] });
  assert.deepEqual(petWarnings(p).map((w) => [w.rule.id, w.species]), [["permethrin-pyrethroids", ["cat"]]]);
  assert.equal(catCaution(p), "danger");
});

test("a pyrethroid product labeled for cats gets no cat flag", () => {
  const p = product({ species: ["cat", "dog"], activeIngredientText: "Phenothrin 0.1%" });
  assert.equal(petWarnings(p).length, 0);
  assert.equal(catCaution(p), null);
});

test("tea tree oil flags both species, wherever it is listed", () => {
  const p = product({ species: ["cat", "dog"], inactiveIngredientText: "Water, Melaleuca Alternifolia (Tea Tree) Leaf Oil" });
  assert.deepEqual(petWarnings(p)[0].species, ["cat", "dog"]);
});

test("zinc oxide flags dogs only at 10% or more, or an unknown strength", () => {
  const at = (pct: number | null) => product({ activeIngredientText: "Zinc Oxide", actives: [{ name: "ZINC OXIDE", pct }] });
  assert.equal(petWarnings(at(2)).length, 0);
  assert.equal(petWarnings(at(20))[0].rule.id, "zinc-oxide");
  assert.equal(petWarnings(at(null))[0].rule.id, "zinc-oxide");
});

test("dog-only products without a cat-toxic ingredient say dogs only; the label's own ban wins", () => {
  assert.equal(catCaution(product({ activeIngredientText: "Chlorhexidine 4%" })), "dog_only");
  assert.equal(catCaution(product({ notForCats: true })), "danger");
  assert.equal(catCaution(product({ species: ["pet"] })), null);
});

test("'pet' labels (no species named) match both species filters", () => {
  assert.ok(forSpecies(["pet"], "cat"));
  assert.ok(forSpecies(["dog"], "dog"));
  assert.ok(!forSpecies(["dog"], "cat"));
});

// Pet rows live in their own table so no human listing, search or count can
// show one. Only the seed and lib/pet-catalog.ts may read it.
test("only the seed and lib/pet-catalog.ts touch pet_products", () => {
  const root = path.resolve(process.cwd(), "src");
  const allowed = new Set(["db/schema.ts", "db/seed.ts", "db/seed-pets.ts", "lib/pet-catalog.ts", "db/pet.ts", "db/pet.test.ts"]);
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name) && !allowed.has(path.relative(root, full))) {
        if (/\bpetProducts\b|\bpet_products\b/.test(fs.readFileSync(full, "utf-8"))) offenders.push(path.relative(root, full));
      }
    }
  };
  walk(root);
  assert.deepEqual(offenders, []);
});
