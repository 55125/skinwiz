// Barcode / NDC / set id lookup from the search box: lib/product-codes.ts
// reads the entry, lib/queries.ts lookupProductsByCode finds the product.
// The lookup half seeds a throwaway DB. `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { brandSiteBarcode, gtinSpellings, parseProductCode, validGtin } from "./product-codes";

test("check digits", () => {
  assert.ok(validGtin("302994910458")); // Differin UPC-A
  assert.ok(validGtin("0302994910458")); // same as EAN-13
  assert.ok(validGtin("00302994910458")); // same as GTIN-14
  assert.ok(!validGtin("302994910459"));
  assert.ok(validGtin("96385074")); // EAN-8
});

test("every length of one barcode reads the same", () => {
  const spellings = ["302994910458", "0302994910458", "00302994910458", " 3 02994 91045 8 ", "UPC: 302994910458"].map(
    (s) => parseProductCode(s)?.barcodes.sort(),
  );
  for (const s of spellings) assert.deepEqual(s, ["00302994910458", "0302994910458", "302994910458"]);
  assert.deepEqual(gtinSpellings("00012114"), ["00012114", "000000012114", "0000000012114", "00000000012114"]);
});

test("a UPC typed without its check digit, and a Kroger productId", () => {
  assert.ok(parseProductCode("30299491045")!.barcodes.includes("302994910458"));
  const kroger = parseProductCode("0030299491045")!;
  assert.ok(kroger.barcodes.includes("302994910458"));
  assert.ok(kroger.krogerIds.includes("0030299491045"));
  // any valid barcode is also looked up as its Kroger productId
  assert.deepEqual(parseProductCode("302994910458")!.krogerIds, ["0030299491045"]);
});

test("NDCs in every spelling", () => {
  assert.deepEqual(parseProductCode("49967-138")!.productNdcs, ["49967-138"]);
  assert.deepEqual(parseProductCode("49967-138-01")!.productNdcs, ["49967-138"]);
  assert.deepEqual(parseProductCode("NDC 0023-1230-01")!.productNdcs, ["0023-1230"]);
  // 11-digit billing form, zero-padded labeler (4-4-2)
  assert.ok(parseProductCode("00023-1230-01")!.productNdcs.includes("0023-1230"));
  assert.ok(parseProductCode("00023123001")!.productNdcs.includes("0023-1230"));
  // 11-digit, zero-padded product code (5-3-2) and package (5-4-1)
  assert.ok(parseProductCode("49967-0138-01")!.productNdcs.includes("49967-138"));
  assert.ok(parseProductCode("50718003201")!.productNdcs.includes("50718-0032"));
  // bare 10 digits: every split is a candidate
  assert.deepEqual(parseProductCode("4996713801")!.productNdcs, ["4996-7138", "49967-138", "49967-1380"]);
});

test("a drug's UPC carries its NDC", () => {
  // "3" + NDC 0023-1230-01 + check digit (fetch_barcodes.py ndc_derived)
  assert.ok(parseProductCode("300231230017")!.productNdcs.includes("0023-1230"));
});

test("DailyMed set ids", () => {
  assert.equal(parseProductCode("664D4733-E72D-410A-8ED0-A159D9DFA236")!.setId, "664d4733-e72d-410a-8ed0-a159d9dfa236");
});

test("ordinary searches are not codes", () => {
  for (const s of ["cerave", "spf 50", "50", "2024", "1-2", "vitamin c 15%", "302994910459", "123456", "a1b2c3d4e5f6"]) {
    assert.equal(parseProductCode(s), null, s);
  }
});

test("brand-direct ids that carry the brand's own UPC", () => {
  assert.equal(brandSiteBarcode("aquaphor-072140633776"), "0072140633776");
  assert.equal(brandSiteBarcode("aquaphor-072140633777"), null); // bad check digit
  assert.equal(brandSiteBarcode("NATR-123"), null);
  assert.equal(brandSiteBarcode("0072140633776"), null); // OBF ids are barcodes already
});

