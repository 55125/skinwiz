// HSA/FSA eligibility tag -- pure logic, no DB (hsa.test.ts covers it;
// lib/otc-index.ts applies it to the catalog).
//
// Basis (see /guide/hsa-fsa-eligible for the user-facing version):
// - CARES Act (Pub. L. 116-136) sec. 3702 made over-the-counter medicines
//   reimbursable from an HSA, FSA or HRA without a prescription, for amounts
//   paid after Dec 31, 2019. Every openFDA/DailyMed row in the catalog is an
//   FDA-listed OTC drug, so those are tagged.
// - Sunscreen: plan administrators generally accept broad-spectrum SPF 15+
//   and not lower or non-broad-spectrum products. The label itself tells us
//   which: FDA's sunscreen labeling rule (21 CFR 201.327) puts the "Sun
//   Protection Measures" direction only on broad-spectrum SPF 15+ products,
//   and the "Skin Cancer/Skin Aging Alert" warning only on the rest. A
//   sunscreen with neither signal gets no tag -- unconfirmed, not assumed.
// - Makeup with SPF (foundation, lipstick, BB cream): no tag -- drug-listed,
//   but plans generally treat it as a cosmetic. Matched on name/form words.
// - Antiperspirants: no tag, though they're OTC drugs. Pub. 502 excludes
//   toiletries, and administrators generally want a Letter of Medical
//   Necessity (hyperhidrosis) for them -- "usually eligible" would mislead.
// - Hair-loss products (minoxidil): no tag, though they're OTC drugs. Pub. 502
//   excludes hair transplants as cosmetic, and plan administrators generally
//   treat hair regrowth products the same way unless there's a Letter of
//   Medical Necessity -- "usually eligible" would mislead.
// - Cosmetics (brand-direct, Open Beauty Facts): no tag. Items used for
//   appearance or general health generally aren't medical care (IRS Pub. 502).
// - Homeopathic products (NDC marketing category "UNAPPROVED HOMEOPATHIC"):
//   no tag. They're drug-listed but FDA hasn't evaluated them, and plan
//   administrators vary on whether they count as a "medicine or drug" --
//   "usually eligible" would overstate it. Read from the NDC directory
//   (products.marketingCategory); a row without one is judged as before.
// - Prescription rows: no tag. They're reimbursable with the prescription
//   itself, a different flow from this OTC label, and they never appear in
//   consumer listings anyway (lib/queries.ts OTC_ONLY).
// Always a "usually", never a promise: the plan administrator decides.
import { ACTIVE_DEFINITIONS } from "../db/actives";

export const HSA_LABEL = "Usually HSA/FSA eligible";
export const HSA_GUIDE_PATH = "/guide/hsa-fsa-eligible";

// Hook for an HSA/FSA store affiliate link (e.g. a store that sells only
// eligible items). No account exists yet, so this stays null and nothing
// renders. When one is approved, set the URL here -- the guide page and the
// product-page eligibility note both render it with an affiliate disclosure.
export const HSA_STORE_AFFILIATE: { name: string; url: string } | null = null;

// A product listing where most cards would carry the HSA/FSA badge (a drug
// concern's page) says so once above the grid instead, and the badge drops
// off its cards; where eligible products are the exception, each keeps its
// badge. Too few cards to call it "most" keep their badges too.
export function hsaSaidOnce(eligible: number, total: number): boolean {
  return total >= 3 && eligible * 2 > total;
}

// Lower-case substrings, matched case-insensitively both here and in SQL
// (otc-index.ts builds LIKE clauses from these same arrays).
export const BROAD_SPECTRUM_15_PHRASES = ["sun protection measures", "broad spectrum spf value of 15 or higher"];
export const SUNBURN_ONLY_PHRASES = ["skin aging alert", "shown only to help prevent sunburn"];

const DRUG_SOURCES = new Set(["openfda", "dailymed"]);
const ANTIPERSPIRANT = new Set(ACTIVE_DEFINITIONS.filter((a) => a.categories.includes("antiperspirant")).map((a) => a.id));
const SUNSCREEN_ONLY = new Set(
  ACTIVE_DEFINITIONS.filter((a) => a.categories.length > 0 && a.categories.every((c) => c === "sunscreen")).map((a) => a.id),
);

