// Whether a product can still be bought in the US, from signals the catalog
// already has. Pure rules, no database: lib/availability.ts gathers the
// signals and keeps the result in memory for search ranking, the product
// page banner and /admin.
//
// Three shelves, in the order search shows them:
//  - "us": sold here. A US retailer lists it now, it has a current FDA drug
//    listing (openFDA's NDC directory only holds active listings), the
//    brand sells it from its own store, or it was hand-picked from US
//    retail. Also every product we know nothing against: no listing data is
//    not evidence of anything.
//  - "import": a brand from abroad (lib/origin-shared.ts) with none of those
//    US signals, so it's mostly bought from import sellers.
//  - "discontinued": likely no longer made. Never hidden, only listed last
//    with a banner, and the owner can override either way from /admin.
//
// "Likely discontinued" is deliberately conservative. A product needs no
// retail offer and no price source carrying it now, and then one of:
//  - retail: a price source found it before, and none has for RETAIL_GONE_DAYS
//    (the lookups back off after a miss, so that's several misses in a row).
//    Only sources still finding other products count (lib/availability.ts),
//    so a feed that breaks or is switched off flags nothing, and a current
//    FDA listing outranks it.
//  - label: its FDA drug listing has lapsed (a DailyMed label whose NDC is in
//    no current listing) and the label hasn't changed in LABEL_STALE_YEARS.
//    Drug listings must be renewed every year while a product is sold, so a
//    lapsed one with a years-old label is a product the labeler stopped making.
import type { OriginId } from "@/lib/origin-shared";

export type Shelf = "us" | "import" | "discontinued";

export type DiscontinuedReason =
  | { kind: "manual"; note: string | null }
  | { kind: "retail"; lastSeen: string }
  | { kind: "label"; labelDate: string };

export type AvailabilitySignals = {
  /** data_source of the product and its merged duplicates. */
  dataSources: string[];
  origin: OriginId | null;
  /** The FDA label's effective time, YYYYMMDD, when the product has one. */
  labelDate: string | null;
  /** A fresh in-stock price quote, a live affiliate link or a manual retailer link. */
  usOffer: boolean;
  /** A price source's latest check found it (matched, or listed without a price). */
  carriedNow: boolean;
  /** Newest time any price source found it (ISO), across every source. */
  lastMatchedAt: string | null;
  override: "discontinued" | "available" | null;
  overrideNote?: string | null;
};

export type Availability = {
  shelf: Shelf;
  /** Can be bought now: a fresh in-stock quote or a retailer link. Ranks first. */
  inStock: boolean;
  discontinued: DiscontinuedReason | null;
};

export const RETAIL_GONE_DAYS = 60;
export const LABEL_STALE_YEARS = 7;

const DAY = 86_400_000;
/**
 * Sources whose presence means the product is on the US market now: a
 * current FDA drug listing, the brand's own store, or a product hand-picked
 * for the catalog from US retail (third_party, tools/catalog_pipeline/curated_products.csv).
 */
const US_LISTED_SOURCES = ["openfda", "brand_direct", "third_party"];

export function labelCutoff(now: Date): string {
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() - LABEL_STALE_YEARS);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export function classifyAvailability(s: AvailabilitySignals, now: Date): Availability {
  const inStock = s.usOffer;
  if (s.override === "discontinued") return { shelf: "discontinued", inStock, discontinued: { kind: "manual", note: s.overrideNote ?? null } };

  const usListed = s.usOffer || s.carriedNow || s.dataSources.some((d) => US_LISTED_SOURCES.includes(d));
  if (s.override !== "available" && !s.usOffer && !s.carriedNow) {
    const fdaListed = s.dataSources.includes("openfda");
    if (!fdaListed && s.lastMatchedAt && Date.parse(s.lastMatchedAt) < now.getTime() - RETAIL_GONE_DAYS * DAY) {
      return { shelf: "discontinued", inStock, discontinued: { kind: "retail", lastSeen: s.lastMatchedAt } };
    }
    if (!usListed && s.dataSources.includes("dailymed") && s.labelDate && /^\d{8}/.test(s.labelDate) && s.labelDate.slice(0, 8) < labelCutoff(now)) {
      return { shelf: "discontinued", inStock, discontinued: { kind: "label", labelDate: s.labelDate.slice(0, 8) } };
    }
  }
  if (s.origin && !usListed) return { shelf: "import", inStock, discontinued: null };
  return { shelf: "us", inStock, discontinued: null };
}

/** Popularity from first-party statistics: product page visits plus retailer clicks, which count more. */
export function popularityScore(views: number, clicks: number): number {
  return views + 3 * clicks;
}
/** Score at which a product counts as popular in search ranking. */
export const POPULAR_MIN_SCORE = 5;
/** Days of statistics the popularity score looks at. */
export const POPULAR_WINDOW_DAYS = 90;
