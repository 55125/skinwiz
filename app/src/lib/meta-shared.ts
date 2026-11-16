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
