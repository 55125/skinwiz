// The dupe finder's rules, kept free of database access so they can be tested
// on plain rows (lib/dupes.ts applies them to the catalog). A dupe has exactly
// the same set of actives, at the same strengths wherever both labels state
// one, in the same form; dupes are then ranked by how closely their inactive
// ingredient lists match.

/**
 * A product's form for dupe matching: what a shopper would call the same
 * kind of product. Some product types decide it from the name whatever the
 * FDA form says (a "cream cleanser" is a cleanser, a lip balm is not a body
 * stick, a tinted SPF foundation is not a sunscreen lotion); otherwise the
 * FDA dosage form, grouped; otherwise a texture word in the name. null when
 * none of those settles it: such products get no dupes, since "same form"
 * can't be confirmed.
 */
export type DupeForm =
  | "cleanser"
  | "shampoo"
  | "lip"
  | "tinted"
  | "mask"
  | "patch"
  | "pad"
  | "cream"
  | "lotion"
  | "gel"
  | "ointment"
  | "paste"
  | "stick"
  | "spray"
  | "foam"
  | "liquid"
  | "serum"
  | "oil"
  | "powder";

export const DUPE_FORM_LABELS: Record<DupeForm, string> = {
  cleanser: "Cleanser",
  shampoo: "Shampoo",
  lip: "Lip product",
  tinted: "Tinted makeup",
  mask: "Mask",
  patch: "Patch",
  pad: "Pad or wipe",
  cream: "Cream",
  lotion: "Lotion",
  gel: "Gel",
  ointment: "Ointment or balm",
  paste: "Paste",
  stick: "Stick",
  spray: "Spray",
  foam: "Foam",
  liquid: "Liquid",
  serum: "Serum",
  oil: "Oil",
  powder: "Powder",
};

// Product types that override the FDA form, checked in order on the name.
const NAME_TYPES: [RegExp, DupeForm][] = [
  [/\blip(s|stick)?\b/i, "lip"],
  [/\b(foundation|bb|cc|tinted|cushion|concealer|skin tint)\b/i, "tinted"],
  [/\bshampoo\b/i, "shampoo"],
  [/\b(wash|cleanser|cleansing|scrub|soap|body bar|face bar)\b/i, "cleanser"],
  [/\bmasks?\b/i, "mask"],
  [/\b(patch|patches)\b/i, "patch"],
  [/\b(pads?|wipes?|towelettes?|cloths?|swabs?)\b/i, "pad"],
];

// FDA dosage forms, grouped. KIT is deliberately absent: a kit has no dupe.
const FDA_FORMS: [RegExp, DupeForm][] = [
  [/^SOAP\b/, "cleanser"],
  [/SHAMPOO/, "shampoo"],
  [/^LIPSTICK\b/, "lip"],
  [/^PATCH\b/, "patch"],
  [/^(CLOTH|SWAB|SPONGE|DISC)\b/, "pad"],
  [/FOAM/, "foam"],
  [/POWDER/, "powder"],
  [/SPRAY|^AEROSOL$/, "spray"],
  [/^STICK\b/, "stick"],
  [/^CREAM\b/, "cream"],
  [/^(LOTION|EMULSION|MILK)\b/, "lotion"],
  [/^GEL\b/, "gel"],
  [/^(OINTMENT|SALVE|JELLY|BALM)\b/, "ointment"],
  [/^PASTE\b/, "paste"],
  [/^OIL\b/, "oil"],
  [/^(LIQUID|SOLUTION|TINCTURE|RINSE|SUSPENSION|FOR SOLUTION)\b/, "liquid"],
];

// Texture words in the name, for rows with no FDA form (every cosmetic and
// most DailyMed rows). Balms before lotions before creams before gels, so
// "gel cream" reads as a cream and "balm stick" as a balm.
const NAME_TEXTURES: [RegExp, DupeForm][] = [
  [/\b(spray|mist|aerosol)\b/i, "spray"],
  [/\bstick\b/i, "stick"],
  [/\b(foam|mousse)\b/i, "foam"],
  [/\b(serum|ampoule|essence|booster)\b/i, "serum"],
  [/\b(toner|tonic|solution|liquid)\b/i, "liquid"],
  [/\boil\b(?![- ]?(free|control|absorb))/i, "oil"],
  [/\bpowder\b/i, "powder"],
  [/\b(ointment|balm|salve|jelly)\b/i, "ointment"],
  [/\bpaste\b/i, "paste"],
  [/\b(lotion|milk|fluid|emulsion)\b/i, "lotion"],
  [/\b(cream|creme|crème|moisturi[sz]er)\b/i, "cream"],
  [/\bgel\b/i, "gel"],
];

export function dupeForm(dosageForm: string | null, name: string): DupeForm | null {
  const type = NAME_TYPES.find(([re]) => re.test(name));
  if (type) return type[1];
  const listed = dosageForm?.trim().toUpperCase();
  if (listed) return FDA_FORMS.find(([re]) => re.test(listed))?.[1] ?? null;
  return NAME_TEXTURES.find(([re]) => re.test(name))?.[1] ?? null;
}

