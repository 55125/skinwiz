// Browser side of Meta ad measurement (rules in lib/meta-shared.ts). Used by
// the statistics beacon (components/analytics-beacon.tsx), the consent banner
// and pixel loader (components/meta-consent.tsx), and the privacy choices
// control (components/privacy-choices.tsx). Every storage access is wrapped:
// private windows and blocked storage just mean nothing is sent to Meta.
import {
  META_EVENTS,
  STORAGE,
  clickStillFresh,
  fbcFromClickId,
  validEventId,
  validFbc,
  validPixelId,
  type MetaConsent,
  type MetaEventName,
} from "./meta-shared";

export const CONSENT_EVENT = "sw-meta-consent";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; loaded?: boolean; version?: string; push?: unknown };
type MetaWindow = Window & { fbq?: Fbq; _fbq?: Fbq; __swPixelId?: string };

function read(store: "local" | "session", key: string): string | null {
  try {
    return (store === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function write(store: "local" | "session", key: string, value: string | null): void {
  try {
    const s = store === "local" ? window.localStorage : window.sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // storage unavailable: nothing is remembered, so nothing is sent
  }
}

/** Global Privacy Control or Do Not Track: nothing ever goes to Meta. */
export function browserOptedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

export function getConsent(): MetaConsent {
  const v = read("local", STORAGE.consent);
  return v === "granted" || v === "denied" ? v : null;
}

/** null forgets the choice: the next visit from an ad asks again. */
export function setConsent(value: MetaConsent): void {
  write("local", STORAGE.consent, value);
  if (value === "denied") {
    write("local", STORAGE.click, null);
    write("session", STORAGE.landing, null);
    clearMetaCookies();
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** The stored ad click's fbc while it is inside the click window, else null. */
export function adClickFbc(): string | null {
  const raw = read("local", STORAGE.click);
  if (!raw) return null;
  try {
    const click = JSON.parse(raw) as { fbc?: unknown; at?: unknown };
    return clickStillFresh(click, Date.now()) ? (click.fbc as string) : null;
  } catch {
    return null;
  }
}

/**
 * Remembers an fbclid in this page's address. Returns the fbc when this page
 * load is an ad landing (an fbclid is in the URL), else null. Idempotent.
 */
export function captureAdClick(): string | null {
  if (browserOptedOut() || getConsent() === "denied") return null;
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (!fbclid) return null;
  const existing = adClickFbc();
  if (existing && existing.endsWith(`.${fbclid}`)) return existing;
  const fbc = fbcFromClickId(fbclid, Date.now());
  if (!fbc) return null;
  write("local", STORAGE.click, JSON.stringify({ fbc, at: Date.now() }));
  return fbc;
}

/** True when this browser may send ad-measurement events at all. */
export function metaEligible(): boolean {
  return !browserOptedOut() && getConsent() !== "denied" && adClickFbc() !== null;
}

function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export type BeaconMeta = { event_id: string; fbc: string; landing?: true };

/**
 * For a page view: the landing event when this page load carries an fbclid
 * not already counted in this tab, else null. Fires the pixel copy too when
 * the pixel is loaded.
 */
export function landingMeta(): BeaconMeta | null {
  const fbc = captureAdClick();
  if (!fbc || !metaEligible()) return null;
  const prior = read("session", STORAGE.landing);
  if (prior) {
    try {
      if ((JSON.parse(prior) as { fbc?: string }).fbc === fbc) return null;
    } catch {
      // overwrite below
    }
  }
  const eventId = newEventId();
  write("session", STORAGE.landing, JSON.stringify({ eventId, fbc }));
  pixelEvent(META_EVENTS.landing, eventId);
  return { event_id: eventId, fbc, landing: true };
}

/** For a click to a retailer or brand site: the RetailerClick event, or null. */
export function retailerClickMeta(): BeaconMeta | null {
  if (!metaEligible()) return null;
  const fbc = adClickFbc()!;
  const eventId = newEventId();
  pixelEvent(META_EVENTS.retailerClick, eventId);
  return { event_id: eventId, fbc };
}

/** This tab's landing event, so the pixel can send its copy after a late "Allow". */
export function pendingLanding(): { eventId: string; fbc: string } | null {
  const raw = read("session", STORAGE.landing);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { eventId?: unknown; fbc?: unknown };
    return validEventId(v.eventId) && validFbc(v.fbc) ? { eventId: v.eventId, fbc: v.fbc } : null;
  } catch {
    return null;
  }
}

// --- the pixel (only after "Allow") ---------------------------------------

export function pixelLoaded(): boolean {
  return typeof (window as MetaWindow).__swPixelId === "string";
}

/**
 * Loads Meta's pixel. Automatic event detection (autoConfig) is turned off so
 * the pixel never reads buttons or forms on our pages; only the PageView and
 * the two events we fire explicitly are sent. The ad click id is handed to it
 * as the _fbc cookie, since the landing URL may be gone by the time of consent.
 */
export function loadPixel(pixelId: string, fbc: string): void {
  const w = window as MetaWindow;
  if (pixelLoaded()) return;
  setCookie("_fbc", fbc, 90 * 86_400);
  if (!w.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    w.fbq = fbq;
    w._fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  w.fbq!("set", "autoConfig", false, pixelId);
  w.fbq!("init", pixelId);
  w.__swPixelId = pixelId;
}

export function pixelPageView(): void {
  if (pixelLoaded()) (window as MetaWindow).fbq?.("track", "PageView");
}

export function pixelEvent(name: MetaEventName, eventId: string): void {
  if (pixelLoaded()) (window as MetaWindow).fbq?.("trackCustom", name, {}, { eventID: eventId });
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  try {
    document.cookie = `${name}=${value}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax; Secure`;
  } catch {
    // ignore
  }
}

/** Removes Meta's cookies on this site (the pixel sets them on the bare domain too). */
export function clearMetaCookies(): void {
  const host = window.location.hostname;
  const domains = ["", `; Domain=${host}`, `; Domain=.${host.replace(/^www\./, "")}`];
  for (const name of ["_fbp", "_fbc"]) {
    for (const d of domains) {
      try {
        document.cookie = `${name}=; Max-Age=0; Path=/${d}`;
      } catch {
        // ignore
      }
    }
  }
}

// --- server config ----------------------------------------------------------

export type MetaSiteConfig = { pixelId: string | null; consentRequired: boolean };

let configPromise: Promise<MetaSiteConfig> | null = null;

/**
 * The pixel id and whether this visitor's location needs the consent notice
 * (GET /api/meta/config). Fetched once per page load. Any failure counts as
 * "consent required", so the pixel never loads without a notice by mistake.
 */
export function fetchMetaConfig(): Promise<MetaSiteConfig> {
  configPromise ??= fetch("/api/meta/config", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { pixelId?: unknown; consentRequired?: unknown } | null) => ({
      pixelId: validPixelId(d?.pixelId) ? d.pixelId : null,
      consentRequired: d?.consentRequired !== false,
    }))
    .catch(() => {
      configPromise = null;
      return { pixelId: null, consentRequired: true };
    });
  return configPromise;
}
