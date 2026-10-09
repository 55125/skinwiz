// The dupe finder against a small seeded catalog (lib/dupes.ts): only exact
// active sets in the same form qualify, a stated strength mismatch rules a
// product out, an unstated one is allowed and flagged, closest inactive list
// first, same-brand matches apart, and Rx rows, merged duplicates and other
// concerns' filing don't change who qualifies. `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let dupes: typeof import("./dupes");
let db: typeof import("@/db/client").db;
let sql: typeof import("drizzle-orm").sql;

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-dupes-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  ({ db } = await import("@/db/client"));
  ({ sql } = await import("drizzle-orm"));
  dupes = await import("./dupes");

  db.run(sql`INSERT INTO concerns (id, name, description) VALUES ('sun-protection', 'Sun protection', ''), ('dry-skin', 'Dry skin', ''), ('rx', 'Prescription', '')`);
  // Common ingredients in every list, so rarity weights behave as in the catalog.
  const common = ["water", "glycerin"];
  const product = (
    id: string,
    o: { name: string; maker: string; form?: string | null; actives?: string[]; strengths?: Record<string, number> | null; concern?: string; rx?: boolean; canonical?: string; inactives?: string[] },
  ) => {
    const actives = o.actives ?? ["zinc-oxide", "titanium-dioxide"];
    const strengths = o.strengths === undefined ? { "zinc-oxide": 10, "titanium-dioxide": 5 } : o.strengths;
    const concern = o.concern ?? "sun-protection";
    db.run(sql`INSERT INTO products (id, concern_id, concern_ids, brand_name, manufacturer, dosage_form, active_ids, strengths, data_source, verified, is_rx, canonical_id)
      VALUES (${id}, ${concern}, json_array(${concern}), ${o.name}, ${o.maker}, ${o.form === undefined ? "CREAM" : o.form}, ${JSON.stringify(actives)},
        ${strengths ? JSON.stringify(strengths) : null}, 'openfda', 1, ${o.rx ? 1 : 0}, ${o.canonical ?? null})`);
    actives.forEach((a, i) => {
      db.run(sql`INSERT INTO ingredients (id, name, aliases, product_count) VALUES (${a}, ${a}, '[]', 1) ON CONFLICT DO NOTHING`);
      db.run(sql`INSERT INTO product_ingredients (product_id, position, ingredient_id, raw_name, is_active) VALUES (${id}, ${-i}, ${a}, ${a}, 1)`);
    });
    (o.inactives?.length === 0 ? [] : [...common, ...(o.inactives ?? [])]).forEach((ing, i) => {
      db.run(sql`INSERT INTO ingredients (id, name, aliases, product_count) VALUES (${ing}, ${ing}, '[]', 1) ON CONFLICT DO UPDATE SET product_count = product_count + 1`);
      db.run(sql`INSERT INTO product_ingredients (product_id, position, ingredient_id, raw_name, is_active) VALUES (${id}, ${i + 1}, ${ing}, ${ing}, 0)`);
    });
  };
  const base = ["ceramide-np", "squalane", "dimethicone", "cetearyl-alcohol", "tocopherol"];
  product("target", { name: "Sunbright Mineral Sunscreen Cream SPF 30", maker: "Sunbright Inc", inactives: base });
  product("near", { name: "Shoreline Mineral Cream SPF 30", maker: "Shoreline LLC", inactives: base.slice(0, 4) });
  product("far", { name: "Harbor Daily Mineral Cream SPF 30", maker: "Harbor Co", inactives: ["dimethicone", "fragrance", "carbomer", "xanthan-gum"] });
  // Filed under a different concern: dupes search the whole catalog.
  product("other-concern", { name: "Dune Moisturizing Cream SPF 30", maker: "Dune Labs", concern: "dry-skin", inactives: base.slice(0, 3) });
  product("no-strength", { name: "Coastal Mineral Cream", maker: "Coastal Labs", strengths: null, inactives: base.slice(0, 2) });
  product("no-inactives", { name: "Tidal Mineral Cream SPF 30", maker: "Tidal Inc", inactives: [] });
  product("discontinued", { name: "Old Pier Mineral Cream SPF 30", maker: "Old Pier", inactives: base });
  product("same-brand", { name: "Sunbright Sport Mineral Cream SPF 30", maker: "Sunbright Inc", inactives: base });
  // Not dupes:
  product("lotion", { name: "Shoreline Mineral Lotion SPF 30", maker: "Shoreline LLC", form: "LOTION", inactives: base });
  product("stronger", { name: "Beacon Mineral Cream SPF 50", maker: "Beacon", strengths: { "zinc-oxide": 20, "titanium-dioxide": 5 }, inactives: base });
  product("extra-active", { name: "Gull Cream SPF 30", maker: "Gull", actives: ["zinc-oxide", "titanium-dioxide", "octinoxate"], strengths: { "zinc-oxide": 10, "titanium-dioxide": 5, octinoxate: 7.5 }, inactives: base });
  product("fewer-actives", { name: "Pelican Cream SPF 30", maker: "Pelican", actives: ["zinc-oxide"], strengths: { "zinc-oxide": 10 }, inactives: base });
  product("rx-bait", { name: "Rx Mineral Cream", maker: "Rx Pharma", rx: true, inactives: base });
  product("merged", { name: "Shoreline Mineral Cream SPF 30 (2 oz)", maker: "Shoreline LLC", canonical: "near", inactives: base });
  product("kit", { name: "Sunbright Mineral Kit", maker: "Kit Co", form: "KIT", inactives: base });
  db.run(sql`INSERT INTO product_availability (product_id, status, note, updated_at) VALUES ('discontinued', 'discontinued', NULL, ${new Date().toISOString()})`);
});

