// `npm test`: drug actives on brand-direct product pages, and what the
// brand-direct banner may say about OTC monograph status (db/labeled-actives.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { brandDirectNiche, brandDirectStatus, labeledActiveSegment, labeledDrugActives, namesSunscreen, sunscreenNiche } from "./labeled-actives";

test("reads a Drug Facts-style active line and stops at the inactive list", () => {
  const text = "Active ingredients: Pramoxine Hydrochloride 1% Inactive ingredients: Water, Glycerin, Petrolatum , Cetyl Alcohol";
  assert.deepEqual(labeledDrugActives(text), { activeIds: ["pramoxine"], strengths: { pramoxine: 1 } });
});

test("finds petrolatum, benzoyl peroxide, colloidal oatmeal and salicylic acid on brand labels", () => {
  assert.deepEqual(labeledDrugActives("Active Ingredients : PETROLATUM 46.5% Inactive Ingredient : MINERAL OIL, PARAFFIN"), {
    activeIds: ["petrolatum"],
    strengths: { petrolatum: 46.5 },
  });
  assert.deepEqual(labeledDrugActives("ACTIVE INGREDIENT: BENZOYL PEROXIDE 10% INACTIVE INGREDIENTS: WATER, GLYCERIN").strengths, {
    "benzoyl-peroxide": 10,
  });
  assert.deepEqual(labeledDrugActives("ACTIVE INGREDIENT: COLLOIDAL OATMEAL 1% INACTIVE INGREDIENTS: WATER, NIACINAMIDE").activeIds, [
    "colloidal-oatmeal",
  ]);
  // Health Canada wording; "Non-medicinal" must not be read as "medicinal".
  assert.deepEqual(labeledDrugActives("Medicinal Ingredient : Salicylic Acid 2% Non-medicinal Ingredients: Water, Glycolic Acid").strengths, {
    "salicylic-acid": 2,
  });
});

test("reads every sunscreen filter, and stops at a bare INGREDIENTS heading", () => {
  const r = labeledDrugActives(
    "ACTIVE INGREDIENTS : AVOBENZONE 3%, HOMOSALATE 5%, OCTISALATE 5%, OCTOCRYLENE 7% INGREDIENTS : WATER, ZINC OXIDE, NIACINAMIDE",
  );
  assert.deepEqual(r.strengths, { avobenzone: 3, homosalate: 5, octisalate: 5, octocrylene: 7 });
  assert.ok(!r.activeIds.includes("zinc-oxide"));
});

test("reads a bare strength list with no heading", () => {
  assert.deepEqual(labeledDrugActives("Petrolatum (31%), Avobenzone (3%), Octinoxate (6.75%)").strengths, {
    petrolatum: 31,
    avobenzone: 3,
    octinoxate: 6.75,
  });
});

test("ignores cosmetic INCI lists and cosmetic 'actives'", () => {
  const none = { activeIds: [], strengths: null };
  assert.deepEqual(labeledDrugActives("Water, Glycerin, Petrolatum, Salicylic Acid, Niacinamide"), none);
  assert.deepEqual(labeledDrugActives("0.5% Bakuchiol"), none);
  assert.deepEqual(labeledDrugActives("Active ingredients: Niacinamide 10%, Zinc PCA 1%"), none);
  assert.equal(labeledActiveSegment("Inactive ingredients: Water, Glycerin"), null);
});

test("banner: a drug when the page labels an OTC active", () => {
  assert.deepEqual(
    brandDirectStatus({
      activeIds: ["benzoyl-peroxide", "niacinamide", "ceramides"],
      strengths: { "benzoyl-peroxide": 4 },
      activeIngredientText: "Active Ingredient : Benzoyl Peroxide 4% Inactive Ingredients : Water",
    }),
    { kind: "drug", drugActiveIds: ["benzoyl-peroxide"] },
  );
});

test("banner: a drug when stored strengths name an OTC active, or the text says Drug Facts", () => {
  assert.equal(brandDirectStatus({ activeIds: ["petrolatum"], strengths: { petrolatum: 41 }, activeIngredientText: null }).kind, "drug");
  assert.equal(brandDirectStatus({ activeIds: ["niacinamide"], activeIngredientText: "Drug Facts ... Uses ..." }).kind, "drug");
});

test("banner: says nothing about status when an OTC active is only in the INCI list", () => {
  const p = { activeIds: ["hyaluronic-acid", "ceramides", "petrolatum"], activeIngredientText: "Water, Glycerin, Petrolatum" };
  assert.equal(brandDirectStatus(p).kind, "drug-ingredient");
});

