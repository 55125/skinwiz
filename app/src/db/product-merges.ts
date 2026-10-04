// Turns the de-duplication pipeline's output into products.canonical_id:
//
//  - tools/catalog_pipeline/output/product_merges.csv: the "auto" tier
//    (duplicate_id -> canonical_id, written by build_product_merges.py);
//  - tools/catalog_pipeline/output/product_merge_flagged.csv: pairs a reviewer
//    decided (review_product_merges.py). Only rows whose decision is "merge"
//    are applied, folded into decided_canonical_id; keep_separate,
//    reformulated, needs_owner and undecided rows never merge.
//
// Pure, so product-merges.test.ts can check it without a database.
//
// - A row is skipped (and reported) when either id isn't in the catalog,
//   when either side is a prescription row (Rx never merges with OTC), or
//   when it points a product at itself.
// - Chains and conflicting rows are resolved with union-find across both
//   files: every product connected by a merge row ends up in one group, and
//   the whole group points at a single canonical -- a reviewer's decided
//   canonical when the group has one, else the CSV's canonical when the group
//   has exactly one id that is never a duplicate, otherwise the smallest such
//   id (or the smallest id when every member was listed as a duplicate). The
//   result is flat: a canonical never has a canonical of its own.
//
// Reversible: delete rows from the CSVs (or set a reviewed row's decision to
// keep_separate) and reseed; the seed rebuilds products from scratch, so
// canonical_id goes back to null.

export type MergeRow = { duplicate_id: string; canonical_id: string; tier?: string; method?: string };
export type MergeSkip = { duplicateId: string; canonicalId: string; reason: string };
export type FlaggedRow = { id_a: string; id_b: string; decision?: string; decided_canonical_id?: string };

/** Tiers resolveMerges applies: the pipeline's auto tier and reviewed merge decisions. */
const APPLIED_TIERS = new Set(["auto", "reviewed"]);

/**
 * Reviewed "merge" rows of product_merge_flagged.csv as merge rows (tier
 * "reviewed"): each id of the pair that isn't the decided canonical becomes a
 * duplicate of it. Every other decision, and a merge without a decided
 * canonical, yields nothing.
 */
export function reviewedMergeRows(rows: FlaggedRow[]): MergeRow[] {
  const out: MergeRow[] = [];
  for (const r of rows) {
    if ((r.decision ?? "").trim() !== "merge") continue;
    const can = (r.decided_canonical_id ?? "").trim();
    if (!can) continue;
    for (const id of [r.id_a, r.id_b].map((x) => (x ?? "").trim())) {
      if (id && id !== can) out.push({ duplicate_id: id, canonical_id: can, tier: "reviewed" });
    }
  }
  return out;
}

export function resolveMerges(
  rows: MergeRow[],
  catalog: Map<string, { isRx: boolean }>,
): { canonicalOf: Map<string, string>; skipped: MergeSkip[] } {
  const skipped: MergeSkip[] = [];
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== undefined && parent.get(root) !== root) root = parent.get(root)!;
    // path compression
    let cur = x;
    while (parent.get(cur) !== undefined && parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (ra < rb) parent.set(rb, ra);
    else parent.set(ra, rb);
  };

  const duplicates = new Set<string>();
  const decided = new Set<string>();
  for (const r of rows) {
    const dup = (r.duplicate_id ?? "").trim();
    const can = (r.canonical_id ?? "").trim();
    const tier = r.tier ?? "auto";
    const skip = (reason: string) => skipped.push({ duplicateId: dup, canonicalId: can, reason });
    if (!APPLIED_TIERS.has(tier)) {
      skip(`tier ${r.tier} is not applied`);
      continue;
    }
    if (!dup || !can || dup === can) {
      skip("not a pair");
      continue;
    }
    const d = catalog.get(dup);
    const c = catalog.get(can);
    if (!d || !c) {
      skip(`${!d ? dup : can} is not in the catalog`);
      continue;
    }
    if (d.isRx || c.isRx) {
      skip("prescription rows are never merged");
      continue;
    }
    duplicates.add(dup);
    if (tier === "reviewed") decided.add(can);
    union(dup, can);
  }

  const groups = new Map<string, string[]>();
  for (const id of parent.keys()) {
    const root = find(id);
    (groups.get(root) ?? groups.set(root, []).get(root)!).push(id);
  }
  const canonicalOf = new Map<string, string>();
  for (const members of groups.values()) {
    members.sort();
    const heads = members.filter((m) => !duplicates.has(m));
    const head = heads.find((m) => decided.has(m)) ?? heads[0] ?? members[0];
    for (const m of members) if (m !== head) canonicalOf.set(m, head);
  }
  return { canonicalOf, skipped };
}
