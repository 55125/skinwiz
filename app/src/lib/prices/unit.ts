// Price-per-unit ordering and the store-brand savings line for equivalence
// lists (product page, /same/...). Pure, tested in unit.test.ts.
import type { EquivalenceMember } from "@/lib/equivalence";

export type LivePrice = {
  price: number;
  productId: string;
  perUnit: { value: number; per: "oz" | "item" } | null;
  merchantName: string | null;
  url: string | null;
  fetchedAt: string | null;
};

/** Per-ounce prices first (cheapest first), then per-item, then prices with no known size. */
export function compareLivePrices(a: LivePrice, b: LivePrice): number {
  const rank = (p: LivePrice) => (p.perUnit ? (p.perUnit.per === "oz" ? 0 : 1) : 2);
  return rank(a) - rank(b) || (a.perUnit && b.perUnit ? a.perUnit.value - b.perUnit.value : 0) || a.price - b.price;
}

export function formatPerUnit(perUnit: LivePrice["perUnit"]): string | null {
  return perUnit ? `$${perUnit.value.toFixed(2)}/${perUnit.per}` : null;
}

/** Priced members cheapest-per-unit first; unpriced keep their order, after them. */
export function sortByUnitPrice<T extends { id: string }>(members: T[], prices: Map<string, LivePrice>): T[] {
  if (prices.size === 0) return members;
  const indexed = members.map((m, i) => ({ m, i, p: prices.get(m.id) }));
  indexed.sort((a, b) => (a.p && b.p ? compareLivePrices(a.p, b.p) : a.p ? -1 : b.p ? 1 : 0) || a.i - b.i);
  return indexed.map((x) => x.m);
}

export type StoreBrandSavings = { pct: number; storeBrand: EquivalenceMember; nameBrand: EquivalenceMember; per: "oz" | "item" };

/**
 * "Store brand saves X%": the cheapest store brand's price per unit against
 * the cheapest name brand's, in the same unit. Null unless both are priced
 * and the store brand is at least 5% cheaper.
 */
export function storeBrandSavings(members: EquivalenceMember[], prices: Map<string, LivePrice>): StoreBrandSavings | null {
  for (const per of ["oz", "item"] as const) {
    const cheapest = (store: boolean) =>
      members
        .filter((m) => !!m.storeBrand === store && prices.get(m.id)?.perUnit?.per === per)
        .sort((a, b) => prices.get(a.id)!.perUnit!.value - prices.get(b.id)!.perUnit!.value)[0];
    const s = cheapest(true);
    const n = cheapest(false);
    if (!s || !n) continue;
    const pct = Math.floor((1 - prices.get(s.id)!.perUnit!.value / prices.get(n.id)!.perUnit!.value) * 100);
    return pct >= 5 ? { pct, storeBrand: s, nameBrand: n, per } : null;
  }
  return null;
}
