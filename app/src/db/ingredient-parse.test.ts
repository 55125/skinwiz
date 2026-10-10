import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalSlug, parseIngredients } from "./ingredient-parse";
import { matchActiveIds } from "./actives";

const slugs = (text: string) => parseIngredients(text).map((i) => canonicalSlug(i.slug));

test("parseIngredients: the labeler's address after the list is not ingredients", () => {
  assert.deepEqual(
    slugs("Inactive ingredients Allantoin, fragrance, Corn starch. Manufactured For/ Distributed By: Marlex Pharmaceuticals, Inc. New Castle, DE 19720"),
    ["allantoin", "fragrance", canonicalSlug("corn-starch")],
  );
  // a kit's second list after the address is kept
  assert.deepEqual(slugs("glycerin. Distributed by CHATTEM, INC. P.O. Box 2219 | aloe barbadensis leaf juice, mica"), [
    "glycerin",
    "aloe-barbadensis-leaf-juice",
    "mica",
  ]);
});

test("parseIngredients: organic footnotes are dropped, the ingredient they trail is kept", () => {
  assert.deepEqual(slugs("Water, Shea Butter Denotes Certified Organic Ingredient, * Organic Ingredients"), ["water", "shea-butter"]);
});

test("parseIngredients: foreign-language warnings and bare fragments get no pages", () => {
  assert.deepEqual(slugs("Aqua, TENIR HORS DE PORTÉE DES ENFANTS, Não ingerir, ACID, Inc, Glycerin"), ["water", "glycerin"]);
});

test("parseIngredients: a Cyrillic letter inside a Latin name folds to the Latin one", () => {
  assert.deepEqual(slugs("Аqua, Glycerin"), ["water", "glycerin"]);
});

test("canonicalSlug: misspellings, split words and French names reach the right page", () => {
  assert.equal(canonicalSlug("acetyl-cedrine"), "acetyl-cedrene");
  assert.equal(canonicalSlug("acide-citrique"), "citric-acid");
  assert.equal(canonicalSlug("coco-gluco-side"), "coco-glucoside");
  // aliases never chain: the misspelling that used to point at a misspelling
  assert.equal(canonicalSlug("chamomilla-recutita-flower-exact"), "chamomilla-recutita-flower-extract");
});

test("matchActiveIds: a misspelled bisoctrizole name isn't read as phenol", () => {
  assert.deepEqual(matchActiveIds("Methylene Bis-benzotriazolyl tetramethylbutyiphenol 2.5%"), ["bisoctrizole"]);
});
