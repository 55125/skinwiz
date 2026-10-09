// Search ranking by availability (lib/availability.ts, lib/availability-rules.ts):
// in-stock and popular US products first, imported brands and likely
// discontinued products in their own sections, the admin override both
// ways, and the price-lookup bookkeeping the retail rule reads. Seeds a
// small catalog in a temporary database. `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { classifyAvailability, labelCutoff, type AvailabilitySignals } from "./availability-rules";

type Q = typeof import("./queries");
let q: Q;
let av: typeof import("./availability");
let admin: typeof import("./availability-admin");
let db: typeof import("@/db/client").db;
let sql: typeof import("drizzle-orm").sql;

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-availability-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  process.env.KROGER_CLIENT_ID = "test";
  process.env.KROGER_CLIENT_SECRET = "test";
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  ({ db } = await import("@/db/client"));
  ({ sql } = await import("drizzle-orm"));
  q = await import("./queries");
  av = await import("./availability");
  admin = await import("./availability-admin");

  db.run(sql`INSERT INTO concerns (id, name, description) VALUES ('sun', 'Sun protection', '')`);
  const product = (id: string, name: string, maker: string, source: string, setId: string | null = null) =>
    db.run(sql`INSERT INTO products (id, concern_id, brand_name, manufacturer, active_ingredient_text, active_ids, spl_set_id, data_source, verified, is_rx)
      VALUES (${id}, 'sun', ${name}, ${maker}, 'ZINC OXIDE 20%', '[]', ${setId}, ${source}, 1, 0)`);
  product("us-plain", "Brightside Daily Sunscreen SPF 30", "Acme Labs", "openfda");
  product("us-popular", "Brightside Sport Sunscreen SPF 50", "Acme Labs", "openfda");
  product("us-stock", "Brightside Kids Sunscreen SPF 50", "Acme Labs", "openfda");
  product("import-kr", "Relief Sun Sunscreen SPF 50", "Beauty of Joseon", "open_beauty_facts");
  product("old-label", "Brightside Classic Sunscreen SPF 15", "Acme Labs", "dailymed", "set-old");
  product("new-label", "Brightside Beach Sunscreen SPF 30", "Acme Labs", "dailymed", "set-new");
  product("dropped", "Brightside Glow Sunscreen", "Brightside", "open_beauty_facts");
  product("carried", "Brightside Tinted Sunscreen", "Brightside", "open_beauty_facts");
  product("accent", "Curél Hydra Sunscreen SPF 30", "Kao USA", "openfda");
  db.run(sql`INSERT INTO label_sections (spl_set_id, effective_time) VALUES ('set-old', '20120101'), ('set-new', '20250301')`);
  // A retailer link puts one product in stock.
  db.run(sql`INSERT INTO manual_affiliate_links (product_id, retailer, url) VALUES ('us-stock', 'amazon', 'https://www.amazon.com/dp/B000000002?tag=mtass-20')`);
  // Five visitors on one product page make it popular.
  for (let i = 0; i < 5; i++) {
    db.run(sql`INSERT INTO analytics_events (at, day, kind, path, visitor) VALUES (${NOW.toISOString()}, ${NOW.toISOString().slice(0, 10)}, 'pageview', '/product/us-popular', ${`v${i}`})`);
  }
  // Kroger found "dropped" 90 days ago and misses it since; it still finds "carried".
  db.run(sql`INSERT INTO price_checks (product_id, source, checked_at, status, misses, next_check_at, last_matched_at) VALUES
    ('dropped', 'kroger', ${daysAgo(3)}, 'miss', 3, ${daysAgo(-20)}, ${daysAgo(90)}),
    ('carried', 'kroger', ${daysAgo(1)}, 'listed', 0, ${daysAgo(-1)}, ${daysAgo(1)})`);
  av.resetAvailabilityIndex();
});

const signals = (s: Partial<AvailabilitySignals>): AvailabilitySignals => ({
  dataSources: ["open_beauty_facts"],
  origin: null,
  labelDate: null,
  usOffer: false,
  carriedNow: false,
  lastMatchedAt: null,
  override: null,
  ...s,
});

