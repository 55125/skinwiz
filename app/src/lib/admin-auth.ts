// The owner's /admin page: one shared password (ADMIN_PASSWORD), a signed
// httpOnly session cookie, and a login throttle. Pure apart from reading
// env, so it is unit tested (admin-auth.test.ts); the cookie is read in
// app/admin and set in app/api/admin/login.
//
// - Production with ADMIN_PASSWORD unset (or shorter than 8 characters):
//   the admin page is disabled and answers 404.
// - Development: falls back to DEV_ADMIN_PASSWORD so the page can be tried.
// - Changing ADMIN_PASSWORD (or APP_SECRET) signs every admin out, because
//   the cookie's signing key is derived from both.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { appSecret, signToken, verifyToken } from "@/lib/tokens";

export const ADMIN_COOKIE = "sw_admin";
export const ADMIN_SESSION_MS = 12 * 60 * 60_000;
export const DEV_ADMIN_PASSWORD = "dev-admin";
const MIN_LENGTH = 8;

export function adminPassword(env: Record<string, string | undefined> = process.env): string | null {
  const p = env.ADMIN_PASSWORD;
  if (p && p.length >= MIN_LENGTH) return p;
  return env.NODE_ENV === "production" ? null : DEV_ADMIN_PASSWORD;
}

/** Constant-time: both sides are hashed first, so neither length nor content leaks through timing. */
export function passwordMatches(attempt: string, expected: string): boolean {
  const a = createHash("sha256").update(attempt, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

function signingKey(password: string, secret: string): string {
  return createHmac("sha256", secret).update(`admin-session|${password}`, "utf8").digest("base64url");
}

export function issueAdminToken(password: string, secret: string, now: Date): string {
  return signToken(signingKey(password, secret), "admin", "owner", new Date(now.getTime() + ADMIN_SESSION_MS));
}

export function isValidAdminToken(token: string | undefined, password: string, secret: string, now: Date): boolean {
  if (!token) return false;
  return verifyToken(signingKey(password, secret), "admin", token, now)?.subject === "owner";
}

/** Reads the cookie value against the current password and APP_SECRET. */
export function isAdminCookie(token: string | undefined, now = new Date()): boolean {
  const password = adminPassword();
  if (!password) return false;
  return isValidAdminToken(token, password, appSecret(), now);
}

/** Advisory for the dashboard's health panel. */
export function passwordWarning(password: string): string | null {
  if (password === DEV_ADMIN_PASSWORD) return "Using the development password. Set ADMIN_PASSWORD.";
  if (password.length < 14 || /^[a-z]+$/.test(password)) {
    return "The admin password is short or letters-only. A longer passphrase (14+ characters, mixed) is much harder to guess.";
  }
  return null;
}

// Failed-login throttle, in memory (one container; a restart clears it).
// Per IP: 5 failures in 15 minutes locks that IP for 15 minutes. Globally:
// 20 failures in 15 minutes from anywhere locks all logins for 15 minutes,
// which caps guessing from many addresses at 80 tries an hour.
export const THROTTLE = { perIp: 5, global: 20, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };

type Window = { count: number; start: number; lockedUntil: number };

export class LoginThrottle {
  private ips = new Map<string, Window>();
  private all: Window = { count: 0, start: 0, lockedUntil: 0 };

  /** Seconds until this IP may try again, or 0 when allowed. */
  retryAfter(ip: string, now: number): number {
    const until = Math.max(this.ips.get(ip)?.lockedUntil ?? 0, this.all.lockedUntil);
    return until > now ? Math.ceil((until - now) / 1000) : 0;
  }

  fail(ip: string, now: number): void {
    if (this.ips.size > 10_000) {
      for (const [k, w] of this.ips) if (w.lockedUntil <= now && now - w.start > THROTTLE.windowMs) this.ips.delete(k);
    }
    const w = this.ips.get(ip) ?? { count: 0, start: now, lockedUntil: 0 };
    this.ips.set(ip, w);
    bump(w, now, THROTTLE.perIp);
    bump(this.all, now, THROTTLE.global);
  }

  succeed(ip: string): void {
    this.ips.delete(ip);
  }
}

function bump(w: Window, now: number, limit: number) {
  if (now - w.start > THROTTLE.windowMs) {
    w.start = now;
    w.count = 0;
  }
  w.count++;
  if (w.count >= limit) {
    w.lockedUntil = now + THROTTLE.lockMs;
    w.count = 0;
    w.start = now;
  }
}

export const loginThrottle = new LoginThrottle();
