// Kroger Products and Locations API adapter (https://developer.kroger.com):
//   POST https://api.kroger.com/v1/connect/oauth2/token
//        grant_type=client_credentials&scope=product.compact
//        header  authorization: Basic base64(KROGER_CLIENT_ID:KROGER_CLIENT_SECRET)
//   GET  /v1/locations?filter.zipCode.near={zip}&filter.limit=1
//   GET  /v1/products/{productId}?filter.locationId={id}       (barcode lookups)
//   GET  /v1/products?filter.term=...&filter.locationId={id}    (keyword search)
// Prices and stock are per store, so each run resolves one store: the one
// pinned by KROGER_LOCATION_ID, else the nearest to KROGER_ZIP. That zip is
// a server setting; no visitor's location or anything else about a visitor
// is ever sent to Kroger.
//
// Kroger links are plain product pages on kroger.com, not affiliate links
// (we have no Kroger program), so quotes are stored with affiliatable =
// false, are never wrapped through Sovrn, and earn nothing -- which also
// means a browser sending Global Privacy Control gets exactly what everyone
// else gets.
//
// Lookup order per product matches Sovrn's: barcodes in confidence order
// (Kroger's productId is the UPC without its check digit, zero-padded to
// 13), then a keyword search checked by match.ts's strict verifier. The
// parser is tolerant and drops anything it can't read.
import {
  brandWords,
  contradicts,
  normalize,
  parseSizeFromTitle,
  searchKeywords,
  verifyDerivedBarcode,
  verifyKeywordMatch,
} from "./match";
import { KROGER_MIN_INTERVAL_MS, type KrogerConfig } from "./config";
import {
  BudgetExhausted,
  SourceUnavailable,
  type Availability,
  type LookupProduct,
  type LookupResult,
  type MatchType,
  type PriceQuote,
  type PriceSource,
} from "./types";

export const KROGER_API_BASE = "https://api.kroger.com/v1";
const SCOPE = "product.compact";

/** label is where the store is, e.g. "Cincinnati, OH 45202". */
export type KrogerStore = { locationId: string; merchantName: string; label: string };

export type KrogerOffer = {
  productId: string;
  name: string; // brand + description + size, for matching
  url: string;
  regular: number | null;
  promo: number | null;
  availability: Availability | null;
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

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
}

