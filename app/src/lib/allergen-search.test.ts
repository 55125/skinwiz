import { test } from "node:test";
import assert from "node:assert/strict";
import { allergensInQuery } from "@/lib/allergen-search";

const ids = (q: string) => allergensInQuery(q).allergens.map((a) => a.id);

test("patch-test names from the 2026-11-22 search log", () => {
  assert.deepEqual(ids("cinnamic aldehyde"), ["cinnamal"]);
  assert.deepEqual(ids("bisphenol"), ["epoxy-resin"]);
  const pasted = allergensInQuery("bisphenol a epoxy resin, fragrance mix ii, propolis, decyl glucosidedisperse blu");
  assert.deepEqual(new Set(pasted.allergens.map((a) => a.id)), new Set(["epoxy-resin", "fragrance-mix-2", "propolis"]));
});

test("fragrance mix II is neither mix I nor undisclosed fragrance", () => {
  assert.deepEqual(ids("fragrance mix ii"), ["fragrance-mix-2"]);
  assert.deepEqual(ids("fragrance mix 1"), ["fragrance-mix-1"]);
});

test("an allergen that labels don't list has no page link but says where it's found", () => {
  const [epoxy] = allergensInQuery("epoxy resin").allergens;
  assert.equal(epoxy.href, null);
  assert.ok(epoxy.foundIn);
});

test("only a search made of allergen names counts as a list of results", () => {
  assert.equal(allergensInQuery("nickel, cobalt").allNamed, true);
  assert.equal(allergensInQuery("allergic to nickel").allNamed, true);
  assert.equal(allergensInQuery("tea tree shampoo").allNamed, false);
  assert.equal(allergensInQuery("fragrance free moisturizer").allNamed, false);
  assert.deepEqual(ids("cerave"), []);
});
