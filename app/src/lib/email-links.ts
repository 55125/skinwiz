// Absolute URLs that go into emails. Signed tokens (lib/tokens.ts) carry the
// authorization, so none of these needs a login.
import { siteUrl } from "@/lib/site-url";
import { appSecret, signToken, verifyToken } from "@/lib/tokens";

export type UnsubscribeCategory = "checkins" | "safety";

const DAY_MS = 24 * 60 * 60_000;
// Check-in answers stay valid for two months after the email goes out.
export const CHECKIN_TOKEN_TTL_MS = 60 * DAY_MS;
// Unsubscribe links must keep working for as long as someone might click an
// old email.
const UNSUBSCRIBE_TTL_MS = 3 * 365 * DAY_MS;

export function checkinAnswerUrl(checkinId: number, answer: string, now: Date): string {
  const token = signToken(appSecret(), "checkin", String(checkinId), new Date(now.getTime() + CHECKIN_TOKEN_TTL_MS));
  return `${siteUrl()}/checkin/${token}?a=${answer}`;
}

export function verifyCheckinToken(token: string, now: Date): number | null {
  const v = verifyToken(appSecret(), "checkin", token, now);
  const id = v ? Number(v.subject) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function unsubscribeToken(personId: string, category: UnsubscribeCategory, now: Date): string {
  return signToken(appSecret(), "unsub", `${personId}:${category}`, new Date(now.getTime() + UNSUBSCRIBE_TTL_MS));
}

/** Works as the List-Unsubscribe target (one-click POST) and as a plain link (GET -> confirm page). */
export function unsubscribeUrl(personId: string, category: UnsubscribeCategory, now: Date): string {
  return `${siteUrl()}/api/email/unsubscribe?t=${unsubscribeToken(personId, category, now)}`;
}

export function verifyUnsubscribeToken(token: string, now: Date): { personId: string; category: UnsubscribeCategory } | null {
  const v = verifyToken(appSecret(), "unsub", token, now);
  if (!v) return null;
  const [personId, category] = v.subject.split(":");
  if (!personId || (category !== "checkins" && category !== "safety")) return null;
  return { personId, category };
}

// Where a sign-in may land afterwards. Only same-site paths under a short
// allow-list (the clinician area today), so a crafted link can't bounce
// someone off-site or into an arbitrary page.
const NEXT_PREFIXES = ["/clinicians", "/regimen", "/h/"];
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string" || next.length > 200 || !next.startsWith("/") || next.startsWith("//") || /[\\\s]/.test(next)) return null;
  return NEXT_PREFIXES.some((p) => next === p || next.startsWith(p.endsWith("/") ? p : `${p}/`) || next.startsWith(`${p}?`)) ? next : null;
}

export function signInUrl(token: string, next?: string | null): string {
  const safe = safeNextPath(next);
  return `${siteUrl()}/email/verify?token=${encodeURIComponent(token)}${safe ? `&next=${encodeURIComponent(safe)}` : ""}`;
}

export const settingsUrl = () => `${siteUrl()}/account`;
export const productUrl = (productId: string) => `${siteUrl()}/product/${encodeURIComponent(productId)}`;
