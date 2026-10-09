import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { BROAD_SPECTRUM_15_PHRASES, SUNBURN_ONLY_PHRASES } from "@/lib/hsa";
import { concernTier, duplicateKey, excludedFromConcern, pickListing, poorTitle } from "@/lib/listing-rules";

// listing-rules.ts applied to the catalog once, then kept in memory as JSON
// id lists that concern-page queries bind as a single parameter (the same
// approach as the HSA set in otc-index.ts). The catalog only changes on a
// reseed.
// The rules depend on the concern (eczema leaves out antifungals, sun ranks
// SPF 30+ first), and a product can be listed under more than one, so each
// concern gets its own lists.
type ConcernLists = { excludedJson: string; tier1Json: string; tier2Json: string };
type Index = {
  at: number;
  byConcern: Map<string, ConcernLists>;
  // Under each product's own concern, for listings not scoped to a concern.
  ownExcludedJson: string;
  duplicatesJson: string;
  poorTitleJson: string;
};
const EMPTY: ConcernLists = { excludedJson: "[]", tier1Json: "[]", tier2Json: "[]" };

// Building it scans the whole catalog (~1s), so it is kept for 30 minutes.
const TTL_MS = 30 * 60_000;
let cached: Index | null = null;

function likeAny(column: string, phrases: string[]) {
  return sql.join(
    phrases.map((p) => sql`${sql.raw(column)} LIKE ${`%${p}%`}`),
    sql` OR `,
  );
}

function build(): Index {
  const rows = db.all<{
    id: string;
    rowid: number;
    concernId: string;
    concernIds: string;
    dataSource: string;
    manufacturer: string | null;
    hasImage: number;
    hasIngredients: number;
    brandName: string;
    activeIds: string;
    activeIngredientText: string | null;
    dosageForm: string | null;
    strengths: string | null;
    hasLabel: number;
    bs15: number | null;
    sunburnOnly: number | null;
  }>(sql`
    SELECT p.id, p.rowid AS rowid, p.concern_id AS concernId, p.concern_ids AS concernIds, p.data_source AS dataSource, p.manufacturer,
      p.image_url IS NOT NULL AS hasImage, p.free_from_flags IS NOT NULL AS hasIngredients, p.brand_name AS brandName, p.active_ids AS activeIds,
      p.active_ingredient_text AS activeIngredientText, p.dosage_form AS dosageForm, p.strengths,
      l.spl_set_id IS NOT NULL AS hasLabel,
      (${likeAny("l.directions", BROAD_SPECTRUM_15_PHRASES)} OR ${likeAny("l.warnings", BROAD_SPECTRUM_15_PHRASES)}) AS bs15,
      (${likeAny("l.warnings", SUNBURN_ONLY_PHRASES)} OR ${likeAny("l.directions", SUNBURN_ONLY_PHRASES)}) AS sunburnOnly
    FROM products p LEFT JOIN label_sections l ON l.spl_set_id = p.spl_set_id
    WHERE p.is_rx = 0 AND p.canonical_id IS NULL
  `);
  const lists = new Map<string, { excluded: string[]; tier1: string[]; tier2: string[] }>();
  const ownExcluded: string[] = [];
  const poor: string[] = [];
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = duplicateKey(r.brandName, r.manufacturer);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
    if (poorTitle(r.brandName, r.dataSource)) poor.push(r.id);
    const base = {
      brandName: r.brandName,
      activeIds: JSON.parse(r.activeIds ?? "[]") as string[],
      activeIngredientText: r.activeIngredientText,
      dosageForm: r.dosageForm,
      strengths: r.strengths ? (JSON.parse(r.strengths) as Record<string, number>) : null,
      label: r.hasLabel ? { broadSpectrum15: !!r.bs15, sunburnOnly: !!r.sunburnOnly } : null,
    };
    const concernIds = new Set([r.concernId, ...(JSON.parse(r.concernIds ?? "[]") as string[])]);
    for (const concernId of concernIds) {
      const l = lists.get(concernId) ?? lists.set(concernId, { excluded: [], tier1: [], tier2: [] }).get(concernId)!;
      const input = { ...base, concernId };
      if (excludedFromConcern(input)) {
        l.excluded.push(r.id);
        if (concernId === r.concernId) ownExcluded.push(r.id);
        continue;
      }
      const tier = concernTier(input);
      if (tier === 1) l.tier1.push(r.id);
      else if (tier === 2) l.tier2.push(r.id);
    }
  }
  // One listing per duplicate group; the rest keep their pages but leave
  // every listing, search and the home page.
  const duplicates: string[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const keep = pickListing(group.map((r) => ({ id: r.id, dataSource: r.dataSource, hasImage: !!r.hasImage, hasIngredients: !!r.hasIngredients, order: r.rowid })));
    for (const r of group) if (r.id !== keep.id) duplicates.push(r.id);
  }
  return {
    at: Date.now(),
    duplicatesJson: JSON.stringify(duplicates),
    poorTitleJson: JSON.stringify(poor),
    ownExcludedJson: JSON.stringify(ownExcluded),
    byConcern: new Map(
      [...lists].map(([id, l]) => [id, { excludedJson: JSON.stringify(l.excluded), tier1Json: JSON.stringify(l.tier1), tier2Json: JSON.stringify(l.tier2) }]),
    ),
  };
}

function index(): Index {
  if (!cached || Date.now() - cached.at > TTL_MS) cached = build();
  return cached;
}

/**
 * Ids kept off a concern's listing (they keep their own pages). Without a
 * concern, those kept off their own concern's listing.
 */
export function concernExcludedIdsJson(concernId?: string): string {
  return concernId ? (index().byConcern.get(concernId) ?? EMPTY).excludedJson : index().ownExcludedJson;
}

/** [tier 1 ids, tier 2 ids] on a concern's listing, as JSON arrays; everything else is tier 0. */
export function concernTierJson(concernId: string): [string, string] {
  const l = index().byConcern.get(concernId) ?? EMPTY;
  return [l.tier1Json, l.tier2Json];
}

/** Extra copies of a listed product, hidden from listings and search. */
export function duplicateIdsJson(): string {
  return index().duplicatesJson;
}

/** Junk or non-English community titles, ranked last. */
export function poorTitleIdsJson(): string {
  return index().poorTitleJson;
}
