// Does a retailer's offer title describe this exact catalog product? Pure,
// tested in match.test.ts. A wrong price is worse than none, so a keyword
// match must pass every check below or it is thrown away:
//   - brand: the product's brand word (or its labeler / store brand) appears
//   - name:  at least 75% of the product name's meaningful words appear
//   - strength: any % the title states is one of the product's strengths, and
//               a single-active product's strength must be stated
//   - SPF: if either side states an SPF, both state the same one
//   - form: a title naming a different form (cream vs gel) is rejected
//   - variant: kits, multi-packs, minis, refills, samples, tinted versions...
//              are rejected unless the product's own name says so
//   - size: both sizes must be known and agree within 4%
// Barcode and plainlink matches are exact lookups, so they only get the
// contradiction checks (strength, SPF); the NDC-derived barcode, being a
// guess, also needs the brand or most of the name to agree.
import { parsePackageDescription, storeBrandFor, type PackageSize } from "@/lib/equivalence";
import { displayManufacturer } from "@/lib/format";
import type { LookupProduct } from "./types";

const STOP = new Set([
  "the", "and", "for", "with", "by", "of", "in", "on", "to", "a", "an", "&",
  "usp", "otc", "drug", "facts", "new", "formula", "size", "oz", "fl", "ml", "g", "ct", "count",
]);

// Words that never identify a brand on their own (a store-brand listing is
// often named just "Adapalene Gel").
const GENERIC = new Set([
  "adapalene", "benzoyl", "peroxide", "salicylic", "acid", "sulfur", "zinc", "oxide", "titanium", "dioxide",
  "hydrocortisone", "clotrimazole", "miconazole", "terbinafine", "tolnaftate", "ketoconazole", "pyrithione",
  "selenium", "coal", "tar", "avobenzone", "octinoxate", "octisalate", "homosalate", "octocrylene", "oxybenzone",
  "acne", "sunscreen", "sun", "spf", "gel", "cream", "lotion", "wash", "cleanser", "treatment", "spot", "face",
  "facial", "body", "daily", "maximum", "strength", "extra", "original", "sensitive", "skin", "medicated",
  "aluminum", "antiperspirant", "deodorant", "anti", "itch", "foot", "athlete's", "athletes", "antifungal",
  "dandruff", "shampoo", "broad", "spectrum", "mineral", "clear", "care", "pads", "foaming", "foam",
]);

const FORMS: [string, RegExp][] = [
  ["gel", /\bgels?\b/],
  ["cream", /\bcreams?\b|\bcreme\b/],
  ["lotion", /\blotions?\b/],
  ["foam", /\bfoam(?:ing)?\b|\bmousse\b/],
  ["wash", /\bwash\b|\bcleanser\b|\bcleansing\b/],
  ["spray", /\bsprays?\b|\bmist\b/],
  ["stick", /\bsticks?\b/],
  ["ointment", /\bointments?\b|\bbalm\b/],
  ["pad", /\bpads?\b|\bwipes?\b|\bcloths?\b/],
  ["powder", /\bpowders?\b/],
  ["bar", /\bbar soap\b|\bsoap bar\b|\bbars?\b/],
  ["shampoo", /\bshampoos?\b/],
  ["serum", /\bserums?\b/],
  ["oil", /\boils?\b/],
  ["solution", /\bsolutions?\b|\btoner\b|\bliquid\b/],
];

const VARIANT = /\b(kit|bundle|set|value pack|multi-?pack|\d+\s*-?\s*(?:pack|pk|ct pack)|pack of \d+|twin ?pack|2pk|x\s?[2-9]\b|refills?|samples?|trial|travel|mini|tinted|bonus|gift)\b/;

const SIZE_RE =
  /(\d+(?:\.\d+)?)\s*-?\s*(fl\.?\s*oz\.?|fluid\s+ounces?|ounces?|oz\.?|ml|milliliters?|millilitres?|g|grams?|kg|count|ct|pads|wipes|cloths)(?![a-z])/gi;
const PCT_RE = /(\d*\.?\d+)\s*%/g;
const SPF_RE = /\bspf\s*(\d{1,3})\b/i;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/[^a-z0-9%.&' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(w: string): string {
  return w.length > 4 && w.endsWith("es") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
}

function words(s: string): string[] {
  return normalize(s)
    .split(" ")
    .map((w) => w.replace(/^[.']+|[.']+$/g, ""))
    .filter(Boolean);
}

/** Meaningful name words: no stopwords, no numbers or percents. */
export function nameTokens(s: string): string[] {
  return [...new Set(words(s).filter((w) => w.length >= 3 && !STOP.has(w) && !/\d/.test(w)).map(stem))];
}

/** The first size a title states ("1.7 oz", "45 g", "30 count"), as a package size. */
export function parseSizeFromTitle(title: string): PackageSize | null {
  for (const m of title.matchAll(SIZE_RE)) {
    const n = parseFloat(m[1]);
    if (!(n > 0)) continue;
    const u = m[2].toLowerCase().replace(/[\s.]+/g, "");
    if (u.startsWith("fl") || u.startsWith("fluid")) return { amount: n * 29.5735, unit: "mL" };
    if (u === "oz" || u.startsWith("ounce")) return { amount: n * 28.3495, unit: "g" };
    if (u === "ml" || u.startsWith("millil")) return { amount: n, unit: "mL" };
    if (u === "g" || u.startsWith("gram")) return { amount: n, unit: "g" };
    if (u === "kg") return { amount: n * 1000, unit: "g" };
    return { amount: n, unit: "count" };
  }
  return null;
}

