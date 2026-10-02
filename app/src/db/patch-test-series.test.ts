// Series -> allergen mapping coverage: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALLERGEN_GROUPS, CONTACT_ALLERGENS, allergensInIngredient, parsePatchTestResults, resolveAllergenId } from "./contact-allergens";
import { NOT_ON_LABELS, PATCH_TEST_SERIES, getNotOnLabel, seriesItems, watchForNames } from "./patch-test-series";
import { judge } from "../lib/anti-scrape";

test("the T.R.U.E. Test has its 35 allergens, each mapped or marked not matchable", () => {
  const trueTest = PATCH_TEST_SERIES.find((s) => s.id === "true-test")!;
  const items = seriesItems(trueTest);
  assert.equal(items.length, 35);
  assert.deepEqual(
    items.map((i) => i.pos),
    [...Array.from({ length: 8 }, (_, i) => i + 1), ...Array.from({ length: 27 }, (_, i) => i + 10)],
  );
  for (const it of items) {
    assert.ok(it.ids.length > 0 || it.notOnLabel, `${it.name} maps to nothing`);
    assert.ok(!(it.ids.length > 0 && it.notOnLabel), `${it.name} is both mapped and not matchable`);
  }
});

test("every series item points at real ids", () => {
  for (const series of PATCH_TEST_SERIES) {
    for (const it of seriesItems(series)) {
      for (const id of it.ids) assert.equal(resolveAllergenId(id), id, `${series.id}: ${it.name} -> unknown ${id}`);
      if (it.notOnLabel) assert.ok(getNotOnLabel(it.notOnLabel), `${series.id}: ${it.name} -> unknown ${it.notOnLabel}`);
    }
  }
});

test("not-on-label ids never collide with allergen or family ids", () => {
  const taken = new Set([...CONTACT_ALLERGENS.map((a) => a.id), ...ALLERGEN_GROUPS.map((g) => g.id)]);
  for (const n of NOT_ON_LABELS) assert.ok(!taken.has(n.id), n.id);
});

test("added T.R.U.E. Test allergens match their label names", () => {
  const cases: [string, string][] = [
    ["Glyceryl Hydrogenated Rosinate", "colophonium"],
    ["Colophonium", "colophonium"],
    ["Dibucaine", "dibucaine"],
    ["Tetracaine HCl", "tetracaine"],
    ["Ethylenediamine Dihydrochloride", "ethylenediamine"],
    ["Colloidal Gold", "gold"],
  ];
  for (const [name, id] of cases) assert.ok(allergensInIngredient(name).includes(id), `${name} -> ${id}`);
  for (const name of ["Disodium EDTA", "Trisodium Ethylenediamine Disuccinate", "Ethylenediamine Tetraacetic Acid"]) {
    assert.ok(!allergensInIngredient(name).includes("ethylenediamine"), name);
  }
  for (const name of ["Calendula Officinalis (Marigold) Flower Extract", "Golden Jojoba Oil", "Rosa Canina Fruit Oil"]) {
    const got = allergensInIngredient(name);
    assert.ok(!got.includes("gold") && !got.includes("colophonium"), `${name}: ${got.join(", ")}`);
  }
  assert.deepEqual(parsePatchTestResults("Colophony 20% pet +")[0].ids, ["colophonium"]);
});

test("watch-for names come from label synonyms and family members", () => {
  assert.ok(watchForNames("lanolin").includes("wool wax"));
  assert.ok(watchForNames("fragrance-mix-1").includes("Eugenol"));
});

test("import and issue pages are reachable from an ordinary phone", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  for (const pathname of ["/avoid/import", "/for-clinicians/patch-test"]) {
    const v = judge({ pathname, method: "GET", headers: new Headers({ "user-agent": iphone }), ip: "203.0.113.7" });
    assert.equal(v.action, "allow", pathname);
  }
  const post = judge({ pathname: "/api/avoid", method: "POST", headers: new Headers({ "user-agent": iphone }), ip: "203.0.113.7" });
  assert.equal(post.action, "allow");
});
