// `npm test`: topical steroid potency mapping (db/steroid-potency.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchPotencyRule, steroidPotencyClass, vehicleOf } from "./steroid-potency";

const one = (name: string, pct: number | null) => [{ name, pct }];

test("vehicle comes from the FDA dosage form, with augmented betamethasone told apart", () => {
  assert.deepEqual(vehicleOf("AEROSOL, FOAM"), { vehicle: "foam", augmented: false });
  assert.deepEqual(vehicleOf("OINTMENT, AUGMENTED"), { vehicle: "ointment", augmented: true });
  assert.deepEqual(vehicleOf("SHAMPOO"), { vehicle: "shampoo", augmented: false });
});

test("same molecule, different vehicle or strength, different class", () => {
  assert.equal(steroidPotencyClass(one("CLOBETASOL PROPIONATE", 0.05), "CREAM"), 1);
  assert.equal(steroidPotencyClass(one("BETAMETHASONE DIPROPIONATE", 0.05), "OINTMENT, AUGMENTED"), 1);
  assert.equal(steroidPotencyClass(one("BETAMETHASONE DIPROPIONATE", 0.05), "CREAM, AUGMENTED"), 2);
  assert.equal(steroidPotencyClass(one("BETAMETHASONE DIPROPIONATE", 0.05), "OINTMENT"), 2);
  assert.equal(steroidPotencyClass(one("BETAMETHASONE DIPROPIONATE", 0.05), "CREAM"), 3);
  assert.equal(steroidPotencyClass(one("BETAMETHASONE DIPROPIONATE", 0.05), "LOTION"), 5);
  assert.equal(steroidPotencyClass(one("TRIAMCINOLONE ACETONIDE", 0.1), "CREAM"), 4);
  assert.equal(steroidPotencyClass(one("TRIAMCINOLONE ACETONIDE", 0.025), "CREAM"), 6);
  assert.equal(steroidPotencyClass(one("DESONIDE", 0.05), "CREAM"), 6);
  assert.equal(steroidPotencyClass(one("HYDROCORTISONE", 2.5), "CREAM"), 7);
  assert.equal(steroidPotencyClass(one("HYDROCORTISONE BUTYRATE", 0.1), "CREAM"), 5);
});

test("combination products take their steroid component's class", () => {
  const lotrisone = [{ name: "CLOTRIMAZOLE", pct: 1 }, { name: "BETAMETHASONE DIPROPIONATE", pct: 0.05 }];
  assert.equal(steroidPotencyClass(lotrisone, "CREAM"), 3);
  const analpram = [{ name: "HYDROCORTISONE ACETATE", pct: 2.5 }, { name: "PRAMOXINE HYDROCHLORIDE", pct: 1 }];
  assert.equal(steroidPotencyClass(analpram, "CREAM"), 7);
});

test("filing errors and unknowns stay unclassified, never guessed", () => {
  assert.equal(steroidPotencyClass(one("CLOBETASOL PROPIONATE", 5), "SPRAY"), null, "a 5% clobetasol is a units error");
  assert.equal(steroidPotencyClass(one("HYDROCORTISONE ACETATE", 10), "AEROSOL, FOAM"), null);
  assert.equal(steroidPotencyClass(one("TRETINOIN", 0.025), "CREAM"), null, "not a steroid");
  assert.equal(steroidPotencyClass(one("BETAMETHASONE DIPROPIONATE", 0.05), "SPRAY"), null);
  assert.equal(steroidPotencyClass(one("HALOBETASOL PROPIONATE", 0.01), "LOTION"), null);
});

test("unsure rules carry a reason for the reviewer", () => {
  assert.ok(matchPotencyRule(one("CLOBETASOL PROPIONATE", 0.025), "CREAM")?.unsure);
  assert.equal(matchPotencyRule(one("CLOBETASOL PROPIONATE", 0.05), "OINTMENT")?.unsure, undefined);
});
