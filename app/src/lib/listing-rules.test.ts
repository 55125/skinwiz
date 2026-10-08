// `npm test`: concern-page exclusions and ordering (lib/listing-rules.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as rules from "./listing-rules";
import { aboveMonograph, concernTier, excludedFromConcern, type RankInput } from "./listing-rules";

const p = (over: Partial<RankInput>): RankInput => ({ concernId: "dry-skin-eczema", brandName: "Eczema Cream", activeIds: ["colloidal-oatmeal"], ...over });

test("eczema leaves out topical antihistamines and antifungals", () => {
  assert.equal(excludedFromConcern(p({ activeIds: ["diphenhydramine"] })), true);
  assert.equal(excludedFromConcern(p({ activeIds: ["colloidal-oatmeal"], activeIngredientText: "Tolnaftate 1%; Colloidal Oatmeal 1.5%" })), true);
  assert.equal(excludedFromConcern(p({ activeIds: ["clotrimazole"] })), true);
  assert.equal(excludedFromConcern(p({})), false);
  // Only on the eczema page: diphenhydramine stays on itch relief.
  assert.equal(excludedFromConcern(p({ concernId: "itch-relief", activeIds: ["diphenhydramine"] })), false);
});

test("diaper products rank after general eczema care", () => {
  assert.equal(concernTier(p({ brandName: "Baby Diaper Rash Cream" })), 1);
  assert.equal(concernTier(p({ brandName: "Eczema Therapy Moisturizing Cream" })), 0);
  assert.equal(concernTier(p({ brandName: "Chapstick Moisturizer", activeIds: ["avobenzone", "petrolatum"] })), 1);
});

test("sunscreens: dedicated broad-spectrum SPF 30+ first, makeup and under SPF 30 last", () => {
  const sun = (brandName: string, label: RankInput["label"] = null) => concernTier({ concernId: "sun-protection", brandName, activeIds: ["zinc-oxide"], label });
  assert.equal(sun("Mineral Sunscreen Broad Spectrum SPF 50"), 0);
  assert.equal(sun("Sport Sunscreen SPF 50", { broadSpectrum15: true, sunburnOnly: false }), 0);
  assert.equal(sun("Sport Sunscreen SPF 50"), 1);
  assert.equal(sun("Daily Lotion"), 1);
  assert.equal(sun("Forever Skin Glow Foundation Broad Spectrum SPF 15"), 2);
  assert.equal(sun("Tinted Moisturizer Broad Spectrum SPF 50 Foundation"), 2);
  assert.equal(sun("Daily Moisturizer Broad Spectrum SPF 15"), 2);
});

test("a strength above the monograph maximum keeps a product off concern lists", () => {
  assert.equal(aboveMonograph({ "salicylic-acid": 2.88 }), true);
  assert.equal(aboveMonograph({ "salicylic-acid": 2 }), false);
  assert.equal(excludedFromConcern(p({ concernId: "acne", strengths: { "salicylic-acid": 2.88 } })), true);
});

test("junk and non-English community titles are flagged; brand names in French aren't", () => {
  const { poorTitle } = rules;
  assert.equal(poorTitle("www.THEORDINARY.COM", "open_beauty_facts"), true);
  assert.equal(poorTitle("COSRX The Peptide Collagen Hydrogel Mask_1ea", "brand_direct"), true);
  assert.equal(poorTitle("Vaseline Vücut Losyonu Aloe Vera Ferahlığı Kuru Ciltler İçin", "open_beauty_facts"), true);
  assert.equal(poorTitle("CeraVe Retinol Serum Tegen Post-Acne Vlekjes", "open_beauty_facts"), true);
  assert.equal(poorTitle("cle de peau BEAUTE UV PROTECTIVE N", "openfda"), false);
  assert.equal(poorTitle("Retinol Serum", "open_beauty_facts"), false);
});

test("duplicates: same name and maker; keep the one with a picture and an ingredient list", () => {
  const { duplicateKey, pickListing } = rules;
  assert.equal(duplicateKey("Skin renewing retinol serum", "Cerave"), duplicateKey("Skin Renewing Retinol Serum", "CeraVe"));
  assert.notEqual(duplicateKey("Acne Dots", "Brand A"), duplicateKey("Acne Dots", "Brand B"));
  const kept = pickListing([
    { id: "a", dataSource: "openfda", hasImage: false, hasIngredients: true, order: 1 },
    { id: "b", dataSource: "dailymed", hasImage: true, hasIngredients: true, order: 2 },
    { id: "c", dataSource: "openfda", hasImage: true, hasIngredients: false, order: 3 },
  ]);
  assert.equal(kept.id, "b");
});
