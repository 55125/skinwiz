// Product page snippet and structured data (lib/seo.ts). `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { productDescription, productLd } from "./seo";

test("a cosmetic's snippet names its actives and checks, not the raw ingredient list", () => {
  const d = productDescription(
    {
      name: "Moisturizing Cream",
      brand: "CeraVe",
      isDrugLabel: false,
      activeIngredientText: "Aqua (Water), Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride",
      activeNames: ["Ceramides", "Hyaluronic acid"],
      concernName: "Dry skin & eczema",
      freeFrom: ["Fragrance-free", "Paraben-free"],
    },
    "Actively",
  );
  assert.equal(
    d,
    "Moisturizing Cream by CeraVe: a dry skin & eczema product with ceramides and hyaluronic acid. Fragrance-free and paraben-free. Full ingredients, allergen flags and where to buy on Actively.",
  );
  assert.ok(!d.includes("Aqua"));
});

test("a drug label's snippet leads with the active and strength, and stays short", () => {
  const d = productDescription(
    { name: "GuruNanda Anti-Cavity", brand: "GuruNanda", isDrugLabel: true, activeIngredientText: "SODIUM FLUORIDE .2 mg/mL", activeNames: [], concernName: "Oral care", freeFrom: [] },
    "Actively",
  );
  assert.ok(d.startsWith("GuruNanda Anti-Cavity: SODIUM FLUORIDE .2 mg/mL. OTC oral care product."), d);
  const long = productDescription({ name: "X", brand: null, isDrugLabel: true, activeIngredientText: "A ".repeat(200), activeNames: [], concernName: null, freeFrom: [] }, "Actively");
  assert.ok(long.length <= 200 && long.endsWith("…"));
  const wordy = productDescription(
    { name: "Ultra Healing Extra Dry Skin Moisturizer", brand: "Jergens", isDrugLabel: false, activeIngredientText: null, activeNames: ["Panthenol", "Petrolatum"], concernName: "Dry skin & eczema", freeFrom: ["Fragrance-free", "Paraben-free", "Phthalate-free"] },
    "Actively",
  );
  assert.ok(wordy.endsWith("phthalate-free."), wordy);
});

test("Product data carries offers only when there are prices", () => {
  const base = { url: "https://a/product/1", name: "N", brand: "B", description: "d", image: null, gtin: "0012345678905" };
  assert.equal("offers" in productLd({ ...base, prices: [] }), false);
  const ld = productLd({ ...base, prices: [12.99, 9.5, 0] }) as { offers: { lowPrice: string; highPrice: string; offerCount: number } };
  assert.deepEqual([ld.offers.lowPrice, ld.offers.highPrice, ld.offers.offerCount], ["9.50", "12.99", 2]);
});
