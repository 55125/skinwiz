// The plain-language lead on ingredient and allergen pages: a few sentences
// that answer "what is it and how common is it" before the details, built
// only from facts the page already shows. Search snippets and AI assistants
// quote a page's opening statement, so it should stand on its own. Pure
// (no database), so `npm test` covers the wording.

import { SITE_NAME } from "@/lib/brand";

const n = (x: number) => x.toLocaleString("en-US");
const plural = (x: number, one: string, many = `${one}s`) => `${n(x)} ${x === 1 ? one : many}`;

/** "a", "a and b", "a, b and c" (joined with `last`). */
export function listPhrase(items: string[], last = "and"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${last} ${items[items.length - 1]}`;
}

// "Methylisothiazolinone (MI)" -> "methylisothiazolinone", for comparing names.
const bare = (s: string) => s.replace(/\s*\([^)]*\)/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Edit distance, to drop label spellings that are only a typo of the name.
function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

export type IngredientFacts = {
  name: string;
  products: number;
  brands: number;
  asActive: number;
  /** What it's used for, as an active (db/active-uses.ts). */
  use?: string;
  /** Contact allergens the ingredient is, by name. */
  allergens: string[];
  /** Labels of the free-from checks a product listing it fails ("Fragrance-free"). */
  failedChecks: string[];
  /** Typical place in cosmetic ingredient lists, when enough lists say. */
  avgPosition: number | null;
};

export function ingredientSummary(f: IngredientFacts): string[] {
  const out = [
    `${f.name} is listed on ${plural(f.products, "product")} from ${plural(f.brands, "brand")} in the ${SITE_NAME} catalog` +
      (f.asActive > 0 ? `, ${f.asActive === f.products ? "each" : n(f.asActive)} as an active ingredient.` : "."),
  ];
  if (f.use) out.push(`As an active, it is used for ${f.use.charAt(0).toLowerCase()}${f.use.slice(1)}`.replace(/(?<![.!?])$/, "."));
  if (f.allergens.length) {
    const self = f.allergens.length === 1 && bare(f.allergens[0]).split(/\d/)[0].startsWith(bare(f.name).slice(0, 6));
    out.push(self ? "It is a known contact allergen." : `It is a known contact allergen: ${listPhrase(f.allergens)}.`);
  }
  if (f.failedChecks.length) out.push(`A product that lists it is not ${listPhrase(f.failedChecks.map((c) => c.toLowerCase()), "or")}.`);
  if (f.avgPosition) {
    const where = f.avgPosition <= 5 ? ", near the top, where the main ingredients are" : f.avgPosition >= 15 ? ", well down the list, where smaller amounts go" : "";
    out.push(`In cosmetic ingredient lists it usually sits around position ${f.avgPosition}${where}.`);
  }
  return out;
}

export type AllergenFacts = {
  name: string;
  /** The allergen's section title ("Formaldehyde and formaldehyde releasers"). */
  section: string;
  /** Names it is listed under on labels, the INCI name first. */
  labelNames: string[];
  listedOn: number;
  /** Products with a full ingredient list that are free of it; null when it can't be shown (metals). */
  freeOf: number | null;
  /** Can hide inside an undisclosed "fragrance". */
  hideable: boolean;
  /** Patch-test mixes and cross-reacting groups it belongs to. */
  families: string[];
};

export function allergenSummary(f: AllergenFacts): string[] {
  // Other names worth knowing, not respellings of the name itself.
  const kept: string[] = [bare(f.name)];
  const others = f.labelNames.filter((l) => {
    const b = bare(l);
    if (kept.some((k) => distance(k, b) <= 2)) return false;
    kept.push(b);
    return true;
  }).slice(0, 4);
  const out = [
    `${f.name} is a known contact allergen (${f.section.toLowerCase()}): in people who are sensitized to it, it can cause an itchy allergic rash called allergic contact dermatitis.`,
  ];
  if (others.length) out.push(`On ingredient labels it can also appear as ${listPhrase(others, "or")}.`);
  out.push(
    f.freeOf === null
      ? `${plural(f.listedOn, "product")} in the ${SITE_NAME} catalog ${f.listedOn === 1 ? "lists" : "list"} it.`
      : `${plural(f.listedOn, "product")} in the ${SITE_NAME} catalog ${f.listedOn === 1 ? "lists" : "list"} it, and ${n(f.freeOf)} with a full ingredient list are free of it.`,
  );
  if (f.hideable) out.push(`It doesn't have to be named when it is part of a blend listed only as "fragrance" or "parfum".`);
  if (f.families.length) out.push(`It is patch-tested or avoided together with ${listPhrase(f.families)}.`);
  return out;
}
