// Clinical ordering and exclusions for the concern pages (/concern/[slug]).
// Pure rules here; listing-rules-index.ts applies them to the catalog. These
// are ranking calls, not product judgments: an excluded or lower-ranked
// product keeps its own page and still shows up in search and /browse.
//
//  - Dry skin & eczema leaves out topical antihistamines and antifungals.
//    Topical diphenhydramine is a common cause of allergic contact
//    dermatitis and isn't recommended for eczema; antifungals treat a
//    different problem. (AAD, "Eczema: self-care"; AAD atopic dermatitis
//    guidelines, 2023.)
//  - Diaper-area products rank below general eczema care and are labeled.
//  - Sun protection ranks dedicated broad-spectrum SPF 30+ sunscreens
//    first, as the AAD recommends; makeup with SPF and anything under
//    SPF 30 go below. (AAD, "How to select a sunscreen".)
//  - A stated strength above the OTC monograph maximum (e.g. salicylic acid
//    2.88% for acne) is kept off concern listings: it's usually a labeling
//    error, and the product page says so.
import { MONOGRAPH_RANGES } from "@/db/monograph-ranges";

export const ECZEMA_CONCERN = "dry-skin-eczema";
export const SUN_CONCERN = "sun-protection";

// Active ids (db/actives.ts) left out of the eczema listing.
export const ECZEMA_EXCLUDED_ACTIVES = [
  "diphenhydramine",
  "clotrimazole",
  "miconazole-nitrate",
  "tolnaftate",
  "terbinafine",
  "butenafine",
  "undecylenic-acid",
  "ketoconazole",
];
// The same, by name, for listings whose active wasn't recognized.
export const ECZEMA_EXCLUDED_TEXT = /\b(diphenhydramine|clotrimazole|miconazole|tolnaftate|terbinafine|butenafine|undecylenic|ketoconazole)\b/i;

export const DIAPER_RE = /\b(diaper|nappy|nappies)\b/i;

export const MAKEUP_RE =
  /\b(foundation|lipstick|lip ?gloss|lip ?balm|lip ?colou?r|concealer|[bc]c ?cream|primer|bronzer|blush|cushion|make-?up|mascara|eye ?shadow|powder|compact)\b/i;

export type RankInput = {
  concernId: string;
  brandName: string;
  activeIds: string[];
  activeIngredientText?: string | null;
  dosageForm?: string | null;
  strengths?: Record<string, number> | null;
  /** From the FDA label: carries the broad-spectrum SPF 15+ directions / the sunburn-only alert. */
  label?: { broadSpectrum15: boolean; sunburnOnly: boolean } | null;
};

export function isDiaperProduct(name: string): boolean {
  return DIAPER_RE.test(name);
}

export function spfInName(name: string): number | null {
  const values = [...name.matchAll(/\bspf\s*-?\s*(\d{1,3})\b/gi)].map((m) => parseInt(m[1], 10));
  return values.length ? Math.max(...values) : null;
}

/** An active stated above what its OTC monograph permits. */
export function aboveMonograph(strengths: Record<string, number> | null | undefined): boolean {
  if (!strengths) return false;
  return Object.entries(strengths).some(([id, pct]) => {
    const range = MONOGRAPH_RANGES[id];
    return !!range && typeof pct === "number" && pct > range.max + 1e-9;
  });
}

/** Left off this concern's listing altogether. */
export function excludedFromConcern(p: RankInput): boolean {
  if (aboveMonograph(p.strengths)) return true;
  if (p.concernId === ECZEMA_CONCERN) {
    if (p.activeIds.some((id) => ECZEMA_EXCLUDED_ACTIVES.includes(id))) return true;
    if (p.activeIngredientText && ECZEMA_EXCLUDED_TEXT.test(p.activeIngredientText.slice(0, 300))) return true;
  }
  return false;
}

/** 0 ranks first. Only the eczema and sun pages have tiers; everything else is 0. */
// Sunscreen filters: on the eczema page, a product that has them is a lip
// balm or a day cream with SPF, not eczema care.
export const SUNSCREEN_ACTIVES = ["avobenzone", "octinoxate", "octisalate", "octocrylene", "homosalate", "oxybenzone", "ensulizole", "meradimate"];

export function concernTier(p: RankInput): 0 | 1 | 2 {
  if (p.concernId === ECZEMA_CONCERN) {
    const offTopic = /\blip\b|chapstick/i.test(p.brandName) || p.activeIds.some((id) => SUNSCREEN_ACTIVES.includes(id));
    return isDiaperProduct(p.brandName) || offTopic ? 1 : 0;
  }
  if (p.concernId !== SUN_CONCERN) return 0;
  const spf = spfInName(p.brandName);
  const makeup = MAKEUP_RE.test(p.brandName) || p.dosageForm?.toUpperCase() === "LIPSTICK";
  if (makeup || (spf !== null && spf < 30) || p.label?.sunburnOnly) return 2;
  const broad = p.label?.broadSpectrum15 || /broad[\s-]*spectrum/i.test(p.brandName);
  return spf !== null && spf >= 30 && broad ? 0 : 1;
}

// ---- titles and duplicates ------------------------------------------------
// Community listings (Open Beauty Facts) sometimes carry a URL, a label
// fragment or a non-English title. Those rank below everything else in
// listings; they keep their pages and stay searchable.
const JUNK_TITLE = /(www\.|https?:|\.com\b|ingredients?:|_\d*ea\b|&quot;)/i;
const NON_ENGLISH =
  /[ğşıİ]|\b(için|cilt|losyon|losyonu|yüz|kremi|voor|huid|tegen|vlekjes|gezicht|für|mit|und|gesicht|haut|avec|pour|peau|visage|corps|crema|viso|corpo|para|piel|rostro|saç|köpüğü)\b/i;

export function poorTitle(name: string, dataSource: string): boolean {
  if (JUNK_TITLE.test(name)) return true;
  return dataSource === "open_beauty_facts" && NON_ENGLISH.test(name);
}

/** Same product listed more than once (sizes, re-filings, sources): same name and maker, ignoring case and punctuation. */
export function duplicateKey(name: string, manufacturer: string | null): string {
  const fold = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  return `${fold(name)}|${fold(manufacturer ?? "")}`;
}

type DupCandidate = { id: string; dataSource: string; hasImage: boolean; hasIngredients: boolean; order: number };
const SOURCE_RANK: Record<string, number> = { brand_direct: 0, openfda: 1, dailymed: 2 };

/** The listing to keep from a duplicate group: a picture, then a full ingredient list, then the source tier, then the oldest row. */
export function pickListing(group: DupCandidate[]): DupCandidate {
  return [...group].sort(
    (a, b) =>
      Number(b.hasImage) - Number(a.hasImage) ||
      Number(b.hasIngredients) - Number(a.hasIngredients) ||
      (SOURCE_RANK[a.dataSource] ?? 3) - (SOURCE_RANK[b.dataSource] ?? 3) ||
      a.order - b.order,
  )[0];
}
