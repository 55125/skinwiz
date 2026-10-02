// Token primitives for email links. Two kinds:
//
// - One-time sign-in tokens: random, stored only as a SHA-256 hash, checked
//   against expiry and single-use state in the database (lib/identity.ts).
// - Signed tokens (check-in answers, unsubscribe): stateless HMAC-SHA256 over
//   a small payload with an expiry, so a link works without a login and
//   without a lookup table, but can't be forged or altered.
//
// Pure functions only (secret and clock are parameters), so they're unit
// tested in tokens.test.ts.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SIGN_IN_TTL_MS = 15 * 60_000;

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isExpired(expiresAtIso: string, now: Date): boolean {
  return Date.parse(expiresAtIso) <= now.getTime();
}

function hmac(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data, "utf8").digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * `kind` namespaces the token (a check-in token can't be replayed as an
 * unsubscribe token); `subject` is what it authorizes (a check-in id, a
 * person id + category). Format: base64url(kind|subject|expEpochSec).sig
 */
export function signToken(secret: string, kind: string, subject: string, expiresAt: Date): string {
  const payload = Buffer.from(`${kind}|${subject}|${Math.floor(expiresAt.getTime() / 1000)}`, "utf8").toString("base64url");
  return `${payload}.${hmac(secret, payload)}`;
}

export type VerifiedToken = { subject: string; expiresAt: Date };

/** Null when malformed, forged, of another kind, or expired. */
export function verifyToken(secret: string, kind: string, token: string, now: Date): VerifiedToken | null {
  if (typeof token !== "string" || token.length > 512) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, hmac(secret, payload))) return null;
  const parts = Buffer.from(payload, "base64url").toString("utf8").split("|");
  if (parts.length !== 3 || parts[0] !== kind) return null;
  const exp = Number(parts[2]);
  if (!Number.isFinite(exp)) return null;
  const expiresAt = new Date(exp * 1000);
  if (expiresAt.getTime() <= now.getTime()) return null;
  return { subject: parts[1], expiresAt };
}

let warned = false;

// APP_SECRET signs check-in and unsubscribe links. Required in production;
// in development a fixed placeholder keeps links working across restarts.
export function appSecret(): string {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET must be set (32+ random characters) to sign email links.");
  }
  if (!warned) {
    warned = true;
    console.warn("[tokens] APP_SECRET not set; using an insecure development secret.");
  }
  return "dev-only-insecure-secret-do-not-use-in-production";
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  // Deliberately simple: one @, a dot in the domain, no spaces or angle
  // brackets. Deliverability is proven by the link, not by a regex.
  if (!/^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(email)) return null;
  return email;
}

/** "m•••@gmail.com" -- for confirmation screens, without exposing the full address. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 1)}•••@${domain}`;
}
