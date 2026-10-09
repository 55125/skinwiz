// Merged duplicate listings (products.canonical_id, lib/canonical.ts) must
// disappear from every listing while their URL, buy links and user data keep
// working through the canonical. Seeds one canonical product, one duplicate
// built to pass every filter a listing applies, an unrelated product and an
// Rx row, then checks each surface. `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveMerges, reviewedMergeRows } from "@/db/product-merges";

type Q = typeof import("./queries");
let q: Q;
let db: typeof import("@/db/client").db;
let sql: typeof import("drizzle-orm").sql;

const CANON = "otc-canon";
const DUP = "otc-dup";
const noDup = (ids: string[], where: string) => assert.ok(!ids.includes(DUP), `${where} listed the merged duplicate`);

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-merge-"));
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
  db.run(sql`INSERT INTO ingredients (id, name, aliases, product_count) VALUES ('adapalene', 'Adapalene', '[]', 3)`);
  const product = (id: string, name: string, maker: string, opts: { rx?: boolean; canonical?: string; image?: string } = {}) =>
    db.run(sql`INSERT INTO products (id, concern_id, brand_name, manufacturer, dosage_form, active_ingredient_text, active_ids,
        spl_set_id, free_from_flags, allergen_hits, strengths, strength_key, data_source, verified, is_rx, canonical_id, image_url,
        package_description, marketing_category)
      VALUES (${id}, ${opts.rx ? "rx" : "acne"}, ${name}, ${maker}, 'GEL', 'ADAPALENE 1 mg/g', '["adapalene"]', NULL,
        '["fragrance-free"]', '[]', '{"adapalene":0.1}', 'adapalene:0.1', 'openfda', 1, ${opts.rx ? 1 : 0},
        ${opts.canonical ?? null}, ${opts.image ?? null}, '45 g in 1 TUBE', 'NDA')`);
  product(CANON, "Differin Adapalene Gel 0.1%", "Galderma");
  product(DUP, "Differin Adapalene Gel 0.1% 15 g", "Galderma", { canonical: CANON, image: "https://images.example/differin.jpg" });
  product("otc-other", "Store Brand Adapalene Gel", "Walgreens");
  product("rx-1", "Differin Adapalene Gel 0.3%", "Galderma", { rx: true });
  for (const id of [CANON, DUP, "otc-other"]) {
    db.run(sql`INSERT INTO product_ingredients (product_id, position, ingredient_id, raw_name, is_active) VALUES (${id}, 0, 'adapalene', 'Adapalene', 1)`);
    for (let pos = 1; pos <= 5; pos++) {
      db.run(sql`INSERT INTO ingredients (id, name, aliases, product_count) VALUES (${`ing-${pos}`}, ${`Ing ${pos}`}, '[]', 3) ON CONFLICT DO NOTHING`);
      db.run(sql`INSERT INTO product_ingredients (product_id, position, ingredient_id, raw_name, is_active) VALUES (${id}, ${pos}, ${`ing-${pos}`}, ${`Ing ${pos}`}, 0)`);
    }
  }
  // buy links recorded against the duplicate belong on the canonical's page
  db.run(sql`INSERT INTO manual_affiliate_links (product_id, retailer, url) VALUES (${DUP}, 'amazon', 'https://www.amazon.com/dp/B000000001?tag=mtass-20')`);
  db.run(sql`INSERT INTO product_barcodes (product_id, barcode, source, rank) VALUES (${DUP}, '0302993917564', 'openfda_upc', 0)`);
});

test("resolveMerges: chains flatten, Rx and unknown ids are skipped, flagged rows ignored", () => {
  const catalog = new Map(
    ["a", "b", "c", "d", "x", "y", "rx"].map((id) => [id, { isRx: id === "rx" }] as [string, { isRx: boolean }]),
  );
  const { canonicalOf, skipped } = resolveMerges(
    [
      { duplicate_id: "c", canonical_id: "b", tier: "auto" },
      { duplicate_id: "b", canonical_id: "a", tier: "auto" }, // chain c -> b -> a
      { duplicate_id: "d", canonical_id: "c", tier: "auto" }, // joins through a duplicate
      { duplicate_id: "y", canonical_id: "x", tier: "flagged" },
      { duplicate_id: "x", canonical_id: "rx", tier: "auto" },
      { duplicate_id: "gone", canonical_id: "a", tier: "auto" },
    ],
    catalog,
  );
  assert.deepEqual(Object.fromEntries(canonicalOf), { b: "a", c: "a", d: "a" });
  for (const target of canonicalOf.values()) assert.equal(canonicalOf.has(target), false, "a canonical never has a canonical");
  assert.deepEqual(skipped.map((s) => s.reason).sort(), ["gone is not in the catalog", "prescription rows are never merged", "tier flagged is not applied"]);
});

