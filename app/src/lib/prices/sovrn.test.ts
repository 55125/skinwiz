// Sovrn adapter: response parsing, lookup order, backoff. A mocked fetch
// only -- no live calls. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildSovrnUrl, offerPrice, parseSovrnResponse, SovrnSource, usableOffers } from "./sovrn";
import { BudgetExhausted, SourceUnavailable, type LookupProduct } from "./types";

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/sovrn-differin.json"), "utf-8"));
const CFG = { siteKey: "site-key-123", secret: "secret-456" };

const differin: LookupProduct = {
  id: "0299-4910",
  brandName: "Differin",
  manufacturer: "Galderma Laboratories, L.P.",
  dosageForm: "GEL",
  dataSource: "openfda",
  sourceUrl: null,
  packageDescription: "1 TUBE in 1 CARTON / 45 g in 1 TUBE",
  strengths: { adapalene: 0.1 },
  barcodes: [
    { barcode: "0302994910456", source: "openfda_upc" },
    { barcode: "0008400000071", source: "obf_id" },
    { barcode: "3029949100", source: "ndc_derived" },
  ],
};

type Call = { url: URL; auth: string | null };
function mockFetch(responder: (u: URL, n: number) => { status?: number; body?: unknown; headers?: Record<string, string> }) {
  const calls: Call[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, auth: new Headers(init?.headers).get("authorization") });
    const r = responder(url, calls.length);
    return new Response(r.body === undefined ? "" : typeof r.body === "string" ? r.body : JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: r.headers,
    });
  }) as typeof fetch;
  return { fn, calls };
}
const noSleep = async () => {};
const source = (fetchFn: typeof fetch, extra: Partial<ConstructorParameters<typeof SovrnSource>[1]> = {}) =>
  new SovrnSource(CFG, { fetch: fetchFn, sleep: noSleep, minIntervalMs: 0, ...extra });

test("parses the documented array response", () => {
  const offers = parseSovrnResponse(fixture);
  assert.equal(offers.length, 4);
  assert.deepEqual(
    { ...offers[0] },
    {
      id: "9123001",
      name: "Differin Adapalene Gel 0.1% Acne Treatment, 45 g",
      merchantId: "101",
      merchantName: "Walmart",
      deeplink: "https://sovrn.example.invalid/click?m=101&p=9123001",
      currency: "USD",
      salePrice: 12.97,
      retailPrice: 15.49,
      affiliatable: true,
    },
  );
});

test("keeps only USD, affiliatable, priced offers, cheapest per merchant", () => {
  const usable = usableOffers(parseSovrnResponse(fixture));
  assert.deepEqual(
    usable.map((o) => o.merchantName),
    ["Walmart", "Target"],
  );
  const dupes = usableOffers(
    parseSovrnResponse([
      { name: "a", merchant: { id: 1, name: "M" }, deeplink: "https://x.invalid/1", currency: "usd", salePrice: "9.50", affiliatable: "true" },
      { name: "b", merchant: { id: 1, name: "M" }, deeplink: "https://x.invalid/2", currency: "USD", salePrice: 8, affiliatable: true },
    ]),
  );
  assert.equal(dupes.length, 1);
  assert.equal(offerPrice(dupes[0]), 8);
});

test("tolerates envelopes, malformed and empty bodies", () => {
  assert.equal(parseSovrnResponse({ products: fixture }).length, 4);
  assert.equal(parseSovrnResponse({ data: fixture.slice(0, 1) }).length, 1);
  for (const bad of [null, undefined, "", "oops", 42, {}, { products: "x" }, [], [null, 1, "x", {}]]) {
    assert.deepEqual(parseSovrnResponse(bad), [], JSON.stringify(bad));
  }
  // missing merchant, non-https deeplink, no price
  const junk = parseSovrnResponse([
    { name: "a", deeplink: "https://x.invalid/1", currency: "USD", salePrice: 5, affiliatable: true },
    { name: "b", merchant: { id: 2, name: "M" }, deeplink: "http://x.invalid/2", currency: "USD", salePrice: 5, affiliatable: true },
    { name: "c", merchant: { id: 3, name: "N" }, deeplink: "https://x.invalid/3", currency: "USD", salePrice: null, retailPrice: 0, affiliatable: true },
  ]);
  assert.equal(junk.length, 1);
  assert.deepEqual(usableOffers(junk), []);
});

test("builds the documented request", async () => {
  const { fn, calls } = mockFetch(() => ({ body: [] }));
  await source(fn).query({ barcode: "012345678905" });
  const u = calls[0].url;
  assert.equal(u.origin + u.pathname, "https://comparisons.sovrn.com/api/affiliate/v3.5/sites/site-key-123/compare/prices/usd_en/by/accuracy");
  assert.equal(u.searchParams.get("barcode"), "012345678905");
  assert.ok((u.searchParams.get("sid") ?? "").length <= 32);
  assert.equal(calls[0].auth, "secret secret-456");
  assert.ok(buildSovrnUrl("k", { plainlink: "https://brand.example/p?a=1" }).includes("plainlink=https%3A%2F%2Fbrand.example%2Fp%3Fa%3D1"));
});

