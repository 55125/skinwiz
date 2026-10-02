// "Same active, same strength" equivalence groups -- pure logic, no DB, so it
// can be unit-tested (equivalence.test.ts). lib/otc-index.ts runs it over the
// catalog once and caches the result.
//
// A group is every FDA-listed OTC drug product with the identical set of
// actives at the identical labeled strengths, in the same dosage form, for
// the same use. Deliberately narrow:
// - FDA drug rows only (openfda/dailymed): cosmetic sources carry no strengths.
// - One or two actives. Wider combinations are almost all sunscreens and
//   antiperspirants, which are left out entirely (below).
// - No sunscreens: SPF and broad-spectrum are measured on each finished
//   product (21 CFR 201.327), so two products with the same filters at the
//   same percentages can carry different SPFs. "Same standard" isn't true.
// - No antiperspirants: the monograph also requires efficacy testing of each
//   final formulation (21 CFR 350.60), same reasoning.
// - No kits (several products in one box -- the strengths belong to
//   different pieces).
// - The dosage form has to be known: from the listing, or else an
//   unambiguous form word in the product name. Otherwise the row is left out
//   rather than guessed into a group.
import { ACTIVE_DEFINITIONS } from "../db/actives";
import { formatPct } from "../db/strength";

export type EquivalenceRow = {
  id: string;
  brandName: string;
  manufacturer: string | null;
  dosageForm: string | null;
  strengthKey: string | null;
  activeIds: string[];
  concernId: string;
  dataSource: string;
};

export type EquivalenceMember = {
  // Lowest product id among this listing's pack-size duplicates -- the same
  // canonical id queries.ts getCanonicalProductId() resolves to.
  id: string;
  // Every product id that collapses to this listing (pack sizes), so a page
  // for any of them can find its group.
  ids: string[];
  brandName: string;
  manufacturer: string | null;
  storeBrand: string | null;
};

export type EquivalenceGroup = {
  slug: string;
  key: string;
  title: string; // "Adapalene 0.1% gel"
  activeIds: string[];
  strengths: Record<string, number>;
  dosageForm: string; // as listed, upper case ("GEL")
  concernId: string; // the first member's; groups can span browsing concerns
  // Approved under an NDA/ANDA rather than an OTC monograph (adapalene,
  // terbinafine, butenafine) -- changes how the "same standard" line reads.
  application: boolean;
  members: EquivalenceMember[];
  labelerCount: number;
};

export const DRUG_SOURCES = ["openfda", "dailymed"];
const EXCLUDED_CONCERNS = new Set(["sun-protection", "excessive-sweating"]);
const MAX_ACTIVES = 2;

// Topical OTC actives sold under an approved application (Rx-to-OTC switch
// plus generics), not a monograph.
const APPLICATION_ACTIVES = new Set(["adapalene", "terbinafine", "butenafine"]);

const ACTIVE_BY_ID = new Map(ACTIVE_DEFINITIONS.map((a) => [a.id, a]));

// A sunscreen-only active (avobenzone, octinoxate, ...) anywhere on a product
// makes it a sunscreen even outside the sun-protection concern -- an SPF lip
// balm filed under skin protectants, say.
function isSunscreenOnlyActive(id: string): boolean {
  const cats = ACTIVE_BY_ID.get(id)?.categories;
  return !!cats && cats.length > 0 && cats.every((c) => c === "sunscreen" || c === "antiperspirant");
}

const NAME_FORMS: [RegExp, string][] = [
  [/\bointment\b/i, "OINTMENT"],
  [/\bcream\b/i, "CREAM"],
  [/\blotion\b/i, "LOTION"],
  [/\bgel\b/i, "GEL"],
  [/\bshampoo\b/i, "SHAMPOO"],
  [/\bpowder\b/i, "POWDER"],
  [/\bsolution\b/i, "SOLUTION"],
  [/\bpaste\b/i, "PASTE"],
  [/\bjelly\b/i, "JELLY"],
];

/** The listed dosage form, or a single unambiguous form word from the name. */
export function resolveDosageForm(dosageForm: string | null, brandName: string): string | null {
  const listed = dosageForm?.trim().toUpperCase();
  if (listed) return listed;
  const found = NAME_FORMS.filter(([re]) => re.test(brandName));
  return found.length === 1 ? found[0][1] : null;
}

