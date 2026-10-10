// Prescription rows must never reach a consumer surface. Seeds two OTC
// products and two "bait" Rx rows built to pass every filter a consumer query
// applies (same concern, same active and strength key, assessed ingredient
// lists, ingredient memberships, a LIVE affiliate row) -- so each assertion
// below fails if that query ever loses its isRx filter. `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type Q = typeof import("./queries");
let q: Q;
let db: typeof import("@/db/client").db;
let sql: typeof import("drizzle-orm").sql;

const RX = ["rx-bait-1", "rx-bait-2"];
const isRx = (id: string) => RX.includes(id);
const noRx = (ids: string[], where: string) => assert.deepEqual(ids.filter(isRx), [], `${where} leaked an Rx row`);

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-rx-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  ({ db } = await import("@/db/client"));
  ({ sql } = await import("drizzle-orm"));
  q = await import("./queries");

  db.run(sql`INSERT INTO concerns (id, name, description) VALUES ('acne', 'Acne', ''), ('rx', 'Prescription', '')`);
  db.run(sql`INSERT INTO actives (id, canonical_name, categories, synonyms) VALUES ('adapalene', 'Adapalene', '["acne"]', '[]')`);
  db.run(sql`INSERT INTO ingredients (id, name, aliases, product_count) VALUES ('adapalene', 'Adapalene', '[]', 4), ('water', 'Water', '[]', 4)`);
  const product = (id: string, concern: string, rx: boolean, name: string) =>
    db.run(sql`INSERT INTO products (id, concern_id, concern_ids, brand_name, manufacturer, dosage_form, active_ingredient_text, active_ids,
        spl_set_id, free_from_flags, allergen_hits, strengths, strength_key, data_source, verified, is_rx, generic_name,
        package_description, marketing_category)
      VALUES (${id}, ${concern}, json_array(${concern}), ${name}, 'Galderma', 'GEL', 'ADAPALENE 1 mg/g', '["adapalene"]', NULL,
        '["fragrance-free"]', '[]', '{"adapalene":0.1}', 'adapalene:0.1', 'openfda', 1, ${rx ? 1 : 0}, 'adapalene',
        '45 g in 1 TUBE', ${rx ? "NDA" : "OTC MONOGRAPH DRUG"})`);
  product("otc-1", "acne", false, "Adapalene Gel 0.1%");
  product("otc-2", "acne", false, "Store Brand Adapalene Gel");
  product("rx-bait-1", "acne", true, "Adapalene Gel 0.1% Rx");
  product("rx-bait-2", "rx", true, "Adapalene Cream Rx");
  for (const id of ["otc-1", "otc-2", ...RX]) {
    db.run(sql`INSERT INTO product_ingredients (product_id, position, ingredient_id, raw_name, is_active) VALUES (${id}, 0, 'adapalene', 'Adapalene', 1)`);
    for (let pos = 1; pos <= 5; pos++) {
      db.run(sql`INSERT INTO ingredients (id, name, aliases, product_count) VALUES (${`ing-${pos}`}, ${`Ing ${pos}`}, '[]', 4) ON CONFLICT DO NOTHING`);
      db.run(sql`INSERT INTO product_ingredients (product_id, position, ingredient_id, raw_name, is_active) VALUES (${id}, ${pos}, ${`ing-${pos}`}, ${`Ing ${pos}`}, 0)`);
    }
    db.run(sql`INSERT INTO affiliate_links (product_id, network, price, currency, buy_url, is_demo) VALUES (${id}, 'walmart', 9.99, 'USD', 'https://example.com', 0)`);
  }
});

test("concern lists and the hidden rx concern", () => {
  noRx(q.getConcerns().map((c) => c.id), "getConcerns");
  assert.equal(q.getConcern("rx"), undefined);
  noRx(q.getProductsForConcern("acne", 1).rows.map((r) => r.id), "getProductsForConcern");
  noRx(q.getProductsForConcern("rx", 1).rows.map((r) => r.id), "getProductsForConcern(rx)");
  assert.equal(q.getProductsForConcern("acne", 1, "adapalene", ["fragrance-free"], 0.1).total, 2);
  assert.deepEqual(q.getStrengthOptionsForActive("acne", "adapalene"), [{ pct: 0.1, count: 2 }]);
});

test("browse, match scores and counts", () => {
  noRx(q.browseProducts({}, 1).rows.map((r) => r.id), "browseProducts");
  noRx(q.browseProducts({ activeId: "adapalene", freeFromIds: ["fragrance-free"], dataSources: ["openfda"] }, 1).rows.map((r) => r.id), "browse filters");
  const scored = q.browseProductsByMatch({}, 1, (rows) => new Map(rows.map((r) => [r.id, 1])));
  noRx(scored.rows.map((r) => r.id), "browseProductsByMatch");
  assert.equal(scored.total, 2);
  assert.equal(q.countProducts(), 2);
  assert.equal(q.getAssessedProductCount(), 2);
  noRx(q.getTopProducts(50).map((r) => r.id), "getTopProducts");
  assert.equal(q.getTopActives(5)[0].productCount, 2);
});

