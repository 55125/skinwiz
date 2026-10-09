// Two independent switches, read at call time (not module load) so tests and
// a redeploy with new env both see the current value:
//  - SOVRN_SITE_API_KEY alone turns on outbound link wrapping through
//    Sovrn's Redirect API (redirect.ts).
//  - SOVRN_SITE_API_KEY + SOVRN_SECRET_KEY turn on the Price Comparison API:
//    lookups, view recording, and showing stored quotes. Without both, no
//    quote is ever shown, even if rows exist.
//  - KROGER_CLIENT_ID + KROGER_CLIENT_SECRET turn on Kroger's Products API
//    (kroger.ts): shelf prices and stock at one Kroger store, found nearest
//    to KROGER_ZIP (default 45202, downtown Cincinnati) or pinned with
//    KROGER_LOCATION_ID. That zip is ours, never a visitor's.

import { PRICE_MAX_AGE_MS } from "@/lib/equivalence";

export type SovrnConfig = { siteKey: string; secret: string };

/** The site API key, for link wrapping. Needs no secret. */
export function sovrnSiteKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.SOVRN_SITE_API_KEY?.trim() || null;
}

export function sovrnConfig(env: NodeJS.ProcessEnv = process.env): SovrnConfig | null {
  const siteKey = env.SOVRN_SITE_API_KEY?.trim();
  const secret = env.SOVRN_SECRET_KEY?.trim();
  return siteKey && secret ? { siteKey, secret } : null;
}

export type KrogerConfig = { clientId: string; clientSecret: string; zip: string; locationId: string | null };

export const KROGER_DEFAULT_ZIP = "45202";

export function krogerConfig(env: NodeJS.ProcessEnv = process.env): KrogerConfig | null {
  const clientId = env.KROGER_CLIENT_ID?.trim();
  const clientSecret = env.KROGER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const zip = env.KROGER_ZIP?.trim();
  const locationId = env.KROGER_LOCATION_ID?.trim();
  return {
    clientId,
    clientSecret,
    zip: zip && /^\d{5}$/.test(zip) ? zip : KROGER_DEFAULT_ZIP,
    locationId: locationId && /^[A-Za-z0-9]{8}$/.test(locationId) ? locationId : null,
  };
}

/** True when any live price source is configured (Sovrn or Kroger). */
export function livePricesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return sovrnConfig(env) !== null || krogerConfig(env) !== null;
}

const HOUR = 3_600_000;
/** A matched product is looked up again after this long. */
export const PRICE_STALE_MS = 24 * HOUR;
/** A quote older than this is never displayed, whatever the job did. */
export const PRICE_DISPLAY_MAX_AGE_MS = PRICE_MAX_AGE_MS;
/** A product with no match waits this long, doubling per miss, up to the cap. */
export const MISS_RETRY_MS = 7 * 24 * HOUR;
export const MISS_RETRY_MAX_MS = 90 * 24 * HOUR;
/** A product whose lookup failed for a transient reason is retried after this. */
export const ERROR_RETRY_MS = HOUR;
/** Product pages viewed within this window are refreshed before the sweep. */
export const RECENT_VIEW_MS = 7 * 24 * HOUR;

/** Sovrn allows 100 req/s per account; stay at a tenth of that. */
export const SOVRN_MIN_INTERVAL_MS = 100;

export function maxRequestsPerRun(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.SOVRN_MAX_REQUESTS_PER_RUN);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 300;
}

/** Kroger allows 10,000 Products API calls a day; 24 hourly runs of 200 stay well under. */
export const KROGER_MIN_INTERVAL_MS = 200;

export function krogerMaxRequestsPerRun(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.KROGER_MAX_REQUESTS_PER_RUN);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 200;
}
