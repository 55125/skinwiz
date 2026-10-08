// Pure profile logic shared by server and client components (no DB / cookies).
import { avoidConflicts, type AvoidableProduct } from "@/lib/avoid-shared";
import { RETINOIDS, countsAtAnyPosition } from "@/lib/retinoids";

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
  { id: "aging", label: "Fine lines & aging", boosters: [...RETINOIDS, "bakuchiol", "*peptide*", "*tripeptide*", "vitamin-c"] },
  { id: "dryness", label: "Dryness & barrier", boosters: ["*hyaluron*", "ceramide*", "squalane", "panthenol", "glycerin", "colloidal-oatmeal"] },
  { id: "redness", label: "Redness & irritation", boosters: ["centella-asiatica", "azelaic-acid", "panthenol", "allantoin", "colloidal-oatmeal"] },
  { id: "sun", label: "Sun protection", boosters: ["zinc-oxide", "titanium-dioxide", "avobenzone", "octocrylene", "homosalate"] },
];

export function boosterHit(pattern: string, id: string): boolean {
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

// pregnant / breastfeeding only drive the pregnancy & lactation notices
// (db/pregnancy-lactation.ts); they never change the match score.
export type Profile = { skin: string | null; concerns: string[]; likes: string[]; dislikes: string[]; pregnant: boolean; breastfeeding: boolean };
export const EMPTY_PROFILE: Profile = { skin: null, concerns: [], likes: [], dislikes: [], pregnant: false, breastfeeding: false };

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
    pregnant: o.pregnant === true,
    breastfeeding: o.breastfeeding === true,
  };
}

// s=oily|c=acne,aging|l=a,b|d=x -- only [a-z0-9,-=|] so no cookie escaping.
// |p=1 / |b=1 are appended only when set, so existing cookies parse as-is.
export function serializeProfile(p: Profile): string {
  return `s=${p.skin ?? ""}|c=${p.concerns.join(",")}|l=${p.likes.join(",")}|d=${p.dislikes.join(",")}${p.pregnant ? "|p=1" : ""}${p.breastfeeding ? "|b=1" : ""}`;
}

export function parseProfile(raw: string | undefined): Profile {
  if (!raw) return EMPTY_PROFILE;
  const f: Record<string, string> = {};
  for (const part of raw.split("|")) {
    const i = part.indexOf("=");
    if (i > 0) f[part.slice(0, i)] = part.slice(i + 1);
  }
  const list = (s: string | undefined) => (s ? s.split(",").filter(Boolean) : []);
  return sanitizeProfile({ skin: f.s, concerns: list(f.c), likes: list(f.l), dislikes: list(f.d), pregnant: f.p === "1", breastfeeding: f.b === "1" });
}

/** Whether the profile has anything the match score uses. */
export function hasProfile(p: Profile): boolean {
  return !!p.skin || p.concerns.length > 0 || p.likes.length > 0 || p.dislikes.length > 0;
}

/** Whether there's anything worth keeping in the cookie at all. */
export function hasProfileData(p: Profile): boolean {
  return hasProfile(p) || p.pregnant || p.breastfeeding;
}

// ---- signed-in sync ------------------------------------------------------
// A signed-in person's profile is also saved to their account so it follows
// them to other devices -- except the pregnancy and breastfeeding answers,
// which are health information and stay in this browser's cookie only (the
// privacy policy says so). Everything below is pure so it can be tested.

/** The part of a profile that is saved to an account. */
export function accountPart(p: Profile): Profile {
  return { ...p, pregnant: false, breastfeeding: false };
}

/**
 * The profile to use for a signed-in person: their saved profile, with the
 * pregnancy and breastfeeding answers taken from this browser's cookie.
 */
export function withLocalFlags(saved: Profile, local: Profile): Profile {
  return { ...saved, pregnant: local.pregnant, breastfeeding: local.breastfeeding };
}

/**
 * At sign-in: this browser's profile and the account's become one. Lists are
 * combined; a single-choice field (skin type) keeps the account's value
 * unless it has none; a disliked ingredient always beats a liked one.
 * Pregnancy and breastfeeding come from this browser only.
 */
export function mergeProfiles(saved: Profile | null, local: Profile): Profile {
  if (!saved) return local;
  const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
  return sanitizeProfile({
    skin: saved.skin ?? local.skin,
    concerns: union(saved.concerns, local.concerns),
    likes: union(saved.likes, local.likes),
    dislikes: union(saved.dislikes, local.dislikes),
    pregnant: local.pregnant,
    breastfeeding: local.breastfeeding,
  });
}

// ---- scoring -------------------------------------------------------------

export type ProductIngredient = { id: string; position: number; isActive: boolean };

export type MatchReason = { tone: "good" | "bad"; text: string; points: number };
export type Match = { score: number; label: "Great match" | "Good match" | "Mixed" | "Poor match"; reasons: MatchReason[] };

// Also the listing pages' "Sensitive skin" filter (free-from-filters.tsx).
export const SENSITIVE_SKIN_FREE = ["fragrance-free", "alcohol-free", "essential-oil-free"];

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
  product: AvoidableProduct,
  ingredients: ProductIngredient[] | undefined,
  profile: Profile,
  avoidLabels: { id: string; name: string }[],
): Match | null {
  if (!hasProfile(profile) && avoidLabels.length === 0) return null;
  if (!ingredients || ingredients.length === 0) return null;
  const flags = product.freeFromFlags;
  const present = new Set(ingredients.map((i) => i.id));
  const meaningful = new Set(
    ingredients.filter((i) => i.isActive || i.position <= BOOSTER_MAX_POSITION || countsAtAnyPosition(i.id)).map((i) => i.id),
  );

  let score = 60;
  let cap = 100;
  const reasons: MatchReason[] = [];
  const add = (points: number, text: string) => {
    score += points;
    reasons.push({ tone: points >= 0 ? "good" : "bad", text, points });
  };

  const avoidFound = avoidConflicts(product, avoidLabels.map((a) => a.id));
  if (avoidFound) {
    const named = (ids: string[]) => avoidLabels.filter((a) => ids.includes(a.id));
    const conflicts = named(avoidFound.conflicts);
    for (const c of conflicts.slice(0, 3)) add(-25, `Contains ${c.name}, which you avoid`);
    if (conflicts.length > 0) cap = Math.min(cap, 35);
    const possible = named(avoidFound.possible);
    if (possible.length > 0) {
      add(-10, `Undisclosed fragrance may contain ${possible[0].name}${possible.length > 1 ? ` and ${possible.length - 1} more` : ""}, which you avoid`);
      cap = Math.min(cap, 60);
    }
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