test("reviewed merge decisions are applied; needs_owner and the rest are not", () => {
  const catalog = new Map(
    ["a", "b", "c", "d", "e", "f", "g", "h", "x"].map((id) => [id, { isRx: false }] as [string, { isRx: boolean }]),
  );
  const reviewed = reviewedMergeRows([
    { id_a: "c", id_b: "d", decision: "merge", decided_canonical_id: "a" }, // joins the auto group a <- b
    { id_a: "e", id_b: "f", decision: "needs_owner", decided_canonical_id: "" },
    { id_a: "e", id_b: "g", decision: "keep_separate", decided_canonical_id: "" },
    { id_a: "f", id_b: "g", decision: "reformulated", decided_canonical_id: "" },
    { id_a: "g", id_b: "h", decision: "", decided_canonical_id: "" },
    { id_a: "h", id_b: "x", decision: "merge", decided_canonical_id: "" }, // no canonical: not applied
  ]);
  assert.deepEqual(reviewed, [
    { duplicate_id: "c", canonical_id: "a", tier: "reviewed" },
    { duplicate_id: "d", canonical_id: "a", tier: "reviewed" },
  ]);
  const { canonicalOf } = resolveMerges([{ duplicate_id: "b", canonical_id: "a", tier: "auto" }, ...reviewed], catalog);
  assert.deepEqual(Object.fromEntries(canonicalOf), { b: "a", c: "a", d: "a" });
  for (const id of ["e", "f", "g", "h", "x"]) assert.equal(canonicalOf.has(id), false, `${id} must stay listed`);

  // a reviewer's decided canonical wins over the auto canonical when the review joins two auto groups
  const joined = resolveMerges(
    [
      { duplicate_id: "b", canonical_id: "a", tier: "auto" },
      { duplicate_id: "d", canonical_id: "c", tier: "auto" },
      ...reviewedMergeRows([{ id_a: "b", id_b: "d", decision: "merge", decided_canonical_id: "c" }]),
    ],
    catalog,
  );
  assert.deepEqual(Object.fromEntries(joined.canonicalOf), { a: "c", b: "c", d: "c" });
});

test("listings, counts, search and autocomplete leave the duplicate out", () => {
  noDup(q.getProductsForConcern("acne", 1).rows.map((r) => r.id), "getProductsForConcern");
  assert.equal(q.getProductsForConcern("acne", 1, "adapalene", ["fragrance-free"], 0.1).total, 2);
  assert.deepEqual(q.getStrengthOptionsForActive("acne", "adapalene"), [{ pct: 0.1, count: 2 }]);
  noDup(q.browseProducts({}, 1).rows.map((r) => r.id), "browseProducts");
  assert.equal(q.browseProducts({}, 1).total, 2);
  assert.equal(q.browseProductsByMatch({}, 1, (rows) => new Map(rows.map((r) => [r.id, 1]))).total, 2);
  assert.equal(q.countProducts(), 2);
  assert.equal(q.getAssessedProductCount(), 2);
  noDup(q.getTopProducts(50).map((r) => r.id), "getTopProducts");
  assert.equal(q.getTopActives(5)[0].productCount, 2);
  noDup(q.searchProducts("differin").map((r) => r.id), "searchProducts");
  assert.equal(q.searchProductsCount("differin"), 1);
  noDup(q.suggestProducts("differin", 10).map((r) => r.id), "suggestProducts");
  assert.deepEqual(q.getSafeProductsByConcern(["fragrance-free"]).map((c) => c.n), [2]);
});

test("ingredient pages and similar/dupe tools leave the duplicate out", async () => {
  noDup(q.getProductsForIngredient("adapalene", 1).rows.map((r) => r.product.id), "getProductsForIngredient");
  assert.equal(q.getProductsForIngredient("adapalene", 1).total, 2);
  assert.deepEqual(q.getIngredientConcernCounts("adapalene").map((c) => c.count), [2]);
  assert.equal(q.getIngredientStats("adapalene").products, 2);
  assert.equal(q.getActiveStrengthStats("adapalene").n, 2);
  const canon = q.getProduct(CANON)!;
  noDup(q.getEquivalentProducts(canon).rows.map((r) => r.id), "getEquivalentProducts");
  const { findSimilarProducts } = await import("./similar");
  noDup(findSimilarProducts(["ing-1", "ing-2", "ing-3", "ing-4", "ing-5"], { minScore: 0 }).map((s) => s.product.id), "findSimilarProducts");
});

