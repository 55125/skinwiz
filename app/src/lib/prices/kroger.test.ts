// Kroger adapter: ids from barcodes, response parsing, the token and store
// lookups, lookup order, the catalog check, and failures. A mocked fetch
// only -- no live calls. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { krogerFrontImage, krogerPrice, krogerProductIds, KrogerSource, parseKrogerLocation, parseKrogerProducts } from "./kroger";
import { krogerConfig, type KrogerConfig } from "./config";
import { BudgetExhausted, SourceUnavailable, type LookupProduct } from "./types";

const fixture = (name: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf-8"));
const LOCATION = fixture("kroger-location.json");
const DIFFERIN = fixture("kroger-product-differin.json");
const SEARCH = fixture("kroger-search.json");
const CFG: KrogerConfig = { clientId: "client-123", clientSecret: "secret-456", zip: "45202", locationId: null };
const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;
const NOW = new Date("2026-10-09T12:00:00Z");

const differin: LookupProduct = {
  id: "0299-4910",
  brandName: "Differin",
  manufacturer: "Galderma Laboratories, L.P.",
  dosageForm: "GEL",
  dataSource: "openfda",
  sourceUrl: null,
  packageDescription: "1 TUBE in 1 CARTON / 45 g in 1 TUBE",
  strengths: { adapalene: 0.1 },
  barcodes: [{ barcode: "302994910458", source: "openfda_upc" }],
};

type Call = { url: URL; method: string; auth: string | null; body: string | null };
type Reply = { status?: number; body?: unknown; headers?: Record<string, string> };
function mockFetch(api: (u: URL, n: number) => Reply, token: (n: number) => Reply = () => ({ body: { access_token: "tok", expires_in: 1800 } })) {
  const calls: Call[] = [];
  let tokens = 0;
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, method: init?.method ?? "GET", auth: new Headers(init?.headers).get("authorization"), body: init?.body ? String(init.body) : null });
    const r = url.pathname.endsWith("/connect/oauth2/token") ? token(++tokens) : api(url, calls.length);
    return new Response(r.body === undefined ? "" : JSON.stringify(r.body), { status: r.status ?? 200, headers: r.headers });
  }) as typeof fetch;
  return { fn, calls, api: () => calls.filter((c) => !c.url.pathname.endsWith("/token")) };
}
const noSleep = async () => {};
const source = (fetchFn: typeof fetch, extra: Partial<ConstructorParameters<typeof KrogerSource>[1]> = {}, cfg = CFG) =>
  new KrogerSource(cfg, { fetch: fetchFn, sleep: noSleep, minIntervalMs: 0, ...extra });

// A Kroger API with one store, the Differin UPC, and a keyword search.
const kroger = (products: (u: URL) => Reply = (u) => (u.pathname.endsWith("/0030299491045") ? { body: DIFFERIN } : { status: 404, body: {} })) =>
  mockFetch((u) => (u.pathname.startsWith("/v1/locations") ? { body: LOCATION } : products(u)));

test("config: both keys needed, default zip, and a pinned store", () => {
  assert.equal(krogerConfig(env({})), null);
  assert.equal(krogerConfig(env({ KROGER_CLIENT_ID: "a" })), null);
  assert.deepEqual(krogerConfig(env({ KROGER_CLIENT_ID: "a", KROGER_CLIENT_SECRET: "b" })), { clientId: "a", clientSecret: "b", zip: "45202", locationId: null });
  assert.deepEqual(krogerConfig(env({ KROGER_CLIENT_ID: "a", KROGER_CLIENT_SECRET: "b", KROGER_ZIP: "98101", KROGER_LOCATION_ID: "70100123" })), {
    clientId: "a",
    clientSecret: "b",
    zip: "98101",
    locationId: "70100123",
  });
  assert.equal(krogerConfig(env({ KROGER_CLIENT_ID: "a", KROGER_CLIENT_SECRET: "b", KROGER_ZIP: "nope" }))!.zip, "45202");
});

