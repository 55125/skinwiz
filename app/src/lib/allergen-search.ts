// Patch-test results typed or pasted into search ("cinnamic aldehyde",
// "bisphenol A epoxy resin, fragrance mix II, propolis, ...") name allergens,
// not products, so they find nothing. The search page points each allergen
// to its page instead (components/allergen-search-hint.tsx). Seen in the
// 2026-11-22 weekly search gaps.
import { ALLERGEN_GROUPS, allergensInList, CONTACT_ALLERGENS, getAllergen, normalizeForAllergens } from "@/db/contact-allergens";
import { NOT_ON_LABELS } from "@/db/patch-test-series";
import { casIndex } from "@/db/allergen-education";

export type QueryAllergen = {
  id: string;
  name: string;
  /** Its allergen page; null for one that labels don't list (a textile dye, epoxy resin). */
  href: string | null;
  /** Where a not-on-label allergen is met instead. */
  foundIn?: string;
};

const word = (pattern: string) => new RegExp(`(?<![a-z0-9])(?:${pattern})(?![a-z0-9])`);

// Patch-test names for groups and not-on-label allergens, in the normalized
// form (lowercase, separators as spaces). The tested allergen in an epoxy
// series is bisphenol A epoxy resin, so "bisphenol" means that one.
// "disperse blu" is how a long pasted query arrives cut off.
const NAMED: [RegExp, string][] = [
  [word("fragrance mix (?:i|1)|fm i|fm 1"), "fragrance-mix-1"],
  [word("fragrance mix (?:ii|2)|fm ii|fm 2"), "fragrance-mix-2"],
  [word("disperse (?:blue 106 124|blue mix|dye mix)"), "disperse-dye-mix"],
  [word("disperse blue 106|disperse blue|disperse blu"), "disperse-blue-106"],
  [word("epoxy resin|bisphenol a|bisphenol|bpa epoxy"), "epoxy-resin"],
  ...ALLERGEN_GROUPS.map((g): [RegExp, string] => [word(normalizeForAllergens(g.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), g.id]),
  ...NOT_ON_LABELS.map((n): [RegExp, string] => [word(normalizeForAllergens(n.name.replace(/\s*\(.*$/, "")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), n.id]),
  // CAS numbers, as labs and safety data sheets print them ("7791-13-1").
  ...casIndex().map((c): [RegExp, string] => [word(normalizeForAllergens(c.number)), c.id]),
];

function idsIn(text: string): string[] {
  const normalized = normalizeForAllergens(text);
  const named: string[] = [];
  for (const [re, id] of NAMED) {
    // The dye mix also reads as disperse blue 106; keep the more specific one.
    if (id === "disperse-blue-106" && named.includes("disperse-dye-mix")) continue;
    if (re.test(normalized) && !named.includes(id)) named.push(id);
  }
  // "Fragrance mix II" isn't the undisclosed "fragrance" a label lists.
  const single = allergensInList(text).filter((id) => !(id === "fragrance" && named.some((n) => n.startsWith("fragrance-mix"))));
  return [...new Set([...single, ...named])];
}

const TERMS = new Map(CONTACT_ALLERGENS.map((a) => [a.id, a.terms.map((t) => word(normalizeForAllergens(t.replace(/^\*|\*$/g, "")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))]));

/** True when nothing but the allergens' own names is left in the part. */
function onlyNames(part: string, ids: string[]): boolean {
  let rest = normalizeForAllergens(part);
  for (const [re, id] of NAMED) if (ids.includes(id)) rest = rest.replace(new RegExp(re.source, "g"), " ");
  for (const id of ids) for (const re of TERMS.get(id) ?? []) rest = rest.replace(new RegExp(re.source, "g"), " ");
  return !/[a-z]{2,}/.test(rest.replace(/(?<![a-z0-9])(?:and|or|positive|allergy|allergic|to)(?![a-z0-9])/g, " "));
}

function describe(id: string): QueryAllergen | null {
  const allergen = getAllergen(id);
  if (allergen) return { id, name: allergen.name, href: `/allergens/${id}` };
  const group = ALLERGEN_GROUPS.find((g) => g.id === id);
  if (group) return { id, name: group.name, href: `/allergens/${id}` };
  const offLabel = NOT_ON_LABELS.find((n) => n.id === id);
  return offLabel ? { id, name: offLabel.name, href: null, foundIn: offLabel.foundIn } : null;
}

/**
 * The patch-test allergens a search names. `allNamed` is true when every
 * comma-separated part of the query names one, so the search was a list of
 * results rather than a product that happens to contain one ("tea tree
 * shampoo").
 */
export function allergensInQuery(query: string): { allergens: QueryAllergen[]; allNamed: boolean } {
  const parts = query.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  const perPart = parts.map(idsIn);
  const ids = [...new Set(perPart.flat())];
  const allergens = ids.map(describe).filter((a): a is QueryAllergen => a !== null);
  return { allergens, allNamed: allergens.length > 0 && parts.every((p, i) => perPart[i].length > 0 && onlyNames(p, perPart[i])) };
}
