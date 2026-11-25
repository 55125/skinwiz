// Named products on the printed patch-test handout (getHandoutSafeProducts):
// clear of the whole list on a full ingredient list, household brands before
// unknown ones, one per brand, never discontinued. `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let q: typeof import("./queries");

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-handout-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  const { db } = await import("@/db/client");
  const { sql } = await import("drizzle-orm");
  q = await import("./queries");

  db.run(sql`INSERT INTO concerns (id, name, description) VALUES ('dry-skin-eczema', 'Dry Skin & Eczema', ''), ('sun-protection', 'Sun Protection', '')`);
  const product = (id: string, name: string, maker: string, concern: string, hits: string[] | null) =>
    db.run(sql`INSERT INTO products (id, concern_id, concern_ids, brand_name, manufacturer, active_ingredient_text, active_ids, free_from_flags, allergen_hits, data_source, verified)
      VALUES (${id}, ${concern}, ${JSON.stringify([concern])}, ${name}, ${maker}, '', '[]', ${hits ? "[]" : null}, ${hits ? JSON.stringify(hits) : null}, 'brand_direct', 0)`);
  product("plain", "Plain Moisturizing Lotion", "Smallco", "dry-skin-eczema", []);
  product("aveeno-1", "Daily Moisturizing Lotion", "Aveeno", "dry-skin-eczema", []);
  product("aveeno-2", "Eczema Therapy Cream", "Aveeno", "dry-skin-eczema", []);
  product("has-nickel", "Shimmer Body Cream", "Cetaphil", "dry-skin-eczema", ["nickel"]);
  product("unassessed", "Rich Cream", "CeraVe", "dry-skin-eczema", null);
  product("sunscreen", "Mineral Sunscreen SPF 50", "Blue Lizard", "sun-protection", []);
});

test("names household brands first, one per brand, clear of the list and assessed", () => {
  const kinds = q.getHandoutSafeProducts(["nickel"]);
  const moist = kinds.find((k) => k.concernId === "dry-skin-eczema")!;
  assert.deepEqual(
    moist.products.map((p) => p.id),
    ["aveeno-1", "plain"],
  );
  assert.equal(moist.products[0].title, "Aveeno Daily Moisturizing Lotion");
  assert.deepEqual(kinds.find((k) => k.concernId === "sun-protection")!.products.map((p) => p.title), ["Blue Lizard Mineral Sunscreen SPF 50"]);
  assert.ok(!kinds.some((k) => k.concernId === "hair-care"), "a kind with nothing clear is left off");
});

test("a list with nothing checkable on labels names no products", () => {
  assert.deepEqual(q.getHandoutSafeProducts([]), []);
  assert.deepEqual(q.getHandoutSafeProducts(["not-a-real-allergen"]), []);
});

test("titles don't repeat a brand the name already starts with", () => {
  assert.equal(q.handoutProductTitle("CeraVe Moisturizing Cream", "CeraVe"), "CeraVe Moisturizing Cream");
  assert.equal(q.handoutProductTitle("Clean & Balanced Shampoo", "Head & Shoulders, Procter & Gamble"), "Head & Shoulders Clean & Balanced Shampoo");
  assert.equal(q.handoutProductTitle("Lotion", null), "Lotion");
});

test("the self-sent email names no allergen and links back to the list", async () => {
  const { avoidListLinkEmail } = await import("./email-templates");
  const m = avoidListLinkEmail("https://activelyskin.com/avoid/import?a=1xyz");
  assert.equal(m.subject, "Your skin allergy list");
  assert.ok(m.text.includes("https://activelyskin.com/avoid/import?a=1xyz"));
  assert.ok(m.html.includes("avoid/import?a=1xyz"));
});
