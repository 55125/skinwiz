// Recall -> catalog matching: `npm test`. Cases are taken from real openFDA
// enforcement records (benzoyl peroxide / benzene recalls, 2025).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCatalogIndex,
  extractBarcodes,
  extractNdcs,
  matchRecall,
  ndcCandidatesFromUpc,
  normalizeProductNdc,
  sameFirm,
  type CatalogProduct,
  type RecallRecord,
} from "./recall-match";

const catalog: CatalogProduct[] = [
  { id: "71687-0011", brandName: "Zapzyt Acne Treatment Gel", manufacturer: "Focus Consumer Healthcare" },
  { id: "49967-647", brandName: "La Roche Posay Laboratoire Dermatologique Effaclar Duo Dual Action Acne Medication Cleanser", manufacturer: "L'Oreal USA Products Inc" },
  { id: "49967-282", brandName: "La Roche Posay Effaclar Dermatological Acne System 3 Step Acne Routine", manufacturer: "L'Oreal USA Products Inc" },
  { id: "49967-735", brandName: "La Roche Posay Laboratoire Dermatologique Effaclar AZ Acne Treatment", manufacturer: "L'Oreal USA Products Inc" },
  { id: "11410-012", brandName: "Proactiv Emergency Blemish Relief", manufacturer: "Alchemee, LLC" },
  { id: "11410-216", brandName: "Proactivplus Smoothing BHA Cleanser", manufacturer: "Alchemee, LLC" },
  { id: "84803-115", brandName: "Ultra Violette Velvet Screen Blurring Mineral Skinscreen Broad Spectrum SPF 40", manufacturer: "Grace and Fire" },
  { id: "52410-3050", brandName: "MedPride", manufacturer: "Shield Line LLC" },
  { id: "0363-0123", brandName: "Walgreens Acne Wash", manufacturer: "Walgreen Company" },
  { id: "3606000508804", brandName: "Some EU Barcode Product", manufacturer: "Somebody" },
];
const idx = buildCatalogIndex(catalog);

const recall = (over: Partial<RecallRecord>): RecallRecord => ({
  recallNumber: "D-0000-2025",
  productDescription: "",
  codeInfo: null,
  recallingFirm: null,
  productNdcs: [],
  brandNames: [],
  ...over,
});

test("NDCs normalize to the 5-4 product form", () => {
  assert.equal(normalizeProductNdc("49967-138"), "49967-0138");
  assert.equal(normalizeProductNdc("0363-0012"), "00363-0012");
  assert.equal(normalizeProductNdc("71687-0011-1"), "71687-0011");
  assert.equal(normalizeProductNdc("1234-56"), null);
  assert.equal(normalizeProductNdc("3606000508804"), null);
});

test("NDCs are read from text only where the text says NDC", () => {
  assert.deepEqual(extractNdcs("Gel, 1 oz, NDC 71687-0011-1, Distributed by ..."), ["71687-0011"]);
  assert.deepEqual(extractNdcs("NDC# 0363-0123"), ["00363-0123"]);
  assert.deepEqual(extractNdcs("NDC: 00363012345"), ["00363-0123"]);
  assert.deepEqual(extractNdcs("Lot 1234-567-89 exp 2025"), []);
});

test("barcodes and drug UPCs", () => {
  assert.deepEqual(extractBarcodes("UPC 7 35786 01528 2; b) 883140500759"), ["735786015282", "883140500759"]);
  assert.ok(extractBarcodes("a) UPC 3606000508804, 20 mL").includes("3606000508804"));
  assert.ok(ndcCandidatesFromUpc("352410305012").includes("52410-3050"));
  assert.deepEqual(ndcCandidatesFromUpc("735786015282"), []);
});

test("firm names compare without legal suffixes", () => {
  assert.ok(sameFirm("L'Oreal USA", "L'Oreal USA Products Inc"));
  assert.ok(sameFirm("Alchemee, LLC", "ALCHEMEE LLC"));
  assert.ok(!sameFirm("Alchemee, LLC", "THE PROACTIV COMPANY LLC"));
});

test("openfda.product_ndc is a certain match", () => {
  const m = matchRecall(recall({ productNdcs: ["71687-0011"], productDescription: "Zapzyt, Acne Treatment Gel" }), idx);
  assert.deepEqual(m.map((x) => [x.productId, x.matchType, x.confidence]), [["71687-0011", "ndc", 1]]);
});

test("a drug UPC that decodes to one catalog NDC matches", () => {
  const m = matchRecall(recall({ productDescription: "Med Pride, HYDROCORTISONE CREAM 1%, UPC 352410305012", recallingFirm: "Dabur India Limited" }), idx);
  assert.deepEqual(m.map((x) => [x.productId, x.matchType]), [["52410-3050", "upc"]]);
});

test("an EAN barcode matches a barcode-keyed product", () => {
  const m = matchRecall(recall({ productDescription: "Thing, a) UPC 3606000508804, 20 mL" }), idx);
  assert.deepEqual(m.map((x) => x.productId), ["3606000508804"]);
});

test("same firm + full product name is a low-confidence text match", () => {
  const m = matchRecall(
    recall({
      recallingFirm: "Alchemee, LLC",
      productDescription: "Proactiv Emergency Blemish Relief (Benzoyl Peroxide 5%), 0.33 oz. (9.45 g), Distributed by Alchemee LLC, Santa Monica, CA",
    }),
    idx,
  );
  assert.equal(m.length, 1);
  assert.equal(m[0].productId, "11410-012");
  assert.equal(m[0].matchType, "text");
  assert.ok(m[0].confidence < 0.9);
});

test("a recalled Effaclar Duo treatment doesn't match the Effaclar Duo cleanser or Effaclar AZ", () => {
  const m = matchRecall(
    recall({
      recallingFirm: "L'Oreal USA",
      productDescription:
        "La Roche-Posay Laboratoire Dermatologique Effaclar Duo Dual Action Acne Treatment, 5.5% Benzoyl Peroxide Acne Medication, a) UPC 3606000508805, 20 mL, La Roche-Posay LLC, New York, NY 10001, Phoenix, AZ",
    }),
    idx,
  );
  assert.deepEqual(m, []);
});

test("the recalled Effaclar 3-step kit matches the kit", () => {
  const m = matchRecall(
    recall({
      recallingFirm: "L'Oreal USA",
      productDescription: "La Roche-Posay Laboratoire Dermatologique Effaclar Dermatological Acne System, 3 Step Acne Routine Kit, Medicated Gel Cleanser 3.4 fl. oz.",
    }),
    idx,
  );
  assert.deepEqual(m.map((x) => x.productId), ["49967-282"]);
});

test("a recall naming its own (different) NDC never text-matches our NDC products", () => {
  const m = matchRecall(
    recall({
      recallingFirm: "Grace and Fire",
      productDescription: "Ultra Violette, Velvet Screen SPF 50, Blurring Mineral Skinscreen, Zinc Oxide 22.75%, 15 mL, NDC 84803-106-01",
    }),
    idx,
  );
  assert.deepEqual(m, []);
});

test("no firm match, no text match", () => {
  const m = matchRecall(recall({ recallingFirm: "Someone Else Inc", productDescription: "Proactiv Emergency Blemish Relief" }), idx);
  assert.deepEqual(m, []);
});
