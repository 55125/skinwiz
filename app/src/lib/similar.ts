import { inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { avoidConflicts } from "@/lib/avoid-shared";
import { browseProducts } from "@/lib/queries";

// Formula similarity by ingredient overlap. Every ingredient is weighted by
// how rare it is across the catalog (ln(N / products-with-it)), so sharing
// niacinamide + ceramide NP + a niche peptide counts for far more than
// sharing water + glycerin. Only cosmetic-style lists are compared: a drug
// label's inactive list has no meaningful order or completeness.
type Weighted = { id: string; w: number };

let cachedTotal: { at: number; n: number } | null = null;
function catalogSize(): number {
  if (cachedTotal && Date.now() - cachedTotal.at < 10 * 60_000) return cachedTotal.n;
  const [{ n }] = db.all<{ n: number }>(sql`SELECT COUNT(DISTINCT product_id) AS n FROM product_ingredients WHERE position > 0`);
  cachedTotal = { at: Date.now(), n };
  return n;
}

function weigh(ids: string[]): Weighted[] {
  if (ids.length === 0) return [];
  const N = catalogSize();
  const rows = db.all<{ id: string; c: number }>(sql`SELECT id, product_count AS c FROM ingredients WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
  const count = new Map(rows.map((r) => [r.id, r.c]));
  return ids.map((id) => ({ id, w: Math.log((N + 1) / ((count.get(id) ?? 1) + 1)) }));
}

export type SimilarProduct = {
  product: typeof products.$inferSelect;
  score: number; // 0..1 weighted Jaccard
  shared: number;
  total: number;
};

export function findSimilarProducts(
  slugs: string[],
  opts: { excludeId?: string; limit?: number; minScore?: number } = {},
): SimilarProduct[] {
  const { excludeId, limit = 6, minScore = 0.35 } = opts;
  const uniq = [...new Set(slugs)];
  if (uniq.length < 4) return [];
  const weighted = weigh(uniq);
  const wOf = new Map(weighted.map((x) => [x.id, x.w]));

  const seeds = [...weighted].sort((a, b) => b.w - a.w).slice(0, 15).map((x) => x.id);
  const hits = db.all<{ pid: string; iid: string }>(sql`
    SELECT product_id AS pid, ingredient_id AS iid FROM product_ingredients
    WHERE position > 0 AND ingredient_id IN (${sql.join(seeds.map((i) => sql`${i}`), sql`, `)})
  `);
  const cand = new Map<string, number>();
  for (const h of hits) if (h.pid !== excludeId) cand.set(h.pid, (cand.get(h.pid) ?? 0) + (wOf.get(h.iid) ?? 0));
  const top = [...cand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 150).map(([pid]) => pid);
  if (top.length === 0) return [];

  const lists = db.all<{ pid: string; iid: string }>(sql`
    SELECT product_id AS pid, ingredient_id AS iid FROM product_ingredients
    WHERE position > 0 AND product_id IN (${sql.join(top.map((i) => sql`${i}`), sql`, `)})
  `);
  const byProduct = new Map<string, string[]>();
  for (const l of lists) (byProduct.get(l.pid) ?? byProduct.set(l.pid, []).get(l.pid)!).push(l.iid);

  const extraIds = [...new Set(lists.map((l) => l.iid))].filter((i) => !wOf.has(i));
  for (const x of weigh(extraIds)) wOf.set(x.id, x.w);
  const mine = new Set(uniq);
  const myTotal = uniq.reduce((s, i) => s + (wOf.get(i) ?? 0), 0);

  const scored: { pid: string; score: number; shared: number; total: number }[] = [];
  for (const [pid, ids] of byProduct) {
    if (ids.length < 4) continue;
    let inter = 0;
    let theirs = 0;
    let shared = 0;
    for (const i of ids) {
      const w = wOf.get(i) ?? 0;
      theirs += w;
      if (mine.has(i)) {
        inter += w;
        shared++;
      }
    }
    const union = myTotal + theirs - inter;
    const score = union > 0 ? inter / union : 0;
    if (score >= minScore) scored.push({ pid, score, shared, total: ids.length });
  }
  scored.sort((a, b) => b.score - a.score);
  const best = scored.slice(0, limit);
  if (best.length === 0) return [];
  const rows = db.select().from(products).where(inArray(products.id, best.map((b) => b.pid))).all();
  const byId = new Map(rows.map((r) => [r.id, r]));
  return best.flatMap((b) => {
    const product = byId.get(b.pid);
    return product ? [{ product, score: b.score, shared: b.shared, total: b.total }] : [];
  });
}

// A rough product kind from the name and dosage form, so a body wash's swaps
// are washes before serums. Coarse on purpose: unknown stays unknown.
const KINDS: [string, RegExp][] = [
  ["cleanser", /\b(wash|cleanser|cleansing|shower|soap|scrub|foam(ing)?)\b/i],
  ["shampoo", /\b(shampoo|conditioner)\b/i],
  ["sunscreen", /\b(sunscreen|spf|sun\s?(cream|lotion|stick|spray))\b/i],
  ["serum", /\b(serum|essence|ampoule|toner|solution)\b/i],
  ["lip", /\b(lip|balm)\b/i],
  ["deodorant", /\b(deodorant|antiperspirant)\b/i],
  ["cream", /\b(cream|lotion|moisturi[sz]er|gel|butter|baume|ointment)\b/i],
];

function productKind(p: typeof products.$inferSelect): string | null {
  const text = `${p.brandName} ${p.dosageForm ?? ""}`;
  return KINDS.find(([, re]) => re.test(text))?.[0] ?? null;
}

/**
 * Products like this one that are clear of everything on an avoid list,
 * same kind of product first (wash for a wash): closest formulas, then the
 * same first active for the same concern. Only products with a full
 * ingredient list qualify -- "couldn't check" is never offered as safe.
 */
export function findSafeSwaps(
  product: typeof products.$inferSelect,
  ingredientSlugs: string[],
  avoidIds: string[],
  limit = 4,
): (typeof products.$inferSelect)[] {
  if (avoidIds.length === 0) return [];
  const clear = (p: typeof products.$inferSelect) => {
    const found = avoidConflicts(p, avoidIds);
    return !!found && found.conflicts.length === 0 && found.possible.length === 0;
  };
  const kind = productKind(product);
  const similar = findSimilarProducts(ingredientSlugs, { excludeId: product.id, limit: 60, minScore: 0.2 }).map((s) => s.product);
  const { rows } = browseProducts({ concernId: product.concernId, activeId: product.activeIds[0], freeFromIds: avoidIds }, 1);
  // Stable order: similarity first, then same-concern products; same kind
  // anywhere in that list beats a different kind.
  const pool = [...similar.filter(clear), ...rows.filter((p) => p.id !== product.id)];
  const rank = (p: typeof products.$inferSelect) => (kind && productKind(p) === kind ? 0 : 1);
  const out = new Map<string, typeof products.$inferSelect>();
  for (const p of pool.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).map((x) => x.p)) {
    if (out.size >= limit) break;
    if (!out.has(p.id)) out.set(p.id, p);
  }
  return [...out.values()];
}
