// `npm test`: "Order all" cart links (lib/retailer-carts.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { amazonAsin, buildOrderPlan, walmartItemId } from "./retailer-carts";

const items = [
  { productId: "a", name: "Cleanser" },
  { productId: "b", name: "Moisturizer" },
  { productId: "c", name: "Sunscreen" },
];

test("demo affiliate rows never produce a buy link", () => {
  const plan = buildOrderPlan(items, [{ productId: "a", network: "awin", buyUrl: "https://www.amazon.com/dp/B000000001", isDemo: true, price: 9 }], { amazonTag: "tag-20" });
  assert.deepEqual(plan.carts, []);
  assert.deepEqual(plan.singles, []);
  assert.equal(plan.unmatched.length, 3);
});

test("live Amazon rows become one multi-item cart when a tag is configured", () => {
  const links = [
    { productId: "a", network: "amazon", buyUrl: "https://www.amazon.com/dp/B000000001?tag=x", isDemo: false, price: 9 },
    { productId: "b", network: "amazon", buyUrl: "https://www.amazon.com/gp/product/B000000002/", isDemo: false, price: 12 },
    { productId: "c", network: "target", buyUrl: "https://www.target.com/p/-/A-123", isDemo: false, price: 8 },
  ];
  const plan = buildOrderPlan(items, links, { amazonTag: "actively-20" });
  assert.equal(plan.carts.length, 1);
  assert.equal(
    plan.carts[0].url,
    "https://www.amazon.com/gp/aws/cart/add.html?AssociateTag=actively-20&ASIN.1=B000000001&Quantity.1=1&ASIN.2=B000000002&Quantity.2=1",
  );
  assert.deepEqual(plan.singles.map((s) => [s.item.productId, s.retailer]), [["c", "target"]]);
  // Without a tag: no cart, cheapest per-item link instead.
  const untagged = buildOrderPlan(items, links, {});
  assert.equal(untagged.carts.length, 0);
  assert.equal(untagged.singles.length, 3);
});

test("Walmart cart only with the Impact tracking link configured", () => {
  const links = [
    { productId: "a", network: "impact", buyUrl: "https://www.walmart.com/ip/CeraVe-Cleanser/123456789", isDemo: false, price: 14 },
    { productId: "b", network: "impact", buyUrl: "https://www.walmart.com/ip/987654321", isDemo: false, price: 15 },
  ];
  const plan = buildOrderPlan(items, links, { walmartImpactLink: "https://goto.walmart.com/c/1/2/9383" });
  assert.equal(plan.carts[0].retailer, "walmart");
  assert.equal(
    decodeURIComponent(plan.carts[0].url.split("?u=")[1]),
    "https://affil.walmart.com/cart/addToCart?items=123456789|1,987654321|1",
  );
  assert.equal(buildOrderPlan(items, links, {}).carts.length, 0);
});

test("id extraction", () => {
  assert.equal(amazonAsin("https://www.amazon.com/Some-Name/dp/B07XYZ1234/ref=sr_1"), "B07XYZ1234");
  assert.equal(amazonAsin("https://www.amazon.com/s?k=cleanser"), null);
  assert.equal(walmartItemId("https://www.walmart.com/ip/Name/55554444?athbdg=1"), "55554444");
  assert.equal(walmartItemId("https://www.walmart.com/search?q=x"), null);
});
