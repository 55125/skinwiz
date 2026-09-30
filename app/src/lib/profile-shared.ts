// Pure profile logic shared by server and client components (no DB / cookies).
export const PROFILE_COOKIE = "sw_profile";
export const PROFILE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const MAX_LIST = 30;

export const SKIN_TYPES = [
  { id: "oily", label: "Oily" },
  { id: "dry", label: "Dry" },
  { id: "combination", label: "Combination" },
  { id: "normal", label: "Normal" },
  { id: "sensitive", label: "Sensitive" },
] as const;

// Booster patterns: exact slug, "prefix*", or "*contains*" (ingredient slugs
// come in many salt/ester variants, e.g. ceramide-np/-ap/-eop).
export const PROFILE_CONCERNS: { id: string; label: string; boosters: string[] }[] = [
  { id: "acne", label: "Acne & breakouts", boosters: ["benzoyl-peroxide", "salicylic-acid", "adapalene", "azelaic-acid", "niacinamide", "sulfur"] },
  { id: "fungal-acne", label: "Fungal acne", boosters: [] },
  { id: "dark-spots", label: "Dark spots & tone", boosters: ["vitamin-c", "alpha-arbutin", "tranexamic-acid", "niacinamide", "azelaic-acid", "*ascorb*"] },
  { id: "aging", label: "Fine lines & aging", boosters: ["retinol-cosmetic", "retinal", "bakuchiol", "*peptide*", "*tripeptide*", "vitamin-c", "adapalene"] },
  { id: "dryness", label: "Dryness & barrier", boosters: ["*hyaluron*", "ceramide*", "squalane", "panthenol", "glycerin", "colloidal-oatmeal"] },
  { id: "redness", label: "Redness & irritation", boosters: ["centella-asiatica", "azelaic-acid", "panthenol", "allantoin", "colloidal-oatmeal"] },
  { id: "sun", label: "Sun protection", boosters: ["zinc-oxide", "titanium-dioxide", "avobenzone", "octocrylene", "homosalate"] },
];

function boosterHit(pattern: string, id: string): boolean {
  if (pattern.startsWith("*") && pattern.endsWith("*")) return id.includes(pattern.slice(1, -1));
  if (pattern.endsWith("*")) return id.startsWith(pattern.slice(0, -1));
  return id === pattern;
}
function hitsFor(patterns: string[], ids: Iterable<string>): string[] {
  const list = [...ids];
  return patterns.flatMap((p) => {
    const hit = list.find((id) => boosterHit(p, id));
    return hit ? [hit] : [];
  });
}

export type Profile = { skin: string | null; concerns: string[]; likes: string[]; dislikes: string[] };
export const EMPTY_PROFILE: Profile = { skin: null, concerns: [], likes: [], dislikes: [] };

const SKIN_IDS = new Set<string>(SKIN_TYPES.map((s) => s.id));
const CONCERN_IDS = new Set(PROFILE_CONCERNS.map((c) => c.id));
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

function slugList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === "string" && SLUG.test(x)))].slice(0, MAX_LIST);
}

export function sanitizeProfile(input: unknown): Profile {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const dislikes = slugList(o.dislikes);
  return {
    skin: typeof o.skin === "string" && SKIN_IDS.has(o.skin) ? o.skin : null,
    concerns: Array.isArray(o.concerns) ? [...new Set(o.concerns.filter((c): c is string => typeof c === "string" && CONCERN_IDS.has(c)))] : [],
    dislikes,
    likes: slugList(o.likes).filter((l) => !dislikes.includes(l)),
  };
}

// s=oily|c=acne,aging|l=a,b|d=x -- only [a-z0-9,-=|] so no cookie escaping.
export function serializeProfile(p: Profile): string {
  return `s=${p.skin ?? ""}|c=${p.concerns.join(",")}|l=${p.likes.join(",")}|d=${p.dislikes.join(",")}`;
}

export function parseProfile(raw: string | undefined): Profile {
  if (!raw) return EMPTY_PROFILE;
  const f: Record<string, string> = {};
  for (const part of raw.split("|")) {
    const i = part.indexOf("=");
    if (i > 0) f[part.slice(0, i)] = part.slice(i + 1);
  }
  const list = (s: string | undefined) => (s ? s.split(",").filter(Boolean) : []);
  return sanitizeProfile({ skin: f.s, concerns: list(f.c), likes: list(f.l), dislikes: list(f.d) });
}

export function hasProfile(p: Profile): boolean {
  return !!p.skin || p.concerns.length > 0 || p.likes.length > 0 || p.dislikes.length > 0;
}

// ---- scoring -------------------------------------------------------------

export type ProductIngredient = { id: string; position: number; isActive: boolean };

