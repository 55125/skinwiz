// Shapes shared by every live-price source (Sovrn today; Impact, CJ and
// Kroger feeds later). Pure types, no imports beyond the package-size type.
import type { PackageSize } from "@/lib/equivalence";

export type PriceSourceId = "sovrn" | "impact" | "cj" | "kroger";
export type MatchType = "barcode" | "plainlink" | "keywords";

/** One merchant's live offer for one catalog product. */
export type PriceQuote = {
  productId: string;
  source: PriceSourceId;
  merchantId: string;
  merchantName: string;
  price: number;
  retailPrice: number | null;
  currency: string; // always "USD" once stored
  url: string; // the source's tracked affiliate deeplink
  affiliatable: boolean;
  matchType: MatchType;
  matchConfidence: number; // 0..1
  offerName: string | null;
  pack: PackageSize | null; // read from the offer's own title
  fetchedAt: string; // ISO
};

/** What a source needs to know about a catalog product to look it up. */
export type LookupProduct = {
  id: string;
  brandName: string;
  manufacturer: string | null;
  dosageForm: string | null;
  dataSource: string;
  sourceUrl: string | null; // brand-direct product page, for plainlink lookups
  packageDescription: string | null;
  strengths: Record<string, number> | null;
  barcodes: { barcode: string; source: string }[]; // already in confidence order
};

export type LookupResult = { status: "matched" | "miss"; quotes: PriceQuote[] };

/**
 * A price source. lookup() makes its own HTTP calls (rate-limited, with
 * backoff) and returns verified quotes only. It throws on a fatal problem
 * (bad credentials, budget used up, source down) so the job can stop.
 */
export interface PriceSource {
  readonly id: PriceSourceId;
  lookup(product: LookupProduct, now: Date): Promise<LookupResult>;
}

/** Thrown when a run's request budget is used up mid-product (not a miss). */
export class BudgetExhausted extends Error {
  constructor() {
    super("Request budget for this run is used up.");
  }
}

/** Thrown for errors that should stop the whole run (auth, repeated 429/5xx). */
export class SourceUnavailable extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
  }
}
