import { ACTIVE_DEFINITIONS } from "./actives";
import typoAliases from "./ingredient-aliases.json";

// Turns the free-text ingredient lists in the catalog CSVs (FDA "Inactive
// ingredients ..." lines, OBF/brand INCI lists) into normalized ingredients,
// so "Aqua", "WATER/EAU (AQUA)" and "Water" all land on one /ingredient/water
// page. Purely deterministic -- no guessing about what an unfamiliar name
// "probably means": two spellings only merge when the normalization rules
// below (or a tracked active's own synonym list) say they're the same string.
// The one exception is ingredient-aliases.json: label misspellings folded into
// their correct spelling by an offline, precision-first review pass (see
// canonicalSlug) and committed, so the seed itself stays deterministic.

export type ParsedIngredient = { raw: string; slug: string; key: string };

const WATER_WORDS = new Set(["water", "aqua", "eau", "agua"]);
const FRAGRANCE_WORDS = new Set(["fragrance", "parfum", "perfume"]);

const ALIASES: Record<string, string> = {
  "caprylic/capric triglycerides": "caprylic/capric triglyceride",
  "alcohol denat": "alcohol denat",
  "sodium hyaluronic acid": "sodium hyaluronate",
};

const SPELLINGS: [RegExp, string][] = [
  [/hydrolysed/g, "hydrolyzed"],
  [/sulphate/g, "sulfate"],
  [/sulphur/g, "sulfur"],
  [/sulphide/g, "sulfide"],
];

const ACTIVE_BY_KEY = new Map<string, { id: string; name: string }>();

function fold(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

for (const a of ACTIVE_DEFINITIONS) {
  for (const name of [a.canonicalName, ...a.synonyms]) {
    const k = fold(name).replace(/\s+/g, " ").trim();
    if (!ACTIVE_BY_KEY.has(k)) ACTIVE_BY_KEY.set(k, { id: a.id, name: a.canonicalName });
  }
}

export const FIXED_DISPLAY_NAMES: Record<string, string> = {
  water: "Water",
  fragrance: "Fragrance (Parfum)",
};

// Text that precedes the list itself: "Inactive ingredients:", "Ingredients -"
const LIST_LABEL = /^\s*(?:inactive|other|active)?\s*ingredients?\s*(?:list)?\s*[:\-–]?\s*/i;

function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function cleanToken(t: string): string {
  return t
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:and|&|may contain|\+\/-|\(\+\/-\))[\s:]+/i, "")
    .replace(/^\(\+\/-\)\s*/, "")
    .replace(/\s*\(?\d+(?:\.\d+)?\s*%\)?\s*$/, "")
    .replace(/[*†‡§¹²³]+$/g, "")
    .replace(/^([^[]*)\]+$/, "$1")
    .replace(/^([^(]*)\)+$/, "$1")
    .replace(/^[\s.:;\-–]+|[\s.:;\-–]+$/g, "")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;?/gi, "<")
    .replace(/&gt;?/gi, ">")
    .replace(/&quot;?/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&amp;?/gi, "&");
}

// Brand pages and OBF entries sometimes bury disclaimers/packaging text in
// the list; those aren't ingredients and shouldn't get pages.
const NOT_AN_INGREDIENT =
  /\b(?:please|contains? one or more|seek medical|made in|ingredient lists?|external use|keep out|dermatologist|packaging|updated regularly|www\.|https?:|batch|e\.g\.|distributed|manufactured)/i;

function looksLikeIngredient(t: string): boolean {
  if (t.length < 3 || t.length > 100 || !/[a-z]/i.test(t)) return false;
  if (NOT_AN_INGREDIENT.test(t)) return false;
  const words = t.replace(/\([^)]*\)|\[[^\]]*\]/g, " ").trim().split(/\s+/);
  return words.length <= 8;
}