test("barcodes are tried in confidence order, stopping at the first match", async () => {
  const { fn, calls } = mockFetch((u) => ({ body: u.searchParams.get("barcode") === "0008400000071" ? fixture : [] }));
  const r = await source(fn).lookup(differin, new Date("2026-10-03T12:00:00Z"));
  assert.deepEqual(
    calls.map((c) => c.url.searchParams.get("barcode")),
    ["0302994910456", "0008400000071"],
  );
  assert.equal(r.status, "matched");
  assert.deepEqual(
    r.quotes.map((q) => [q.merchantName, q.price, q.matchType, q.matchConfidence]),
    [
      ["Walmart", 12.97, "barcode", 0.9],
      ["Target", 13.49, "barcode", 0.9],
    ],
  );
  assert.deepEqual(r.quotes[0].pack, { amount: 45, unit: "g" });
  assert.equal(r.quotes[0].fetchedAt, "2026-10-03T12:00:00.000Z");
});

test("the NDC-derived barcode is last and must look like the product", async () => {
  const wrong = [{ name: "Head & Shoulders Shampoo 13.5 fl oz", merchant: { id: 9, name: "CVS" }, deeplink: "https://x.invalid/9", currency: "USD", salePrice: 7, affiliatable: true }];
  const { fn, calls } = mockFetch((u) => ({ body: u.searchParams.get("barcode") === "3029949100" ? wrong : [] }));
  const r = await source(fn).lookup(differin, new Date());
  const order = calls.map((c) => c.url.searchParams.get("barcode") ?? (c.url.searchParams.has("search-keywords") ? "keywords" : "?"));
  assert.deepEqual(order, ["0302994910456", "0008400000071", "3029949100", "keywords"]);
  assert.equal(r.status, "miss");
});

test("brand-direct products are looked up by their page URL", async () => {
  const p: LookupProduct = { ...differin, id: "rdn-x", barcodes: [], sourceUrl: "https://brand.example/products/x", strengths: null, brandName: "Brand Serum" };
  const { fn, calls } = mockFetch((u) =>
    u.searchParams.get("plainlink")
      ? { body: [{ name: "Brand Serum 30 ml", merchant: { id: 5, name: "Brand" }, deeplink: "https://x.invalid/5", currency: "USD", salePrice: 20, affiliatable: true }] }
      : { body: [] },
  );
  const r = await source(fn).lookup(p, new Date());
  assert.equal(calls[0].url.searchParams.get("plainlink"), "https://brand.example/products/x");
  assert.equal(r.quotes[0].matchType, "plainlink");
});

test("keyword search is the last resort and only keeps verified offers", async () => {
  const p: LookupProduct = { ...differin, barcodes: [] };
  const offers = [
    { name: "Differin Adapalene Gel 0.1% Acne Treatment 45g", merchant: { id: 1, name: "Walmart" }, deeplink: "https://x.invalid/1", currency: "USD", salePrice: 12.5, affiliatable: true },
    { name: "Differin Adapalene Gel 0.3% Acne Treatment 45g", merchant: { id: 2, name: "Target" }, deeplink: "https://x.invalid/2", currency: "USD", salePrice: 30, affiliatable: true },
    { name: "Differin Adapalene Gel 0.1% Acne Treatment 15g", merchant: { id: 3, name: "CVS" }, deeplink: "https://x.invalid/3", currency: "USD", salePrice: 9, affiliatable: true },
  ];
  const { fn, calls } = mockFetch(() => ({ body: offers }));
  const r = await source(fn).lookup(p, new Date());
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.searchParams.get("search-keywords")!.includes("differin"));
  assert.deepEqual(
    r.quotes.map((q) => [q.merchantName, q.matchType]),
    [["Walmart", "keywords"]],
  );
});

test("429 and 5xx back off exponentially, then succeed", async () => {
  const waits: number[] = [];
  const { fn, calls } = mockFetch((_u, n) => (n === 1 ? { status: 429, headers: { "retry-after": "3" } } : n === 2 ? { status: 503 } : { body: fixture }));
  const offers = await source(fn, { sleep: async (ms) => void waits.push(ms) }).query({ barcode: "1" });
  assert.equal(calls.length, 3);
  assert.deepEqual(waits, [3000, 2000]);
  assert.equal(offers.length, 4);
});

test("a source that stays down, or refuses the keys, stops the lookup", async () => {
  const down = mockFetch(() => ({ status: 500 }));
  await assert.rejects(source(down.fn, { maxRetries: 2 }).query({ barcode: "1" }), SourceUnavailable);
  assert.equal(down.calls.length, 3);
  const denied = mockFetch(() => ({ status: 401 }));
  await assert.rejects(source(denied.fn).query({ barcode: "1" }), (e: unknown) => e instanceof SourceUnavailable && e.status === 401);
  assert.equal(denied.calls.length, 1);
  const bad = mockFetch(() => ({ status: 400, body: { error: "bad barcode" } }));
  assert.deepEqual(await source(bad.fn).query({ barcode: "x" }), []);
  const html = mockFetch(() => ({ body: "<html>not json</html>" }));
  assert.deepEqual(await source(html.fn).query({ barcode: "1" }), []);
});

test("the request budget is shared and enforced", async () => {
  const budget = { remaining: 2 };
  const { fn, calls } = mockFetch(() => ({ body: [] }));
  await assert.rejects(source(fn, { budget }).lookup(differin, new Date()), BudgetExhausted);
  assert.equal(calls.length, 2);
  assert.equal(budget.remaining, 0);
});

test("requests are spaced to stay under 10 per second", async () => {
  const waits: number[] = [];
  const { fn } = mockFetch(() => ({ body: [] }));
  const s = new SovrnSource(CFG, { fetch: fn, sleep: async (ms) => void waits.push(ms) });
  await s.query({ barcode: "1" });
  await s.query({ barcode: "2" });
  assert.equal(waits.length, 1);
  assert.ok(waits[0] > 0 && waits[0] <= 100);
});
