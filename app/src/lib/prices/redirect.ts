// Outbound shopping links through Sovrn's Redirect API
// (https://developer.sovrn.com/reference/building-monetized-urls):
//   https://redirect.viglink.com?key={SITE_API_KEY}&u={encoded url}&cuid={id}
// Sovrn wraps any merchant link this way, without checking that it has a
// program with that merchant. Pure apart from reading env.
//
// Only retailer and brand pages are wrapped, and only while
// SOVRN_SITE_API_KEY is set (the secret isn't needed for this; Sovrn issues
// the key once a site is approved). Never wrapped: regulatory and clinical
// sources (FDA, DailyMed/NIH, AAD), Rx price checks (GoodRx, Cost Plus),
// anything on an Rx page, links that are already affiliate links, and
// non-http(s) URLs. The CUID names the page type only ("product", "same",
// "plan"), never anything about the visitor.
import { sovrnSiteKey } from "./config";

export const SOVRN_REDIRECT_BASE = "https://redirect.viglink.com";

export type LinkPlacement = "product" | "same" | "plan";

const NEVER_WRAP: RegExp[] = [
  /(^|\.)fda\.gov$/,
  /(^|\.)nih\.gov$/, // DailyMed (dailymed.nlm.nih.gov), PubChem, MedlinePlus
  /(^|\.)gov$/,
  /(^|\.)aad\.org$/,
  /(^|\.)goodrx\.com$/,
  /(^|\.)costplusdrugs\.com$/,
  /(^|\.)viglink\.com$/,
  /(^|\.)sovrn\.(com|co)$/,
  /(^|\.)ewg\.org$/,
  /(^|\.)youtube\.com$/,
];

const CUID_RE = /^[A-Za-z0-9]{1,32}$/;

export function isWrappable(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const host = u.hostname.toLowerCase();
  return !NEVER_WRAP.some((re) => re.test(host));
}

/** The Sovrn redirect for a merchant URL. The CUID must be 1-32 letters/digits. */
export function sovrnRedirectUrl(apiKey: string, url: string, cuid: string): string {
  if (!CUID_RE.test(cuid)) throw new Error(`Invalid Sovrn CUID: ${cuid}`);
  return `${SOVRN_REDIRECT_BASE}?key=${encodeURIComponent(apiKey)}&u=${encodeURIComponent(url)}&cuid=${cuid}`;
}

export type OutboundLink = { href: string; rel: string; wrapped: boolean };

/**
 * An outbound retailer/brand link: wrapped through Sovrn (rel gains
 * "sponsored nofollow") when enabled and allowed, otherwise returned
 * exactly as given with the caller's rel, so pages are unchanged while
 * the feature is dormant.
 */
export function outboundLink(
  url: string,
  opts: { placement: LinkPlacement; rel: string; isRx?: boolean },
  env: NodeJS.ProcessEnv = process.env,
): OutboundLink {
  const key = sovrnSiteKey(env);
  if (!key || opts.isRx || !isWrappable(url)) return { href: url, rel: opts.rel, wrapped: false };
  const rel = [...new Set([...opts.rel.split(/\s+/).filter(Boolean), "sponsored", "nofollow"])].join(" ");
  return { href: sovrnRedirectUrl(key, url, opts.placement), rel, wrapped: true };
}