export function splitIngredientList(text: string | null | undefined): string[] {
  if (!text) return [];
  const normalized = decodeEntities(text)
    .replace(/\\n(?=\\n|[A-Z])/g, ",")
    .replace(/[•·●▪|]/g, ",")
    .replace(/;/g, ",")
    .replace(/\r?\n/g, ",")
    .replace(LIST_LABEL, "")
    // "[+/- CI 77891, ...]" / "(+/-) ..." colorant groups: unwrap so the
    // members split like any other ingredient
    .replace(/[[(]\s*(?:\+\/-|may contain\s*:?)\s*[\])]?/gi, ",")
    .replace(/\+\/-|\bmay contain\s*:?/gi, ",")
    // a second label mid-text ("Active ingredients ... Inactive ingredients: ...")
    .replace(/\b(?:inactive|other)?\s*ingredients?\s*:/gi, ",")
    // asterisk-marked items run together: "*Sunflower Oil *Cocoa Butter"
    .replace(/\s\*(?=[A-Za-z])/g, ",");
  return splitTopLevel(normalized)
    .flatMap((t) => t.split(/\.\s+(?=[A-Z*])/))
    .filter((t) => !NOT_AN_INGREDIENT.test(t))
    // "External Cream: Benzoic Acid", "/Peut Contenir: Iron Oxides" -- the
    // part before a colon is a label, not an ingredient
    .map((t) => cleanToken(t.includes(":") ? t.slice(t.lastIndexOf(":") + 1) : t))
    .filter(looksLikeIngredient);
}

export function ingredientKey(raw: string): string {
  let s = fold(raw).replace(/\\/g, "/");
  const stripped = s.replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
  s = stripped || s.replace(/[()[\]]/g, " ").replace(/\s+/g, " ").trim();
  s = s
    .replace(/\s*\/\s*/g, "/")
    .replace(/^[\s.:;\-–]+|[\s.:;\-–]+$/g, "")
    .replace(/\s+/g, " ");
  for (const [re, to] of SPELLINGS) s = s.replace(re, to);
  const parts = s.split("/");
  if (parts.every((p) => WATER_WORDS.has(p.trim()))) return "water";
  if (parts.every((p) => FRAGRANCE_WORDS.has(p.trim()))) return "fragrance";
  if (WATER_WORDS.has(s)) return "water";
  if (FRAGRANCE_WORDS.has(s)) return "fragrance";
  return ALIASES[s] ?? s;
}

export function slugFor(key: string): string {
  const active = ACTIVE_BY_KEY.get(key);
  if (active) return active.id;
  return key
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

// A product lists "Water" and "Aqua" once each in the wild; keep the first.
export function parseIngredients(text: string | null | undefined): ParsedIngredient[] {
  const seen = new Set<string>();
  const out: ParsedIngredient[] = [];
  for (const raw of splitIngredientList(text)) {
    const key = ingredientKey(raw);
    const slug = key ? slugFor(key) : "";
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ raw, slug, key });
  }
  return out;
}

const KEEP_UPPER = new Set([
  "PEG", "PPG", "EDTA", "BHT", "BHA", "DMDM", "PVP", "VP", "PCA", "MEA", "DEA", "TEA", "CI", "SD", "MIPA", "UV",
  "HCL", "PABA", "MCT", "AHA", "PHA", "SPF", "II", "III", "IV", "NP", "AP", "EOP", "AS", "AG", "HP", "EG",
]);

function fixAcronyms(s: string): string {
  return s.replace(/[A-Za-z]+/g, (w) => (KEEP_UPPER.has(w.toUpperCase()) ? w.toUpperCase() : w));
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[a-z0-9&']+/g, (w) => {
      const up = w.toUpperCase();
      if (KEEP_UPPER.has(up) || /^\d/.test(w)) return up;
      return w[0].toUpperCase() + w.slice(1);
    });
}

