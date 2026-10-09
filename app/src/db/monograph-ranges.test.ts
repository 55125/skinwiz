// `npm test`: OTC monograph range badges (db/monograph-ranges.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MONOGRAPH_RANGES, applicableRanges, formatRange, monographStatus, productForm } from "./monograph-ranges";

const status = (...args: Parameters<typeof monographStatus>) => monographStatus(...args)?.status;

test("avobenzone has no minimum: 1% is within", () => {
  assert.equal(status("avobenzone", 1), "within");
  assert.equal(status("avobenzone", 3.5), "above");
  assert.equal(formatRange(MONOGRAPH_RANGES.avobenzone[0]), "up to 3%");
});

test("pyrithione zinc: leave-on 0.1–0.25%, rinse-off 0.3–2%", () => {
  const leaveOn = { concernId: "dandruff-seb-derm", brandName: "Scalp Relief Leave-In Tonic", dosageForm: "LOTION" };
  const shampoo = { concernId: "dandruff-seb-derm", brandName: "Dandruff Shampoo", dosageForm: "SHAMPOO" };
  assert.equal(status("pyrithione-zinc", 0.25, leaveOn), "within");
  assert.equal(status("pyrithione-zinc", 1, leaveOn), "above");
  assert.equal(status("pyrithione-zinc", 1, shampoo), "within");
  assert.equal(status("pyrithione-zinc", 0.25, shampoo), "below");
  // Form unknown: within if any range fits.
  assert.equal(status("pyrithione-zinc", 0.25), "within");
  assert.equal(status("pyrithione-zinc", 1), "within");
});

test("zinc oxide: up to 40% in a skin protectant ointment, 25% otherwise", () => {
  const diaper = { concernId: "dry-skin-eczema", brandName: "Maximum Strength Diaper Rash", dosageForm: "OINTMENT" };
  assert.equal(status("zinc-oxide", 40, diaper), "within");
  assert.equal(status("zinc-oxide", 40, { ...diaper, dosageForm: "PASTE" }), "within");
  assert.equal(status("zinc-oxide", 40, { ...diaper, dosageForm: "LOTION" }), "above");
  assert.equal(status("zinc-oxide", 20, { concernId: "sun-protection", brandName: "Mineral Sunscreen SPF 50", dosageForm: "LOTION" }), "within");
  assert.equal(status("zinc-oxide", 0.5, { concernId: "sun-protection" }), "within");
});

test("salicylic acid: 1.8–3% for dandruff, 0.5–2% for acne", () => {
  assert.equal(status("salicylic-acid", 3, { concernId: "dandruff-seb-derm", brandName: "Scalp Shampoo", dosageForm: "SHAMPOO" }), "within");
  const acne = { concernId: "acne", brandName: "Acne Spot Treatment Gel", dosageForm: "GEL" };
  assert.equal(status("salicylic-acid", 3, acne), "above");
  assert.equal(status("salicylic-acid", 2, acne), "within");
  // Concern unknown: either range counts.
  assert.equal(status("salicylic-acid", 3), "within");
  assert.equal(status("salicylic-acid", 3.5), "above");
});

test("sulfur: 3–10% for acne, 3–8% with resorcinol, 2–5% for dandruff", () => {
  assert.equal(status("sulfur", 10, { concernId: "acne", activeIds: ["sulfur"] }), "within");
  assert.equal(status("sulfur", 10, { concernId: "acne", activeIds: ["sulfur", "resorcinol"] }), "above");
  assert.equal(status("sulfur", 8, { concernId: "acne", activeIds: ["sulfur", "resorcinol"] }), "within");
  assert.equal(status("sulfur", 2, { concernId: "dandruff-seb-derm" }), "within");
  assert.equal(status("sulfur", 2, { concernId: "acne" }), "below");
});

test("selenium sulfide: 1%, or 0.6% micronized", () => {
  assert.equal(status("selenium-sulfide", 1), "within");
  assert.equal(status("selenium-sulfide", 0.6), "within");
  assert.equal(status("selenium-sulfide", 2.5), "above");
});

test("product form comes from the name and dosage form", () => {
  assert.equal(productForm({ brandName: "Dandruff Shampoo" }), "rinse-off");
  assert.equal(productForm({ brandName: "Healing", dosageForm: "OINTMENT" }), "ointment");
  assert.equal(productForm({ brandName: "Daily Cream" }), "leave-on");
  assert.equal(productForm({ brandName: "Head & Shoulders Classic" }), null);
});

test("no monograph, no badge; every active has at least one range", () => {
  assert.equal(monographStatus("niacinamide", 5), null);
  assert.deepEqual(applicableRanges("niacinamide"), []);
  for (const [id, ranges] of Object.entries(MONOGRAPH_RANGES)) {
    assert.ok(ranges.length > 0, id);
    for (const r of ranges) assert.ok(r.min <= r.max && r.cite.length > 0, id);
  }
});

test("NDA citations for the Rx-to-OTC switches", () => {
  assert.match(MONOGRAPH_RANGES.adapalene[0].cite, /NDA 020380/);
  assert.match(MONOGRAPH_RANGES.butenafine[0].cite, /NDA 021307/);
  assert.match(MONOGRAPH_RANGES.terbinafine[0].cite, /NDA 020980/);
});