/** The active set as one comparable key; "" for a product with no actives. */
export function activeKey(activeIds: string[]): string {
  return [...new Set(activeIds)].sort().join("|");
}

/**
 * Strengths of two products with the same actives. "same" when every active
 * has a stated strength on both and they agree (labels round: 7.49% and 7.5%
 * are one strength, so 2% relative slack); "different" when any active's
 * stated strengths disagree; "unknown" when they agree as far as both labels
 * go but one of them leaves a strength out.
 */
export type StrengthMatch = "same" | "unknown" | "different";

export function compareStrengths(
  activeIds: string[],
  a: Record<string, number> | null,
  b: Record<string, number> | null,
): StrengthMatch {
  let unknown = false;
  for (const id of new Set(activeIds)) {
    const x = a?.[id];
    const y = b?.[id];
    if (x == null || y == null) {
      unknown = true;
      continue;
    }
    if (Math.abs(x - y) > 0.02 * Math.max(x, y)) return "different";
  }
  return unknown ? "unknown" : "same";
}

/** An inactive ingredient list: ids in label order; ordered = the order means something. */
export type InactiveList = { ids: string[]; ordered: boolean };

// Cosmetic (INCI) lists run roughly by descending concentration; FDA inactive
// lists are often alphabetical or arbitrary (schema.ts productIngredients).
export function listIsOrdered(dataSource: string): boolean {
  return dataSource !== "openfda" && dataSource !== "dailymed";
}

// How much a place in an ordered list counts: the first ingredient 1, the
// 10th about 0.3, the 30th about 0.23. Gentle, so a shared ingredient deep in
// both lists still counts, but the bulk of a formula counts most.
function placeWeight(position: number): number {
  return 1 / (1 + Math.log(position));
}

export type InactiveMatch = { score: number; shared: number; union: number };

/**
 * Weighted Jaccard (Ruzicka) similarity of two inactive lists. Each
 * ingredient's weight is its rarity across the catalog (`rarity`, as in
 * lib/similar.ts, so sharing water and glycerin says little), times its
 * place in the list when both lists are ordered: the same ingredient near
 * the top of both counts fully, one near the top of one and the bottom of
 * the other only partly. null when either list is empty: no basis to rank.
 */
export function inactiveSimilarity(a: InactiveList, b: InactiveList, rarity: (id: string) => number): InactiveMatch | null {
  if (a.ids.length === 0 || b.ids.length === 0) return null;
  const ordered = a.ordered && b.ordered;
  const vector = (l: InactiveList) => {
    const v = new Map<string, number>();
    l.ids.forEach((id, i) => {
      if (!v.has(id)) v.set(id, rarity(id) * (ordered ? placeWeight(i + 1) : 1));
    });
    return v;
  };
  const va = vector(a);
  const vb = vector(b);
  let min = 0;
  let max = 0;
  let shared = 0;
  for (const id of new Set([...va.keys(), ...vb.keys()])) {
    const x = va.get(id) ?? 0;
    const y = vb.get(id) ?? 0;
    min += Math.min(x, y);
    max += Math.max(x, y);
    if (va.has(id) && vb.has(id)) shared++;
  }
  const union = new Set([...va.keys(), ...vb.keys()]).size;
  // Every ingredient common enough to weigh nothing: fall back to plain overlap.
  const score = max > 0 ? min / max : shared / union;
  return { score, shared, union };
}

export type DupeCandidate = {
  id: string;
  brandName: string;
  strength: StrengthMatch;
  match: InactiveMatch | null;
  discontinued: boolean;
  inStock: boolean;
  imported: boolean;
};

/**
 * Dupe order, matching how search ranks (lib/queries.ts): likely
 * discontinued products last whatever their match; then closest inactive
 * match (to the whole percent), rows with no inactive list to compare after
 * every compared one; then, at an equal match, in stock now, sold in the US
 * before imports, strengths confirmed before "strength not listed", and the
 * shorter name.
 */
export function rankDupes<T extends DupeCandidate>(rows: T[]): T[] {
  const pct = (r: T) => (r.match ? Math.round(r.match.score * 100) : -1);
  return [...rows].sort(
    (a, b) =>
      Number(a.discontinued) - Number(b.discontinued) ||
      pct(b) - pct(a) ||
      Number(b.inStock) - Number(a.inStock) ||
      Number(a.imported) - Number(b.imported) ||
      Number(a.strength !== "same") - Number(b.strength !== "same") ||
      a.brandName.length - b.brandName.length ||
      a.brandName.localeCompare(b.brandName),
  );
}

/**
 * A brand key for "same brand": its other shades, sizes and scents share the
 * formula but aren't what someone looking for a dupe wants, so they're listed
 * apart. Case, punctuation and legal suffixes don't make a different brand.
 */
export function brandKey(brand: string | null): string {
  return (brand ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(the|inc|llc|ltd|co|corp|corporation|company|brands?|usa|us|lp)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
