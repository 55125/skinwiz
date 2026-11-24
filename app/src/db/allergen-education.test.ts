import { test } from "node:test";
import assert from "node:assert/strict";
import { ALLERGEN_EDUCATION, allergyIntro, educationFor, validCas } from "./allergen-education";
import { getAllergen, getAllergenGroup } from "./contact-allergens";
import { PATCH_TEST_SERIES, getNotOnLabel, seriesItems } from "./patch-test-series";
import { allergensInQuery } from "@/lib/allergen-search";

const known = (id: string) => !!(getAllergen(id) || getAllergenGroup(id) || getNotOnLabel(id));

test("every record is for an allergen, family or not-on-label item we know, once", () => {
  const seen = new Set<string>();
  for (const e of ALLERGEN_EDUCATION) {
    assert.ok(known(e.id), e.id);
    assert.ok(!seen.has(e.id), `duplicate ${e.id}`);
    seen.add(e.id);
  }
});

test("related links point at known allergens, never at the record itself", () => {
  for (const e of ALLERGEN_EDUCATION)
    for (const r of e.related) {
      assert.ok(known(r.id), `${e.id} -> ${r.id}`);
      assert.notEqual(r.id, e.id);
      assert.ok(r.why.length > 10, `${e.id} -> ${r.id} needs a reason`);
    }
});

test("CAS numbers pass the check digit", () => {
  assert.ok(validCas("7791-13-1"));
  assert.ok(!validCas("55560-96-1")); // tixocortol pivalate mistyped; it is 55560-96-8
  for (const e of ALLERGEN_EDUCATION) for (const c of e.cas) assert.ok(validCas(c.number), `${e.id} ${c.number}`);
});

test("every T.R.U.E. Test allergen has a record", () => {
  const tray = PATCH_TEST_SERIES.find((s) => s.id === "true-test")!;
  for (const it of seriesItems(tray))
    for (const id of it.notOnLabel ? [it.notOnLabel] : it.ids) assert.ok(educationFor(id), `${it.name} (${id})`);
});

test("records say where it's found and stay unreviewed until a dermatologist signs off", () => {
  for (const e of ALLERGEN_EDUCATION) {
    assert.ok(e.testedAs.length > 0, e.id);
    assert.ok(e.foundIn.length > 0 && e.foundIn.every((g) => g.items.length > 0), e.id);
    if (e.reviewed) assert.match(e.reviewed.on, /^\d{4}-\d{2}-\d{2}$/, e.id);
  }
});

test("the cobalt record covers the Contact Dermatitis Institute handout's points", () => {
  const cobalt = educationFor("cobalt")!;
  const text = JSON.stringify(cobalt).toLowerCase();
  for (const word of ["7791-13-1", "jewelry", "zippers", "keys", "magnets", "pottery glazes", "implants", "b12", "eye shadow", "sterling silver"])
    assert.ok(text.includes(word), word);
  assert.deepEqual(cobalt.related.map((r) => r.id), ["nickel"]);
});

test("the shared intro names the allergen", () => {
  assert.match(allergyIntro("cobalt"), /^Your patch test shows a contact allergy to cobalt\./);
});

test("a CAS number in search names its allergen", () => {
  assert.deepEqual(allergensInQuery("7791-13-1").allergens.map((a) => a.id), ["cobalt"]);
  assert.equal(allergensInQuery("cobalt 7791-13-1, 10101-97-0").allNamed, true);
});