type Q = typeof import("./queries");
let q: Q;

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-codes-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  const { db } = await import("@/db/client");
  const { sql } = await import("drizzle-orm");
  q = await import("./queries");

  db.run(sql`INSERT INTO concerns (id, name, description) VALUES ('acne', 'Acne', ''), ('rx', 'Prescription', '')`);
  const product = (id: string, name: string, opts: { setId?: string; canonical?: string; rx?: boolean; source?: string } = {}) =>
    db.run(sql`INSERT INTO products (id, concern_id, brand_name, manufacturer, active_ids, spl_set_id, data_source, verified, is_rx, canonical_id)
      VALUES (${id}, ${opts.rx ? "rx" : "acne"}, ${name}, 'Maker', '[]', ${opts.setId ?? null}, ${opts.source ?? "openfda"}, 1,
        ${opts.rx ? 1 : 0}, ${opts.canonical ?? null})`);
  product("0299-3822", "Differin Gel", { setId: "aaaaaaaa-1111-2222-3333-444444444444" });
  product("0299-3823", "Differin Gel 15 g", { canonical: "0299-3822" });
  product("0023-1230", "Drug With Derived UPC");
  product("0012345678905", "Cosmetic Keyed By Barcode", { source: "open_beauty_facts" });
  product("brand-serum", "Brand Serum", { source: "brand_direct" });
  product("shared-a", "Shared Code A");
  product("shared-b", "Shared Code B");
  product("0168-0099", "Rx Cream", { rx: true });
  product("10356-101", "Aquaphor Healing");
  db.run(sql`UPDATE products SET dosage_form = 'OINTMENT' WHERE id = '10356-101'`);
  db.run(sql`INSERT INTO product_barcodes (product_id, barcode, source, rank) VALUES
    ('0299-3823', '0302993917564', 'openfda_upc', 0),
    ('shared-a', '0070501111116', 'openfda_upc', 0),
    ('shared-b', '0070501111116', 'openfda_upc', 0),
    ('10356-101', '0072140014193', 'package', 0)`);
  db.run(sql`INSERT INTO price_quotes (product_id, source, merchant_id, merchant_name, price, currency, url, affiliatable, match_type, match_confidence, fetched_at)
    VALUES ('brand-serum', 'kroger', 'kroger-1', 'Kroger', 9.99, 'USD', 'https://www.kroger.com/p/brand-serum/0081234500001', 0, 'keywords', 0.9, '2026-10-09')`);
});

const ids = (s: string) => q.lookupProductsByCode(s)?.map((p) => p.id);

test("lookup: barcode on a merged listing finds the product that stands for it", () => {
  assert.deepEqual(ids("302993917564"), ["0299-3822"]);
  assert.deepEqual(ids("00302993917564"), ["0299-3822"]);
});

test("lookup: NDC, drug UPC, set id, barcode id, Kroger productId", () => {
  assert.deepEqual(ids("0299-3822-01"), ["0299-3822"]);
  assert.deepEqual(ids("300231230017"), ["0023-1230"]);
  assert.deepEqual(ids("AAAAAAAA-1111-2222-3333-444444444444"), ["0299-3822"]);
  assert.deepEqual(ids("012345678905"), ["0012345678905"]);
  assert.deepEqual(ids("0081234500001"), ["brand-serum"]);
});

test("lookup: a shared code lists every product; unknown codes and Rx find nothing", () => {
  assert.deepEqual(ids("070501111116"), ["shared-a", "shared-b"].sort((a, b) => a.localeCompare(b)));
  assert.deepEqual(ids("0168-0099"), []);
  assert.deepEqual(ids("036000291452"), []);
  assert.equal(q.lookupProductsByCode("differin"), null);
});

test("lookup: a barcode typed off the package finds an FDA listing openFDA gives no UPC for", () => {
  assert.deepEqual(ids("0 72140 01419 3"), ["10356-101"]);
});

test("search: the dosage form counts as a word of the name", () => {
  assert.deepEqual(q.searchProducts("aquaphor healing ointment").map((p) => p.id), ["10356-101"]);
  assert.deepEqual(q.searchProducts("aquaphor cream").map((p) => p.id), []);
});