test("/same groups and the sitemap show the canonical only", async () => {
  const idx = await import("./otc-index");
  for (const g of idx.getEquivalenceGroups()) {
    noDup(g.members.map((m) => m.id), `group ${g.slug} member link`);
    const m = g.members.find((x) => x.ids.includes(DUP));
    if (m) assert.equal(m.id, CANON, "the duplicate is folded into its canonical's member");
  }
  assert.equal(idx.getEquivalenceGroupForProduct(DUP)?.members.find((m) => m.ids.includes(DUP))?.id, CANON);
  assert.equal(idx.isHsaEligible(DUP), false);
  const { default: sitemap } = await import("@/app/sitemap");
  const urls = sitemap().map((e) => e.url);
  assert.ok(urls.some((u) => u.endsWith(`/product/${CANON}`)));
  assert.ok(!urls.some((u) => u.endsWith(`/product/${DUP}`)), "sitemap lists the duplicate");
  noDup(q.canonicalProductIds(), "canonicalProductIds");
});

test("canonical page data: URL, buy links, barcodes, best image", () => {
  const dup = q.getProduct(DUP)!;
  assert.ok(dup, "a duplicate still resolves by id (for the redirect and user rows)");
  assert.equal(q.getCanonicalProductId(dup), CANON);
  assert.equal(q.getCanonicalProductId(q.getProduct(CANON)!), CANON);
  assert.equal(q.getManualLinksForProduct(CANON).length, 1);
  assert.deepEqual(q.getMergedDuplicates(CANON).map((p) => p.id), [DUP]);
  assert.deepEqual(q.getRetailBarcodes([CANON, DUP]), ["0302993917564"]);
  assert.equal(q.bestProductImage(q.getProduct(CANON)!, q.getMergedDuplicates(CANON)), "https://images.example/differin.jpg");
  assert.equal(q.bestProductImage({ imageUrl: "/img/dm/0a0a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a/0123456789ab/full.webp" }, [{ imageUrl: "https://x/y.jpg" }]), "https://x/y.jpg");
});

