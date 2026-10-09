import { matchActiveIds } from "./actives";

// Parses the exact-strength text an FDA drug label carries ("BENZOYL
// PEROXIDE 50 mg/mL", "SALICYLIC ACID 2 g/100g", "SULFUR 1.4 g in 14 g",
// "ZINC OXIDE 25 kg/100kg", "Avobenzone 3%") into a percent per tracked
// active. Only openFDA/DailyMed rows carry this -- cosmetic ingredient lists
// (Open Beauty Facts, brand-direct) don't disclose concentrations at all,
// so those rows get null, never a guess.
//
// A line with a numerator but no denominator ("SALICYLIC ACID 2 g",
// ".14 mg/1") is a per-package amount, not a concentration -- it can't be
// converted to a percent without the package size, which the label text
// doesn't give, so it's skipped rather than assumed to be per-gram.

const UNIT_TO_GRAMS: Record<string, number> = {
  kg: 1000,
  g: 1,
  mg: 0.001,
  ug: 0.000001,
  mcg: 0.000001,
  // Volume treated 1:1 with mass -- the labels themselves mix "g/100mL" and
  // "g/100g" for the same kind of product, and for topical vehicles near
  // water density the difference is well inside label rounding.
  l: 1000,
  ml: 1,
  ul: 0.001,
};

// Real OTC topical strengths run from 0.1% (adapalene) to 100% (petrolatum).
// A parsed value outside that is a label-data quirk (a "1 mg/100mL"
// salicylic acid line is a units error on the filing, not a 0.001% product)
// and is dropped rather than shown as fact.
const MIN_PLAUSIBLE_PCT = 0.05;
const MAX_PLAUSIBLE_PCT = 100;

const SEGMENT_RE =
  /^\s*(.+?)\s+(\d*\.?\d+)\s*(%|kg|g|mg|ug|mcg|L|mL|uL)(?:\s*(?:\/|in)\s*(\d*\.?\d+)?\s*(kg|g|mg|ug|mcg|L|mL|uL))?\s*$/i;

// Segments are normally ";"-separated, but Drug Facts text often joins them
// with commas ("Avobenzone 3%, Homosalate 10%, ...") or kit parts with "|".
// A comma only splits when it follows a quantity, so a comma inside a name
// or a thousands separator ("1,000 mg") is left alone. Without this split
// the whole line is one segment and every active got the last percent.
const SEGMENT_SPLIT_RE = /;|\||(?<=\d\s*(?:%|kg|g|mg|ug|mcg|l|ml|ul)\)?)\s*,/i;

function parseSegment(segment: string): { name: string; pct: number } | null {
  const m = SEGMENT_RE.exec(segment);
  if (!m) return null;
  const [, name, numStr, numUnit, denStr, denUnit] = m;
  const num = parseFloat(numStr);
  if (!Number.isFinite(num)) return null;

  let pct: number;
  if (numUnit === "%") {
    pct = num;
  } else {
    if (!denUnit) return null; // per-package amount, not a concentration
    const den = denStr ? parseFloat(denStr) : 1;
    const numG = num * UNIT_TO_GRAMS[numUnit.toLowerCase()];
    const denG = den * UNIT_TO_GRAMS[denUnit.toLowerCase()];
    if (!denG) return null;
    pct = (numG / denG) * 100;
  }
  if (pct < MIN_PLAUSIBLE_PCT || pct > MAX_PLAUSIBLE_PCT) return null;
  return { name, pct: Math.round(pct * 100) / 100 };
}

export type Strengths = Record<string, number>;

/**
 * Percent strength per tracked active id, or null when nothing on the line
 * could be parsed. An active that appears twice (two salicylic-acid
 * segments on a kit label) keeps the first value.
 */
export function parseStrengths(activeIngredientText: string | null | undefined): Strengths | null {
  if (!activeIngredientText) return null;
  const out: Strengths = {};
  const add = (name: string, pct: number) => {
    for (const id of matchActiveIds(name)) {
      if (!(id in out)) out[id] = pct;
    }
  };
  // Some labels carry the Drug Facts table flattened into one segment
  // ("Active ingredients Purpose Homosalate 10% Sunscreen Octisalate 5%
  // Sunscreen ...") -- no separators, so the single-quantity parse would
  // give every name the last number. A segment with more than one percent,
  // or one the single parse can't read, is scanned for every "<name> <n>%"
  // pair instead; the name capture runs back to the previous match and may
  // include a stray word like "Sunscreen", which matchActiveIds' substring
  // matching tolerates.
  const scan = (segment: string) => {
    for (const m of segment.matchAll(/([A-Za-z][A-Za-z\s'\-]*?)\s*:?\s*\(?(\d*\.?\d+)\s*%\)?/g)) {
      const pct = parseFloat(m[2]);
      if (pct >= MIN_PLAUSIBLE_PCT && pct <= MAX_PLAUSIBLE_PCT) add(m[1], Math.round(pct * 100) / 100);
    }
  };
  for (const segment of activeIngredientText.split(SEGMENT_SPLIT_RE)) {
    const percents = segment.match(/\d\s*%/g)?.length ?? 0;
    const parsed = percents > 1 ? null : parseSegment(segment);
    if (parsed) add(parsed.name, parsed.pct);
    else if (percents > 0) scan(segment);
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * A canonical "same actives at the same strengths" key, so equivalents can
 * be found with a plain equality match instead of JSON comparison. Only
 * defined when every active on the product has a parsed strength -- a
 * partial key would match products that differ in the unparsed active.
 */
export function strengthKey(strengths: Strengths | null, activeIds: string[]): string | null {
  if (!strengths || activeIds.length === 0) return null;
  if (!activeIds.every((id) => id in strengths)) return null;
  return [...activeIds]
    .sort()
    .map((id) => `${id}:${strengths[id]}`)
    .join("|");
}

export function formatPct(pct: number): string {
  return `${Number.isInteger(pct) ? pct : pct.toFixed(pct * 10 === Math.floor(pct * 10) ? 1 : 2)}%`;
}
