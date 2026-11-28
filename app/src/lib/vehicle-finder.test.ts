// Prescribe-safe finder (lib/vehicle-finder.ts): a label is clean only when
// neither its vehicle nor its active lists anything avoided; group ids cover
// their members; labels group by product, clean ones first. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findVehicles, formWord, type VehicleRow } from "./vehicle-finder";

function row(id: string, display: string, hits: string[], extra: Partial<VehicleRow> = {}): VehicleRow {
  return {
    id,
    brandName: `Brand ${id}`,
    labeler: `Labeler ${id}`,
    genericName: display,
    strengthText: null,
    dosageForm: "CREAM",
    rxGroup: "corticosteroid",
    potency: 4,
    display,
    names: ["water"],
    hits,
    freeFromFlags: [],
    ...extra,
  };
}

test("a label with an avoided allergen is blocked; another labeler's is clean", () => {
  const r = findVehicles(
    [row("1", "Triamcinolone 0.1% cream", ["propylene-glycol", "corticosteroid-class-b"]), row("2", "Triamcinolone 0.1% cream", ["corticosteroid-class-b"])],
    ["propylene-glycol"],
  );
  assert.equal(r.groups.length, 1);
  assert.deepEqual(r.groups[0].clean.map((x) => x.id), ["2"]);
  assert.equal(r.groups[0].blocked[0].conflicts[0], "Propylene glycol");
  assert.equal(r.cleanLabels, 1);
});

test("a steroid class allergy rules out the active itself", () => {
  const r = findVehicles([row("1", "Hydrocortisone 2.5% cream", ["corticosteroid-class-a"])], ["corticosteroid-class-a"]);
  assert.equal(r.cleanGroups, 0);
});

test("a family id covers its members", () => {
  const r = findVehicles([row("1", "A cream", ["diazolidinyl-urea"]), row("2", "B cream", [])], ["formaldehyde-releasers"]);
  assert.deepEqual(r.groups.map((g) => [g.display, g.clean.length]), [["B cream", 1], ["A cream", 0]]);
});

test("filters by group, potency and vehicle", () => {
  const rows = [row("1", "A cream", []), row("2", "B ointment", [], { dosageForm: "OINTMENT", potency: 1 }), row("3", "C gel", [], { rxGroup: "acne", potency: null, dosageForm: "GEL" })];
  assert.equal(findVehicles(rows, ["lanolin"], { group: "acne" }).labels, 1);
  assert.equal(findVehicles(rows, ["lanolin"], { potency: 1 }).labels, 1);
  assert.equal(findVehicles(rows, ["lanolin"], { form: "ointment" }).labels, 1);
  assert.equal(formWord("CREAM, AUGMENTED"), "cream");
  assert.equal(formWord("AEROSOL, FOAM"), "foam");
});
