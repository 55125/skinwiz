// `npm test`: the product page's short Where to buy row and its disclosure.
import { test } from "node:test";
import assert from "node:assert/strict";
import { quickBuyDisclosure, quickBuyLinks } from "./quick-buy";

const none = { quotes: [], manualLinks: [], affiliateLinks: [], brandLink: null, brandName: null, retailerSearches: [] };
const searches = ["Target", "Walmart", "CVS"].map((name) => ({ name, href: `https://${name}.example/s`, rel: "noopener noreferrer", wrapped: false }));

test("store searches only when there is no price or store link", () => {
  const links = quickBuyLinks({ ...none, retailerSearches: searches });
  assert.deepEqual(links.map((l) => l.label), ["Target", "Walmart", "CVS"]);
  assert.ok(links.every((l) => l.search && !l.affiliate));
  assert.equal(quickBuyDisclosure(links), "Not affiliate links: we don't earn a commission on them.");
});

test("live prices lead, show the price, and replace the searches", () => {
  const links = quickBuyLinks({
    ...none,
    quotes: [{ source: "kroger", merchantId: "k", merchantName: "Kroger", price: 12.5, url: "https://kroger.example/p", affiliatable: false }],
    brandLink: { href: "https://brand.example", rel: "noopener noreferrer", wrapped: true },
    brandName: "CeraVe",
    retailerSearches: searches,
  });
  assert.deepEqual(links.map((l) => l.label), ["$12.50 at Kroger", "Buy from CeraVe"]);
  assert.equal(quickBuyDisclosure(links), "Some are affiliate links: we may earn a commission.");
});

test("an Amazon link adds the Associates line", () => {
  const links = quickBuyLinks({ ...none, manualLinks: [{ id: 1, retailer: "Amazon", sizeLabel: "8 oz", url: "https://www.amazon.com/dp/B00TTD9BRC" }] });
  assert.equal(links[0].label, "Buy at Amazon (8 oz)");
  assert.equal(quickBuyDisclosure(links), "Affiliate links: we may earn a commission. As an Amazon Associate I earn from qualifying purchases.");
});

test("capped at a few buttons", () => {
  const many = Array.from({ length: 6 }, (_, i) => ({ id: i, network: "net", price: 10 + i, buyUrl: `https://x.example/${i}` }));
  assert.equal(quickBuyLinks({ ...none, affiliateLinks: many }).length, 4);
});
