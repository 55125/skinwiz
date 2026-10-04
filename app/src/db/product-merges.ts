// Turns tools/catalog_pipeline/output/product_merges.csv (duplicate_id ->
// canonical_id, written by build_product_merges.py) into products.canonical_id.
// Pure, so product-merges.test.ts can check it without a database.
//
// - Only the "auto" tier is applied; flagged pairs live in another file and
//   are never merged here.
// - A row is skipped (and reported) when either id isn't in the catalog,
//   when either side is a prescription row (Rx never merges with OTC), or
//   when it points a product at itself.
// - Chains and conflicting rows are resolved with union-find: every product
//   connected by a merge row ends up in one group, and the whole group points
//   at a single canonical -- the CSV's canonical when the group has exactly
//   one id that is never a duplicate, otherwise the smallest such id (or the
//   smallest id when every member was listed as a duplicate). The result is
//   flat: a canonical never has a canonical of its own.
//
// Reversible: delete rows from the CSV (or the whole file) and reseed; the
// seed rebuilds products from scratch, so canonical_id goes back to null.

export type MergeRow = { duplicate_id: string; canonical_id: string; tier?: string; method?: string };
export type MergeSkip = { duplicateId: string; canonicalId: string; reason: string };

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
  for (const r of rows) {
    const dup = (r.duplicate_id ?? "").trim();
    const can = (r.canonical_id ?? "").trim();
    const skip = (reason: string) => skipped.push({ duplicateId: dup, canonicalId: can, reason });
    if ((r.tier ?? "auto") !== "auto") {
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
    const head = heads[0] ?? members[0];
    for (const m of members) if (m !== head) canonicalOf.set(m, head);
  }
  return { canonicalOf, skipped };
}
