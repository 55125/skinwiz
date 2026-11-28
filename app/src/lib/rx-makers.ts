// Same medicine, strength and vehicle, different makers: generics share the
// active but each labeler picks its own vehicle, so the inactive ingredients
// (and the contact allergens in them) can differ. Pure (no DB); the /rx/[id]
// page passes in the listings of one variant (lib/rx-browse.ts variantKey)
// and their rx_vehicles rows.

export type MakerLabel = { id: string; labeler: string; brandName: string; names: string[] | null; allergenHits: string[] | null };

export type MakerRow = MakerLabel & {
  /** Inactive ingredients this label lists that not every other label does. */
  distinctive: string[];
};

export type MakerComparison = {
  makers: MakerRow[];
  /** Inactive ingredients every label with a list has. */
  shared: string[];
  /** Per allergen some labels list and others don't: which makers have it, which don't. */
  allergens: { id: string; inIds: string[]; notInIds: string[] }[];
  /** Labels with no inactive list on file. */
  unknown: number;
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function compareMakers(labels: MakerLabel[]): MakerComparison {
  const known = labels.filter((l) => l.names && l.names.length > 0);
  const sets = known.map((l) => new Set(l.names!.map(norm)));
  const shared = known.length ? known[0].names!.filter((n) => sets.every((s) => s.has(norm(n)))) : [];
  const sharedSet = new Set(shared.map(norm));
  const makers: MakerRow[] = labels.map((l) => ({
    ...l,
    distinctive: l.names && known.length > 1 ? l.names.filter((n) => !sharedSet.has(norm(n))) : [],
  }));
  const allIds = [...new Set(known.flatMap((l) => l.allergenHits ?? []))].sort();
  const allergens = allIds
    .map((id) => ({
      id,
      inIds: known.filter((l) => (l.allergenHits ?? []).includes(id)).map((l) => l.id),
      notInIds: known.filter((l) => !(l.allergenHits ?? []).includes(id)).map((l) => l.id),
    }))
    .filter((a) => a.notInIds.length > 0 && a.inIds.length > 0);
  // Clean labels first, then fewest allergens, then by maker.
  makers.sort(
    (a, b) =>
      Number(!a.names) - Number(!b.names) ||
      (a.allergenHits?.length ?? 99) - (b.allergenHits?.length ?? 99) ||
      a.labeler.localeCompare(b.labeler),
  );
  return { makers, shared, allergens, unknown: labels.length - known.length };
}