export type MatchReason = { tone: "good" | "bad"; text: string; points: number };
export type Match = { score: number; label: "Great match" | "Good match" | "Mixed" | "Poor match"; reasons: MatchReason[] };

const SENSITIVE_TRIGGERS: { flag: string; text: string }[] = [
  { flag: "fragrance-free", text: "contains fragrance" },
  { flag: "alcohol-free", text: "contains drying alcohol" },
  { flag: "essential-oil-free", text: "contains essential oils" },
];
const DRY_HELPERS = ["*hyaluron*", "ceramide*", "squalane", "panthenol", "glycerin", "colloidal-oatmeal"];

const BOOSTER_MAX_POSITION = 15;

/**
 * null = can't score (no profile, or no ingredient data on file -- never
 * treated as a middling score).
 */
export function matchProduct(
  product: { freeFromFlags: string[] | null },
  ingredients: ProductIngredient[] | undefined,
  profile: Profile,
  avoidLabels: { id: string; name: string }[],
): Match | null {
  if (!hasProfile(profile) && avoidLabels.length === 0) return null;
  if (!ingredients || ingredients.length === 0) return null;
  const flags = product.freeFromFlags;
  const present = new Set(ingredients.map((i) => i.id));
  const meaningful = new Set(ingredients.filter((i) => i.isActive || (i.position > 0 && i.position <= BOOSTER_MAX_POSITION) || i.position <= 0).map((i) => i.id));

  let score = 60;
  let cap = 100;
  const reasons: MatchReason[] = [];
  const add = (points: number, text: string) => {
    score += points;
    reasons.push({ tone: points >= 0 ? "good" : "bad", text, points });
  };

  if (flags) {
    const conflicts = avoidLabels.filter((a) => !flags.includes(a.id));
    for (const c of conflicts.slice(0, 3)) add(-25, `Contains ${c.name}, which you avoid`);
    if (conflicts.length > 0) cap = Math.min(cap, 35);
  }

  const dislikeHits = profile.dislikes.filter((d) => present.has(d));
  for (const d of dislikeHits.slice(0, 2)) add(-20, `Contains ${prettify(d)}, which you dislike`);
  if (dislikeHits.length > 0) cap = Math.min(cap, 40);

  const likeHits = profile.likes.filter((l) => present.has(l));
  for (const l of likeHits.slice(0, 3)) add(8, `Contains ${prettify(l)}, which you like`);

  if (profile.skin === "sensitive" && flags) {
    const bad = SENSITIVE_TRIGGERS.filter((t) => !flags.includes(t.flag));
    for (const t of bad) add(-12, `Sensitive skin: ${t.text}`);
    if (bad.length === 0) add(8, "Sensitive skin: no fragrance, drying alcohol or essential oils");
  }
  if (profile.skin === "oily") {
    if (present.has("petrolatum") || present.has("mineral-oil")) add(-6, "Oily skin: heavy occlusive (petrolatum / mineral oil)");
    if (meaningful.has("niacinamide") || meaningful.has("salicylic-acid")) add(5, "Oily skin: contains niacinamide or salicylic acid");
  }
  if (profile.skin === "dry") {
    const helpers = [...new Set(hitsFor(DRY_HELPERS, meaningful))];
    if (helpers.length > 0) add(Math.min(15, helpers.length * 5), `Dry skin: hydrating ingredients (${helpers.slice(0, 3).map(prettify).join(", ")})`);
    if (flags && !flags.includes("alcohol-free")) add(-8, "Dry skin: contains drying alcohol");
  }

  for (const c of PROFILE_CONCERNS) {
    if (!profile.concerns.includes(c.id)) continue;
    if (c.id === "fungal-acne") {
      if (!flags) continue;
      if (flags.includes("fungal-acne-safe")) add(12, "Fungal-acne-safe ingredient list");
      else {
        add(-25, "Contains fungal-acne triggers");
        cap = Math.min(cap, 45);
      }
      continue;
    }
    const hits = [...new Set(hitsFor(c.boosters, meaningful))];
    if (hits.length > 0) add(10 + Math.min(2, hits.length - 1) * 4, `${c.label}: ${hits.slice(0, 3).map(prettify).join(", ")}`);
  }

  const final = Math.max(0, Math.min(cap, Math.round(score), 100));
  const label = final >= 80 ? "Great match" : final >= 65 ? "Good match" : final >= 45 ? "Mixed" : "Poor match";
  reasons.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  return { score: final, label, reasons };
}

export function prettify(slug: string): string {
  return slug.replace(/-cosmetic$/, "").replace(/-/g, " ");
}

export function matchClasses(label: Match["label"]): string {
  switch (label) {
    case "Great match":
      return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400";
    case "Good match":
      return "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-400";
    case "Mixed":
      return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400";
    default:
      return "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400";
  }
}

