// A product can be listed under more than one concern (products.concernIds):
// an SPF moisturizer shows on both the sun protection and dry skin pages, in
// their counts and filters, with each page's own ranking rules. `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let q: typeof import("./queries");

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-multi-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  const { db } = await import("@/db/client");
  const { sql } = await import("drizzle-orm");
  q = await import("./queries");

  db.run(sql`INSERT INTO concerns (id, name, description) VALUES ('sun-protection', 'Sun Protection', ''), ('dry-skin-eczema', 'Dry Skin & Eczema', '')`);
  const product = (id: string, name: string, concernIds: string[], activeIds: string[]) =>
    db.run(sql`INSERT INTO products (id, concern_id, concern_ids, brand_name, manufacturer, active_ingredient_text, active_ids, free_from_flags, allergen_hits, data_source, verified)
      VALUES (${id}, ${concernIds[0]}, ${JSON.stringify(concernIds)}, ${name}, ${`Maker ${id}`}, '', ${JSON.stringify(activeIds)}, '[]', '[]', 'brand_direct', 0)`);
  product("spf-lotion", "AM Facial Moisturizing Lotion SPF 30", ["sun-protection", "dry-skin-eczema"], ["avobenzone"]);
  product("sunscreen", "Sport Sunscreen Broad Spectrum SPF 50", ["sun-protection"], ["avobenzone"]);
  product("cream", "Moisturizing Cream", ["dry-skin-eczema"], ["petrolatum"]);
});

test("a product listed under two concerns shows on both pages", () => {
  const ids = (concernId: string) => q.getProductsForConcern(concernId, 1).rows.map((r) => r.id).sort();
  assert.deepEqual(ids("sun-protection"), ["spf-lotion", "sunscreen"]);
  assert.deepEqual(ids("dry-skin-eczema"), ["cream", "spf-lotion"]);
  assert.deepEqual(q.browseProducts({ concernId: "dry-skin-eczema", concernListing: true }, 1).rows.map((r) => r.id).sort(), ["cream", "spf-lotion"]);
});

test("each page ranks it by its own rules", () => {
  // The dry-skin page ranks a day cream with SPF below eczema care.
  assert.deepEqual(q.getProductsForConcern("dry-skin-eczema", 1).rows.map((r) => r.id), ["cream", "spf-lotion"]);
});

test("counts per concern include it under each", () => {
  const counts = new Map(q.getFreeOfAllergenByConcern("fragrance").map((c) => [c.id, c.n]));
  assert.equal(counts.get("sun-protection"), 2);
  assert.equal(counts.get("dry-skin-eczema"), 2);
});
