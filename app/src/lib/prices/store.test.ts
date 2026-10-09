// Live prices end to end on a scratch database, with a mocked fetch: dormant
// without both keys, stale quotes hidden, Rx never looked up or shown, the
// miss marker, and the job's priority order. No live calls. `npm test`.
import { before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let db: typeof import("@/db/client").db;
let sql: typeof import("drizzle-orm").sql;
let store: typeof import("./store");
let refresh: typeof import("./refresh");
let queries: typeof import("@/lib/queries");

const NOW = new Date("2026-10-03T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const KEYS = { SOVRN_SITE_API_KEY: "site", SOVRN_SECRET_KEY: "secret" };

const KROGER_KEYS = { KROGER_CLIENT_ID: "client", KROGER_CLIENT_SECRET: "secret" };

function setEnv(on: boolean, keys: Record<string, string> = KEYS) {
  if (!on) for (const k of Object.keys(KROGER_KEYS)) delete process.env[k];
  for (const [k, v] of Object.entries(keys)) {
    if (on) process.env[k] = v;
    else delete process.env[k];
  }
}

function quote(productId: string, merchant: string, price: number, fetchedAt: string, extra = "", pack?: { amount: number; unit: "g" | "mL" }) {
  db.run(sql`INSERT INTO price_quotes (product_id, source, merchant_id, merchant_name, price, currency, url, affiliatable,
      match_type, match_confidence, offer_name, pack_amount, pack_unit, fetched_at)
    VALUES (${productId}, 'sovrn', ${merchant}, ${merchant}, ${price}, 'USD', ${`https://x.invalid/${productId}/${merchant}${extra}`}, 1,
      'barcode', 0.95, NULL, ${pack?.amount ?? null}, ${pack?.unit ?? null}, ${fetchedAt})`);
}

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-prices-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  ({ db } = await import("@/db/client"));
  ({ sql } = await import("drizzle-orm"));
  store = await import("./store");
  refresh = await import("./refresh");
  queries = await import("@/lib/queries");

  db.run(sql`INSERT INTO concerns (id, name, description) VALUES ('acne', 'Acne', ''), ('rx', 'Prescription', '')`);
  const product = (id: string, name: string, rx: boolean, pkg: string | null, manufacturer = "Galderma") =>
    db.run(sql`INSERT INTO products (id, concern_id, brand_name, manufacturer, dosage_form, active_ids, strengths, strength_key, data_source, is_rx, package_description)
      VALUES (${id}, ${rx ? "rx" : "acne"}, ${name}, ${manufacturer}, 'GEL', '["adapalene"]', '{"adapalene":0.1}', 'adapalene:0.1', 'openfda', ${rx ? 1 : 0}, ${pkg})`);
  product("otc-1", "Differin", false, "1 TUBE in 1 CARTON / 45 g in 1 TUBE");
  product("otc-2", "Adapalene", false, "1 TUBE in 1 CARTON / 15 g in 1 TUBE", "RITE AID");
  product("otc-3", "Differin Gel", false, null);
  product("rx-1", "Differin Rx Cream", true, "45 g in 1 TUBE");
  db.run(sql`INSERT INTO product_barcodes (product_id, barcode, source, rank) VALUES
    ('otc-1', '111', 'openfda_upc', 0), ('rx-1', '999', 'openfda_upc', 0)`);
});

beforeEach(() => {
  setEnv(false);
  db.run(sql`DELETE FROM price_quotes`);
  db.run(sql`DELETE FROM price_checks`);
  db.run(sql`DELETE FROM product_views`);
  db.run(sql`DELETE FROM shelf_items`);
});

test("dormant without both keys: no quotes shown, no requests, no writes", async () => {
  quote("otc-1", "Walmart", 12.97, hoursAgo(1));
  let calls = 0;
  const fetchSpy = (async () => {
    calls++;
    return new Response("[]");
  }) as typeof fetch;
  const real = globalThis.fetch;
  globalThis.fetch = fetchSpy;
  try {
    for (const env of [{}, { SOVRN_SITE_API_KEY: "site" }, { SOVRN_SECRET_KEY: "secret" }]) {
      setEnv(false);
      Object.assign(process.env, env);
      assert.deepEqual(store.getDisplayQuotes("otc-1", NOW), []);
      assert.equal(queries.getLivePrices(new Map([["g", ["otc-1"]]]), NOW).size, 0);
      const report = await refresh.refreshPrices(NOW, { deps: { fetch: fetchSpy } });
      assert.equal(report.enabled, false);
      store.recordProductView("otc-1", NOW);
    }
    assert.equal(calls, 0);
    assert.equal(db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM price_checks`)!.n, 0);
    assert.equal(db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM product_views`)!.n, 0);
  } finally {
    globalThis.fetch = real;
  }
});

test("quotes older than 72 hours are never shown", () => {
  setEnv(true);
  quote("otc-1", "Walmart", 12.97, hoursAgo(71));
  quote("otc-1", "Target", 11.0, hoursAgo(73));
  assert.deepEqual(
    store.getDisplayQuotes("otc-1", NOW).map((q) => q.merchantName),
    ["Walmart"],
  );
  const live = queries.getLivePrices(new Map([["g", ["otc-1"]]]), NOW);
  assert.equal(live.get("g")?.price, 12.97);
  assert.equal(live.get("g")?.merchantName, "Walmart");
});

test("Rx is never shown, even with a stored quote, and never looked up", async () => {
  setEnv(true);
  quote("rx-1", "Walmart", 5, hoursAgo(1));
  assert.deepEqual(store.getDisplayQuotes("rx-1", NOW), []);
  assert.equal(queries.getLivePrices(new Map([["g", ["rx-1"]]]), NOW).size, 0);
  assert.deepEqual(store.getDisplayQuotesFor(["rx-1"], NOW), []);
  assert.ok(!refresh.pickDueProducts(NOW, 100).includes("rx-1"));
  assert.deepEqual(refresh.pickDueProducts(NOW, 100, { only: ["rx-1"] }), []);
  assert.deepEqual(store.loadLookupProducts(["rx-1"]), []);
});

test("group prices use only the offer's own stated size, never our NDC package", () => {
  setEnv(true);
  quote("otc-1", "Walmart", 12.97, hoursAgo(1)); // offer states no size; our NDC package (45 g) is NOT used
  quote("otc-2", "Rite Aid", 6.0, hoursAgo(1), "", { amount: 15, unit: "g" }); // the offer states 15 g -> $11.34/oz
  const live = queries.getLivePrices(new Map([["g", ["otc-1", "otc-2"]], ["a", ["otc-2"]], ["b", ["otc-1"]]]), NOW);
  // A known per-ounce price ranks ahead of one whose size is unknown.
  assert.equal(live.get("g")?.productId, "otc-2");
  assert.equal(live.get("a")?.perUnit?.value.toFixed(2), "11.34");
  assert.equal(live.get("b")?.price, 12.97);
  assert.equal(live.get("b")?.perUnit, null);
});

test("the refresh stores verified quotes, books a miss, and skips both until due", async () => {
  setEnv(true);
  const asked: string[] = [];
  const fetchMock = (async (input: string | URL | Request) => {
    const u = new URL(String(input));
    asked.push(u.searchParams.get("barcode") ?? u.searchParams.get("search-keywords") ?? "?");
    const body =
      u.searchParams.get("barcode") === "111"
        ? [{ name: "Differin Gel 0.1% 45 g", merchant: { id: 1, name: "Walmart" }, deeplink: "https://x.invalid/w", currency: "USD", salePrice: 12.97, affiliatable: true }]
        : [];
    return new Response(JSON.stringify(body));
  }) as typeof fetch;
  const deps = { fetch: fetchMock, sleep: async () => {}, minIntervalMs: 0 };

  const r1 = await refresh.refreshPrices(NOW, { deps, maxRequests: 50 });
  assert.equal(r1.matched, 1);
  assert.equal(r1.misses, 2);
  assert.ok(!asked.includes("999"), "never asks about the Rx barcode");
  assert.deepEqual(
    store.getDisplayQuotes("otc-1", NOW).map((q) => [q.merchantName, q.price]),
    [["Walmart", 12.97]],
  );
  const miss = db.get<{ status: string; next: string }>(sql`SELECT status, next_check_at AS next FROM price_checks WHERE product_id = 'otc-3'`)!;
  assert.equal(miss.status, "miss");
  assert.equal(miss.next, new Date(NOW.getTime() + 7 * 24 * 3_600_000).toISOString());

  asked.length = 0;
  const r2 = await refresh.refreshPrices(new Date(NOW.getTime() + 3_600_000), { deps, maxRequests: 50 });
  assert.equal(r2.checked, 0);
  assert.deepEqual(asked, []);

  // a day later the match is due again; the misses are still waiting
  const r3 = await refresh.refreshPrices(new Date(NOW.getTime() + 25 * 3_600_000), { deps, maxRequests: 50 });
  assert.equal(r3.checked, 1);
});

test("a second miss backs off longer", async () => {
  setEnv(true);
  const deps = { fetch: (async () => new Response("[]")) as typeof fetch, sleep: async () => {}, minIntervalMs: 0 };
  await refresh.refreshPrices(NOW, { deps, only: ["otc-3"] });
  const later = new Date(NOW.getTime() + 8 * 24 * 3_600_000);
  await refresh.refreshPrices(later, { deps, only: ["otc-3"] });
  const row = db.get<{ misses: number; next: string }>(sql`SELECT misses, next_check_at AS next FROM price_checks WHERE product_id = 'otc-3'`)!;
  assert.equal(row.misses, 2);
  assert.equal(row.next, new Date(later.getTime() + 14 * 24 * 3_600_000).toISOString());
});

test("an outage stops the run and keeps existing quotes", async () => {
  setEnv(true);
  quote("otc-1", "Walmart", 12.97, hoursAgo(30));
  const deps = { fetch: (async () => new Response("", { status: 503 })) as typeof fetch, sleep: async () => {}, minIntervalMs: 0, maxRetries: 1 };
  const r = await refresh.refreshPrices(NOW, { deps, maxRequests: 50 });
  assert.ok(r.stopped);
  assert.equal(r.requests, 2);
  assert.equal(store.getDisplayQuotes("otc-1", NOW).length, 1);
});

test("priority: users' products, then recent views, then the sweep", () => {
  setEnv(true);
  db.run(sql`INSERT INTO shelf_items (session_id, product_id, status) VALUES ('s', 'otc-3', 'own'), ('s', 'rx-1', 'own')`);
  store.recordProductView("otc-2", NOW);
  assert.deepEqual(refresh.pickDueProducts(NOW, 10), ["otc-3", "otc-2", "otc-1"]);
  assert.deepEqual(refresh.pickDueProducts(NOW, 10, { sweep: false }), ["otc-3", "otc-2"]);
});

test("Kroger alone: plain-link quotes with stock are shown, the catalog check is booked, Sovrn is never called", async () => {
  setEnv(true, KROGER_KEYS);
  const hosts = new Set<string>();
  const fetchMock = (async (input: string | URL | Request) => {
    const u = new URL(String(input));
    hosts.add(u.hostname);
    if (u.pathname.endsWith("/token")) return new Response(JSON.stringify({ access_token: "t", expires_in: 1800 }));
    if (u.pathname === "/v1/locations")
      return new Response(JSON.stringify({ data: [{ locationId: "01400943", chain: "KROGER", address: { city: "Cincinnati", state: "OH", zipCode: "45202" } }] }));
    const term = u.searchParams.get("filter.term") ?? "";
    const item = (price: number | null) => [{ price: price == null ? undefined : { regular: price, promo: 0 }, size: "1.6 oz", inventory: { stockLevel: "HIGH" } }];
    // otc-1 (Differin): priced. otc-2 (Rite Aid adapalene): Kroger carries a match but no price here.
    const data = /differin/.test(term)
      ? [{ productId: "0030299491045", description: "Differin Adapalene Gel 0.1% Acne Treatment", productPageURI: "/p/differin/0030299491045", items: item(14.99) }]
      : /rite adapalene/.test(term)
        ? [{ productId: "0001", description: "Rite Aid Adapalene Gel 0.1% 15 g", items: item(null) }]
        : [];
    return new Response(JSON.stringify({ data }));
  }) as typeof fetch;

  const r = await refresh.refreshPrices(NOW, { krogerDeps: { fetch: fetchMock, sleep: async () => {}, minIntervalMs: 0 }, maxRequests: 50 });
  assert.deepEqual(Object.keys(r.sources), ["kroger"]);
  assert.deepEqual([...hosts], ["api.kroger.com"]);
  assert.equal(r.sources.kroger!.matched, 1);
  assert.equal(r.sources.kroger!.listed, 1);

  const [q] = store.getDisplayQuotes("otc-1", NOW);
  assert.equal(q.source, "kroger");
  assert.equal(q.affiliatable, false);
  assert.equal(q.url, "https://www.kroger.com/p/differin/0030299491045");
  assert.equal(q.availability, "in_stock");
  assert.equal(q.location, "Cincinnati, OH 45202");
  assert.equal(queries.getLivePrices(new Map([["g", ["otc-1"]]]), NOW).get("g")?.price, 14.99);

  const checks = db.all<{ id: string; status: string }>(sql`SELECT product_id AS id, status FROM price_checks WHERE source = 'kroger' ORDER BY product_id`);
  assert.deepEqual(checks, [
    { id: "otc-1", status: "matched" },
    { id: "otc-2", status: "listed" },
    { id: "otc-3", status: "miss" }, // no known size, so the strict keyword check can't pass
  ]);
  // A listed product is due again in a day, like a match, not backed off like a miss.
  assert.ok(!refresh.pickDueProducts(new Date(NOW.getTime() + 3_600_000), 10, { source: "kroger" }).includes("otc-2"));
  assert.ok(refresh.pickDueProducts(new Date(NOW.getTime() + 25 * 3_600_000), 10, { source: "kroger" }).includes("otc-2"));
});

test("Kroger photos: stored per lookup, kept on an error, cleared on a miss, shown only while fresh and configured", () => {
  const photo = "https://www.kroger.com/product/images/large/front/0030299491045";
  const imageOf = (id: string) => db.get<{ u: string | null }>(sql`SELECT image_url AS u FROM price_checks WHERE product_id = ${id} AND source = 'kroger'`)?.u;
  store.saveLookup("otc-1", "kroger", { status: "listed", quotes: [], image: photo }, NOW);
  store.saveLookup("rx-1", "kroger", { status: "listed", quotes: [], image: photo }, NOW);
  assert.equal(imageOf("otc-1"), photo);

  assert.deepEqual(store.getKrogerImages(["otc-1"], NOW), new Map(), "nothing while Kroger isn't configured");
  setEnv(true, KROGER_KEYS);
  assert.deepEqual(store.getKrogerImages(["otc-1", "otc-2", "rx-1"], NOW), new Map([["otc-1", photo]]), "OTC only, and only products with a photo");
  assert.deepEqual(store.getKrogerImages([], NOW), new Map());
  const later = (days: number) => new Date(NOW.getTime() + days * 24 * 3_600_000);
  assert.equal(store.getKrogerImages(["otc-1"], later(29)).get("otc-1"), photo);
  assert.equal(store.getKrogerImages(["otc-1"], later(31)).get("otc-1"), undefined, "a lookup over 30 days old isn't shown");

  store.saveLookupError("otc-1", "kroger", later(1));
  assert.equal(imageOf("otc-1"), photo, "a failed lookup keeps the photo");
  store.saveLookup("otc-1", "kroger", { status: "matched", quotes: [] }, later(2));
  assert.equal(imageOf("otc-1"), null, "a lookup that found no photo clears it");
  store.saveLookup("otc-1", "kroger", { status: "listed", quotes: [], image: photo }, later(3));
  store.saveLookup("otc-1", "kroger", { status: "miss", quotes: [] }, later(4));
  assert.equal(imageOf("otc-1"), null, "a miss clears it");
});

test("a non-affiliate quote from a non-direct source is still never shown", () => {
  setEnv(true);
  db.run(sql`INSERT INTO price_quotes (product_id, source, merchant_id, merchant_name, price, currency, url, affiliatable, match_type, match_confidence, fetched_at)
    VALUES ('otc-1', 'sovrn', 'm', 'Somewhere', 3, 'USD', 'https://x.invalid', 0, 'barcode', 0.9, ${hoursAgo(1)})`);
  assert.deepEqual(store.getDisplayQuotes("otc-1", NOW), []);
});

test("Sovrn and Kroger run side by side, each with its own bookkeeping", async () => {
  setEnv(true);
  Object.assign(process.env, KROGER_KEYS);
  const sovrnFetch = (async () => new Response("[]")) as typeof fetch;
  const krogerFetch = (async (input: string | URL | Request) => {
    const u = new URL(String(input));
    if (u.pathname.endsWith("/token")) return new Response(JSON.stringify({ access_token: "t" }));
    if (u.pathname === "/v1/locations") return new Response(JSON.stringify({ data: [{ locationId: "01400943", chain: "KROGER" }] }));
    return new Response(JSON.stringify({ data: [] }));
  }) as typeof fetch;
  const fast = { sleep: async () => {}, minIntervalMs: 0 };
  const r = await refresh.refreshPrices(NOW, { deps: { fetch: sovrnFetch, ...fast }, krogerDeps: { fetch: krogerFetch, ...fast }, maxRequests: 50 });
  assert.deepEqual(Object.keys(r.sources).sort(), ["kroger", "sovrn"]);
  assert.equal(r.misses, 6);
  assert.equal(db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM price_checks`)!.n, 6);
});