test("rules: unknown products stay on the US shelf; imports need a foreign brand and no US signal", () => {
  assert.equal(classifyAvailability(signals({}), NOW).shelf, "us");
  assert.equal(classifyAvailability(signals({ origin: "kr" }), NOW).shelf, "import");
  // A current FDA listing, the brand's own store or a retailer means it's sold here.
  assert.equal(classifyAvailability(signals({ origin: "eu", dataSources: ["openfda"] }), NOW).shelf, "us");
  assert.equal(classifyAvailability(signals({ origin: "ca", dataSources: ["brand_direct"] }), NOW).shelf, "us");
  assert.equal(classifyAvailability(signals({ origin: "kr", usOffer: true }), NOW).shelf, "us");
  assert.equal(classifyAvailability(signals({ origin: "jp", dataSources: ["open_beauty_facts", "openfda"] }), NOW).shelf, "us");
});

test("rules: an old lapsed FDA label is likely discontinued, unless anything says it's still sold", () => {
  const old = signals({ dataSources: ["dailymed"], labelDate: "20120101" });
  assert.deepEqual(classifyAvailability(old, NOW).discontinued, { kind: "label", labelDate: "20120101" });
  assert.equal(classifyAvailability({ ...old, labelDate: labelCutoff(NOW) }, NOW).discontinued, null, "exactly at the cutoff is not old");
  assert.equal(classifyAvailability({ ...old, usOffer: true }, NOW).discontinued, null);
  assert.equal(classifyAvailability({ ...old, carriedNow: true }, NOW).discontinued, null);
  assert.equal(classifyAvailability({ ...old, dataSources: ["dailymed", "openfda"] }, NOW).discontinued, null);
  assert.equal(classifyAvailability({ ...old, override: "available" }, NOW).shelf, "us");
  assert.equal(classifyAvailability(signals({ dataSources: ["dailymed"], labelDate: null }), NOW).discontinued, null);
});

test("rules: retailers dropping a product flags it after 60 days; an FDA listing outranks that", () => {
  const gone = signals({ lastMatchedAt: daysAgo(61) });
  assert.equal(classifyAvailability(gone, NOW).discontinued?.kind, "retail");
  assert.equal(classifyAvailability({ ...gone, lastMatchedAt: daysAgo(59) }, NOW).discontinued, null);
  assert.equal(classifyAvailability({ ...gone, carriedNow: true }, NOW).discontinued, null);
  assert.equal(classifyAvailability({ ...gone, dataSources: ["openfda"] }, NOW).discontinued, null);
  // The owner's call wins both ways.
  assert.equal(classifyAvailability({ ...gone, override: "available" }, NOW).discontinued, null);
  const manual = classifyAvailability(signals({ usOffer: true, override: "discontinued", overrideNote: "Replaced by v2" }), NOW);
  assert.deepEqual(manual.discontinued, { kind: "manual", note: "Replaced by v2" });
});

test("the catalog index classifies each seeded product", () => {
  assert.equal(av.shelfOf("us-plain"), "us");
  assert.equal(av.availabilityOf("us-stock").inStock, true);
  assert.equal(av.shelfOf("import-kr"), "import");
  assert.equal(av.availabilityOf("old-label").discontinued?.kind, "label");
  assert.equal(av.shelfOf("new-label"), "us");
  assert.equal(av.availabilityOf("dropped").discontinued?.kind, "retail");
  assert.equal(av.shelfOf("carried"), "us");
  assert.deepEqual(av.availabilitySummary(), { inStock: 1, imports: 1, discontinued: { manual: 0, retail: 1, label: 1 } });
});

