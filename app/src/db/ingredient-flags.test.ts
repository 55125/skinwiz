// Free-from checks against sample ingredient lists. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFreeFromFlags } from "./ingredient-flags";

const BASE = "Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Phenoxyethanol, Xanthan Gum";

test("phthalate-free passes a plain unscented list", () => {
  assert.ok(computeFreeFromFlags(BASE)!.includes("phthalate-free"));
});

test("phthalate-free fails on a listed phthalate, by name or abbreviation", () => {
  assert.ok(!computeFreeFromFlags(`${BASE}, Diethyl Phthalate`)!.includes("phthalate-free"));
  assert.ok(!computeFreeFromFlags(`${BASE}, DEP`)!.includes("phthalate-free"));
});

test("phthalate-free fails on undisclosed fragrance, which can hide phthalates", () => {
  const flags = computeFreeFromFlags(`${BASE}, Parfum`)!;
  assert.ok(!flags.includes("phthalate-free"));
  assert.ok(!flags.includes("fragrance-free"));
});

test("abbreviations only match a whole ingredient name", () => {
  // "dep" inside another word must not trip the check
  assert.ok(computeFreeFromFlags(`${BASE}, Sodium Dehydroacetate`)!.includes("phthalate-free"));
});
