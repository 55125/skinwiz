import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { buildEquivalenceGroups, DRUG_SOURCES, type EquivalenceGroup } from "@/lib/equivalence";
import { BROAD_SPECTRUM_15_PHRASES, hsaStatus, SUNBURN_ONLY_PHRASES } from "@/lib/hsa";

// One scan of the FDA drug rows (~15k), turned into the equivalence groups
// and the HSA/FSA-eligible id set, then kept in memory. The catalog only
// changes on a reseed, so a 10-minute refresh (same as similar.ts) is plenty
// and no request ever does more than a Map lookup.
type Index = {
  at: number;
  groups: EquivalenceGroup[];
  bySlug: Map<string, EquivalenceGroup>;
  byProductId: Map<string, EquivalenceGroup>;
  hsaIds: Set<string>;
  hsaIdsJson: string;
};

const TTL_MS = 10 * 60_000;
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
    brandName: string;
    manufacturer: string | null;
    dosageForm: string | null;
    strengthKey: string | null;
    activeIds: string;
    concernId: string;
    dataSource: string;
    marketingCategory: string | null;
    hasLabel: number;
    bs15: number | null;
    sunburnOnly: number | null;
  }>(sql`
    SELECT p.id, p.brand_name AS brandName, p.manufacturer, p.dosage_form AS dosageForm,
      p.strength_key AS strengthKey, p.active_ids AS activeIds, p.concern_id AS concernId,
      p.data_source AS dataSource, p.marketing_category AS marketingCategory, l.spl_set_id IS NOT NULL AS hasLabel,
      (${likeAny("l.directions", BROAD_SPECTRUM_15_PHRASES)} OR ${likeAny("l.warnings", BROAD_SPECTRUM_15_PHRASES)}) AS bs15,
      (${likeAny("l.warnings", SUNBURN_ONLY_PHRASES)} OR ${likeAny("l.directions", SUNBURN_ONLY_PHRASES)}) AS sunburnOnly
    FROM products p LEFT JOIN label_sections l ON l.spl_set_id = p.spl_set_id
    WHERE p.is_rx = 0 AND p.data_source IN (${sql.join(DRUG_SOURCES.map((s) => sql`${s}`), sql`, `)})
  `);

  const parsed = rows.map((r) => ({ ...r, activeIds: JSON.parse(r.activeIds) as string[] }));
  const groups = buildEquivalenceGroups(parsed);
  const bySlug = new Map(groups.map((g) => [g.slug, g]));
  const byProductId = new Map<string, EquivalenceGroup>();
  for (const g of groups) for (const m of g.members) for (const id of m.ids) byProductId.set(id, g);

  const hsaIds = new Set(
    parsed
      .filter(
        (r) =>
          hsaStatus({
            ...r,
            label: r.hasLabel ? { broadSpectrum15: !!r.bs15, sunburnOnly: !!r.sunburnOnly } : null,
          }).eligible,
      )
      .map((r) => r.id),
  );
  return { at: Date.now(), groups, bySlug, byProductId, hsaIds, hsaIdsJson: JSON.stringify([...hsaIds]) };
}

function index(): Index {
  if (!cached || Date.now() - cached.at > TTL_MS) cached = build();
  return cached;
}

/** Every equivalence group, largest first. */
export function getEquivalenceGroups(): EquivalenceGroup[] {
  return index().groups;
}

export function getEquivalenceGroup(slug: string): EquivalenceGroup | undefined {
  return index().bySlug.get(slug);
}

export function getEquivalenceGroupForProduct(productId: string): EquivalenceGroup | undefined {
  return index().byProductId.get(productId);
}

export function isHsaEligible(productId: string): boolean {
  return index().hsaIds.has(productId);
}

export function hsaEligibleCount(): number {
  return index().hsaIds.size;
}

// The eligible ids as one JSON array string, so a SQL filter binds a single
// parameter: id IN (SELECT value FROM json_each(?)).
export function hsaEligibleIdsJson(): string {
  return index().hsaIdsJson;
}
