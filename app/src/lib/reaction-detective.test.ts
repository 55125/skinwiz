// Reaction Detective's ranking (lib/reaction-detective.ts): an allergen in
// every reacted product and no tolerated one is a strong lead; a tolerated
// product that lists it lowers it; one reacted product only gives
// "possible"; different releasers point at the family; common ingredients
// never become suspects; shared retinoids/acids are called out. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeReactions, seriesFor, type DetectiveProduct } from "./reaction-detective";

const ing = (id: string, productCount = 50, position = 1) => ({ id, name: id.replace(/-/g, " "), position, productCount });

function product(name: string, hits: string[] | null, ingredients = [ing("water", 9000)]): DetectiveProduct {
  return { id: name, name, allergenHits: hits, ingredients };
}

const N = 10_000;

test("an allergen in every reacted product and no tolerated one is strong", () => {
  const r = analyzeReactions(
    [product("A", ["methylisothiazolinone", "fragrance"]), product("B", ["methylisothiazolinone"])],
    [product("C", ["fragrance"])],
    N,
  );
  const mi = r.suspects.find((s) => s.id === "methylisothiazolinone")!;
  assert.equal(mi.strength, "strong");
  assert.deepEqual(mi.reactedIn, ["A", "B"]);
  const frag = r.suspects.find((s) => s.id === "fragrance")!;
  assert.equal(frag.strength, "weaker");
  assert.deepEqual(frag.fineIn, ["C"]);
  assert.equal(r.suspects[0].id, "methylisothiazolinone");
  assert.equal(r.needMore, false);
});

test("one reacted product gives only possible allergens and no plain ingredients", () => {
  const r = analyzeReactions([product("A", ["lanolin"], [ing("rare-extract", 3), ing("lanolin", 500)])], [], N);
  assert.equal(r.needMore, true);
  assert.deepEqual(r.suspects.map((s) => [s.id, s.strength]), [["lanolin", "possible"]]);
});

test("different formaldehyde releasers point at the family", () => {
  const r = analyzeReactions([product("A", ["dmdm-hydantoin"]), product("B", ["quaternium-15"])], [], N);
  const group = r.suspects.find((s) => s.kind === "group");
  assert.ok(group, "expected a group suspect");
  assert.equal(group.strength, "strong");
  assert.equal(group.members?.length, 2);
  assert.equal(r.suspects[0].kind, "group");
});

test("shared uncommon ingredients count; common or tolerated ones don't", () => {
  const r = analyzeReactions(
    [
      product("A", [], [ing("water", 9000), ing("polyglyceryl-4-caprate", 40), ing("cetearyl-alcohol", 900)]),
      product("B", [], [ing("water", 9000), ing("polyglyceryl-4-caprate", 40), ing("cetearyl-alcohol", 900)]),
    ],
    [product("C", [], [ing("cetearyl-alcohol", 900)])],
    N,
  );
  assert.deepEqual(r.suspects.map((s) => s.id), ["polyglyceryl-4-caprate"]);
  assert.equal(r.suspects[0].avoidId, "ing:polyglyceryl-4-caprate");
});

test("products with no ingredient list are reported, not counted", () => {
  const r = analyzeReactions([product("A", null), product("B", ["lanolin"])], [], N);
  assert.deepEqual(r.unchecked, ["A"]);
  assert.equal(r.reactedChecked, 1);
});

test("a retinoid in every reacted product is called out", () => {
  const r = analyzeReactions(
    [product("A", [], [ing("retinol-cosmetic", 300, 20)]), product("B", [], [ing("adapalene", 30, 0)])],
    [],
    N,
  );
  const note = r.irritants.find((n) => n.cls === "retinoid");
  assert.ok(note?.all);
});

test("patch-test series coverage is found", () => {
  assert.ok(seriesFor("methylisothiazolinone").length > 0);
  assert.ok(seriesFor("quaternium-15").includes("T.R.U.E. Test"));
});
