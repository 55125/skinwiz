// Drug actives a brand's own product page states on a Drug Facts-style line
// ("Active ingredient: Petrolatum 46.5%", "ACTIVE INGREDIENTS: HOMOSALATE
// (10%), ZINC OXIDE (8%) INACTIVE INGREDIENTS: ...", Health Canada's
// "Medicinal Ingredient: Salicylic Acid 2%"), or as a bare strength list
// ("Petrolatum (41%)").
//
// The brand-direct pipeline (tools/catalog_pipeline/build_brand_direct_catalog.py)
// matches only cosmetic ids plus petrolatum against the whole text, so a
// CeraVe benzoyl peroxide wash or an SPF 30 lotion came through with no drug
// active and no strength. seed.ts adds these on top of the CSV's ids; the
// product page uses brandDirectStatus() to decide what the brand-direct
// banner may say about OTC monograph status (AG-results.md G-11).
//
// Only OTC drug actives count here (ids with an FDA range in
// MONOGRAPH_RANGES): a cosmetic page's "Active ingredients: Niacinamide 10%"
// doesn't make it a drug.

import { matchActiveIds } from "./actives";
import { MONOGRAPH_RANGES } from "./monograph-ranges";
import { parseStrengths, type Strengths } from "./strength";

const isDrugActive = (id: string) => id in MONOGRAPH_RANGES;

// "Active ingredient(s)" / "Medicinal ingredient(s)", not "Inactive ..." or
// "Non-medicinal ...". Runs to the next ingredient heading, or the end.
const LABELED_RE =
  /(?<![\w-])(?:active|medicinal)\s+ingredients?\s*:?\s*([\s\S]*?)(?=(?<![\w])(?:inactive|non-medicinal|other)\s+ingredients?\b|(?<![\w-])ingredients?\s*:|$)/i;
const DRUG_FACTS_RE = /\bdrug facts\b/i;
const SUNSCREEN_NAME_RE =
  /\bspf\s*\d|\bsunscreen|\bsun\s+(?:serum|stick|cushion|cream|fluid|milk|essence|gel|lotion|spray)|\bbroad spectrum\b/i;

/** The text of the product's labeled active-ingredient line, or null when it has none. */
export function labeledActiveSegment(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const m = LABELED_RE.exec(text);
  if (m && m[1].trim()) return m[1].trim();
  // No heading, but every comma-separated item carries a percent:
  // "Petrolatum (41%)", "Petrolatum (31%), Avobenzone (3%), ...".
  const items = text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (
    items.length > 0 &&
    items.length <= 8 &&
    items.every((s) => /\d\s*%/.test(s))
  )
    return text.trim();
  return null;
}

export type LabeledDrugActives = {
  activeIds: string[];
  strengths: Strengths | null;
};

/** OTC drug actives (and their strengths) on the labeled active line. */
export function labeledDrugActives(
  text: string | null | undefined,
): LabeledDrugActives {
  const segment = labeledActiveSegment(text);
  if (!segment) return { activeIds: [], strengths: null };
  const activeIds = matchActiveIds(segment).filter(isDrugActive);
  const parsed = parseStrengths(segment);
  const strengths = parsed
    ? Object.fromEntries(
        Object.entries(parsed).filter(([id]) => activeIds.includes(id)),
      )
    : {};
  return {
    activeIds,
    strengths: Object.keys(strengths).length > 0 ? strengths : null,
  };
}

/**
 * What a brand-sourced listing may say about OTC monograph status.
 * - "drug": the page labels an OTC drug active (or says "Drug Facts").
 * - "drug-ingredient": an OTC drug active is listed, but not labeled as the
 *   active (petrolatum or salicylic acid in a cosmetic INCI list), or the
 *   name says sunscreen/SPF (a sunscreen is an OTC drug in the US even when
 *   the scraped text missed its filters) -- say nothing about status.
 * - "cosmetic": no tracked active has OTC monograph status.
 */
export function brandDirectStatus(p: {
  activeIds: string[];
  strengths?: Strengths | null;
  activeIngredientText?: string | null;
  brandName?: string | null;
}): { kind: "drug" | "drug-ingredient" | "cosmetic"; drugActiveIds: string[] } {
  const labeled = labeledDrugActives(p.activeIngredientText).activeIds;
  const fromStrengths = Object.keys(p.strengths ?? {}).filter(isDrugActive);
  const drugActiveIds = [...new Set([...labeled, ...fromStrengths])];
  if (
    drugActiveIds.length > 0 ||
    DRUG_FACTS_RE.test(p.activeIngredientText ?? "")
  )
    return { kind: "drug", drugActiveIds };
  if (
    p.activeIds.some(isDrugActive) ||
    SUNSCREEN_NAME_RE.test(p.brandName ?? "")
  )
    return { kind: "drug-ingredient", drugActiveIds: [] };
  return { kind: "cosmetic", drugActiveIds: [] };
}
