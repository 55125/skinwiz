// Two independent switches, read at call time (not module load) so tests and
// a redeploy with new env both see the current value:
//  - SOVRN_SITE_API_KEY alone turns on outbound link wrapping through
//    Sovrn's Redirect API (redirect.ts).
//  - SOVRN_SITE_API_KEY + SOVRN_SECRET_KEY turn on the Price Comparison API:
//    lookups, view recording, and showing stored quotes. Without both, no
//    quote is ever shown, even if rows exist.

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

/** True when any live price source is configured (only Sovrn today). */
export function livePricesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return sovrnConfig(env) !== null;
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