/** g and mL compare 1:1 (as strength.ts and unitPrice do); counts only with counts. */
export function sizesAgree(a: PackageSize, b: PackageSize, tolerance = 0.04): boolean {
  if ((a.unit === "count") !== (b.unit === "count")) return false;
  return Math.abs(a.amount - b.amount) <= tolerance * Math.max(a.amount, b.amount);
}

export function percentsIn(title: string): number[] {
  return [...title.matchAll(PCT_RE)].map((m) => parseFloat(m[1])).filter((n) => n > 0 && n <= 100);
}

function samePct(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1e-6, 0.01 * Math.max(a, b));
}

function spfOf(s: string): number | null {
  const m = SPF_RE.exec(s);
  return m ? Number(m[1]) : null;
}

function formsIn(s: string): Set<string> {
  const t = normalize(s);
  return new Set(FORMS.filter(([, re]) => re.test(t)).map(([f]) => f));
}

/** The product's own size: the NDC package description, else a size in its name. */
export function productSize(p: Pick<LookupProduct, "packageDescription" | "brandName" | "id">): PackageSize | null {
  return parsePackageDescription(p.packageDescription) ?? parseSizeFromTitle(p.brandName) ?? parseSizeFromTitle(p.id.replace(/-/g, " "));
}

/** Brand words an offer title must contain one of. */
export function brandWords(p: Pick<LookupProduct, "brandName" | "manufacturer">): string[] {
  const out = new Set<string>();
  const first = words(p.brandName).find((w) => !STOP.has(w) && !/^\d/.test(w));
  if (first && !GENERIC.has(first) && first.length >= 2) out.add(first);
  const store = storeBrandFor(p.manufacturer);
  if (store) {
    const w = words(store.replace(/\(.*\)/, "")).find((x) => !STOP.has(x));
    if (w) out.add(w);
  } else if (p.manufacturer) {
    const w = words(displayManufacturer(p.manufacturer)).find((x) => !STOP.has(x) && x.length >= 3);
    if (w && !GENERIC.has(w)) out.add(w);
  }
  return [...out];
}

export type Verdict = { ok: true } | { ok: false; reason: string };
const no = (reason: string): Verdict => ({ ok: false, reason });

/** Checks any match type must pass: the title may not contradict strength or SPF. */
export function contradicts(p: LookupProduct, title: string): string | null {
  const strengths = Object.values(p.strengths ?? {});
  const stated = percentsIn(title);
  if (strengths.length > 0 && stated.some((x) => !strengths.some((s) => samePct(s, x)))) return "strength";
  const a = spfOf(p.brandName);
  const b = spfOf(title);
  if ((a !== null || b !== null) && a !== b) return "spf";
  return null;
}

function nameCoverage(p: LookupProduct, titleWords: Set<string>): number {
  const tokens = nameTokens(p.brandName);
  if (tokens.length === 0) return 1;
  return tokens.filter((t) => titleWords.has(t)).length / tokens.length;
}

function hasBrand(p: LookupProduct, titleWords: Set<string>): boolean {
  return brandWords(p).some((b) => titleWords.has(b) || titleWords.has(stem(b)));
}

/** Light check for an NDC-derived barcode hit: no contradiction, and brand or most of the name agrees. */
export function verifyDerivedBarcode(p: LookupProduct, title: string): Verdict {
  const c = contradicts(p, title);
  if (c) return no(c);
  const tw = new Set(words(title).map(stem));
  if (hasBrand(p, tw) || nameCoverage(p, tw) >= 0.6) return { ok: true };
  return no("brand");
}

/** The strict check for a keyword-search hit. */
export function verifyKeywordMatch(p: LookupProduct, title: string): Verdict {
  if (!title.trim()) return no("empty");
  const tw = new Set(words(title).map(stem));
  if (!hasBrand(p, tw)) return no("brand");
  if (nameCoverage(p, tw) < 0.75) return no("name");

  const c = contradicts(p, title);
  if (c) return no(c);
  const strengths = Object.values(p.strengths ?? {});
  if (strengths.length === 1 && !percentsIn(title).some((x) => samePct(x, strengths[0]))) return no("strength");

  const ours = formsIn(`${p.dosageForm ?? ""} ${p.brandName}`);
  const theirs = formsIn(title);
  if (ours.size > 0 && theirs.size > 0 && ![...theirs].some((f) => ours.has(f))) return no("form");

  const variant = VARIANT.exec(normalize(title));
  if (variant && !VARIANT.test(normalize(p.brandName))) return no("variant");

  const a = productSize(p);
  const b = parseSizeFromTitle(title);
  if (!a || !b || !sizesAgree(a, b)) return no("size");
  return { ok: true };
}

/** Space-separated keywords for a search: the product name, plus its brand word when the name lacks it. */
export function searchKeywords(p: LookupProduct): string {
  const name = words(p.brandName).filter((w) => !STOP.has(w));
  const brand = brandWords(p).filter((b) => !name.includes(b));
  return [...brand, ...name].join(" ").slice(0, 200);
}