/** GTIN check digit, for a code whose last digit is the check digit. */
function validCheckDigit(code: string): boolean {
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * Kroger productIds for a barcode: a 12/13/14-digit GTIN with a valid check
 * digit loses it; a 10/11-digit code (no check digit) is taken as is. Both
 * are zero-padded to 13. Anything else gives none.
 */
export function krogerProductIds(barcode: string): string[] {
  const d = barcode.replace(/\D/g, "");
  let core: string | null = null;
  if (d.length >= 12 && d.length <= 14 && validCheckDigit(d)) core = d.slice(0, -1).replace(/^0+(?=\d{11})/, "");
  else if (d.length === 10 || d.length === 11) core = d;
  if (!core || core.length > 13 || /^0+$/.test(core)) return [];
  return [core.padStart(13, "0")];
}

/** The first store in a Locations response. */
export function parseKrogerLocation(body: unknown): KrogerStore | null {
  const data = obj(body).data;
  const first = Array.isArray(data) ? obj(data[0]) : obj(data);
  const locationId = str(first.locationId);
  if (!locationId) return null;
  const merchantName = titleCase(str(first.chain) ?? "Kroger");
  const a = obj(first.address);
  const place = [str(a.city), [str(a.state), str(a.zipCode)].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return { locationId, merchantName, label: place || locationId };
}

function availabilityOf(item: Record<string, unknown>): Availability | null {
  const level = str(obj(item.inventory).stockLevel)?.toUpperCase();
  if (level === "HIGH") return "in_stock";
  if (level === "LOW") return "low";
  if (level === "TEMPORARILY_OUT_OF_STOCK") return "out_of_stock";
  return null;
}

/** A kroger.com product page without its tracking query string. */
function productPage(uri: string | null, productId: string): string {
  if (uri) {
    try {
      const u = new URL(uri, "https://www.kroger.com");
      if (u.protocol === "https:" && /(^|\.)kroger\.com$/.test(u.hostname)) return `${u.origin}${u.pathname}`;
    } catch {
      // fall through
    }
  }
  return `https://www.kroger.com/p/item/${productId}`;
}

/** Reads a Products response (one product or a list) into offers; unreadable items are skipped. */
export function parseKrogerProducts(body: unknown): KrogerOffer[] {
  const data = obj(body).data;
  const list = Array.isArray(data) ? data : data ? [data] : [];
  const out: KrogerOffer[] = [];
  for (const raw of list) {
    const r = obj(raw);
    const productId = str(r.productId);
    const description = str(r.description);
    if (!productId || !description) continue;
    const items = Array.isArray(r.items) ? r.items.map(obj) : [];
    const item = items[0] ?? {};
    const price = obj(item.price);
    const brand = str(r.brand);
    const size = str(item.size);
    const name = [brand && !description.toLowerCase().includes(brand.toLowerCase()) ? brand : null, description, size]
      .filter(Boolean)
      .join(" ");
    out.push({
      productId,
      name,
      url: productPage(str(r.productPageURI), productId),
      regular: num(price.regular),
      promo: num(price.promo),
      availability: availabilityOf(item),
    });
  }
  return out;
}

/** The shelf price: the promo price when there is one, else the regular price. */
export function krogerPrice(o: KrogerOffer): number | null {
  const p = o.promo != null && o.promo > 0 ? o.promo : o.regular;
  return p != null && p > 0 && p < 10_000 ? Math.round(p * 100) / 100 : null;
}

/**
 * Words for Kroger's term search: the product name, led by the labeler's
 * name only when the product name has no brand of its own (a store brand's
 * "Adapalene Gel" becomes "kroger adapalene gel"; "Differin" stays as is,
 * since shelf titles rarely name the manufacturer). Kroger takes at most 8
 * words of 3+ characters.
 */
export function krogerSearchTerm(p: LookupProduct): string {
  const own = normalize(p.brandName).split(" ");
  const words = searchKeywords(p).split(" ");
  const hasOwnBrand = brandWords(p).some((b) => own.includes(b));
  return (hasOwnBrand ? words.filter((w) => own.includes(w)) : words)
    .filter((w) => w.length >= 3)
    .slice(0, 8)
    .join(" ");
}

const CONFIDENCE: Record<string, number> = { openfda_upc: 0.95, obf_id: 0.9, ndc_derived: 0.7, keywords: 0.6 };

export type KrogerDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Shared across a run: each HTTP attempt takes one; at 0 the lookup stops. */
  budget?: { remaining: number };
  minIntervalMs?: number;
  maxRetries?: number;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class KrogerSource implements PriceSource {
  readonly id = "kroger" as const;
  private lastRequestAt = 0;
  private token: { value: string; expiresAt: number } | null = null;
  private store: KrogerStore | null = null;
  requests = 0;

  constructor(
    private readonly cfg: KrogerConfig,
    private readonly deps: KrogerDeps = {},
  ) {}

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  /** Paces, spends budget, and retries 429/5xx/network errors with backoff. 401 is returned to the caller. */
  private async send(url: string, init: () => RequestInit, what: string): Promise<Response | null> {
    const doFetch = this.deps.fetch ?? fetch;
    const sleep = this.deps.sleep ?? defaultSleep;
    const minInterval = this.deps.minIntervalMs ?? KROGER_MIN_INTERVAL_MS;
    const maxRetries = this.deps.maxRetries ?? 3;
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
        const res = await doFetch(url, { ...init(), signal: AbortSignal.timeout(10_000) });
        status = res.status;
        if (status < 500 && status !== 429) return res;
        retryAfterMs = (num(res.headers.get("retry-after")) ?? 0) * 1000;
      } catch {
        // network error or timeout: retry like a 5xx
      }
      if (attempt >= maxRetries) throw new SourceUnavailable(`Kroger ${what} unavailable (${status ?? "network error"}) after ${attempt + 1} tries.`, status);
      await sleep(Math.min(30_000, Math.max(retryAfterMs, 1000 * 2 ** attempt)));
    }
  }

  /** A client-credentials token, reused until a minute before it expires. */
  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > this.now() + 60_000) return this.token.value;
    const basic = Buffer.from(`${this.cfg.clientId}:${this.cfg.clientSecret}`).toString("base64");
    const res = await this.send(
      `${KROGER_API_BASE}/connect/oauth2/token`,
      () => ({
        method: "POST",
        headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: new URLSearchParams({ grant_type: "client_credentials", scope: SCOPE }).toString(),
      }),
      "token",
    );
    const body = res?.ok ? obj(await res.json().catch(() => null)) : {};
    const value = str(body.access_token);
    if (!res?.ok || !value) throw new SourceUnavailable(`Kroger refused the client credentials (${res?.status ?? "no response"}).`, res?.status ?? null);
    const ttl = num(body.expires_in) ?? 1800;
    this.token = { value, expiresAt: this.now() + ttl * 1000 };
    return value;
  }

  /** An authorized GET; a 401 gets one fresh token, then stops the run. Null for a 4xx miss. */
  async get(path: string, query: Record<string, string>): Promise<unknown> {
    const url = `${KROGER_API_BASE}${path}?${new URLSearchParams(query)}`;
    for (let auth = 0; auth < 2; auth++) {
      const token = await this.accessToken();
      const res = await this.send(url, () => ({ headers: { authorization: `Bearer ${token}`, accept: "application/json" } }), "API");
      if (!res) return null;
      if (res.ok) return res.json().catch(() => null);
      if (res.status === 401) {
        this.token = null;
        continue;
      }
      if (res.status === 403) throw new SourceUnavailable(`Kroger refused the request (403); check the app's product scope.`, 403);
      // A bad or unknown query (400/404...) is a miss for this query only.
      return null;
    }
    throw new SourceUnavailable("Kroger refused a fresh token (401).", 401);
  }

  /** The store this run prices at: KROGER_LOCATION_ID, else the nearest to KROGER_ZIP. */
  async resolveStore(): Promise<KrogerStore> {
    if (this.store) return this.store;
    const body = this.cfg.locationId
      ? await this.get(`/locations/${encodeURIComponent(this.cfg.locationId)}`, {})
      : await this.get("/locations", { "filter.zipCode.near": this.cfg.zip, "filter.limit": "1" });
    const store = parseKrogerLocation(body);
    if (!store) {
      const where = this.cfg.locationId ? `location ${this.cfg.locationId}` : `zip ${this.cfg.zip}`;
      throw new SourceUnavailable(`No Kroger store found for ${where}.`, null);
    }
    this.store = store;
    return store;
  }

  async lookup(p: LookupProduct, now: Date): Promise<LookupResult> {
    const store = await this.resolveStore();
    const fetchedAt = now.toISOString();
    const priced = (offers: KrogerOffer[]) => offers.filter((o) => krogerPrice(o) != null);
    const toQuotes = (o: KrogerOffer, matchType: MatchType, confidence: number): PriceQuote[] => [
      {
        productId: p.id,
        source: "kroger",
        merchantId: `kroger-${store.locationId}`,
        merchantName: store.merchantName,
        price: krogerPrice(o)!,
        retailPrice: o.regular != null && o.regular > 0 ? o.regular : null,
        currency: "USD",
        url: o.url,
        affiliatable: false,
        matchType,
        matchConfidence: confidence,
        offerName: o.name || null,
        pack: parseSizeFromTitle(o.name),
        fetchedAt,
        availability: o.availability,
        location: store.label,
      },
    ];

    // A product Kroger's catalog has but this store doesn't price is "listed":
    // carried by Kroger, with no quote to show here.
    let listed = false;
    const tried = new Set<string>();
    for (const b of p.barcodes) {
      for (const id of krogerProductIds(b.barcode)) {
        if (tried.has(id)) continue;
        tried.add(id);
        const hits = parseKrogerProducts(await this.get(`/products/${id}`, { "filter.locationId": store.locationId })).filter((o) =>
          b.source === "ndc_derived" ? verifyDerivedBarcode(p, o.name).ok : !contradicts(p, o.name),
        );
        const offer = priced(hits)[0];
        if (offer) return { status: "matched", quotes: toQuotes(offer, "barcode", CONFIDENCE[b.source] ?? 0.7) };
        if (hits.length) listed = true;
      }
    }
    const term = krogerSearchTerm(p);
    if (term && !listed) {
      const hits = parseKrogerProducts(
        await this.get("/products", { "filter.term": term, "filter.locationId": store.locationId, "filter.limit": "20" }),
      ).filter((o) => verifyKeywordMatch(p, o.name).ok);
      const best = priced(hits).sort((a, b) => krogerPrice(a)! - krogerPrice(b)!)[0];
      if (best) return { status: "matched", quotes: toQuotes(best, "keywords", CONFIDENCE.keywords) };
      if (hits.length) listed = true;
    }
    if (listed) return { status: "listed", quotes: [] };
    return { status: "miss", quotes: [] };
  }
}
