import { and, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { availabilityOf } from "@/lib/availability";
import {
  activeKey,
  brandKey,
  compareStrengths,
  dupeForm,
  inactiveSimilarity,
  listIsOrdered,
  rankDupes,
  type DupeCandidate,
  type DupeForm,
  type InactiveList,
} from "@/lib/dupe-rules";
import { productBrand } from "@/lib/product-brand";
import { LISTED_OTC } from "@/lib/queries";
import { weigh } from "@/lib/similar";
import { ttlCache } from "@/lib/ttl-cache";

// The dupe finder (rules in lib/dupe-rules.ts): every listed product with
// exactly this product's actives, at the same strengths where both labels
// state them, in the same form, ranked by how closely the inactive lists
// match. Searches the whole catalog, not just this product's concern, so an
// SPF moisturizer filed under Dry Skin still finds its dupes under Sun
// Protection.

type Row = {
  id: string;
  brandName: string;
  manufacturer: string | null;
  dataSource: string;
  activeIds: string[];
  strengths: Record<string, number> | null;
  form: DupeForm | null;
};

// Every listed product grouped by its active set, held in memory: ~17k small
// rows, and the catalog only changes on a reseed.
const TTL_MS = 10 * 60_000;
let cached: { at: number; byKey: Map<string, Row[]>; byId: Map<string, Row> } | null = null;

function index() {
  if (cached && Date.now() - cached.at < TTL_MS) return cached;
  const byKey = new Map<string, Row[]>();
  const byId = new Map<string, Row>();
  const all = db
    .select({
      id: products.id,
      brandName: products.brandName,
      manufacturer: products.manufacturer,
      dataSource: products.dataSource,
      dosageForm: products.dosageForm,
      activeIds: products.activeIds,
      strengths: products.strengths,
    })
    .from(products)
    .where(LISTED_OTC)
    .all();
  for (const p of all) {
    const row: Row = {
      id: p.id,
      brandName: p.brandName,
      manufacturer: p.manufacturer,
      dataSource: p.dataSource,
      activeIds: p.activeIds,
      strengths: p.strengths,
      form: dupeForm(p.dosageForm, p.brandName),
    };
    byId.set(p.id, row);
    const key = activeKey(p.activeIds);
    if (key) (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(row);
  }
  cached = { at: Date.now(), byKey, byId };
  return cached;
}

export function resetDupeIndex(): void {
  cached = null;
}

function inactiveLists(ids: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (ids.length === 0) return out;
  const rows = db.all<{ pid: string; iid: string }>(sql`
    SELECT product_id AS pid, ingredient_id AS iid FROM product_ingredients
    WHERE position > 0 AND is_active = 0 AND product_id IN (SELECT value FROM json_each(${JSON.stringify(ids)}))
    ORDER BY product_id, position
  `);
  for (const r of rows) (out.get(r.pid) ?? out.set(r.pid, []).get(r.pid)!).push(r.iid);
  return out;
}

export type Dupe = DupeCandidate & { sameBrand: boolean; product: typeof products.$inferSelect };

export type DupeResult = {
  /** The form matched on; null when this product's form can't be told, so nothing is matched. */
  form: DupeForm | null;
  /** False when the product lists no actives: there is nothing to match exactly. */
  hasActives: boolean;
  /** This product has an inactive list to rank against. */
  hasInactives: boolean;
  /** Other brands' dupes: how many, and the best `limit` of them. */
  total: number;
  rows: Dupe[];
  /** The same brand's own matches (other shades, sizes, scents), listed apart. */
  sameBrandTotal: number;
  sameBrandRows: Dupe[];
};

const EMPTY: DupeResult = { form: null, hasActives: false, hasInactives: false, total: 0, rows: [], sameBrandTotal: 0, sameBrandRows: [] };

export function findDupes(productId: string, limit = 4): DupeResult {
  const { byKey, byId } = index();
  const self = byId.get(productId);
  if (!self) return EMPTY;
  const key = activeKey(self.activeIds);
  const base = { ...EMPTY, form: self.form, hasActives: key !== "" };
  if (!key || !self.form) return base;

  const matches = (byKey.get(key) ?? []).flatMap((r) => {
    if (r.id === self.id || r.form !== self.form) return [];
    const strength = compareStrengths(self.activeIds, self.strengths, r.strengths);
    return strength === "different" ? [] : [{ row: r, strength }];
  });
  const lists = inactiveLists([self.id, ...matches.map((m) => m.row.id)]);
  const mine: InactiveList = { ids: lists.get(self.id) ?? [], ordered: listIsOrdered(self.dataSource) };
  const rarity = new Map(weigh([...new Set([...lists.values()].flat())]).map((w) => [w.id, w.w]));

  const myBrand = brandKey(productBrand(self).brand);
  const ranked = rankDupes(
    matches.map(({ row, strength }) => {
      const a = availabilityOf(row.id);
      return {
        id: row.id,
        brandName: row.brandName,
        sameBrand: myBrand !== "" && brandKey(productBrand(row).brand) === myBrand,
        strength,
        match: inactiveSimilarity(mine, { ids: lists.get(row.id) ?? [], ordered: listIsOrdered(row.dataSource) }, (id) => rarity.get(id) ?? 0),
        discontinued: a.shelf === "discontinued",
        inStock: a.inStock,
        imported: a.shelf === "import",
      };
    }),
  );
  const others = ranked.filter((r) => !r.sameBrand);
  const own = ranked.filter((r) => r.sameBrand);
  const top = [...others.slice(0, limit), ...own.slice(0, limit)];
  const rows = top.length ? db.select().from(products).where(and(inArray(products.id, top.map((t) => t.id)), LISTED_OTC)).all() : [];
  const byRow = new Map(rows.map((r) => [r.id, r]));
  const withProduct = (list: typeof ranked) =>
    list.slice(0, limit).flatMap((t) => {
      const product = byRow.get(t.id);
      return product ? [{ ...t, product }] : [];
    });
  return {
    ...base,
    hasInactives: mine.ids.length > 0,
    total: others.length,
    rows: withProduct(others),
    sameBrandTotal: own.length,
    sameBrandRows: withProduct(own),
  };
}

/** findDupes for page renders: catalog-only, so it caches like lib/similar.ts. */
export const findDupesCached = ttlCache(findDupes);