test("Kroger productIds drop the GTIN check digit and pad to 13", () => {
  assert.deepEqual(krogerProductIds("302994910458"), ["0030299491045"]); // UPC-A
  assert.deepEqual(krogerProductIds("0302994910458"), ["0030299491045"]); // EAN-13 of the same
  assert.deepEqual(krogerProductIds("3029949104"), ["0003029949104"]); // no check digit (NDC-derived)
  assert.deepEqual(krogerProductIds("302994910459"), []); // bad check digit
  assert.deepEqual(krogerProductIds("111"), []);
});

test("parses a store and its products", () => {
  assert.deepEqual(parseKrogerLocation(LOCATION), { locationId: "01400943", merchantName: "Kroger", label: "Cincinnati, OH 45202" });
  assert.equal(parseKrogerLocation({ data: [] }), null);

  const [one] = parseKrogerProducts(DIFFERIN);
  assert.deepEqual(one, {
    productId: "0030299491045",
    name: "Differin Adapalene Gel 0.1% Acne Treatment 1.6 oz",
    url: "https://www.kroger.com/p/differin-adapalene-gel-0-1-acne-treatment/0030299491045",
    regular: 15.99,
    promo: 13.49,
    availability: "low",
    image: "https://www.kroger.com/product/images/large/front/0030299491045",
  });
  assert.equal(krogerPrice(one), 13.49, "promo price wins");

  const list = parseKrogerProducts(SEARCH);
  assert.equal(list.length, 3, "the item with no productId is skipped");
  assert.equal(list[0].name, "Kroger® Adapalene Gel 0.1% Acne Treatment 1.6 oz", "brand isn't repeated");
  assert.equal(krogerPrice(list[0]), 9.99, "a 0 promo means none");
  assert.equal(list[1].availability, "out_of_stock");
  assert.equal(list[2].url, "https://www.kroger.com/p/item/0030299491099");
  assert.equal(list[0].image, null, "no images array, no photo");
  assert.deepEqual(parseKrogerProducts(null), []);
  assert.deepEqual(parseKrogerProducts({ data: [{ productId: "1", description: "x", productPageURI: "https://evil.example/p" }] })[0].url, "https://www.kroger.com/p/item/1");
});

test("product photo: the featured front shot, large first, only from kroger.com over https", () => {
  const front = (url: string, size = "large", featured?: boolean) => ({ perspective: "front", featured, sizes: [{ size, url }] });
  assert.equal(krogerFrontImage(DIFFERIN.data.images), "https://www.kroger.com/product/images/large/front/0030299491045");
  assert.equal(
    krogerFrontImage([front("https://www.kroger.com/a.jpg"), front("https://www.kroger.com/b.jpg", "large", true)]),
    "https://www.kroger.com/b.jpg",
    "the featured front wins",
  );
  assert.equal(krogerFrontImage([front("https://www.kroger.com/m.jpg", "medium")]), "https://www.kroger.com/m.jpg", "a smaller size when that's all");
  assert.equal(krogerFrontImage([front("https://www.kroger.com/t.jpg", "thumbnail")]), null, "a thumbnail is too small");
  assert.equal(krogerFrontImage([{ perspective: "back", sizes: [{ size: "large", url: "https://www.kroger.com/back.jpg" }] }]), null);
  assert.equal(krogerFrontImage([front("http://www.kroger.com/x.jpg")]), null, "https only");
  assert.equal(krogerFrontImage([front("https://evil.example/x.jpg")]), null, "Kroger's host only");
  assert.equal(krogerFrontImage([front("https://kroger.com.evil.example/x.jpg")]), null);
  assert.equal(krogerFrontImage([front("javascript:alert(1)")]), null);
  assert.equal(krogerFrontImage(undefined), null);
  assert.equal(krogerFrontImage([null, 3, "x"]), null);
});

