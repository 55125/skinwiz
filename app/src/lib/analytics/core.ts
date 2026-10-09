// Pure helpers for the first-party site statistics (lib/analytics/store.ts
// records, app/admin reads). Everything that decides what is stored, and in
// what redacted form, lives here so it is unit tested (core.test.ts).
import { createHash } from "node:crypto";

export const EVENT_KINDS = ["pageview", "outbound", "search", "tool", "client_error"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type Device = "mobile" | "tablet" | "desktop";

/** A raw beacon body after validation, before the server adds visitor/device/time. */
export type CleanEvent = {
  kind: EventKind;
  path: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  detail: string | null;
  value: number | null;
  productId: string | null;
};

// Browsers asking not to be tracked. Sec-GPC is Global Privacy Control
// (the privacy policy promises to honor it); DNT is the older signal.
export function optedOut(headers: Headers): boolean {
  return headers.get("sec-gpc") === "1" || headers.get("dnt") === "1";
}

// Anything that isn't a person in a browser. Search crawlers run JavaScript
// too, so they're excluded by name; scripting clients by their library UAs.
const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|uptime|curl|wget|python|go-http|java\/|node-fetch|axios|okhttp|httpclient|phantomjs|puppeteer|playwright|selenium|facebookexternalhit|embedly|whatsapp|telegram/i;

export function isBot(ua: string): boolean {
  return !ua.trim() || BOT_UA.test(ua);
}

export function deviceFromUa(ua: string): Device {
  if (/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|windows phone|blackberry/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * The daily visitor id: sha256(salt | ip | ua), shortened. With the salt
 * deleted after a day it can't be reversed or linked to other days.
 */
export function visitorHash(salt: string, ip: string, ua: string): string {
  return createHash("sha256").update(`${salt}|${ip}|${ua}`, "utf8").digest("hex").slice(0, 16);
}

export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Private links whose path segment is a secret: handout claim links (printed
// as QR codes), check-in answer links, and email sign-in/unsubscribe pages.
const TOKEN_PATHS: [RegExp, string][] = [
  [/^\/h\/[^/]+/, "/h/[token]"],
  [/^\/checkin\/[^/]+/, "/checkin/[token]"],
  [/^\/clinic-tools\/handouts\/[^/]+/, "/clinic-tools/handouts/[id]"],
  [/^\/clinicians\/handouts\/(?!new\b)[^/]+/, "/clinicians/handouts/[id]"],
];

/** Path only (no query or hash), tokens redacted, capped. Null when not a site path. */
export function cleanPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  let path = raw.split(/[?#]/)[0];
  try {
    path = decodeURI(path);
  } catch {
    // keep as sent
  }
  for (const [re, replacement] of TOKEN_PATHS) {
    if (re.test(path)) {
      path = path.replace(re, replacement);
      break;
    }
  }
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path.slice(0, 200);
}

/** The referring site's host, or null for direct visits and our own pages. */
export function referrerHost(raw: unknown, ownHost: string): string | null {
  if (typeof raw !== "string" || !raw) return null;
  let host: string;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:" && u.protocol !== "android-app:") return null;
    host = u.hostname.toLowerCase();
  } catch {
    return null;
  }
  host = host.replace(/^www\./, "").replace(/^m\./, "").replace(/^l\./, "").replace(/^lm\./, "");
  const own = ownHost.toLowerCase().replace(/^www\./, "").split(":")[0];
  if (!host || host === own || host === "localhost") return null;
  return host.slice(0, 100);
}

/** Campaign tags from a page's query string: lowercased, plain characters only. */
export function utmTag(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase().replace(/[^a-z0-9 ._+-]/g, "").slice(0, 60);
  return v || null;
}

/**
 * A search term as stored: lowercased, whitespace collapsed, capped. Terms
 * that look like personal details (an email address, a phone number, long
 * digit runs) are dropped rather than kept.
 */
export function cleanSearchTerm(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const term = raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  if (!term) return null;
  if (/@/.test(term) || /\d[\d\s().-]{6,}\d/.test(term)) return null;
  return term;
}

/** "retailer.com" from an outbound URL (no path: product URLs can carry tracking ids). */
export function outboundHost(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // Sovrn-wrapped links: count the merchant they lead to, not Sovrn.
    if (/(^|\.)viglink\.com$/.test(u.hostname)) {
      const inner = u.searchParams.get("u");
      if (inner) return outboundHost(inner);
    }
    return u.hostname.toLowerCase().replace(/^www\./, "").slice(0, 100);
  } catch {
    return null;
  }
}

const TOOL_RE = /^[a-z0-9][a-z0-9:_-]{0,39}$/;
const PRODUCT_PATH = /^\/(?:product|rx)\/([^/]+)$/;

/** Validates a beacon body. Null means "ignore it". */
export function parseEvent(body: unknown, ownHost: string): CleanEvent | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const kind = b.kind;
  if (typeof kind !== "string" || !(EVENT_KINDS as readonly string[]).includes(kind)) return null;
  const path = cleanPath(b.path);
  if (!path) return null;
  // The admin's own page is never counted.
  if (path === "/admin" || path.startsWith("/admin/")) return null;
  const productMatch = PRODUCT_PATH.exec(path);
  const event: CleanEvent = {
    kind: kind as EventKind,
    path,
    referrer: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    detail: null,
    value: null,
    productId: null,
  };
  switch (event.kind) {
    case "pageview":
      event.referrer = referrerHost(b.referrer, ownHost);
      event.utmSource = utmTag(b.utm_source);
      event.utmMedium = utmTag(b.utm_medium);
      event.utmCampaign = utmTag(b.utm_campaign);
      break;
    case "outbound":
      event.detail = outboundHost(b.href);
      if (!event.detail) return null;
      event.productId = productMatch ? productMatch[1].slice(0, 100) : null;
      break;
    case "search": {
      event.detail = cleanSearchTerm(b.term);
      if (!event.detail) return null;
      const n = Number(b.results);
      event.value = Number.isInteger(n) && n >= 0 ? Math.min(n, 100_000) : null;
      break;
    }
    case "tool":
      if (typeof b.tool !== "string" || !TOOL_RE.test(b.tool)) return null;
      event.detail = b.tool;
      break;
    case "client_error":
      event.detail = typeof b.digest === "string" ? b.digest.replace(/[^A-Za-z0-9-]/g, "").slice(0, 40) || null : null;
      break;
  }
  return event;
}

/** Last `days` UTC days ending today, oldest first. */
export function dayRange(now: Date, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(utcDay(new Date(now.getTime() - i * 86_400_000)));
  return out;
}

/** Percent change, or null when there's no baseline to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
