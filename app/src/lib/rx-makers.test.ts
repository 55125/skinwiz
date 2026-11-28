import { test } from "node:test";
import assert from "node:assert/strict";
import { compareMakers } from "./rx-makers";
import { allergensThatVary } from "./rx-browse";

test("splits shared and per-maker inactives, and which makers list each varying allergen", () => {
  const c = compareMakers([
    { id: "a", labeler: "Taro", brandName: "X", names: ["Water", "Propylene Glycol", "Cetyl Alcohol"], allergenHits: ["propylene-glycol", "cetyl-alcohol"] },
    { id: "b", labeler: "Fougera", brandName: "X", names: ["water", "Cetyl alcohol", "Mineral oil"], allergenHits: ["cetyl-alcohol"] },
    { id: "c", labeler: "Nolist", brandName: "X", names: null, allergenHits: null },
  ]);
  assert.deepEqual(c.shared, ["Water", "Cetyl Alcohol"]);
  assert.deepEqual(c.makers.map((m) => m.id), ["b", "a", "c"]);
  assert.deepEqual(c.makers.find((m) => m.id === "a")!.distinctive, ["Propylene Glycol"]);
  assert.deepEqual(c.allergens, [{ id: "propylene-glycol", inIds: ["a"], notInIds: ["b"] }]);
  assert.equal(c.unknown, 1);
});

test("allergens that vary need two labels and a difference", () => {
  assert.deepEqual(allergensThatVary([["a", "b"]]), []);
  assert.deepEqual(allergensThatVary([["a", "b"], ["a"]]), ["b"]);
  assert.deepEqual(allergensThatVary([["a"], ["a"]]), []);
});
