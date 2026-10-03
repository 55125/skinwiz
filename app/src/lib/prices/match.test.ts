// Keyword-match verification: a wrong price is worse than none, so near
// misses (other size, strength, variant, form, brand) must be rejected.
import { test } from "node:test";
import assert from "node:assert/strict";
import { brandWords, parseSizeFromTitle, searchKeywords, sizesAgree, verifyDerivedBarcode, verifyKeywordMatch } from "./match";
import type { LookupProduct } from "./types";

const base = { dataSource: "openfda", sourceUrl: null, barcodes: [] as LookupProduct["barcodes"] };
const neutrogena: LookupProduct = {
  ...base,
  id: "69968-0826",
  brandName: "Neutrogena Adapalene 0.1% Acne Treatment",
  manufacturer: "Kenvue Brands LLC",
  dosageForm: "GEL",
  packageDescription: "1 TUBE in 1 CARTON (69968-0826-1) / 45 g in 1 TUBE",
  strengths: { adapalene: 0.1 },
};
const storeBrand: LookupProduct = {
  ...base,
  id: "11822-0062",
  brandName: "Adapalene",
  manufacturer: "RITE AID",
  dosageForm: "GEL",
  packageDescription: "1 TUBE in 1 CARTON (11822-0062-1) / 15 g in 1 TUBE",
  strengths: { adapalene: 0.1 },
};
const sunscreen: LookupProduct = {
  ...base,
  id: "45334-325",
  brandName: "Vanicream Facial Moisturizer SPF 30",
  manufacturer: "Pharmaceutical Specialties, Inc.",
  dosageForm: "LOTION",
  packageDescription: "1 BOTTLE in 1 CARTON / 75 mL in 1 BOTTLE",
  strengths: { "zinc-oxide": 12, "titanium-dioxide": 3 },
};

const ok = (p: LookupProduct, t: string) => assert.deepEqual(verifyKeywordMatch(p, t), { ok: true }, t);
const rejects = (p: LookupProduct, t: string, reason: string) => assert.deepEqual(verifyKeywordMatch(p, t), { ok: false, reason }, t);

test("accepts the same product under a retailer's wording", () => {
  ok(neutrogena, "Neutrogena Stubborn Acne Adapalene 0.1% Gel Acne Treatment, 1.6 oz");
  ok(neutrogena, "NEUTROGENA® Adapalene Gel 0.1% Acne Treatment - 45g");
  ok(storeBrand, "Rite Aid Adapalene Gel 0.1% Acne Treatment, 15 g");
  ok(sunscreen, "Vanicream Facial Moisturizer with Sunscreen SPF 30, 2.5 fl oz");
});

test("rejects a different size", () => {
  rejects(neutrogena, "Neutrogena Adapalene 0.1% Acne Treatment Gel 15 g", "size");
  rejects(neutrogena, "Neutrogena Adapalene 0.1% Acne Treatment Gel", "size"); // size unstated
  rejects(sunscreen, "Vanicream Facial Moisturizer SPF 30, 1.2 fl oz", "size");
});

test("rejects a different strength, or one that isn't stated", () => {
  rejects(neutrogena, "Neutrogena Adapalene 0.3% Acne Treatment Gel 45 g", "strength");
  rejects(neutrogena, "Neutrogena Adapalene Acne Treatment Gel 45 g", "strength");
  rejects(storeBrand, "Rite Aid Adapalene Gel 1% 15 g", "strength");
});

test("rejects variants: kits, multi-packs, minis, tinted, other SPF", () => {
  rejects(neutrogena, "Neutrogena Adapalene 0.1% Acne Treatment Gel 45 g, 2 Pack", "variant");
  rejects(neutrogena, "Neutrogena Adapalene 0.1% Acne Treatment Gel Starter Kit 45 g", "variant");
  rejects(neutrogena, "Neutrogena Adapalene 0.1% Acne Treatment Gel Travel Size 45 g", "variant");
  rejects(sunscreen, "Vanicream Facial Moisturizer Tinted SPF 30, 2.5 fl oz", "variant");
  rejects(sunscreen, "Vanicream Facial Moisturizer SPF 50, 2.5 fl oz", "spf");
});

test("rejects a different form, brand, or product", () => {
  rejects(neutrogena, "Neutrogena Adapalene 0.1% Acne Treatment Cream 45 g", "form");
  rejects(neutrogena, "Differin Adapalene Gel 0.1% Acne Treatment 45 g", "brand");
  rejects(storeBrand, "CVS Health Adapalene Gel 0.1% 15 g", "brand");
  rejects(neutrogena, "Neutrogena Hydro Boost Water Gel 1.7 oz", "name");
  rejects(neutrogena, "", "empty");
});

test("NDC-derived barcode hits need the brand or most of the name", () => {
  assert.equal(verifyDerivedBarcode(neutrogena, "Neutrogena Adapalene Gel 45g").ok, true);
  assert.equal(verifyDerivedBarcode(neutrogena, "Head & Shoulders Shampoo 13.5 fl oz").ok, false);
  assert.equal(verifyDerivedBarcode(neutrogena, "Neutrogena Adapalene 0.3% Gel").ok, false);
});

test("sizes", () => {
  assert.deepEqual(parseSizeFromTitle("Gel, 45 g"), { amount: 45, unit: "g" });
  assert.deepEqual(parseSizeFromTitle("Toner 8 fl. oz."), { amount: 8 * 29.5735, unit: "mL" });
  assert.deepEqual(parseSizeFromTitle("Pads, 90 count"), { amount: 90, unit: "count" });
  assert.equal(parseSizeFromTitle("Adapalene 0.1% Gel"), null);
  assert.equal(parseSizeFromTitle("SPF 30 Lotion"), null);
  assert.ok(sizesAgree({ amount: 45, unit: "g" }, parseSizeFromTitle("1.6 oz")!));
  assert.ok(!sizesAgree({ amount: 45, unit: "g" }, { amount: 50, unit: "g" }));
  assert.ok(!sizesAgree({ amount: 30, unit: "count" }, { amount: 30, unit: "g" }));
});

test("brand words and search keywords", () => {
  assert.deepEqual(brandWords(neutrogena), ["neutrogena", "kenvue"]);
  assert.deepEqual(brandWords(storeBrand), ["rite"]);
  assert.ok(searchKeywords(storeBrand).startsWith("rite adapalene"));
});