test("product photos lead, label artwork second, on the page and in grids", () => {
  const label = "/img/dm/0a0a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a/0123456789ab/full.webp";
  const photo = "https://x/y.jpg";
  // both: the photo first, the label kept as the second image
  assert.deepEqual(q.productImages({ imageUrl: label }, [{ imageUrl: photo }]), { photo, label });
  assert.deepEqual(q.productImages({ imageUrl: photo }, [{ imageUrl: label }]), { photo, label });
  // only a label: it is the image, with nothing second
  assert.deepEqual(q.productImages({ imageUrl: label }, []), { photo: label, label: null });
  assert.deepEqual(q.productImages({ imageUrl: null }, [{ imageUrl: null }]), { photo: null, label: null });
  // Kroger's photo fills in only when there is no retail photo of our own
  const kroger = "https://www.kroger.com/product/images/large/front/0030299491045";
  assert.deepEqual(q.productImages({ imageUrl: label }, [], kroger), { photo: kroger, label });
  assert.deepEqual(q.productImages({ imageUrl: null }, [], kroger), { photo: kroger, label: null });
  assert.deepEqual(q.productImages({ imageUrl: label }, [{ imageUrl: photo }], kroger), { photo, label });
  assert.deepEqual(q.productImages({ imageUrl: photo }, [], kroger), { photo, label: null });

  // a grid card uses the merged listing's photo over the canonical's own label
  db.run(sql`UPDATE products SET image_url = ${label} WHERE id = ${CANON}`);
  db.run(sql`UPDATE products SET image_url = ${label} WHERE id = 'otc-other'`);
  try {
    const images = q.getBestProductImages([CANON, "otc-other", "rx-1"]);
    assert.equal(images.get(CANON), "https://images.example/differin.jpg");
    assert.equal(images.get("otc-other"), label);
    assert.equal(images.get("rx-1"), null);
    assert.deepEqual(q.getBestProductImages([]), new Map());

    // with Kroger configured, its photo replaces the label-only card, never a retail photo
    process.env.KROGER_CLIENT_ID = "client";
    process.env.KROGER_CLIENT_SECRET = "secret";
    const at = new Date().toISOString();
    for (const id of [CANON, "otc-other", "rx-1"])
      db.run(sql`INSERT INTO price_checks (product_id, source, checked_at, status, misses, next_check_at, image_url)
        VALUES (${id}, 'kroger', ${at}, 'listed', 0, ${at}, ${`https://www.kroger.com/product/images/large/front/${id}`})`);
    const withKroger = q.getBestProductImages([CANON, "otc-other", "rx-1"]);
    assert.equal(withKroger.get(CANON), "https://images.example/differin.jpg");
    assert.equal(withKroger.get("otc-other"), "https://www.kroger.com/product/images/large/front/otc-other");
    assert.equal(withKroger.get("rx-1"), null);
  } finally {
    delete process.env.KROGER_CLIENT_ID;
    delete process.env.KROGER_CLIENT_SECRET;
    db.run(sql`DELETE FROM price_checks`);
    db.run(sql`UPDATE products SET image_url = NULL WHERE id IN (${CANON}, 'otc-other')`);
  }
});

test("a duplicate's product page 308s to its canonical", async () => {
  const { default: ProductPage } = await import("@/app/product/[id]/page");
  await assert.rejects(
    () => ProductPage({ params: Promise.resolve({ id: DUP }) }),
    (e: unknown) => {
      const digest = String((e as { digest?: string }).digest);
      assert.match(digest, /^NEXT_REDIRECT;[a-z]+;\/product\/otc-canon;308;/);
      return true;
    },
  );
});

test("user data saved under a duplicate resolves through canonical_id", async () => {
  const shelf = await import("./shelf");
  const regimen = await import("./regimen");
  const outcomes = await import("./outcomes");
  const { getScoresForProducts } = await import("./scoring");
  const { recallsForProduct, shelfRecallAlerts } = await import("./recalls");
  const s = "session-merge";
  db.run(sql`INSERT INTO shelf_items (session_id, product_id, status, opened) VALUES (${s}, ${DUP}, 'own', 1)`);

  // shelf: shows the canonical, the canonical's page sees the entry, edits hit the saved row
  assert.deepEqual(shelf.getShelf(s).map((i) => i.product.id), [CANON]);
  assert.equal(shelf.getShelfEntry(s, CANON)?.status, "own");
  shelf.setShelfEntry(s, CANON, "empty", false);
  assert.equal(db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM shelf_items WHERE session_id = ${s}`)[0].n, 1, "no second row");
  assert.equal(shelf.getShelfEntry(s, DUP)?.status, "empty");
  shelf.setShelfEntry(s, CANON, "own", true);

  // regimen (incl. a copied clinician plan's items): one step, the canonical product
  db.run(sql`INSERT INTO regimens (session_id, name, kind, active, created_at) VALUES (${s}, 'Mine', 'own', 1, '2026-10-01')`);
  const rid = db.all<{ id: number }>(sql`SELECT id FROM regimens WHERE session_id = ${s}`)[0].id;
  db.run(sql`INSERT INTO regimen_items (session_id, regimen_id, product_id, slot) VALUES (${s}, ${rid}, ${DUP}, 'pm')`);
  assert.equal(regimen.getRegimenSlot(rid, CANON), "pm");
  assert.deepEqual(regimen.getRegimen(rid).pm.map((x) => x.product.id), [CANON]);
  regimen.setRegimenItem(s, rid, CANON, "am");
  assert.equal(db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM regimen_items WHERE regimen_id = ${rid}`)[0].n, 1);
  assert.equal(regimen.getRegimenSlot(rid, DUP), "am");

  // outcomes: an answer under the duplicate counts for the canonical, once
  db.run(sql`INSERT INTO audience_outcomes (product_id, concern_id, session_id, improved, weeks_used) VALUES (${DUP}, 'acne', ${s}, 1, 8)`);
  assert.equal(outcomes.getSessionOutcome(CANON, "acne", s)?.improved, true);
  assert.equal(outcomes.getSessionOutcomes(s, [{ productId: CANON, concernId: "acne" }]).get(CANON)?.weeksUsed, 8);
  outcomes.logOutcome(CANON, "acne", s, { improved: false, weeksUsed: 12 });
  assert.equal(db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM audience_outcomes WHERE session_id = ${s}`)[0].n, 1);
  assert.equal(getScoresForProducts([{ productId: CANON, concernId: "acne" }]).get(CANON)?.audience.count, 1);

  // recalls matched to the canonical reach a shelf row saved under the duplicate
  db.run(sql`INSERT INTO recalls (recall_number, product_description, fetched_at) VALUES ('D-1-2026', 'Differin gel', '2026-10-01')`);
  db.run(sql`INSERT INTO recall_matches (recall_number, product_id, match_type, confidence, matched_on) VALUES ('D-1-2026', ${CANON}, 'ndc', 1, 'ndc')`);
  assert.deepEqual(shelfRecallAlerts(s).map((a) => [a.recallNumber, a.productId]), [["D-1-2026", CANON]]);
  assert.deepEqual(recallsForProduct(DUP).map((r) => r.recallNumber), ["D-1-2026"]);
});