test("barcode lookup: token, nearest store, then the product at that store", async () => {
  const m = kroger();
  const r = await source(m.fn).lookup(differin, NOW);
  assert.equal(r.status, "matched");
  assert.deepEqual(r.quotes, [
    {
      productId: "0299-4910",
      source: "kroger",
      merchantId: "kroger-01400943",
      merchantName: "Kroger",
      price: 13.49,
      retailPrice: 15.99,
      currency: "USD",
      url: "https://www.kroger.com/p/differin-adapalene-gel-0-1-acne-treatment/0030299491045",
      affiliatable: false,
      matchType: "barcode",
      matchConfidence: 0.95,
      offerName: "Differin Adapalene Gel 0.1% Acne Treatment 1.6 oz",
      pack: { amount: 1.6 * 28.3495, unit: "g" },
      fetchedAt: NOW.toISOString(),
      availability: "low",
      location: "Cincinnati, OH 45202",
    },
  ]);
  assert.equal(r.image, "https://www.kroger.com/product/images/large/front/0030299491045", "the matched product's photo comes back with it");

  const [tok, loc, prod] = m.calls;
  assert.equal(tok.method, "POST");
  assert.equal(tok.auth, `Basic ${Buffer.from("client-123:secret-456").toString("base64")}`);
  assert.equal(tok.body, "grant_type=client_credentials&scope=product.compact");
  assert.equal(loc.url.pathname, "/v1/locations");
  assert.equal(loc.url.searchParams.get("filter.zipCode.near"), "45202");
  assert.equal(loc.auth, "Bearer tok");
  assert.equal(prod.url.pathname, "/v1/products/0030299491045");
  assert.equal(prod.url.searchParams.get("filter.locationId"), "01400943");
});

test("the token and store are reused across lookups", async () => {
  const m = kroger();
  const s = source(m.fn);
  await s.lookup(differin, NOW);
  await s.lookup(differin, NOW);
  assert.equal(m.calls.filter((c) => c.url.pathname.endsWith("/token")).length, 1);
  assert.equal(m.calls.filter((c) => c.url.pathname.startsWith("/v1/locations")).length, 1);
});

test("a pinned KROGER_LOCATION_ID is used instead of the zip search", async () => {
  const m = kroger();
  await source(m.fn, {}, { ...CFG, locationId: "01400943" }).lookup(differin, NOW);
  const loc = m.api()[0];
  assert.equal(loc.url.pathname, "/v1/locations/01400943");
  assert.equal(loc.url.searchParams.get("filter.zipCode.near"), null);
});

test("no barcode hit falls back to a strictly checked keyword search, cheapest verified offer", async () => {
  const m = kroger((u) => (u.pathname === "/v1/products" ? { body: SEARCH } : { status: 404 }));
  const r = await source(m.fn).lookup({ ...differin, barcodes: [] }, NOW);
  const search = m.api().find((c) => c.url.pathname === "/v1/products")!;
  assert.equal(search.url.searchParams.get("filter.term"), "differin");
  assert.equal(search.url.searchParams.get("filter.locationId"), "01400943");
  // The store-brand gel fails the brand check and the twin pack the variant check.
  assert.equal(r.status, "matched");
  assert.equal(r.quotes[0].matchType, "keywords");
  assert.equal(r.quotes[0].price, 15.99);
  assert.equal(r.quotes[0].availability, "out_of_stock");
});

test("catalog check: carried but unpriced at the store is 'listed', with no quote", async () => {
  const unpriced = { data: { ...DIFFERIN.data, items: [{ ...DIFFERIN.data.items[0], price: undefined }] } };
  const m = kroger((u) => (u.pathname.endsWith("/0030299491045") ? { body: unpriced } : { status: 404 }));
  const r = await source(m.fn).lookup(differin, NOW);
  assert.deepEqual(r, { status: "listed", quotes: [], image: "https://www.kroger.com/product/images/large/front/0030299491045" }, "a carried product's photo is kept even with no price");
  assert.ok(!m.api().some((c) => c.url.pathname === "/v1/products"), "no keyword search once the catalog has it");
});

test("not carried at all is a miss", async () => {
  const m = kroger((u) => (u.pathname === "/v1/products" ? { body: { data: [] } } : { status: 404 }));
  assert.deepEqual(await source(m.fn).lookup(differin, NOW), { status: "miss", quotes: [] });
});

