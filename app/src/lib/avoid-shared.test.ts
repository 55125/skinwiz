import { test } from "node:test";
import assert from "node:assert/strict";
import { avoidConflicts, avoidedIngredientId, avoidedIngredientName, ingredientAvoidId, normalizeAvoidId, parseFreeParam } from "./avoid-shared";

test("ingredient avoid ids: any ingredient page id behind an ing: prefix", () => {
  assert.equal(ingredientAvoidId("iron-oxides"), "ing:iron-oxides");
  assert.equal(avoidedIngredientId("ing:iron-oxides"), "iron-oxides");
  assert.equal(avoidedIngredientId("fragrance-free"), undefined);
  assert.equal(normalizeAvoidId("ing:iron-oxides"), "ing:iron-oxides");
  assert.equal(normalizeAvoidId("ing:Iron Oxides"), undefined);
  assert.equal(normalizeAvoidId("ing:"), undefined);
  assert.deepEqual(parseFreeParam("fragrance-free,ing:iron-oxides,ing:bad id"), ["fragrance-free", "ing:iron-oxides"]);
  assert.equal(avoidedIngredientName("ing:iron-oxides"), "iron oxides");
});

test("avoidConflicts: an avoided ingredient is checked against the product's own ingredients", () => {
  const assessed = { freeFromFlags: ["fragrance-free"], allergenHits: [] };
  // ingredient ids in hand (a pasted list, the match score)
  assert.deepEqual(avoidConflicts({ ...assessed, ingredientIds: ["water", "iron-oxides"] }, ["ing:iron-oxides"]), { conflicts: ["ing:iron-oxides"], possible: [] });
  assert.deepEqual(avoidConflicts({ ...assessed, ingredientIds: ["water"] }, ["ing:iron-oxides", "fragrance-free"]), { conflicts: [], possible: [] });
  // or looked up by product id
  const lists = (productId: string, ingredientId: string) => productId === "p1" && ingredientId === "iron-oxides";
  assert.deepEqual(avoidConflicts({ ...assessed, id: "p1" }, ["ing:iron-oxides"], lists)?.conflicts, ["ing:iron-oxides"]);
  assert.deepEqual(avoidConflicts({ ...assessed, id: "p2" }, ["ing:iron-oxides"], lists)?.conflicts, []);
  // nothing to check against: couldn't check, never clear
  assert.equal(avoidConflicts({ ...assessed, id: "p1" }, ["ing:iron-oxides"]), null);
  // no full ingredient list: couldn't check either
  assert.equal(avoidConflicts({ freeFromFlags: null, id: "p1" }, ["ing:iron-oxides"], lists), null);
});
