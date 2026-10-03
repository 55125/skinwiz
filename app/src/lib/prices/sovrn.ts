// Sovrn Commerce Price Comparison API adapter
// (https://developer.sovrn.com/reference/product-affiliate-api):
//   GET https://comparisons.sovrn.com/api/affiliate/v3.5/sites/{SITE_API_KEY}
//       /compare/prices/usd_en/by/accuracy?barcode=...|plainlink=...|search-keywords=...
//   header  authorization: secret {SECRET_KEY}
// The documented response is a bare JSON array of products
//   { id, name, merchant: { id, name, logo }, deeplink, image, thumbnail,
//     currency, salePrice, retailPrice, discountRate, affiliatable, epc }
// sorted by price, best offer per merchant. The parser below is tolerant:
// it also accepts the array under products/data/results, numeric strings,
// and drops any item it can't read rather than failing the lookup.
//
// Lookup order per product: barcodes in confidence order (openfda_upc,
// obf_id, then the guessed ndc_derived), then the brand page URL as a
// plainlink, and keyword search last, with match.ts's strict check. Only
// USD, affiliatable offers with a positive price are kept.
import { parseSizeFromTitle, searchKeywords, verifyDerivedBarcode, verifyKeywordMatch, contradicts } from "./match";
import { SOVRN_MIN_INTERVAL_MS, type SovrnConfig } from "./config";
import {
  BudgetExhausted,
  SourceUnavailable,
  type LookupProduct,
  type LookupResult,
  type MatchType,
  type PriceQuote,
  type PriceSource,
} from "./types";

export const SOVRN_API_BASE = "https://comparisons.sovrn.com/api/affiliate/v3.5/sites";
const MARKET = "usd_en";
// Tracking id attached to every deeplink we store, so Sovrn reports can tell
// price-block clicks from wrapped links. Never user-identifying.
const SID = "prices";

export type SovrnOffer = {
  id: string;
  name: string;
  merchantId: string;
  merchantName: string;
  deeplink: string;
  currency: string;
  salePrice: number | null;
  retailPrice: number | null;
  affiliatable: boolean;
};

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function bool(v: unknown): boolean {
  return v === true || v === "true" || v === 1;
}