test("banner: says nothing about status for a sunscreen whose filters weren't scraped", () => {
  const birch = {
    activeIds: ["vitamin-c", "hyaluronic-acid"],
    activeIngredientText: "WATER, ZINC OXIDE, ISODODECANE",
    brandName: "Birch Mild-Up Sunscreen UVLock SPF 50 Broad Spectrum",
  };
  assert.equal(brandDirectStatus(birch).kind, "drug-ingredient");
  assert.equal(brandDirectStatus({ activeIds: ["niacinamide"], brandName: "PDRN Hydrating UV Sun Serum" }).kind, "drug-ingredient");
});

test("banner: claims no monograph status only for all-cosmetic actives", () => {
  const p = { activeIds: ["niacinamide", "squalane"], strengths: null, activeIngredientText: "Water, Niacinamide, Squalane", brandName: "Serum" };
  assert.equal(brandDirectStatus(p).kind, "cosmetic");
});

test("files brand acne washes under Acne, but not scalp, psoriasis or sunscreen rows", () => {
  assert.equal(brandDirectNiche("brightening-texture", "Acne Foaming Cream Wash", ["benzoyl-peroxide"]), "acne");
  assert.equal(brandDirectNiche("skin-protectant", "Acne Control Cleanser", ["salicylic-acid"]), "acne");
  assert.equal(brandDirectNiche("brightening-texture", "Psoriasis Cleanser", ["salicylic-acid"]), "brightening-texture");
  assert.equal(brandDirectNiche("skin-protectant", "Healing Ointment", ["petrolatum"]), "skin-protectant");
  assert.equal(brandDirectNiche("sunscreen", "SPF 30 Acne Lotion", ["salicylic-acid", "avobenzone"]), "sunscreen");
});

test("files SPF products from other categories under Sun Protection", () => {
  // Brand pages filed by the brand's own category (CeraVe "moisturizers").
  assert.equal(sunscreenNiche("skin-protectant", "AM Facial Moisturizing Lotion SPF 30", []), "sunscreen");
  assert.equal(sunscreenNiche("brightening-texture", "Dew-Glow Tinted Moisturizer SPF 50+", []), "sunscreen");
  assert.equal(sunscreenNiche("brightening-texture", "Birch Moisturizing Sun Stick", []), "sunscreen");
  assert.equal(sunscreenNiche("skin-protectant", "Gesichtscreme LSF 30", []), "sunscreen");
  assert.equal(sunscreenNiche("skin-protectant", "Ziaja 50+SPF Güneş Losyonu", []), "sunscreen");
  // No SPF in the name, but a UV filter on the Drug Facts line.
  assert.equal(sunscreenNiche("skin-protectant", "Ultra-Light Moisturizing Lotion", ["avobenzone", "homosalate"]), "sunscreen");
  assert.equal(sunscreenNiche("skin-protectant", "Chapstick Moisturizer Original", ["avobenzone", "octinoxate"]), "sunscreen");
});

test("leaves zinc barrier creams, INCI-only filters, after-sun and acne kits alone", () => {
  // Zinc oxide is a skin protectant too (diaper cream).
  assert.equal(sunscreenNiche("skin-protectant", "Diaper Rash Cream", ["zinc-oxide"]), "skin-protectant");
  // Callers pass only labeled drug actives, so a toner with octisalate in
  // its INCI list and no SPF claim stays put.
  assert.equal(sunscreenNiche("skin-protectant", "Hydrating Toner with Squalane + Oats", []), "skin-protectant");
  assert.equal(sunscreenNiche("skin-protectant", "Kids after sun lotion", []), "skin-protectant");
  assert.equal(sunscreenNiche("skin-protectant", "APRÈS SUN LOTION", []), "skin-protectant");
  assert.equal(sunscreenNiche("brightening-texture", "Bronzlaştırıcı 0SPF Güneş Kremi", []), "brightening-texture");
  assert.equal(sunscreenNiche("brightening-texture", "Sunflower Oil Serum", []), "brightening-texture");
  assert.equal(sunscreenNiche("acne", "UNBLEMISH 30-Day Regimen", ["benzoyl-peroxide", "avobenzone"]), "acne");
});

test("namesSunscreen", () => {
  assert.ok(namesSunscreen("Beaute de Cell Perfect Sun-Shield SPF 50 PA"));
  assert.ok(namesSunscreen("Complexion Rescue Broad Spectrum SPF 30"));
  assert.ok(!namesSunscreen("Healing Ointment"));
  assert.ok(!namesSunscreen(null));
});
