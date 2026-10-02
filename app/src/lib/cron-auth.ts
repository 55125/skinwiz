// Shared by the proxy (to let the cron call past the anti-scrape limits) and
// the cron route itself (which checks again). Kept free of database imports
// so the proxy bundle stays small.
import { timingSafeEqual } from "node:crypto";

export const CRON_PATH_PREFIX = "/api/cron/";

/** True when the request carries `Authorization: Bearer $CRON_SECRET` (secret must be 24+ chars). */
export function isCronAuthorized(headers: Headers): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 24) return false;
  const auth = headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const a = Buffer.from(auth.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