/** Reads a Sovrn response body into offers; anything unreadable is skipped. */
export function parseSovrnResponse(body: unknown): SovrnOffer[] {
  let items: unknown = body;
  if (items && typeof items === "object" && !Array.isArray(items)) {
    const o = items as Record<string, unknown>;
    items = o.products ?? o.data ?? o.results ?? o.items;
  }
  if (!Array.isArray(items)) return [];
  const out: SovrnOffer[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const m = (r.merchant && typeof r.merchant === "object" ? r.merchant : {}) as Record<string, unknown>;
    const deeplink = str(r.deeplink);
    const merchantName = str(m.name);
    const merchantId = str(m.id) ?? merchantName;
    if (!deeplink || !/^https:\/\//i.test(deeplink) || !merchantId || !merchantName) continue;
    out.push({
      id: str(r.id) ?? "",
      name: str(r.name) ?? "",
      merchantId,
      merchantName,
      deeplink,
      currency: (str(r.currency) ?? "").toUpperCase(),
      salePrice: num(r.salePrice),
      retailPrice: num(r.retailPrice),
      affiliatable: bool(r.affiliatable),
    });
  }
  return out;
}

/** The price to show: the sale price, else the retail price; null if neither is a real price. */
export function offerPrice(o: SovrnOffer): number | null {
  const p = o.salePrice != null && o.salePrice > 0 ? o.salePrice : o.retailPrice;
  return p != null && p > 0 && p < 10_000 ? Math.round(p * 100) / 100 : null;
}

/** USD, affiliatable, priced offers, cheapest per merchant. */
export function usableOffers(offers: SovrnOffer[]): SovrnOffer[] {
  const best = new Map<string, SovrnOffer>();
  for (const o of offers) {
    if (o.currency !== "USD" || !o.affiliatable) continue;
    const p = offerPrice(o);
    if (p == null) continue;
    const prev = best.get(o.merchantId);
    if (!prev || p < offerPrice(prev)!) best.set(o.merchantId, o);
  }
  return [...best.values()];
}

export function buildSovrnUrl(siteKey: string, query: Record<string, string>): string {
  const qs = new URLSearchParams({ ...query, sid: SID });
  return `${SOVRN_API_BASE}/${encodeURIComponent(siteKey)}/compare/prices/${MARKET}/by/accuracy?${qs}`;
}

const CONFIDENCE: Record<string, number> = { openfda_upc: 0.95, obf_id: 0.9, ndc_derived: 0.7, plainlink: 0.9, keywords: 0.6 };

export type SovrnDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Shared across a run: each HTTP attempt takes one; at 0 the lookup stops. */
  budget?: { remaining: number };
  minIntervalMs?: number;
  maxRetries?: number;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class SovrnSource implements PriceSource {
  readonly id = "sovrn" as const;
  private lastRequestAt = 0;
  requests = 0;

  constructor(
    private readonly cfg: SovrnConfig,
    private readonly deps: SovrnDeps = {},
  ) {}

  /** One query, with rate limiting and exponential backoff on 429/5xx/network errors. */
  async query(query: Record<string, string>): Promise<SovrnOffer[]> {
    const doFetch = this.deps.fetch ?? fetch;
    const sleep = this.deps.sleep ?? defaultSleep;
    const minInterval = this.deps.minIntervalMs ?? SOVRN_MIN_INTERVAL_MS;
    const maxRetries = this.deps.maxRetries ?? 3;
    const url = buildSovrnUrl(this.cfg.siteKey, query);
    for (let attempt = 0; ; attempt++) {
      if (this.deps.budget) {
        if (this.deps.budget.remaining <= 0) throw new BudgetExhausted();
        this.deps.budget.remaining--;
      }
      const wait = this.lastRequestAt + minInterval - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastRequestAt = Date.now();
      this.requests++;

      let status: number | null = null;
      let retryAfterMs = 0;
      try {
        const res = await doFetch(url, {
          headers: { authorization: `secret ${this.cfg.secret}`, accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });
        status = res.status;
        if (res.ok) {
          const body = await res.json().catch(() => null);
          return parseSovrnResponse(body);
        }
        if (status === 401 || status === 403) throw new SourceUnavailable(`Sovrn refused the credentials (${status}).`, status);
        // A bad or unknown query (400/404/422...) is a miss for this query only.
        if (status < 500 && status !== 429) return [];
        retryAfterMs = (num(res.headers.get("retry-after")) ?? 0) * 1000;
      } catch (err) {
        if (err instanceof SourceUnavailable || err instanceof BudgetExhausted) throw err;
        // network error or timeout: retry like a 5xx
      }
      if (attempt >= maxRetries) throw new SourceUnavailable(`Sovrn unavailable (${status ?? "network error"}) after ${attempt + 1} tries.`, status);
      await sleep(Math.min(30_000, Math.max(retryAfterMs, 1000 * 2 ** attempt)));
    }
  }

  async lookup(p: LookupProduct, now: Date): Promise<LookupResult> {
    const fetchedAt = now.toISOString();
    const toQuotes = (offers: SovrnOffer[], matchType: MatchType, confidence: number): PriceQuote[] =>
      offers.map((o) => ({
        productId: p.id,
        source: "sovrn",
        merchantId: o.merchantId,
        merchantName: o.merchantName,
        price: offerPrice(o)!,
        retailPrice: o.retailPrice != null && o.retailPrice > 0 ? o.retailPrice : null,
        currency: "USD",
        url: o.deeplink,
        affiliatable: true,
        matchType,
        matchConfidence: confidence,
        offerName: o.name || null,
        pack: o.name ? parseSizeFromTitle(o.name) : null,
        fetchedAt,
      }));

    for (const b of p.barcodes) {
      const offers = usableOffers(await this.query({ barcode: b.barcode })).filter((o) =>
        b.source === "ndc_derived" ? verifyDerivedBarcode(p, o.name).ok : !contradicts(p, o.name),
      );
      if (offers.length) return { status: "matched", quotes: toQuotes(offers, "barcode", CONFIDENCE[b.source] ?? 0.7) };
    }
    if (p.sourceUrl && /^https?:\/\//i.test(p.sourceUrl)) {
      const offers = usableOffers(await this.query({ plainlink: p.sourceUrl })).filter((o) => !contradicts(p, o.name));
      if (offers.length) return { status: "matched", quotes: toQuotes(offers, "plainlink", CONFIDENCE.plainlink) };
    }
    const keywords = searchKeywords(p);
    if (keywords) {
      const offers = usableOffers(
        await this.query({ "search-keywords": keywords, "exclude-keywords": "kit bundle sample refill", limit: "20" }),
      ).filter((o) => verifyKeywordMatch(p, o.name).ok);
      if (offers.length) return { status: "matched", quotes: toQuotes(offers, "keywords", CONFIDENCE.keywords) };
    }
    return { status: "miss", quotes: [] };
  }
}