// Retailer and pharmacy-chain private labels, matched on the FDA labeler
// name. The label is what a shopper recognizes on the shelf.
const STORE_BRANDS: [RegExp, string][] = [
  [/\btarget\b/i, "Target (up&up)"],
  [/\bcvs\b/i, "CVS Health"],
  [/\bwalgreen/i, "Walgreens"],
  [/\bwal-?mart\b/i, "Walmart (Equate)"],
  [/\bamazon\b/i, "Amazon (Basic Care)"],
  [/\bcostco\b|\bkirkland\b/i, "Costco (Kirkland Signature)"],
  [/\bsam'?s west\b|\bmember'?s mark\b/i, "Sam's Club (Member's Mark)"],
  [/\bkroger\b/i, "Kroger"],
  [/\brite aid\b/i, "Rite Aid"],
  [/\bmeijer\b/i, "Meijer"],
  [/\bsafeway\b|\balbertsons\b/i, "Albertsons/Safeway (Signature Care)"],
  [/\btopco\b|\btop care\b/i, "TopCare"],
  [/\bdolgencorp\b|\bdollar general\b/i, "Dollar General (DG Health)"],
  [/\bfamily dollar\b/i, "Family Dollar"],
  [/^h[\s-]?e[\s-]?b\b/i, "H-E-B"],
  [/\bpublix\b/i, "Publix"],
  [/\bhy-?vee\b/i, "Hy-Vee"],
  [/\bgiant eagle\b/i, "Giant Eagle"],
  [/\bwegmans\b/i, "Wegmans"],
  [/\bchain drug marketing\b/i, "Quality Choice"],
  [/\bamerisource\s*bergen\b|\bcencora\b/i, "Good Neighbor Pharmacy"],
  [/\bcardinal health\b/i, "Leader (Cardinal Health)"],
  [/\bmckesson\b/i, "Health Mart (McKesson)"],
];

/** The store brand a labeler sells under, or null for a brand/generic maker. */
export function storeBrandFor(manufacturer: string | null | undefined): string | null {
  if (!manufacturer) return null;
  return STORE_BRANDS.find(([re]) => re.test(manufacturer))?.[1] ?? null;
}

