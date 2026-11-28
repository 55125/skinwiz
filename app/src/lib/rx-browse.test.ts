import { test } from "node:test";
import assert from "node:assert/strict";
import { browseMedicines, medicineName, type BrowseRow } from "./rx-browse";

const row = (o: Partial<BrowseRow>): BrowseRow => ({
  id: "x",
  brandName: "Tretinoin",
  genericName: "tretinoin",
  strengthText: "tretinoin 0.025%",
  dosageForm: "CREAM",
  rxGroup: "retinoid",
  marketingCategory: "ANDA",
  manufacturer: "Labeler A",
  steroidPotencyClass: null,
  informationalOnly: false,
  ...o,
});

test("folds labelers of one medicine into one card, one chip per strength + vehicle", () => {
  const meds = browseMedicines([
    row({ id: "a1" }),
    row({ id: "a2", manufacturer: "Labeler B" }),
    row({ id: "brand", brandName: "Retin-A", marketingCategory: "NDA", manufacturer: "Bausch" }),
    row({ id: "g1", strengthText: "tretinoin 0.05%", dosageForm: "GEL" }),
  ]);
  assert.equal(meds.length, 1);
  const m = meds[0];
  assert.equal(m.name, "Tretinoin");
  assert.equal(m.labelers, 3);
  assert.deepEqual(m.brands, ["Retin-A"]);
  assert.deepEqual(m.forms, ["cream", "gel"]);
  assert.deepEqual(m.variants.map((v) => v.label), ["0.025% cream", "0.05% gel"]);
  // The brand-name listing opens for the chip it shares.
  assert.equal(m.variants[0].id, "brand");
  assert.equal(m.variants[0].labelers, 3);
});

test("steroids sort strongest first, with the class range", () => {
  const meds = browseMedicines([
    row({ id: "h", genericName: "hydrocortisone", brandName: "Hydrocortisone", strengthText: "hydrocortisone 2.5%", rxGroup: "corticosteroid", steroidPotencyClass: 7 }),
    row({ id: "c1", genericName: "clobetasol propionate", brandName: "Clobetasol", strengthText: "clobetasol propionate 0.05%", rxGroup: "corticosteroid", steroidPotencyClass: 1 }),
    row({ id: "c2", genericName: "clobetasol propionate", brandName: "Clobetasol", strengthText: "clobetasol propionate 0.05%", dosageForm: "LOTION", rxGroup: "corticosteroid", steroidPotencyClass: 2 }),
  ]);
  assert.deepEqual(meds.map((m) => m.name), ["Clobetasol propionate", "Hydrocortisone"]);
  assert.deepEqual(meds[0].potency, [1, 2]);
});

test("filters by group, vehicle, potency and name or brand", () => {
  const rows = [
    row({ id: "t" }),
    row({ id: "b", brandName: "Retin-A", marketingCategory: "NDA" }),
    row({ id: "c", genericName: "clobetasol propionate", brandName: "Temovate", dosageForm: "OINTMENT", rxGroup: "corticosteroid", steroidPotencyClass: 1 }),
  ];
  assert.deepEqual(browseMedicines(rows, { group: "corticosteroid" }).map((m) => m.name), ["Clobetasol propionate"]);
  assert.deepEqual(browseMedicines(rows, { form: "cream" }).map((m) => m.name), ["Tretinoin"]);
  assert.deepEqual(browseMedicines(rows, { potency: 1 }).map((m) => m.name), ["Clobetasol propionate"]);
  assert.deepEqual(browseMedicines(rows, { q: "temovate" }).map((m) => m.name), ["Clobetasol propionate"]);
  assert.deepEqual(browseMedicines(rows, { q: "retin-a" }).map((m) => m.name), ["Tretinoin"]);
});

test("medicine name drops vehicle, USP and strength from the generic", () => {
  assert.equal(medicineName("Clobetasol propionate cream USP, 0.05%"), "clobetasol propionate");
  assert.equal(medicineName("adapalene and benzoyl peroxide gel, 0.1%/2.5%"), "adapalene and benzoyl peroxide");
  assert.equal(medicineName("adapalene and benzoyl peroxide topical"), "adapalene and benzoyl peroxide");
  assert.equal(medicineName("tretinoin"), "tretinoin");
  assert.equal(medicineName("Sodium sulfacetamide 10% and sulfur 5% emollient"), "sodium sulfacetamide and sulfur");
  assert.equal(medicineName("Lidocaine HCl - hydrocortisone acetate"), "lidocaine hydrochloride and hydrocortisone acetate");
});

test("word order and spelling variants of one medicine fold together", () => {
  const meds = browseMedicines([
    row({ id: "a", genericName: "pramoxine hydrochloride and hydrocortisone acetate", rxGroup: "corticosteroid" }),
    row({ id: "b", genericName: "hydrocortisone acetate pramoxine hcl", rxGroup: "corticosteroid" }),
  ]);
  assert.equal(meds.length, 1);
  assert.equal(meds[0].name, "Pramoxine hydrochloride and hydrocortisone acetate");
});
