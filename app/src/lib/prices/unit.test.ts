// Price-per-unit ordering and the store-brand savings line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPerUnit, sortByUnitPrice, storeBrandSavings, type LivePrice } from "./unit";
import type { EquivalenceMember } from "@/lib/equivalence";

const member = (id: string, storeBrand: string | null = null): EquivalenceMember => ({ id, ids: [id], brandName: id.toUpperCase(), manufacturer: null, storeBrand });
const lp = (productId: string, price: number, per: number | null, unit: "oz" | "item" = "oz"): LivePrice => ({
  price,
  productId,
  perUnit: per == null ? null : { value: per, per: unit },
  merchantName: "M",
  url: "https://x.invalid",
  fetchedAt: null,
});

test("no prices: order untouched (same array)", () => {
  const ms = [member("a"), member("b")];
  assert.equal(sortByUnitPrice(ms, new Map()), ms);
});

test("cheapest per ounce first, per item next, unpriced last in original order", () => {
  const ms = ["a", "b", "c", "d", "e"].map((id) => member(id));
  const prices = new Map([
    ["b", lp("b", 10, 6)],
    ["c", lp("c", 5, 2, "item")],
    ["d", lp("d", 12, 4)],
    ["e", lp("e", 3, null)],
  ]);
  assert.deepEqual(
    sortByUnitPrice(ms, prices).map((m) => m.id),
    ["d", "b", "c", "e", "a"],
  );
  assert.equal(formatPerUnit(prices.get("d")!.perUnit), "$4.00/oz");
});

test("store brand savings compares the cheapest of each, same unit, 5% or more", () => {
  const ms = [member("name1"), member("name2"), member("store1", "Walgreens"), member("store2", "CVS Health")];
  const prices = new Map([
    ["name1", lp("name1", 14, 8.4)],
    ["name2", lp("name2", 13, 7)],
    ["store1", lp("store1", 9, 3.5)],
    ["store2", lp("store2", 10, 4)],
  ]);
  const s = storeBrandSavings(ms, prices)!;
  assert.equal(s.pct, 50);
  assert.equal(s.storeBrand.id, "store1");
  assert.equal(s.nameBrand.id, "name2");
  assert.equal(storeBrandSavings(ms, new Map([["name2", lp("name2", 13, 7)], ["store1", lp("store1", 9, 6.9)]])), null);
  assert.equal(storeBrandSavings(ms, new Map([["store1", lp("store1", 9, 3.5)]])), null);
});
