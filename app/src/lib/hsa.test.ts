// `npm test`: HSA/FSA tagging edge cases (lib/hsa.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { hsaStatus, spfFromName, sunscreenLabelFlags, type HsaInput } from "./hsa";

function p(over: Partial<HsaInput>): HsaInput {
  return { dataSource: "openfda", concernId: "acne", activeIds: ["benzoyl-peroxide"], brandName: "Acne Wash", label: null, ...over };
}

const BS15_DIRECTIONS =
  "apply liberally 15 minutes before sun exposure. Sun Protection Measures. Spending time in the sun increases your risk of skin cancer and early skin aging. To decrease this risk, regularly use a sunscreen with a Broad Spectrum SPF value of 15 or higher";
const ALERT_WARNING =
  "For external use only. Skin Cancer/Skin Aging Alert: Spending time in the sun increases your risk of skin cancer and early skin aging. This product has been shown only to help prevent sunburn, not skin cancer or early skin aging.";

test("OTC drug rows are tagged; cosmetic sources never are", () => {
  assert.deepEqual(hsaStatus(p({})), { eligible: true, reason: "otc-drug" });
  assert.deepEqual(hsaStatus(p({ dataSource: "dailymed", concernId: "antifungal", activeIds: ["clotrimazole"] })), { eligible: true, reason: "otc-drug" });
  assert.equal(hsaStatus(p({ dataSource: "brand_direct" })).eligible, false);
  assert.equal(hsaStatus(p({ dataSource: "open_beauty_facts", concernId: "brightening-texture", activeIds: ["niacinamide"] })).eligible, false);
  // Antiperspirants are OTC drugs but toiletry-adjacent: no tag.
  assert.equal(
    hsaStatus(p({ concernId: "excessive-sweating", activeIds: ["aluminum-chlorohydrate"], brandName: "Clinical Strength" })).reason,
    "antiperspirant",
  );
  // A cosmetic "SPF" moisturizer from a non-FDA source: still no tag.
  assert.equal(hsaStatus(p({ dataSource: "brand_direct", concernId: "sun-protection", brandName: "Daily Lotion SPF 30" })).reason, "not-a-drug");
});

test("sunscreens need label evidence of broad spectrum SPF 15+", () => {
  const sun = { concernId: "sun-protection", activeIds: ["zinc-oxide"], brandName: "Mineral Sunscreen" };
  assert.deepEqual(hsaStatus(p({ ...sun, label: sunscreenLabelFlags(BS15_DIRECTIONS, "For external use only") })), {
    eligible: true,
    reason: "sunscreen-broad-spectrum",
  });
  assert.deepEqual(hsaStatus(p({ ...sun, label: sunscreenLabelFlags("apply liberally", ALERT_WARNING) })), {
    eligible: false,
    reason: "sunscreen-sunburn-only",
  });
  // Neither signal on the label, and no label at all: unconfirmed, not assumed.
  assert.equal(hsaStatus(p({ ...sun, label: sunscreenLabelFlags("apply liberally", "For external use only") })).reason, "sunscreen-unconfirmed");
  assert.equal(hsaStatus(p({ ...sun, label: null })).reason, "sunscreen-unconfirmed");
  // Both signals (a multi-SPF label): the negative one wins.
  assert.equal(hsaStatus(p({ ...sun, label: sunscreenLabelFlags(BS15_DIRECTIONS, ALERT_WARNING) })).eligible, false);
});

test("the product name can confirm or rule out a sunscreen", () => {
  const base = { concernId: "sun-protection", activeIds: ["avobenzone", "octisalate"], label: { broadSpectrum15: false, sunburnOnly: false } };
  assert.equal(hsaStatus(p({ ...base, brandName: "Sport Lotion Broad Spectrum SPF 50" })).eligible, true);
  assert.equal(hsaStatus(p({ ...base, brandName: "Tanning Oil SPF 8" })).reason, "sunscreen-sunburn-only");
  assert.equal(hsaStatus(p({ ...base, brandName: "Broad Spectrum SPF 4", label: { broadSpectrum15: true, sunburnOnly: false } })).eligible, false);
  // SPF 30 without "broad spectrum" in the name and no label signal: unconfirmed.
  assert.equal(hsaStatus(p({ ...base, brandName: "Daily Face SPF 30" })).eligible, false);
});

test("a drug with a sunscreen active outside the sun concern is still treated as a sunscreen", () => {
  assert.equal(
    hsaStatus(p({ concernId: "dry-skin-eczema", activeIds: ["petrolatum", "octinoxate"], brandName: "Lip Protectant SPF 15" })).reason,
    "sunscreen-unconfirmed",
  );
  // Zinc oxide diaper ointment with no SPF claim: an ordinary skin-protectant drug.
  assert.equal(hsaStatus(p({ concernId: "dry-skin-eczema", activeIds: ["zinc-oxide"], brandName: "Diaper Rash Ointment" })).reason, "otc-drug");
});

test("makeup with SPF is not tagged even with a broad spectrum label", () => {
  const label = { broadSpectrum15: true, sunburnOnly: false };
  const sun = { concernId: "sun-protection", activeIds: ["octinoxate"], label };
  assert.equal(hsaStatus(p({ ...sun, brandName: "Skin Glow Foundation Broad Spectrum SPF 15" })).reason, "makeup-with-spf");
  assert.equal(hsaStatus(p({ ...sun, brandName: "Moisture Shine", dosageForm: "LIPSTICK" })).reason, "makeup-with-spf");
  assert.equal(hsaStatus(p({ ...sun, brandName: "Tinted Mineral Sunscreen Broad Spectrum SPF 46" })).eligible, true);
});

test("SPF parsing", () => {
  assert.equal(spfFromName("Ultra Sheer SPF 100+"), 100);
  assert.equal(spfFromName("Kids SPF-50 and SPF 30 pack"), 50);
  assert.equal(spfFromName("Moisturizer"), null);
});

test("homeopathic and prescription rows are never tagged", () => {
  assert.deepEqual(hsaStatus(p({ marketingCategory: "UNAPPROVED HOMEOPATHIC" })), { eligible: false, reason: "homeopathic" });
  assert.deepEqual(hsaStatus(p({ marketingCategory: "unapproved homeopathic" })), { eligible: false, reason: "homeopathic" });
  assert.deepEqual(hsaStatus(p({ marketingCategory: "OTC MONOGRAPH DRUG" })), { eligible: true, reason: "otc-drug" });
  assert.deepEqual(hsaStatus(p({ marketingCategory: "ANDA" })), { eligible: true, reason: "otc-drug" });
  assert.deepEqual(hsaStatus(p({ marketingCategory: null })), { eligible: true, reason: "otc-drug" });
  assert.deepEqual(hsaStatus(p({ isRx: true, marketingCategory: "NDA" })), { eligible: false, reason: "prescription" });
});