// "Walgreen Company" and "WALGREENS" are one labeler; so are "YYBA Corp" and
// "YYBA CORP". Used only to count distinct labelers in a group.
export function labelerKey(manufacturer: string | null): string {
  const store = storeBrandFor(manufacturer);
  if (store) return store;
  return (manufacturer ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(the|inc|incorporated|llc|ltd|limited|co|corp|corporation|company|lp|l p)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugPart(s: string): string {
  return s
    .toLowerCase()
    .replace(/%/g, " percent ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseKey(strengthKey: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of strengthKey.split("|")) {
    const i = part.lastIndexOf(":");
    out[part.slice(0, i)] = parseFloat(part.slice(i + 1));
  }
  return out;
}

function activeLabel(id: string): string {
  return ACTIVE_BY_ID.get(id)?.canonicalName ?? id;
}

// Acne (21 CFR 333) and dandruff (21 CFR 358) are separate monographs that
// share salicylic acid and sulfur, so the same strength and form can be two
// different products (an acne wash, a scalp treatment). Every other concern
// split in the catalog is a browsing bucket, not a different use: a 1%
// hydrocortisone cream is the same product under "itch" or "eczema".
type UseBucket = "acne" | "dandruff" | "skin";
const USE_SPLIT_ACTIVES = new Set(["salicylic-acid", "sulfur"]);

function bucketForConcern(concernId: string): UseBucket {
  return concernId === "acne" ? "acne" : concernId === "dandruff-seb-derm" ? "dandruff" : "skin";
}

/** Why a row can't join a group, or null when it can. Exported for tests. */
export function exclusionReason(row: EquivalenceRow): string | null {
  if (!DRUG_SOURCES.includes(row.dataSource)) return "not an FDA drug listing";
  if (!row.strengthKey) return "strength not parsed";
  if (row.activeIds.length === 0 || row.activeIds.length > MAX_ACTIVES) return "too many actives";
  if (EXCLUDED_CONCERNS.has(row.concernId)) return "sunscreen/antiperspirant";
  if (/\bspf\b/i.test(row.brandName) || row.activeIds.some(isSunscreenOnlyActive)) return "sunscreen/antiperspirant";
  const form = resolveDosageForm(row.dosageForm, row.brandName);
  if (!form) return "dosage form unknown";
  if (form === "KIT") return "kit";
  return null;
}

export function groupKeyFor(row: EquivalenceRow): string | null {
  if (exclusionReason(row)) return null;
  return `${bucketForConcern(row.concernId)}#${row.strengthKey}#${resolveDosageForm(row.dosageForm, row.brandName)}`;
}

/**
 * Builds every group with at least `minLabelers` distinct labelers (a group
 * that is one company's pack sizes isn't a comparison). Members are one per
 * listing (brand + labeler + form, pack sizes collapsed), ordered brand
 * names first, then store brands, then alphabetically.
 */
export function buildEquivalenceGroups(rows: EquivalenceRow[], minLabelers = 2): EquivalenceGroup[] {
  const byKey = new Map<string, EquivalenceRow[]>();
  for (const row of rows) {
    const key = groupKeyFor(row);
    if (!key) continue;
    (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(row);
  }

  const groups: EquivalenceGroup[] = [];
  for (const [key, members] of byKey) {
    // One entry per product name per labeler: pack-size listings and
    // spelling variants of the labeler ("YYBA Corp" / "YYBA CORP") collapse.
    // Its link is the lowest id, which is always a canonical product page.
    const listings = new Map<string, EquivalenceRow[]>();
    for (const r of members) {
      const lk = `${r.brandName.trim().toLowerCase()}\u0000${labelerKey(r.manufacturer)}`;
      (listings.get(lk) ?? listings.set(lk, []).get(lk)!).push(r);
    }
    const labelers = new Set(members.map((r) => labelerKey(r.manufacturer)));
    if (labelers.size < minLabelers) continue;

    const first = members[0];
    const strengths = parseKey(first.strengthKey!);
    // Product's own active order for the title; the key is sorted.
    const activeIds = first.activeIds.filter((id) => id in strengths);
    const form = resolveDosageForm(first.dosageForm, first.brandName)!;
    const formWord = form.toLowerCase();
    const bucket = bucketForConcern(first.concernId);
    const splitByUse = bucket !== "skin" && activeIds.some((id) => USE_SPLIT_ACTIVES.has(id));
    const title =
      activeIds.map((id, i) => `${i === 0 ? activeLabel(id) : activeLabel(id).toLowerCase()} ${formatPct(strengths[id])}`).join(" + ") +
      ` ${formWord}${splitByUse ? ` (${bucket})` : ""}`;
    const sortedIds = [...activeIds].sort();
    let slug = [...sortedIds.map((id) => `${id}-${slugPart(formatPct(strengths[id]))}`), slugPart(formWord)].join("-");
    if (sortedIds.length > 1) slug = slug.replace(/-percent-(?=[a-z])/, "-percent-and-");
    if (splitByUse) slug += `-for-${bucket}`;

    const out: EquivalenceMember[] = [...listings.values()].map((rs) => {
      const ids = rs.map((r) => r.id).sort();
      return { id: ids[0], ids, brandName: rs[0].brandName, manufacturer: rs[0].manufacturer, storeBrand: storeBrandFor(rs[0].manufacturer) };
    });
    out.sort(
      (a, b) =>
        Number(!!a.storeBrand) - Number(!!b.storeBrand) ||
        a.brandName.localeCompare(b.brandName) ||
        (a.manufacturer ?? "").localeCompare(b.manufacturer ?? ""),
    );

    groups.push({
      slug,
      key,
      title,
      activeIds,
      strengths,
      dosageForm: form,
      concernId: first.concernId,
      application: activeIds.some((id) => APPLICATION_ACTIVES.has(id)),
      members: out,
      labelerCount: labelers.size,
    });
  }

  // Two keys can only share a slug if their forms differ just in
  // punctuation ("AEROSOL, SPRAY" vs "AEROSOL SPRAY"); keep URLs unique by
  // suffixing the smaller group, deterministically.
  groups.sort((a, b) => b.members.length - a.members.length || a.key.localeCompare(b.key));
  const seen = new Map<string, number>();
  for (const g of groups) {
    const n = seen.get(g.slug) ?? 0;
    seen.set(g.slug, n + 1);
    if (n > 0) g.slug = `${g.slug}-${n + 1}`;
  }
  return groups;
}

// ---- Price per unit -------------------------------------------------------
// Package size isn't in the catalog yet: the pipeline keeps only package NDC
// codes (tools/catalog_pipeline, `package_ndcs`), not openFDA's packaging
// description ("45 g in 1 TUBE"). parsePackageDescription is ready for when
// it does; until then unitPrice() gets null and returns null.

export type PackageSize = { amount: number; unit: "g" | "mL" | "count" };

const OZ_TO_G = 28.3495;
const FLOZ_TO_ML = 29.5735;

/** "45 g in 1 TUBE", "1.7 OZ in 1 BOTTLE", "118 mL in 1 BOTTLE, PLASTIC" -> size. */
export function parsePackageDescription(description: string | null | undefined): PackageSize | null {
  if (!description) return null;
  const m = /^\s*(\d*\.?\d+)\s*(g|gram|grams|mg|kg|ml|l|oz|fl\.?\s*oz|wipes?|pads?|cloths?|swabs?)\b/i.exec(description);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!(n > 0)) return null;
  const unit = m[2].toLowerCase().replace(/\s+/g, "");
  if (unit === "g" || unit.startsWith("gram")) return { amount: n, unit: "g" };
  if (unit === "mg") return { amount: n / 1000, unit: "g" };
  if (unit === "kg") return { amount: n * 1000, unit: "g" };
  if (unit === "ml") return { amount: n, unit: "mL" };
  if (unit === "l") return { amount: n * 1000, unit: "mL" };
  if (unit === "oz") return { amount: n * OZ_TO_G, unit: "g" };
  if (unit.startsWith("fl")) return { amount: n * FLOZ_TO_ML, unit: "mL" };
  return { amount: n, unit: "count" };
}

/**
 * Price per ounce (g/mL treated 1:1 like strength.ts does, so a gel in grams
 * and a lotion in mL compare) or per item. Null when either side is missing.
 */
export function unitPrice(price: number | null | undefined, size: PackageSize | null): { value: number; per: "oz" | "item" } | null {
  if (price == null || !(price > 0) || !size || !(size.amount > 0)) return null;
  if (size.unit === "count") return { value: price / size.amount, per: "item" };
  return { value: price / (size.amount / OZ_TO_G), per: "oz" };
}

/** Only a live (non-demo) affiliate price may ever be shown as a price. */
export function displayablePrice(link: { price: number | null; isDemo: boolean }): number | null {
  return !link.isDemo && link.price != null && link.price > 0 ? link.price : null;
}
