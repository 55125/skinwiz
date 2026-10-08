import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { productBrand } from "@/lib/product-brand";
import { ORIGINS, ORIGIN_COOKIE, parseOrigin, productNameOrigin, type OriginId } from "@/lib/origin-shared";

export { ORIGINS, originLabel, type OriginId } from "@/lib/origin-shared";

// The listed product ids of each origin (lib/origin-shared.ts), from one scan
// of the catalog kept in memory: the catalog only changes on a reseed, so a
// 10-minute refresh (same as otc-index.ts) is plenty. A listing filter binds
// one region's ids as a single JSON array parameter.
const TTL_MS = 10 * 60_000;
let cached: { at: number; json: Map<OriginId, string>; counts: Map<OriginId, number> } | null = null;

function index() {
  if (cached && Date.now() - cached.at < TTL_MS) return cached;
  const rows = db.all<{ id: string; brandName: string; manufacturer: string | null; dataSource: string }>(sql`
    SELECT id, brand_name AS brandName, manufacturer, data_source AS dataSource
    FROM products WHERE is_rx = 0 AND canonical_id IS NULL
  `);
  const ids = new Map<OriginId, string[]>(ORIGINS.map((o) => [o.id, []]));
  for (const r of rows) {
    const origin = productOrigin(r);
    if (origin) ids.get(origin)!.push(r.id);
  }
  cached = {
    at: Date.now(),
    json: new Map([...ids].map(([k, v]) => [k, JSON.stringify(v)])),
    counts: new Map([...ids].map(([k, v]) => [k, v.length])),
  };
  return cached;
}

export function productOrigin(p: { dataSource: string; brandName: string; manufacturer: string | null }): OriginId | null {
  return productNameOrigin(productBrand(p).brand, p.brandName);
}

/** One origin's listed product ids as a JSON array: id IN (SELECT value FROM json_each(?)). */
export function originIdsJson(origin: OriginId): string {
  return index().json.get(origin)!;
}

export function originCounts(): Map<OriginId, number> {
  return index().counts;
}

/** The visitor's region pick from the header, if any. */
export async function readOrigin(): Promise<OriginId | undefined> {
  return parseOrigin((await cookies()).get(ORIGIN_COOKIE)?.value);
}