export type SunscreenLabelFlags = { broadSpectrum15: boolean; sunburnOnly: boolean };

export function sunscreenLabelFlags(directions: string | null | undefined, warnings: string | null | undefined): SunscreenLabelFlags {
  const text = `${directions ?? ""}\n${warnings ?? ""}`.toLowerCase();
  return {
    broadSpectrum15: BROAD_SPECTRUM_15_PHRASES.some((p) => text.includes(p)),
    sunburnOnly: SUNBURN_ONLY_PHRASES.some((p) => text.includes(p)),
  };
}

export type HsaInput = {
  dataSource: string;
  concernId: string;
  activeIds: string[];
  brandName: string;
  dosageForm?: string | null;
  label: SunscreenLabelFlags | null;
  marketingCategory?: string | null;
  isRx?: boolean;
};

export type HsaStatus =
  | { eligible: true; reason: "otc-drug" | "sunscreen-broad-spectrum" }
  | {
      eligible: false;
      reason:
        | "not-a-drug"
        | "prescription"
        | "homeopathic"
        | "antiperspirant"
        | "hair-loss"
        | "makeup-with-spf"
        | "sunscreen-unconfirmed"
        | "sunscreen-sunburn-only";
    };

export function isHomeopathic(marketingCategory: string | null | undefined): boolean {
  return /homeopathic/i.test(marketingCategory ?? "");
}

const MAKEUP_RE =
  /\b(foundation|lipstick|lip ?gloss|lip ?colou?r|concealer|[bc]c ?cream|primer|bronzer|blush|cushion|make-?up|mascara|eye ?shadow)\b/i;

export function isSunscreen(p: Pick<HsaInput, "concernId" | "activeIds" | "brandName">): boolean {
  return p.concernId === "sun-protection" || /\bspf\b/i.test(p.brandName) || p.activeIds.some((id) => SUNSCREEN_ONLY.has(id));
}

/** Highest "SPF nn" in the product name, or null. */
export function spfFromName(name: string): number | null {
  const values = [...name.matchAll(/\bspf\s*-?\s*(\d{1,3})\b/gi)].map((m) => parseInt(m[1], 10));
  return values.length ? Math.max(...values) : null;
}

export function hsaStatus(p: HsaInput): HsaStatus {
  if (p.isRx) return { eligible: false, reason: "prescription" };
  if (!DRUG_SOURCES.has(p.dataSource)) return { eligible: false, reason: "not-a-drug" };
  if (isHomeopathic(p.marketingCategory)) return { eligible: false, reason: "homeopathic" };
  if (p.concernId === "excessive-sweating" || p.activeIds.some((id) => ANTIPERSPIRANT.has(id))) {
    return { eligible: false, reason: "antiperspirant" };
  }
  if (p.concernId === "hair-loss" || p.activeIds.includes("minoxidil")) return { eligible: false, reason: "hair-loss" };
  if (!isSunscreen(p)) return { eligible: true, reason: "otc-drug" };
  // Makeup with SPF (foundation, lipstick, BB cream) is listed as an OTC drug
  // but plans generally treat it as a cosmetic.
  if (MAKEUP_RE.test(p.brandName) || p.dosageForm?.toUpperCase() === "LIPSTICK") return { eligible: false, reason: "makeup-with-spf" };
  const spf = spfFromName(p.brandName);
  // Any negative signal wins: a label carrying the sunburn-only alert, or a
  // name stating an SPF under 15.
  if (p.label?.sunburnOnly || (spf !== null && spf < 15)) return { eligible: false, reason: "sunscreen-sunburn-only" };
  if (p.label?.broadSpectrum15) return { eligible: true, reason: "sunscreen-broad-spectrum" };
  if (spf !== null && spf >= 15 && /broad[\s-]*spectrum/i.test(p.brandName)) return { eligible: true, reason: "sunscreen-broad-spectrum" };
  return { eligible: false, reason: "sunscreen-unconfirmed" };
}
