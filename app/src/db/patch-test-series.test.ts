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

test("every core-series item maps or is marked not matchable", () => {
  const core = PATCH_TEST_SERIES.find((s) => s.id === "core")!;
  const items = seriesItems(core);
  for (const it of items) {
    assert.ok(it.ids.length > 0 || it.notOnLabel, `${it.name} maps to nothing`);
    assert.ok(!(it.ids.length > 0 && it.notOnLabel), `${it.name} is both mapped and not matchable`);
  }
  const names = items.map((i) => i.name);
  for (const dropped of ["Sandalwood oil", "Octocrylene", "Glyceryl thioglycolate", "Dibucaine", "Amerchol L-101"]) {
    assert.ok(!names.includes(dropped), `${dropped} should not be on the core series`);
  }
  for (const required of [
    "Benzisothiazolinone", "Octylisothiazolinone", "Phenoxyethanol", "Benzalkonium chloride", "Sodium benzoate", "Benzoic acid", "Sorbic acid",
    "Ethylhexylglycerin", "p-Chloro-m-cresol (chlorocresol)", "Ethyleneurea melamine formaldehyde mix", "Lavender absolute (Lavandula angustifolia)",
    "Peppermint oil (Mentha piperita)", "Cocamide DEA", "Sorbitan oleate", "Cetearyl alcohol", "Butylated hydroxytoluene (BHT)", "Propyl gallate",
    "Ethylhexyl methoxycinnamate (octinoxate)", "Pramoxine (pramocaine)", "Polymyxin B sulfate", "Triamcinolone acetonide", "Shellac",
    "Carmine (CI 75470)", "1,3-Diphenylguanidine", "Disperse orange 3", "Disperse yellow 3", "Disperse blue 106/124 mix",
    "Hydroperoxides of linalool", "Hydroperoxides of limonene", "Lauryl polyglucose (glucosides)", "Lanolin alcohol (Amerchol L-101)",
  ]) {
    assert.ok(names.includes(required), `${required} missing from the core series`);
  }
  assert.equal(new Set(names).size, names.length, "duplicate core-series row");
});

test("quinoline mix is clioquinol and chlorquinaldol", () => {
  const trueTest = PATCH_TEST_SERIES.find((s) => s.id === "true-test")!;
  assert.deepEqual(seriesItems(trueTest).find((i) => i.name === "Quinoline mix")!.ids, ["clioquinol", "chlorquinaldol"]);
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

test("added ACDS core allergens match label names without obvious false positives", () => {
  const hits: [string, string][] = [
    ["Benzisothiazolinone", "benzisothiazolinone"],
    ["Octylisothiazolinone", "octylisothiazolinone"],
    ["Benzalkonium Chloride", "benzalkonium-chloride"],
    ["Potassium Sorbate", "sorbic-acid"],
    ["Sorbic Acid", "sorbic-acid"],
    ["Ethylhexylglycerin", "ethylhexylglycerin"],
    ["Cocamide DEA", "cocamide-dea"],
    ["BHT", "bht"],
    ["Butylated Hydroxytoluene", "bht"],
    ["Propyl Gallate", "gallates"],
    ["Carmine (CI 75470)", "carmine"],
    ["Shellac", "shellac"],
    ["Chlorquinaldol", "chlorquinaldol"],
    ["Benzoic Acid", "sodium-benzoate"],
    ["Lauryl Polyglucose", "lauryl-glucoside"],
  ];
  for (const [name, id] of hits) assert.ok(allergensInIngredient(name).includes(id), `${name} -> ${id}`);
  const misses: [string, string][] = [
    ["Polysorbate 20", "sorbic-acid"],
    ["Sorbitol", "sorbic-acid"],
    ["Benzyl Benzoate", "sodium-benzoate"],
    ["Methylisothiazolinone", "benzisothiazolinone"],
    ["Cocamide MEA", "cocamide-dea"],
    ["Epigallocatechin Gallate", "gallates"],
    ["BHA", "bht"],
  ];
  for (const [name, id] of misses) assert.ok(!allergensInIngredient(name).includes(id), `${name} should not match ${id}`);
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

test("ACDS 2020 tray order: 90 allergens, 9 panels of 10, numbered 1-90, every id resolves", async () => {
  const { PATCH_TEST_SERIES, getNotOnLabel } = await import("./patch-test-series");
  const { resolveAllergenId } = await import("./contact-allergens");
  const acds = PATCH_TEST_SERIES.find((s) => s.id === "acds-2020")!;
  assert.equal(acds.groups.length, 9);
  const items = acds.groups.flatMap((g) => g.items);
  assert.deepEqual(items.map((i) => i.pos), Array.from({ length: 90 }, (_, i) => i + 1));
  for (const g of acds.groups) assert.equal(g.items.length, 10, g.title);
  for (const it of items) {
    assert.ok(it.ids.length > 0 || it.notOnLabel, it.name);
    for (const id of it.ids) assert.ok(resolveAllergenId(id), `${it.name}: ${id}`);
    if (it.notOnLabel) assert.ok(getNotOnLabel(it.notOnLabel), it.name);
  }
  assert.match(items[0].name, /Nickel/);
  assert.match(items[65].name, /melamine/);
  assert.match(items[89].name, /chlorocresol/);
});

test("80-allergen trays: ACDS 2017 and NAC-80 are 8 panels of 10, numbered 1-80, every id resolves", async () => {
  const { PATCH_TEST_SERIES, getNotOnLabel } = await import("./patch-test-series");
  const { resolveAllergenId } = await import("./contact-allergens");
  const spot: Record<string, [number, RegExp][]> = {
    "acds-2017": [[1, /Nickel/], [19, /Methyldibromo/], [47, /Lavender/], [66, /melamine/], [80, /Benzyl alcohol/]],
    "nac-80": [[1, /Amerchol/], [2, /persulfate/], [47, /Caine mix/], [53, /Nickel/], [69, /Lanolin alcohol/], [80, /Propylene glycol/]],
  };
  for (const [id, checks] of Object.entries(spot)) {
    const s = PATCH_TEST_SERIES.find((x) => x.id === id)!;
    assert.equal(s.groups.length, 8, id);
    const items = s.groups.flatMap((g) => g.items);
    assert.deepEqual(items.map((i) => i.pos), Array.from({ length: 80 }, (_, i) => i + 1), id);
    for (const it of items) {
      for (const a of it.ids) assert.ok(resolveAllergenId(a), `${id} ${it.name}: ${a}`);
      if (it.notOnLabel) assert.ok(getNotOnLabel(it.notOnLabel), `${id} ${it.name}`);
      assert.ok(it.ids.length > 0 || it.notOnLabel, `${id} ${it.name}`);
    }
    for (const [n, re] of checks) assert.match(items[n - 1].name, re, `${id} #${n}`);
  }
});
