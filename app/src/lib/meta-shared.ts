// Meta (Facebook/Instagram) ad measurement: the parts shared by the browser
// (lib/meta-client.ts, components/meta-consent.tsx) and the server
// (lib/meta-capi.ts, POST /api/e). Pure, so it is unit tested
// (meta-shared.test.ts).
//
// What reaches Meta, and when (the privacy policy's "Meta ad measurement"
// section says the same):
// - Only visitors who arrived from one of our ads (the link carried Meta's
//   fbclid) in the last 7 days. Everyone else: nothing, as before.
// - Never for browsers sending Global Privacy Control or Do Not Track, and
//   never after the visitor picks "Don't share" (stored in this browser).
// - Before any choice: two neutral events through the Conversions API only,
//   ActivelyLanding and RetailerClick, with the click id, IP address and
//   browser type. No page address, product, ingredient, concern or search.
// - After "Allow": Meta's pixel also loads in the browser and sends a
//   PageView per page (Meta then sees the page address) plus the same two
//   events, deduplicated against the server copies by a shared event id.

export const META_EVENTS = { landing: "ActivelyLanding", retailerClick: "RetailerClick" } as const;
export type MetaEventName = (typeof META_EVENTS)[keyof typeof META_EVENTS];

/** How long after an ad click a visitor still counts as "from our ad" (Meta's default click window). */
export const AD_CLICK_WINDOW_MS = 7 * 86_400_000;

// Browser storage keys (localStorage unless noted).
export const STORAGE = {
  click: "sw_meta_click", // {"fbc": "...", "at": ms}
  consent: "sw_meta_consent", // "granted" | "denied"
  landing: "sw_meta_landing", // sessionStorage: event id of this visit's landing
} as const;

export type MetaConsent = "granted" | "denied" | null;

/** Meta's fbc format: fb.1.<ms when the click id was first seen>.<fbclid>. */
export function fbcFromClickId(fbclid: string, nowMs: number): string | null {
  const id = fbclid.trim();
  if (!/^[A-Za-z0-9_-]{10,500}$/.test(id)) return null;
  return `fb.1.${Math.floor(nowMs)}.${id}`;
}

export function validFbc(v: unknown): v is string {
  return typeof v === "string" && /^fb\.1\.\d{10,13}\.[A-Za-z0-9_-]{10,500}$/.test(v);
}

/** The pixel's own browser id cookie, _fbp: fb.1.<ms>.<random>. */
export function validFbp(v: unknown): v is string {
  return typeof v === "string" && /^fb\.\d\.\d{10,13}\.\d{1,25}$/.test(v);
}

export function validEventId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v);
}

export function validPixelId(v: unknown): v is string {
  return typeof v === "string" && /^\d{5,20}$/.test(v);
}

/** The time (ms) an fbc value was created, or null. */
export function fbcTime(fbc: string): number | null {
  const m = /^fb\.1\.(\d{10,13})\./.exec(fbc);
  return m ? Number(m[1]) : null;
}

/** True while a stored ad click is inside the click window. */
export function clickStillFresh(click: { fbc?: unknown; at?: unknown } | null, nowMs: number): boolean {
  if (!click || !validFbc(click.fbc) || typeof click.at !== "number") return false;
  return nowMs - click.at >= 0 && nowMs - click.at < AD_CLICK_WINDOW_MS;
}

// Off-site links that are not shopping: regulators and references, video and
// social sites, and Rx price checks. A click to anything else (a retailer or
// a brand's own site, directly or through Sovrn) is a RetailerClick.
const NOT_SHOPPING: RegExp[] = [
  /(^|\.)gov$/,
  /(^|\.)aad\.org$/,
  /(^|\.)ewg\.org$/,
  /(^|\.)wikipedia\.org$/,
  /(^|\.)openbeautyfacts\.org$/,
  /(^|\.)goodrx\.com$/,
  /(^|\.)costplusdrugs\.com$/,
  /(^|\.)(youtube\.com|youtu\.be|instagram\.com|facebook\.com|tiktok\.com|x\.com|twitter\.com|pinterest\.com|reddit\.com|threads\.net)$/,
  /(^|\.)claude\.ai$/,
  /(^|\.)chatgpt\.com$/,
  /(^|\.)openai\.com$/,
];

/** True for a link to a retailer or brand site (Sovrn-wrapped links count as their merchant). */
export function isShoppingLink(href: string): boolean {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  let host = u.hostname.toLowerCase();
  if (/(^|\.)viglink\.com$/.test(host)) {
    const inner = u.searchParams.get("u");
    return inner ? isShoppingLink(inner) : false;
  }
  host = host.replace(/^www\./, "");
  return !NOT_SHOPPING.some((re) => re.test(host));
}

// --- where the consent notice is needed ------------------------------------
//
// The pixel waits for "Allow" only where the law asks for opt-in consent, or
// where it is advisable because the pixel can reveal a skin concern (health
// data): the EU/EEA, the UK, Switzerland, every country outside the US (we
// only advertise in the US, so this keeps the list short and safe), the US
// states with a comprehensive privacy law or a consumer-health-data law, and
// anywhere the location is unknown. Elsewhere in the US the pixel loads for ad
// visitors without a notice, and /privacy#choices still turns it off.
// Location comes from Cloudflare: CF-IPCountry (always sent) and
// cf-region-code ("Add visitor location headers" managed transform).

/** US states where the pixel waits for consent (comprehensive privacy or consumer health data laws). */
export const CONSENT_US_STATES: ReadonlySet<string> = new Set([
  "CA", "CO", "CT", "DE", "IA", "IN", "KY", "MD", "MN", "MT", "NE", "NH", "NJ", "NV", "OR", "RI", "TN", "TX", "UT", "VA", "WA",
]);

/**
 * True when ad visitors from this place must say "Allow" before the pixel
 * loads. Unknown country or US state (missing header, "XX", Tor "T1") = true.
 */
export function consentRequiredFor(country: string | null | undefined, region: string | null | undefined): boolean {
  const c = country?.trim().toUpperCase() ?? "";
  if (c !== "US") return true;
  const r = region?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}$/.test(r)) return true;
  return CONSENT_US_STATES.has(r);
}