test("a barcode hit that contradicts the product (wrong strength) is not used", async () => {
  const wrong = { data: { ...DIFFERIN.data, description: "Differin Adapalene Gel 0.3%" } };
  const m = kroger((u) => (u.pathname.endsWith("/0030299491045") ? { body: wrong } : { body: { data: [] } }));
  assert.equal((await source(m.fn).lookup(differin, NOW)).status, "miss");
});

test("an expired token gets one refresh; a second 401 stops the run", async () => {
  let n = 0;
  const m = mockFetch((u) => (u.pathname.startsWith("/v1/locations") && n++ === 0 ? { status: 401 } : u.pathname.startsWith("/v1/locations") ? { body: LOCATION } : { body: DIFFERIN }));
  assert.equal((await source(m.fn).lookup(differin, NOW)).status, "matched");
  assert.equal(m.calls.filter((c) => c.url.pathname.endsWith("/token")).length, 2);

  const always = mockFetch(() => ({ status: 401 }));
  await assert.rejects(source(always.fn).lookup(differin, NOW), (e: unknown) => e instanceof SourceUnavailable && e.status === 401);
});

test("bad credentials and a missing scope stop the run", async () => {
  const badCreds = mockFetch(() => ({ body: LOCATION }), () => ({ status: 401, body: { error: "invalid_client" } }));
  await assert.rejects(source(badCreds.fn).lookup(differin, NOW), (e: unknown) => e instanceof SourceUnavailable && e.status === 401);
  const noScope = mockFetch(() => ({ status: 403 }));
  await assert.rejects(source(noScope.fn).lookup(differin, NOW), (e: unknown) => e instanceof SourceUnavailable && e.status === 403);
});

test("no store near the zip stops the run", async () => {
  const m = mockFetch(() => ({ body: { data: [] } }));
  await assert.rejects(source(m.fn).lookup(differin, NOW), /No Kroger store found for zip 45202/);
});

test("429 and 5xx back off, honoring Retry-After, then give up", async () => {
  const waits: number[] = [];
  let n = 0;
  const m = kroger((u) => (n++ < 2 ? { status: 429, headers: { "retry-after": "3" } } : u.pathname.endsWith("/0030299491045") ? { body: DIFFERIN } : { status: 404 }));
  const r = await source(m.fn, { sleep: async (ms) => void waits.push(ms) }).lookup(differin, NOW);
  assert.equal(r.status, "matched");
  assert.deepEqual(waits, [3000, 3000]);

  const down = kroger(() => ({ status: 503 }));
  await assert.rejects(source(down.fn, { maxRetries: 1 }).lookup(differin, NOW), (e: unknown) => e instanceof SourceUnavailable && e.status === 503);
});

test("every request, the token included, spends the run's budget", async () => {
  const m = kroger();
  const budget = { remaining: 2 };
  await assert.rejects(source(m.fn, { budget }).lookup(differin, NOW), BudgetExhausted);
  assert.equal(m.calls.length, 2);
});

test("nothing about a visitor is ever sent: only our zip, store and catalog terms", async () => {
  const m = kroger((u) => (u.pathname === "/v1/products" ? { body: SEARCH } : { status: 404 }));
  await source(m.fn).lookup(differin, NOW);
  const params = new Set(m.api().flatMap((c) => [...c.url.searchParams.keys()]));
  assert.deepEqual([...params].sort(), ["filter.limit", "filter.locationId", "filter.term", "filter.zipCode.near"]);
});

test("search terms: the product's own brand, or the store brand for a generic name", async () => {
  const { krogerSearchTerm } = await import("./kroger");
  assert.equal(krogerSearchTerm(differin), "differin");
  const storeBrand = { ...differin, brandName: "Adapalene Gel", manufacturer: "The Kroger Co." };
  assert.equal(krogerSearchTerm(storeBrand), "kroger adapalene gel");
  const long = { ...differin, brandName: "Neutrogena Hydro Boost Water Gel Daily Face Moisturizer With Hyaluronic Acid For Dry Skin" };
  assert.equal(krogerSearchTerm(long).split(" ").length, 8);
});
