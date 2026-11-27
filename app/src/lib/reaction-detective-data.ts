// Loads the products for Reaction Detective (/reactions) and the clinician
// product review (/clinic-tools/product-review) from their URL params. The
// lists live only in the URL (and the visitor's own browser): nothing is
// stored server-side, so a link a patient sends their clinic carries no
// name and leaves no record with us.
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { canonicalIdOf } from "@/lib/canonical";
import { getIngredientsForProduct, getProduct } from "@/lib/queries";
import type { DetectiveProduct } from "@/lib/reaction-detective";
import { ttlCache } from "@/lib/ttl-cache";

export const MAX_PER_LIST = 15;
const ID = /^[A-Za-z0-9._:-]{1,80}$/;

/** "a,b,c" -> valid ids, deduplicated, capped. */
export function parseIdList(v: string | string[] | undefined): string[] {
  const raw = (Array.isArray(v) ? v.join(",") : (v ?? "")).split(",").map((s) => s.trim());
  return [...new Set(raw.filter((s) => ID.test(s)))].slice(0, MAX_PER_LIST);
}

export type LoadedProduct = DetectiveProduct & { product: NonNullable<ReturnType<typeof getProduct>> };

export function loadDetectiveProducts(ids: string[], exclude: Set<string> = new Set()): LoadedProduct[] {
  const out: LoadedProduct[] = [];
  for (const id of ids) {
    const product = getProduct(canonicalIdOf(id));
    if (!product || exclude.has(product.id) || out.some((p) => p.id === product.id)) continue;
    const ingredients = getIngredientsForProduct(product.id).map((r) => ({
      id: r.ingredientId,
      name: r.rawName,
      position: r.position,
      productCount: r.productCount ?? 0,
    }));
    out.push({ id: product.id, name: product.brandName, ingredients, allergenHits: product.allergenHits ?? null, product });
  }
  return out;
}

/** Products with a full ingredient list, for "how common is this ingredient". */
export const catalogSize = ttlCache((): number => {
  const [{ n }] = db.all<{ n: number }>(sql`SELECT COUNT(DISTINCT product_id) AS n FROM product_ingredients WHERE position > 0`);
  return n;
});

export function listParam(ids: string[]): string {
  return ids.map(encodeURIComponent).join(",");
}

export function detectiveQuery(reacted: string[], fine: string[], extra: Record<string, string> = {}): string {
  const p: string[] = [];
  if (reacted.length) p.push(`r=${listParam(reacted)}`);
  if (fine.length) p.push(`f=${listParam(fine)}`);
  for (const [k, v] of Object.entries(extra)) p.push(`${k}=${encodeURIComponent(v)}`);
  return p.length ? `?${p.join("&")}` : "";
}
