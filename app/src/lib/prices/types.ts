// Shapes shared by every live-price source (Sovrn and Kroger today; Impact
// and CJ feeds later). Pure types, no imports beyond the package-size type.
import type { PackageSize } from "@/lib/equivalence";

export type PriceSourceId = "sovrn" | "impact" | "cj" | "kroger";
export type MatchType = "barcode" | "plainlink" | "keywords";
/** In-store stock, for sources that report it (Kroger); null when unknown. */
export type Availability = "in_stock" | "low" | "out_of_stock";

/** One merchant's live offer for one catalog product. */
export type PriceQuote = {
  productId: string;
  source: PriceSourceId;
  merchantId: string;
  merchantName: string;
  price: number;
  retailPrice: number | null;
  currency: string; // always "USD" once stored
  url: string; // the source's tracked affiliate deeplink, or a plain product page when not affiliatable
  affiliatable: boolean; // false for direct retailer sources (Kroger): a plain link that earns nothing
  matchType: MatchType;
  matchConfidence: number; // 0..1
  offerName: string | null;
  pack: PackageSize | null; // read from the offer's own title
  fetchedAt: string; // ISO
  availability?: Availability | null;
  location?: string | null; // where the store the price is for is, e.g. "Cincinnati, OH 45202"
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

/**
 * matched: priced offers found. listed: the source's catalog carries the
 * product but has no price for it right now (Kroger: not priced at our
 * store). miss: not found. image: the source's own product photo URL for a
 * matched or listed product (Kroger only), hotlinked, never downloaded.
 */
export type LookupResult = { status: "matched" | "listed" | "miss"; quotes: PriceQuote[]; image?: string | null };

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