// Most common mixed-case spelling wins; an ALL-CAPS/all-lowercase-only name
// (FDA labels) gets title-cased instead of shown shouting.
export function pickDisplayName(slug: string, variants: Map<string, number>): string {
  const active = [...ACTIVE_BY_KEY.values()].find((a) => a.id === slug);
  if (active) return active.name;
  if (FIXED_DISPLAY_NAMES[slug]) return FIXED_DISPLAY_NAMES[slug];
  const ranked = [...variants.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length);
  const isMixed = (s: string) => s !== s.toUpperCase() && s !== s.toLowerCase();
  const tidy = (v: string) =>
    v.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").replace(/\s+([,/])/g, "$1").trim();
  // "a-Arbutin" is legitimately lowercase-led; "amur cork tree (..." is just sloppy
  const sloppy = (v: string) => /^[a-z]{3,}/.test(v);
  const mixed = ranked.find(([v]) => isMixed(v) && !sloppy(v));
  if (mixed) return fixAcronyms(tidy(mixed[0]));
  return titleCase(tidy(ranked[0][0]));
}

const ALIAS_CONTENT_STOPLIST = new Set([
  "nano", "organic", "preservative", "emollient", "vegetable", "vegetal", "natural", "thickener", "solvent",
  "skin conditioner", "skin-conditioner", "anhydrous", "ph modifiers", "ph adjuster", "colorant",
  "non-gmo", "non gmo", "derived", "sunflower derived", "coconut derived", "fractionated coconut oil",
]);

// Other names an ingredient is listed under: its own spelling variants with
// annotations removed ("Ethylhexyl Salicylate" for octisalate), plus a
// parenthetical common name when it recurs ("Vitamin E" for tocopherol).
// One-off codes, batch numbers and "(nano)"-style notes are left out.
const FIXED_ALIASES: Record<string, string[]> = {
  water: ["Aqua", "Eau"],
  fragrance: ["Parfum", "Perfume"],
};

const alnum = (s: string) => fold(s).replace(/[^a-z0-9]/g, "");

export function aliasesFor(slug: string, name: string, variants: Map<string, number>, limit = 8): string[] {
  if (FIXED_ALIASES[slug]) return FIXED_ALIASES[slug];
  const score = new Map<string, { label: string; n: number }>();
  const add = (label: string, n: number) => {
    const cleaned = label.replace(/\s+/g, " ").replace(/^[\s*.,:;-]+|[\s.,:;-]+$/g, "");
    if (cleaned.length < 3 || /\d/.test(cleaned) || !/[a-z]/i.test(cleaned)) return;
    if (ALIAS_CONTENT_STOPLIST.has(cleaned.toLowerCase())) return;
    const k = fold(cleaned);
    const cur = score.get(k);
    if (cur) cur.n += n;
    else score.set(k, { label: cleaned, n });
  };
  const contents = new Map<string, number>();
  for (const [raw, n] of variants) {
    add(raw.replace(/\([^)]*\)|\[[^\]]*\]/g, " "), n);
    for (const m of raw.matchAll(/[([]([^)\]]+)[)\]]/g)) contents.set(m[1], (contents.get(m[1]) ?? 0) + n);
  }
  for (const [c, n] of contents) if (n >= 5 && c.length <= 30) add(c, n);
  const own = alnum(name);
  const singles = new Set([...score.values()].filter((v) => !v.label.includes("/")).map((v) => alnum(v.label)));
  return [...score.entries()]
    .filter(([, v]) => alnum(v.label) !== own)
    // "Aqua/Water/Eau"-style joins add nothing over the names they join
    .filter(([, v]) => !v.label.includes("/") || !v.label.split("/").every((p) => singles.has(alnum(p)) || alnum(p) === own))
    .sort((a, b) => b[1].n - a[1].n)
    .map(([, v]) => (v.label === v.label.toUpperCase() || v.label === v.label.toLowerCase() ? titleCase(v.label) : v.label))
    .filter((v, i, arr) => arr.findIndex((o) => fold(o) === fold(v)) === i)
    .slice(0, limit);
}

const TYPO_ALIASES: Record<string, string> = typoAliases;
const ACTIVE_IDS = new Set(ACTIVE_DEFINITIONS.map((a) => a.id));

// A misspelled label's slug -> the slug of its correct spelling. Tracked
// actives are never treated as misspellings of anything.
export function canonicalSlug(slug: string): string {
  return ACTIVE_IDS.has(slug) ? slug : (TYPO_ALIASES[slug] ?? slug);
}
