import { ACTIVE_DEFINITIONS } from "./actives";
import typoAliases from "./ingredient-aliases.json";
import synonymGroups from "./ingredient-synonyms.json";
import uniiLabelNames from "./unii-label-names.json";

// Turns the free-text ingredient lists in the catalog CSVs (FDA "Inactive
// ingredients ..." lines, OBF/brand INCI lists) into normalized ingredients,
// so "Aqua", "WATER/EAU (AQUA)" and "Water" all land on one /ingredient/water
// page. Purely deterministic -- no guessing about what an unfamiliar name
// "probably means": two spellings only merge when the normalization rules
// below (or a tracked active's own synonym list) say they're the same string.
// The exceptions are ingredient-aliases.json, label misspellings folded into
// their correct spelling by an offline, precision-first review pass, and
// ingredient-synonyms.json, other names for the same substance (see
// canonicalSlug); both are committed, so the seed itself stays deterministic.

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

// Cyrillic letters that look like Latin ones, typed into otherwise Latin
// names on some imported packs ("Аqua" with a Cyrillic А).
const HOMOGLYPHS: Record<string, string> = { а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x", і: "i", ј: "j", ѕ: "s" };

function fold(s: string): string {
  const lower = s.toLowerCase();
  const latin = /[a-z]/.test(lower) ? lower.replace(/[аеорсухіјѕ]/g, (c) => HOMOGLYPHS[c]) : lower;
  return latin
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

// A comma between two digits is a chemical locant ("1,2-Hexanediol",
// "2-Bromo-2-Nitropropane-1,3-Diol"), not a list separator.
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    const locant = /\d/.test(chars[i - 1] ?? "") && /\d/.test(chars[i + 1] ?? "");
    if (ch === "," && depth === 0 && !locant) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// The organic footnote, alone or run onto the last ingredient before it:
// "Shea Butter Denotes Certified Organic Ingredient", "* Organic Ingredients".
const ORGANIC_FOOTNOTE = /\s*\*?\s*(?:denotes|indicates)?\s*(?:certified|cerified)?\s*organic\s+ingredients?\s*$/i;

function cleanToken(t: string): string {
  return t
    .replace(/\s+/g, " ")
    .replace(ORGANIC_FOOTNOTE, "")
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
// The same warnings and footnotes in the French, Spanish and Portuguese text
// of imported packs ("tenir hors de portée des enfants", "no ingerir",
// "*ingrédients issus de l'agriculture biologique"), which otherwise got
// ingredient pages of their own.
const NOT_AN_INGREDIENT_INTL =
  /\b(?:hors de port|fuera del? alcance|em caso de|en caso de|n[aã]o ingerir|no ingerir|n-o ingerir|issus? de l|agriculture biologique|agricultura (?:biol|ecol)|agents? de surface)/i;
// A bare word left behind when a list is cut mid-name ("... Citric, Acid")
// or by a company suffix: never an ingredient.
const BARE_FRAGMENTS = new Set(["acid", "acid acid", "inc", "llc", "ltd", "s.l", "s.a"]);
// The labeler's address that some FDA labels run straight into the list:
// "... Corn starch. Manufactured For/ Distributed By: Marlex Pharmaceuticals,
// Inc. New Castle, DE". Nothing after it is an ingredient, up to the next
// kit part ("| Inactive Ingredients ...") if there is one.
const LABELER_TAIL = /\b(?:manufactured|distributed|marketed|packed|made)\s+(?:for|by)\b[\s\S]*?(?=\||\b(?:inactive|other)\s+ingredients\b|$)/gi;

function looksLikeIngredient(t: string): boolean {
  if (t.length < 3 || t.length > 100 || !/[a-z]/i.test(t)) return false;
  if (NOT_AN_INGREDIENT.test(t) || NOT_AN_INGREDIENT_INTL.test(t)) return false;
  if (BARE_FRAGMENTS.has(t.toLowerCase())) return false;
  const words = t.replace(/\([^)]*\)|\[[^\]]*\]/g, " ").trim().split(/\s+/);
  return words.length <= 8;
}

export function splitIngredientList(text: string | null | undefined): string[] {
  if (!text) return [];
  const normalized = decodeEntities(text)
    .replace(LABELER_TAIL, "")
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
  return ACTIVE_BY_KEY.get(key)?.id ?? plainSlug(key);
}

function plainSlug(key: string): string {
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

// FDA substance-registry names carry form qualifiers after a comma
// ("LACTIC ACID, UNSPECIFIED FORM", "TOCOPHEROL, DL-") that labels never print.
const SRS_QUALIFIER = /,\s*(?:unspecified(?:\s+form)?|dl-|d-|l-|\(\+\/-\)-?|\(\+\)-?|\(-\)-?)\s*$/i;

export function cleanStructuredName(raw: string): string {
  return cleanToken(decodeEntities(raw).replace(SRS_QUALIFIER, ""));
}

const UNII_LABEL_NAMES: Record<string, string> = uniiLabelNames;

// Structured lists (the SPL's <ingredient classCode="IACT"> names, from
// tools/catalog_pipeline/fetch_dailymed_inactive.py): every entry is already
// one ingredient, so nothing is split on commas ("SODIUM PHOSPHATE, DIBASIC"
// is one substance). Same keys/slugs as parseIngredients, so a structured
// "GLYCERIN" and a label's "glycerin" land on the same ingredient page.
// Registry names that labels spell differently ("VITAMIN A PALMITATE" for
// retinyl palmitate, "EDETATE DISODIUM" for disodium EDTA) are swapped for
// the label spelling by UNII code (unii-label-names.json, learned from the
// openFDA rows that have both -- tools/catalog_pipeline/build_unii_label_names.py),
// so they reach the same ingredient page and the pregnancy matcher.
export function parseIngredientNames(names: string[], uniis: string[] = []): ParsedIngredient[] {
  const seen = new Set<string>();
  const out: ParsedIngredient[] = [];
  for (const [i, name] of names.entries()) {
    const raw = cleanStructuredName(UNII_LABEL_NAMES[uniis[i] ?? ""] ?? name);
    if (!raw || !/[a-z]/i.test(raw)) continue;
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
  "HCL", "PABA", "MCT", "FD&C", "D&C", "AHA", "PHA", "SPF", "II", "III", "IV", "NP", "AP", "EOP", "AS", "AG", "HP", "EG",
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
  "iron-oxides": ["CI 77491 (red)", "CI 77492 (yellow)", "CI 77499 (black)", "Ferric Oxide", "Ferrosoferric Oxide"],
};

const alnum = (s: string) => fold(s).replace(/[^a-z0-9]/g, "");

export function aliasesFor(
  slug: string,
  name: string,
  variants: Map<string, number>,
  limit = 8,
  // spellings of the names folded in by sameSubstance ("Shea Butter",
  // "FD&C Yellow No. 5"): their numbers are part of the name, not a code
  otherNames: Map<string, number> = new Map(),
): string[] {
  if (FIXED_ALIASES[slug]) return FIXED_ALIASES[slug];
  const score = new Map<string, { label: string; n: number }>();
  const add = (label: string, n: number, digitsOk = false) => {
    const cleaned = label.replace(/\s+/g, " ").replace(/^[\s*.,:;-]+|[\s.,:;-]+$/g, "");
    if (cleaned.length < 3 || (!digitsOk && /\d/.test(cleaned)) || !/[a-z]/i.test(cleaned)) return;
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
  for (const [raw, n] of otherNames) add(raw.replace(/\([^)]*\)|\[[^\]]*\]/g, " "), n, true);
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

// Other names for one and the same substance, not misspellings: an INCI name
// and its common or FDA registry name ("Butyrospermum Parkii Butter" / "Shea
// Butter", "Cetearyl Alcohol" / "Cetostearyl Alcohol"), a colorant's CI
// number ("CI 77891" for titanium dioxide), plurals, hydrates and "organic"
// prefixes. ingredient-synonyms.json maps each page to the slugs folded into
// it; the pairs come from the SPL rows' UNII codes (two names, one FDA
// substance code) and were each reviewed by hand. Botanicals that differ by
// plant part, polymers that differ by grade (carbomers, laureth-n) and
// mixtures (tocopherols, light mineral oil) stay apart. The label's own
// wording stays on each product's ingredient line.
const SYNONYM_SLUGS = new Map<string, string>();
for (const [page, others] of Object.entries(synonymGroups as Record<string, string[]>)) {
  for (const other of others) SYNONYM_SLUGS.set(other, page);
}
// Iron oxides: the INCI name covers the red, yellow and black pigments, so
// "Ferric Oxide Red", "Ferrosoferric Oxide", "CI 77491", "Iron Oxides CI
// 77499" and "CI 77491/CI 77492/CI 77499" all share its page. Iron compounds that are
// something else (Ferric Ferrocyanide is Prussian blue, Iron Titanium Oxide a
// different pigment) and a bare "Iron" are left alone.
const IRON_OXIDE_CI = /^(?:iron-oxides?-)?(?:(?:c-?i|c1)-?7749[129]-?)+(?:iron-oxides?)?(?:-f-i-l)?$/;

// Certified color additives: "FD&C Yellow No. 5", "Yellow 5", "CI 19140
// Yellow 5" and "Yellow 5 (CI 19140)" are one dye, under the shorter
// cosmetic-label name. A lake (the dye fixed on an aluminum or calcium base)
// keeps a page of its own, whatever base it names.
const CERTIFIED_COLOR =
  /^(?:ci-?\d{5}-)?(?:(?:ext-)?(?:fd-and-c|d-and-c)-)?(red|yellow|blue|green|orange|violet)-(?:no-)?(\d+)(-(?:aluminum-|calcium-|al-|ca-)?lake)?(?:-ci-?\d{5})?$/;
// A pigment's name with its own CI number run on ("CI 77891 / Titanium
// Dioxide", "Mica CI 77019"). Another number means a second pigment in the
// same entry, so that one stays apart.
const PIGMENT_CI: Record<string, string> = {
  "titanium-dioxide": "77891", mica: "77019", carmine: "75470", "bismuth-oxychloride": "77163",
  ultramarines: "77007", "manganese-violet": "77742", "ferric-ferrocyanide": "77510", "tin-oxide": "77861",
  "chromium-oxide-greens": "77288", "chromium-hydroxide-green": "77289",
};
const NAMED_PIGMENT = new RegExp(`^(?:ci-?(\\d{5})-)?(${Object.keys(PIGMENT_CI).join("|")})(?:-ci-?(\\d{5}))?$`);

export function sameSubstance(slug: string): string {
  if (IRON_OXIDE_CI.test(slug)) return "iron-oxides";
  const color = CERTIFIED_COLOR.exec(slug);
  if (color) return `${color[1]}-${color[2]}${color[3] ? "-lake" : ""}`;
  const pigment = NAMED_PIGMENT.exec(slug);
  if (pigment && [pigment[1], pigment[3]].every((ci) => !ci || ci === PIGMENT_CI[pigment[2]])) return pigment[2];
  return SYNONYM_SLUGS.get(slug) ?? slug;
}

const ACTIVE_IDS = new Set(ACTIVE_DEFINITIONS.map((a) => a.id));

// The slug a tracked active's other names would get as plain ingredients
// ("bis-ethylhexyloxyphenol-methoxyphenyl-triazine", "benzophenone-4") -> the
// active's id, so links made before the active was tracked still resolve.
const ACTIVE_NAME_SLUGS = new Map<string, string>();
for (const a of ACTIVE_DEFINITIONS) {
  for (const name of a.synonyms) {
    const plain = plainSlug(ingredientKey(name));
    if (plain && plain !== a.id && !ACTIVE_IDS.has(plain) && !ACTIVE_NAME_SLUGS.has(plain)) ACTIVE_NAME_SLUGS.set(plain, a.id);
  }
}

// A misspelled label's slug -> the slug of its correct spelling, and another
// name for the same substance -> its shared page (sameSubstance). Tracked
// actives are never treated as misspellings of anything.
export function canonicalSlug(slug: string): string {
  if (ACTIVE_IDS.has(slug)) return slug;
  const spelled = sameSubstance(spellingSlug(slug));
  return ACTIVE_NAME_SLUGS.get(spelled) ?? spelled;
}

// a brand's formula code run onto the name: "Phenoxyethanol <ILN45635>"
const withoutCode = (slug: string) => slug.replace(/-iln\d+$/, "");

function spellingSlug(slug: string): string {
  const bare = withoutCode(slug);
  return TYPO_ALIASES[bare] ?? bare;
}

// A correctly spelled other name for a substance ("Shea Butter"), as opposed
// to a misspelling, so the seed can show it under "also listed as".
export function isOtherName(slug: string): boolean {
  if (ACTIVE_IDS.has(slug) || TYPO_ALIASES[withoutCode(slug)]) return false;
  const bare = withoutCode(slug);
  return sameSubstance(bare) !== bare;
}
