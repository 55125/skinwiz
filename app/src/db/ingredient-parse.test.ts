import { test } from "node:test";
import assert from "node:assert/strict";
import { aliasesFor, canonicalSlug, isOtherName, parseIngredients } from "./ingredient-parse";
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
  assert.deepEqual(slugs("Water, Shea Butter Denotes Certified Organic Ingredient, * Organic Ingredients"), ["water", "butyrospermum-parkii-butter"]);
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

test("canonicalSlug: every iron oxide name shares the Iron Oxides page", () => {
  for (const name of [
    "Iron Oxides (CI 77491)", "Iron Oxide", "CI 77491", "CI 77499 Iron Oxides", "Iron Oxides CI 77492",
    "CI 77491/CI 77492/CI 77499", "FERRIC OXIDE RED", "FERROSOFERRIC OXIDE", "Ferric Oxide Yellow",
    "Black Iron Oxide (CI 77499)", "Iron Oxide Red", "iron oxides (ci 77499)] <iln50838>", "C1 77492",
  ]) assert.deepEqual(slugs(name), ["iron-oxides"], name);
  // other iron compounds, and a bare "Iron", stay apart
  assert.deepEqual(slugs("Ferric Ferrocyanide, Iron Titanium Oxide, Iron"), ["ferric-ferrocyanide", "iron-titanium-oxide", "iron"]);
});

test("canonicalSlug: other names for one substance share its page", () => {
  assert.deepEqual(slugs("Purified Water"), ["water"]);
  assert.deepEqual(slugs("Deionized Water"), ["water"]);
  assert.deepEqual(slugs("Shea Butter"), ["butyrospermum-parkii-butter"]);
  assert.deepEqual(slugs("Cetostearyl Alcohol"), ["cetearyl-alcohol"]);
  assert.deepEqual(slugs("CI 77891"), ["titanium-dioxide"]);
  assert.deepEqual(slugs("CI 77891 / Titanium Dioxide"), ["titanium-dioxide"]);
  // a second pigment's number: not just titanium dioxide
  assert.notDeepEqual(slugs("CI 77891 / Titanium Dioxide - CI 77491"), ["titanium-dioxide"]);
  assert.deepEqual(slugs("Phenoxyethanol <ILN45635>"), ["phenoxyethanol"]);
});

test("canonicalSlug: a certified color under any label name, its lake apart", () => {
  for (const name of ["FD&C Yellow No. 5", "Yellow 5", "CI 19140 Yellow 5", "Yellow 5 CI 19140", "CI 19140"])
    assert.deepEqual(slugs(name), ["yellow-5"], name);
  assert.deepEqual(slugs("FD&C Yellow No. 5 Aluminum Lake"), ["yellow-5-lake"]);
  assert.deepEqual(slugs("D&C Red No. 7 Calcium Lake"), ["red-7-lake"]);
});

test("aliasesFor: a merged-in name shows as also listed as, numbers and all", () => {
  const aliases = aliasesFor("yellow-5", "Yellow 5", new Map([["Yellow 5", 9]]), 8, new Map([["FD&C YELLOW NO. 5", 4]]));
  assert.deepEqual(aliases, ["FD&C Yellow No. 5"]);
});

test("isOtherName: another name for the substance, not a misspelling", () => {
  assert.equal(isOtherName("shea-butter"), true);
  assert.equal(isOtherName("ferric-oxide-red"), true);
  assert.equal(isOtherName("titanium-dioxida"), false);
  assert.equal(isOtherName("glycerin"), false);
});