test("only exact active sets, in the same form, at matching or unstated strengths", () => {
  const r = dupes.findDupes("target", 50);
  assert.equal(r.form, "cream");
  const ids = [...r.rows, ...r.sameBrandRows].map((d) => d.product.id).sort();
  assert.deepEqual(ids, ["discontinued", "far", "near", "no-inactives", "no-strength", "other-concern", "same-brand"]);
  assert.equal(r.total, 6);
});

test("ranked by inactive match; no list after compared ones; discontinued last", () => {
  const r = dupes.findDupes("target", 50);
  assert.deepEqual(
    r.rows.map((d) => d.product.id),
    ["near", "other-concern", "no-strength", "far", "no-inactives", "discontinued"],
  );
  const near = r.rows[0];
  assert.equal(near.match!.shared, 6);
  assert.equal(near.match!.union, 7);
  assert.equal(r.rows.find((d) => d.product.id === "no-inactives")!.match, null);
  assert.equal(r.rows.find((d) => d.product.id === "discontinued")!.discontinued, true);
});

test("an unstated strength is allowed and flagged", () => {
  const r = dupes.findDupes("target", 50);
  assert.equal(r.rows.find((d) => d.product.id === "no-strength")!.strength, "unknown");
  assert.equal(r.rows.find((d) => d.product.id === "near")!.strength, "same");
});

test("the same brand's matches are listed apart", () => {
  const r = dupes.findDupes("target", 50);
  assert.deepEqual(r.sameBrandRows.map((d) => d.product.id), ["same-brand"]);
  assert.equal(r.sameBrandTotal, 1);
});

test("limit trims the list but not the count", () => {
  const r = dupes.findDupes("target", 2);
  assert.equal(r.rows.length, 2);
  assert.equal(r.total, 6);
});

test("Rx rows, merged duplicates and kits get no dupes", () => {
  assert.equal(dupes.findDupes("rx-bait").total, 0);
  assert.equal(dupes.findDupes("merged").total, 0);
  const kit = dupes.findDupes("kit");
  assert.equal(kit.form, null);
  assert.equal(kit.total, 0);
  assert.equal(kit.hasActives, true);
});