test("search: in stock first, then popular; imports and discontinued in their own sections", () => {
  assert.deepEqual(q.searchShelfCounts("sunscreen"), { main: 6, import: 1, discontinued: 2 });
  const main = q.searchProducts("sunscreen", { shelf: "main" }).map((p) => p.id);
  assert.deepEqual(main.slice(0, 2), ["us-stock", "us-popular"]);
  assert.ok(!main.includes("import-kr") && !main.includes("old-label") && !main.includes("dropped"));
  assert.deepEqual(q.searchProducts("sunscreen", { shelf: "import" }).map((p) => p.id), ["import-kr"]);
  assert.deepEqual(q.searchProducts("sunscreen", { shelf: "discontinued" }).map((p) => p.id).sort(), ["dropped", "old-label"]);
  // Without a section (product pickers, the API), discontinued still goes last.
  const all = q.searchProducts("sunscreen").map((p) => p.id);
  assert.deepEqual(all.slice(-2).sort(), ["dropped", "old-label"]);
  assert.ok(all.indexOf("import-kr") > all.indexOf("us-plain"), "imports rank below equally relevant US products");
  // Discontinued last in autocomplete too.
  assert.ok(!["old-label", "dropped"].includes(q.suggestProducts("brightside", 3)[0].id));
});

test("search: picking a region folds its imports into the main list", () => {
  assert.deepEqual(q.searchShelfCounts("sunscreen", { origin: "kr" }), { main: 1, import: 0, discontinued: 0 });
  assert.deepEqual(q.searchProducts("sunscreen", { origin: "kr", shelf: "main" }).map((p) => p.id), ["import-kr"]);
});

test("search: accent-insensitive matching still works", () => {
  assert.deepEqual(q.searchProducts("curel", { shelf: "main" }).map((p) => p.id), ["accent"]);
  assert.equal(q.suggestProducts("curel")[0]?.id, "accent");
});

test("admin calls override the automatic flags and accept a product URL", () => {
  assert.equal(admin.parseProductRef("https://activelyskin.com/product/old-label?x=1"), "old-label");
  assert.equal(admin.parseProductRef("  us-plain "), "us-plain");
  assert.equal(admin.setAvailability("/product/old-label", "available", null), true);
  assert.equal(av.shelfOf("old-label"), "us");
  assert.equal(admin.setAvailability("us-plain", "discontinued", "  Replaced by the SPF 50  "), true);
  assert.deepEqual(av.availabilityOf("us-plain").discontinued, { kind: "manual", note: "Replaced by the SPF 50" });
  assert.equal(q.searchShelfCounts("sunscreen").discontinued, 2);
  assert.deepEqual(admin.listAvailabilityOverrides().map((o) => o.productId).sort(), ["old-label", "us-plain"]);
  assert.equal(admin.setAvailability("us-plain", "clear", null), true);
  assert.equal(admin.setAvailability("old-label", "clear", null), true);
  assert.equal(av.availabilityOf("old-label").discontinued?.kind, "label");
  assert.equal(admin.setAvailability("no-such-product", "discontinued", null), false);
});

test("a source that stopped finding anything flags nothing", () => {
  db.run(sql`UPDATE price_checks SET last_matched_at = ${daysAgo(30)}, status = 'miss' WHERE product_id = 'carried'`);
  av.resetAvailabilityIndex();
  assert.equal(av.availabilityOf("dropped").discontinued, null);
  db.run(sql`UPDATE price_checks SET last_matched_at = ${daysAgo(1)}, status = 'listed' WHERE product_id = 'carried'`);
  av.resetAvailabilityIndex();
});

test("price lookups record when a product was last found, and a miss keeps it", async () => {
  const { saveLookup } = await import("./prices/store");
  const row = () => db.get<{ status: string; last: string | null }>(sql`SELECT status, last_matched_at AS last FROM price_checks WHERE product_id = 'new-label' AND source = 'kroger'`);
  const t1 = new Date(NOW.getTime() - 86_400_000);
  saveLookup("new-label", "kroger", { status: "listed", quotes: [] }, t1);
  assert.equal(row()?.last, t1.toISOString());
  saveLookup("new-label", "kroger", { status: "miss", quotes: [] }, NOW);
  assert.deepEqual(row(), { status: "miss", last: t1.toISOString() });
});