test("search and autocomplete", () => {
  noRx(q.searchProducts("adapalene").map((r) => r.id), "searchProducts");
  assert.equal(q.searchProductsCount("adapalene"), 2);
  noRx(q.suggestProducts("adapalene", 10).map((r) => r.id), "suggestProducts");
  db.run(sql`INSERT INTO product_barcodes (product_id, barcode, source, rank) VALUES ('rx-bait-1', '0302994910458', 'openfda_upc', 0)`);
  assert.deepEqual(q.lookupProductsByCode("302994910458"), [], "lookupProductsByCode leaked an Rx row");
});

test("product lookups, similar/dupes and equivalents", async () => {
  assert.equal(q.getProduct("rx-bait-1"), undefined, "consumer getProduct refuses Rx");
  assert.equal(q.getRxProduct("rx-bait-1")?.id, "rx-bait-1");
  assert.equal(q.getRxProduct("otc-1"), undefined);
  const otc = q.getProduct("otc-1")!;
  noRx(q.getEquivalentProducts(otc).rows.map((r) => r.id), "getEquivalentProducts");
  const { findSimilarProducts, findSafeSwaps } = await import("./similar");
  noRx(findSimilarProducts(["ing-1", "ing-2", "ing-3", "ing-4", "ing-5"], { minScore: 0 }).map((s) => s.product.id), "findSimilarProducts");
  noRx(findSafeSwaps(otc, ["ing-1", "ing-2"], ["fragrance-free"]).map((p) => p.id), "findSafeSwaps");
});

test("ingredient and allergen pages", () => {
  noRx(q.getProductsForIngredient("adapalene", 1).rows.map((r) => r.product.id), "getProductsForIngredient");
  assert.equal(q.getProductsForIngredient("adapalene", 1).total, 2);
  assert.deepEqual(q.getIngredientConcernCounts("adapalene").map((c) => c.count), [2]);
  assert.equal(q.getIngredientStats("adapalene").products, 2);
  // No brand in these FDA listing names, so the card's fallback: the labeler.
  assert.deepEqual(q.getIngredientTopBrands("adapalene"), [{ brand: "Galderma", count: 2 }]);
  assert.equal(q.getActiveStrengthStats("adapalene").n, 2);
  db.run(sql`UPDATE products SET allergen_hits = '["fragrance"]'`);
  assert.equal(q.getAllergenProductCounts().get("fragrance"), 2);
  db.run(sql`UPDATE products SET allergen_hits = '[]'`);
});

test("affiliate links and prices never attach to Rx", () => {
  assert.deepEqual(q.getAffiliateLinksForProduct("rx-bait-1"), []);
  noRx(q.getAffiliateLinksForProducts(["otc-1", ...RX]).map((l) => l.productId), "getAffiliateLinksForProducts");
  const live = q.getLivePrices(new Map([["g", ["otc-1", ...RX]], ["rx", RX]]));
  assert.equal(live.get("g")?.productId, "otc-1");
  assert.equal(live.has("rx"), false);
  noRx([...q.getPackageDescriptions(["otc-1", ...RX]).keys()], "getPackageDescriptions");
});

test("demo affiliate rows never reach a page", () => {
  db.run(sql`INSERT INTO affiliate_links (product_id, network, price, currency, buy_url, is_demo) VALUES ('otc-2', 'cj', 1.23, 'USD', 'https://example.com/demo', 1)`);
  const urls = (rows: { buyUrl: string }[]) => rows.map((l) => l.buyUrl);
  assert.deepEqual(urls(q.getAffiliateLinksForProduct("otc-2")), ["https://example.com"]);
  assert.ok(!urls(q.getAffiliateLinksForProducts(["otc-1", "otc-2"])).includes("https://example.com/demo"));
  db.run(sql`DELETE FROM affiliate_links WHERE is_demo = 1`);
});

test("equivalence groups (/same) and HSA tags", async () => {
  const idx = await import("./otc-index");
  for (const g of idx.getEquivalenceGroups()) noRx(g.members.flatMap((m) => m.ids), `group ${g.slug}`);
  assert.equal(idx.getEquivalenceGroupForProduct("rx-bait-1"), undefined);
  assert.equal(idx.isHsaEligible("rx-bait-1"), false);
  assert.equal(idx.isHsaEligible("otc-1"), true);
});

test("sitemap has no Rx, clinician or handout URLs", async () => {
  const { default: sitemap } = await import("@/app/sitemap");
  const urls = sitemap().map((e) => e.url);
  assert.ok(urls.some((u) => u.endsWith("/product/otc-1")));
  for (const u of urls) {
    assert.ok(!RX.some((id) => u.includes(id)), `sitemap lists ${u}`);
    assert.ok(!/\/(rx|clinicians|h)(\/|$)|\/concern\/rx$/.test(new URL(u).pathname), `sitemap lists ${u}`);
  }
});

test("canonical ids", () => {
  noRx(q.canonicalProductIds(), "canonicalProductIds");
});
