import { test } from "node:test";
import assert from "node:assert/strict";
import { ANYWHERE_LISTED_ACTIVE_IDS, matchActiveIds } from "./actives";
import { canonicalSlug, parseIngredients } from "./ingredient-parse";

test("bemotrizinol is matched under each of its names", () => {
  for (const name of ["BEMOTRIZINOL", "Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine 3%", "Tinosorb S", "Parsol Shield", "BEMT"]) {
    assert.deepEqual(matchActiveIds(name), ["bemotrizinol"], name);
  }
  assert.deepEqual(matchActiveIds("Avobenzone (3%), Bemotrizinol (6%), Homosalate (15%), Octisalate (5%)"), [
    "avobenzone",
    "octisalate",
    "homosalate",
    "bemotrizinol",
  ]);
});

test("a name inside another active's name only counts once", () => {
  assert.deepEqual(matchActiveIds("4-Methylbenzylidene Camphor 4%"), ["enzacamene"]);
  assert.deepEqual(matchActiveIds("Capryloyl Salicylic Acid"), ["capryloyl-salicylic-acid"]);
  assert.deepEqual(matchActiveIds("Camphor 1%, Capryloyl Salicylic Acid, Salicylic Acid 2%").sort(), ["camphor", "capryloyl-salicylic-acid", "salicylic-acid"]);
});

test("bemotrizinol in an INCI or inactive list lands on the active's ingredient page", () => {
  const slugs = parseIngredients("Water, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Glycerin").map((i) => i.slug);
  assert.ok(slugs.includes("bemotrizinol"));
  assert.ok(ANYWHERE_LISTED_ACTIVE_IDS.has("bemotrizinol"));
  // zinc oxide / titanium dioxide double as makeup colorants
  assert.ok(!ANYWHERE_LISTED_ACTIVE_IDS.has("titanium-dioxide"));
});

test("old ingredient links for newly tracked actives redirect", () => {
  assert.equal(canonicalSlug("bis-ethylhexyloxyphenol-methoxyphenyl-triazine"), "bemotrizinol");
  assert.equal(canonicalSlug("benzophenone-4"), "sulisobenzone");
  assert.equal(canonicalSlug("bemotrizinol"), "bemotrizinol");
  assert.equal(canonicalSlug("water"), "water");
});
