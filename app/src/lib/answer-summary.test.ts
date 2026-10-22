// The plain-language lead on ingredient and allergen pages. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { allergenSummary, ingredientSummary, listPhrase } from "./answer-summary";

test("lists read naturally", () => {
  assert.equal(listPhrase([]), "");
  assert.equal(listPhrase(["a"]), "a");
  assert.equal(listPhrase(["a", "b", "c"], "or"), "a, b or c");
});

test("an active ingredient's lead says how common it is and what it's for", () => {
  const s = ingredientSummary({
    name: "Salicylic Acid",
    products: 1200,
    brands: 300,
    asActive: 900,
    use: "Acne blemishes, blackheads and whiteheads.",
    allergens: [],
    failedChecks: [],
    avgPosition: null,
  }).join(" ");
  assert.equal(
    s,
    "Salicylic Acid is listed on 1,200 products from 300 brands in the Actively catalog, 900 as an active ingredient. As an active, it is used for acne blemishes, blackheads and whiteheads.",
  );
});

test("an allergen ingredient's lead names the allergen and the checks it fails", () => {
  const s = ingredientSummary({ name: "Fragrance (Parfum)", products: 1, brands: 1, asActive: 0, allergens: ["Fragrance (undisclosed blend)"], failedChecks: ["Fragrance-free", "Phthalate-free"], avgPosition: 18 }).join(" ");
  assert.match(s, /^Fragrance \(Parfum\) is listed on 1 product from 1 brand in the Actively catalog\./);
  assert.match(s, /It is a known contact allergen\./);
  assert.match(s, /not fragrance-free or phthalate-free\./);
  assert.match(s, /around position 18, well down the list/);
  assert.match(ingredientSummary({ name: "Quaternium-15", products: 3, brands: 2, asActive: 0, allergens: ["Formaldehyde releasers"], failedChecks: [], avgPosition: null }).join(" "), /It is a known contact allergen: Formaldehyde releasers\./);
  // an allergen named after the ingredient isn't repeated
  assert.match(ingredientSummary({ name: "Lanolin", products: 5, brands: 2, asActive: 0, allergens: ["Lanolin (wool alcohols)"], failedChecks: [], avgPosition: null }).join(" "), /It is a known contact allergen\.$/);
});

test("an allergen's lead gives label names and counts, and never claims 'free of' a metal", () => {
  const base = { name: "Methylisothiazolinone (MI)", section: "Other preservatives and antiseptics", labelNames: ["methylisothiazolinone", "neolone", "kathon"], listedOn: 409, freeOf: 9000, hideable: false, families: ["Isothiazolinones (MI, MCI/MI)"] };
  const s = allergenSummary(base).join(" ");
  assert.match(s, /^Methylisothiazolinone \(MI\) is a known contact allergen \(other preservatives and antiseptics\)/);
  assert.match(s, /also appear as neolone or kathon\./);
  assert.match(s, /409 products in the Actively catalog list it, and 9,000 with a full ingredient list are free of it\./);
  const metal = allergenSummary({ ...base, name: "Nickel", labelNames: ["nickel"], listedOn: 1, freeOf: null, families: [] }).join(" ");
  assert.match(metal, /1 product in the Actively catalog lists it\./);
  assert.doesNotMatch(metal, /free of/);
});
