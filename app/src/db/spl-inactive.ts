// Inactive-ingredient lists for FDA drug rows. openFDA rows carry the label's
// own "Inactive ingredients" text in the catalog CSV; DailyMed-resolved rows
// (and the few openFDA rows missing it) get theirs from the SPL XML instead:
// tools/catalog_pipeline/output/dailymed_inactive_ingredients.csv, holding the
// structured IACT substance list (label order, UNII codes) and, when the label
// has one, the Inactive Ingredients section text.
//
// Whatever the source, the result goes through the same normalization
// (ingredient-parse.ts) and feeds the same consumers: product_ingredients
// rows (pregnancy matching, ingredient pages, avoid lists), and the full-text
// allergen / free-from computations.
import { parseIngredientNames, parseIngredients, cleanStructuredName, type ParsedIngredient } from "./ingredient-parse";

export type SplInactiveCsvRow = {
  product_id: string;
  setid: string;
  position: string;
  raw_name: string;
  unii: string;
  source: "iact" | "section_text";
};

// names: the IACT list, in label order; text: the section's own wording.
export type SplInactive = { names: string[]; uniis: string[]; text: string | null };

/** product id -> its SPL-derived inactive list. */
export function groupSplInactive(rows: SplInactiveCsvRow[]): Map<string, SplInactive> {
  const iact = new Map<string, { pos: number; name: string; unii: string }[]>();
  const text = new Map<string, string>();
  for (const r of rows) {
    if (!r.product_id || !r.raw_name?.trim()) continue;
    if (r.source === "section_text") text.set(r.product_id, r.raw_name);
    else if (r.source === "iact") {
      const list = iact.get(r.product_id) ?? [];
      list.push({ pos: Number(r.position), name: r.raw_name, unii: r.unii ?? "" });
      iact.set(r.product_id, list);
    }
  }
  const out = new Map<string, SplInactive>();
  for (const id of new Set([...iact.keys(), ...text.keys()])) {
    const list = (iact.get(id) ?? []).sort((a, b) => a.pos - b.pos);
    out.set(id, { names: list.map((x) => x.name), uniis: list.map((x) => x.unii), text: text.get(id) ?? null });
  }
  return out;
}

export type DrugInactive = {
  parsed: ParsedIngredient[];
  // the list as text, for computeAllergenHits / computeFreeFromFlags; null = unknown
  text: string | null;
  source: "label" | "spl_iact" | "spl_text" | null;
};

// A label line with no separators ("Water Glycerin Dimethicone ...") can't be
// split into ingredients. Same rule as is_thin() in fetch_dailymed_inactive.py.
export function isThinIngredientText(text: string): boolean {
  return !/[,;，·•]/.test(text);
}

/**
 * The catalog row's own label text wins; the SPL fills in only where it's
 * missing or unsplittable (isThinIngredientText). From the SPL, the ordered list comes from the structured names
 * (each one ingredient, never comma-split) and the matching text is the
 * names plus the section wording, so an allergen spelled either way is caught.
 */
export function drugInactiveList(labelText: string | null | undefined, spl: SplInactive | undefined): DrugInactive {
  const label = labelText?.trim() ? labelText : null;
  if (label && !(isThinIngredientText(label) && spl)) return { parsed: parseIngredients(label), text: label, source: "label" };
  if (spl?.names.length) {
    const parsed = parseIngredientNames(spl.names, spl.uniis);
    // registry names, their label spellings, and the label's own words
    const words = [...new Set([...spl.names.map(cleanStructuredName), ...parsed.map((p) => p.raw)])];
    if (spl.text) words.push(spl.text);
    if (label) words.push(label);
    return { parsed, text: words.join(", "), source: "spl_iact" };
  }
  if (spl?.text?.trim() && !isThinIngredientText(spl.text)) {
    return { parsed: parseIngredients(spl.text), text: label ? `${spl.text}, ${label}` : spl.text, source: "spl_text" };
  }
  if (label) return { parsed: parseIngredients(label), text: label, source: "label" };
  if (spl?.text?.trim()) return { parsed: parseIngredients(spl.text), text: spl.text, source: "spl_text" };
  return { parsed: [], text: null, source: null };
}
