// Layered, best-effort defence against bulk scraping of the catalog. None of
// this stops a determined attacker rotating IPs and spoofing a browser -- that
// needs an edge service (e.g. Cloudflare bot management) -- but it shuts out
// AI/data crawlers, throttles default tooling hard, and stops anything
// hammering the site.
// State is in-process, which is right for one Railway instance; with several
// replicas each would enforce its own (looser) share.

import { Resolver } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

// Crawlers that have no business copying the catalog. Search-engine crawlers
// (Googlebot, Bingbot, DuckDuckBot, Applebot) are deliberately absent.
// Refused even while OPEN_FOR_REVIEW is on: no affiliate reviewer uses them.
const ALWAYS_BLOCKED_UA = new RegExp(
  [
    // AI training / dataset crawlers (answer-engine fetchers -- OAI-SearchBot,
    // ChatGPT-User, PerplexityBot -- are allowed: they send readers our way)
    "gptbot", "ccbot", "claudebot", "claude-web", "anthropic-ai",
    "bytespider", "amazonbot", "google-extended", "applebot-extended",
    "meta-externalagent", "meta-externalfetcher", "facebookbot", "diffbot", "imagesiftbot", "omgili",
    "cohere-ai", "mistralai-user", "youbot", "timpibot", "ai2bot", "friendlycrawler", "petalbot",
    // dedicated scraping frameworks
    "scrapy",
  ].join("|"),
  "i",
);

// SEO / data-mining crawlers. Let in while OPEN_FOR_REVIEW is on, since
// affiliate managers size a site from their traffic estimates.
const SEO_UA = /semrushbot|ahrefsbot|mj12bot|dotbot|dataforseobot|blexbot|serpstatbot|barkrowler/i;


// Scripting libraries, headless browsers and generic bots. These aren't
// refused outright: affiliate-network reviewers, link checkers and preview
// renderers use the same tooling to look at a few pages. They get a tight
// budget instead (LIMITS.automated*), which a bulk scraper can't live with.
const AUTOMATION_UA = new RegExp(
  [
    "python-requests", "python-urllib", "python-httpx", "aiohttp", "httpx", "curl/", "wget",
    "libwww", "go-http-client", "java/", "apache-httpclient", "okhttp", "node-fetch", "axios", "undici",
    "got \\(", "postmanruntime", "insomnia", "headlesschrome", "phantomjs", "puppeteer", "playwright",
    "selenium", "webdriver", "crawler", "scraper", "spider",
  ].join("|"),
  "i",
);

// Fetchers that must keep working: platform health checks.
const ALLOWED_UA = /railwayhealthcheck|googlebot|bingbot|duckduckbot|applebot(?!-extended)|slurp|yandexbot/i;

// Search crawlers we let past the rate limits, once the IP is proven to be
// theirs (anyone can send a Googlebot UA). Each operator documents the same
// check: the IP's PTR name sits under their domain and that name resolves
// back to the IP. DuckDuckBot publishes an IP list instead of rDNS, so it
// stays on the normal limits.
const VERIFIABLE_CRAWLERS: { ua: RegExp; hosts: RegExp }[] = [
  { ua: /googlebot|google-inspectiontool/i, hosts: /\.(googlebot|google|googleusercontent)\.com$/i },
  { ua: /bingbot/i, hosts: /\.search\.msn\.com$/i },
  { ua: /applebot(?!-extended)/i, hosts: /\.applebot\.apple\.com$/i },
  { ua: /yandexbot/i, hosts: /\.yandex\.(ru|net|com)$/i },
];

const verified = new Map<string, { ok: boolean; until: number }>();
const pending = new Map<string, Promise<boolean>>();
const MAX_VERIFIED = 10_000;
const VERIFY_OK_MS = 24 * 3_600_000;
const VERIFY_FAIL_MS = 3_600_000;
const DNS_TIMEOUT_MS = 1_500;

/** The hostname pattern to verify against, if the UA claims to be a verifiable search crawler. */
export function claimedCrawler(ua: string): RegExp | null {
  return VERIFIABLE_CRAWLERS.find((c) => c.ua.test(ua))?.hosts ?? null;
}

// Reverse lookup, check the domain, then forward-confirm the name maps back to
// the same IP. Any DNS error or timeout counts as "not verified".
async function lookupCrawler(ip: string, hosts: RegExp): Promise<boolean> {
  const family = isIP(ip);
  if (!family) return false;
  const dns = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: 1 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      dns.cancel();
      reject(new Error("dns timeout"));
    }, DNS_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      (async () => {
        const names = (await dns.reverse(ip)).filter((n) => hosts.test(n.replace(/\.$/, "")));
        const type = family === 6 ? "ipv6" : "ipv4";
        for (const name of names) {
          const addrs = await (family === 6 ? dns.resolve6(name) : dns.resolve4(name)).catch(() => []);
          // BlockList compares parsed addresses, so IPv6 spelling differences don't matter
          const list = new BlockList();
          for (const a of addrs) list.addAddress(a, type);
          if (list.check(ip, type)) return true;
        }
        return false;
      })(),
      deadline,
    ]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Whether this IP is a genuine search crawler matching the UA's claim. Results
 * are cached per IP; failures (including DNS trouble) are cached for less long
 * and just mean the request gets the ordinary limits.
 */
export async function verifyCrawler(ip: string, ua: string, now = Date.now()): Promise<boolean> {
  const hosts = claimedCrawler(ua);
  if (!hosts) return false;
  const ip0 = ip.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, "");
  // Keyed by IP + claimed operator so a Google IP can't vouch for a "bingbot" UA.
  const key = `${hosts.source}|${ip0}`;
  const hit = verified.get(key);
  if (hit && hit.until > now) return hit.ok;
  let p = pending.get(key);
  if (!p) {
    p = lookupCrawler(ip0, hosts).then((ok) => {
      if (verified.size >= MAX_VERIFIED) verified.clear();
      verified.set(key, { ok, until: Date.now() + (ok ? VERIFY_OK_MS : VERIFY_FAIL_MS) });
      pending.delete(key);
      return ok;
    });
    pending.set(key, p);
  }
  return p;
}

// Recent heavy visitors, for the admin page. In-process like the counters
// above, so it empties on each deploy; each entry is also logged. Kept on
// globalThis because the proxy and the admin page are separate bundles that
// each get their own copy of this module (one Node process on Railway).
export type HeavyVisitor = { ip: string; ua: string; detailPagesThisHour: number; what: string; at: number };
const HEAVY_KEY = Symbol.for("skinwiz.antiScrape.heavyVisitors");
const heavy: HeavyVisitor[] = ((globalThis as Record<symbol, HeavyVisitor[] | undefined>)[HEAVY_KEY] ??= []);
const MAX_HEAVY = 50;

function noteHeavy(ip: string, ua: string, detailPagesThisHour: number, what: string, at: number) {
  heavy.unshift({ ip, ua: ua.slice(0, 200), detailPagesThisHour, what, at });
  if (heavy.length > MAX_HEAVY) heavy.length = MAX_HEAVY;
  console.warn(`[anti-scrape] ${what}: ip=${ip} detail/h=${detailPagesThisHour} ua=${JSON.stringify(ua.slice(0, 200))}`);
}

export function recentHeavyVisitors(): HeavyVisitor[] {
  return heavy.slice();
}

export type Verdict = { action: "allow" } | { action: "block"; status: number; reason: string; retryAfter?: number };

type Window = { start: number; count: number };
type Client = { minute: Window; hour: Window; apiMinute: Window; routerMinute: Window; bannedUntil: number };

const clients = new Map<string, Client>();
const MAX_CLIENTS = 50_000;

export const LIMITS = {
  pagesPerMinute: 100,
  // Client-side router fetches (link prefetches and navigations). One product
  // page can prefetch 40+ ingredient links as they scroll into view.
  routerFetchesPerMinute: 600,
  detailPagesPerHour: 500,
  // budgets for AUTOMATION_UA clients: enough to review a site, not copy it
  automatedPagesPerMinute: 20,
  automatedDetailPagesPerHour: 60,
  apiPerMinute: 40,
  // While OPEN_FOR_REVIEW is on, everyone (tooling included) gets one high
  // ceiling instead: far above anyone clicking through the site, well below
  // copying all ~24k detail pages in one sitting.
  review: { pagesPerMinute: 600, routerFetchesPerMinute: 1_200, detailPagesPerHour: 3_000, apiPerMinute: 240 },
  // detail pages in an hour that put an IP on the admin page's heavy-visitor list
  heavyDetailPagesPerHour: 1_000,
  banMs: 15 * 60_000,
  // strikes (limit breaches) before a ban
  strikes: 3,
};

const strikes = new Map<string, number>();

function bump(w: Window, now: number, span: number): number {
  if (now - w.start >= span) {
    w.start = now;
    w.count = 0;
  }
  return ++w.count;
}

function sweep(now: number) {
  if (clients.size < MAX_CLIENTS) return;
  for (const [ip, c] of clients) {
    if (c.bannedUntil < now && now - c.hour.start > 3_600_000) clients.delete(ip);
  }
  if (clients.size >= MAX_CLIENTS) clients.clear();
  strikes.clear();
}

export function clientIp(headers: Headers): string | null {
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  // the last hop is the one our own proxy appended; earlier ones are client-supplied
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",").pop()!.trim();
  return null;
}

export type RequestInfo = {
  pathname: string;
  method: string;
  headers: Headers;
  ip: string | null;
  // set when verifyCrawler() confirmed the IP belongs to a search engine
  verifiedCrawler?: boolean;
  // OPEN_FOR_REVIEW (lib/review-mode.ts): SEO crawlers allowed, LIMITS.review apply
  reviewMode?: boolean;
  now?: number;
};

const DETAIL_PATH = /^\/(product|ingredient)\//;
const DATA_API = /^\/api\/(search|products)\//;
const IMAGE_PATH = /^\/img\/[^?]*\.webp$/;

export function judge(req: RequestInfo): Verdict {
  const now = req.now ?? Date.now();
  const ua = req.headers.get("user-agent") ?? "";
  const path = req.pathname;

  // Always reachable so well-behaved crawlers can read the rules.
  if (path === "/robots.txt" || path === "/sitemap.xml") return { action: "allow" };

  let automated = false;
  if (!ALLOWED_UA.test(ua)) {
    if (!ua.trim()) return { action: "block", status: 403, reason: "missing user agent" };
    if (ALWAYS_BLOCKED_UA.test(ua) || (!req.reviewMode && SEO_UA.test(ua))) return { action: "block", status: 403, reason: "automated client" };
    // a bare "Java/17.0.2"-style UA is tooling too, not a browser
    automated = AUTOMATION_UA.test(ua) || ua.trim().length < 12;
  }

  // Self-hosted product images: a product grid loads ~24 thumbnails at once,
  // so they never count as page views. The proxy matcher already skips
  // .webp paths (src/proxy.ts); this keeps that true if the matcher changes.
  if (IMAGE_PATH.test(path) && (req.method === "GET" || req.method === "HEAD")) return { action: "allow" };

  // The JSON endpoints exist for our own pages. Browsers label those calls
  // same-origin; a script scraping them directly generally won't.
  if (DATA_API.test(path) && req.method === "GET") {
    const site = req.headers.get("sec-fetch-site");
    if (site !== "same-origin") return { action: "block", status: 403, reason: "api is for on-site use" };
  }

  const ip = req.ip;
  if (!ip) return { action: "allow" };
  // Verified search crawlers walk all ~24k detail pages; the limits and bans
  // below would lock them out for good.
  if (req.verifiedCrawler) return { action: "allow" };
  sweep(now);

  let c = clients.get(ip);
  if (!c) {
    c = { minute: { start: now, count: 0 }, hour: { start: now, count: 0 }, apiMinute: { start: now, count: 0 }, routerMinute: { start: now, count: 0 }, bannedUntil: 0 };
    clients.set(ip, c);
  }
  if (c.bannedUntil > now) {
    return { action: "block", status: 429, reason: "temporarily blocked", retryAfter: Math.ceil((c.bannedUntil - now) / 1000) };
  }

  const isApi = DATA_API.test(path);
  const review = req.reviewMode;
  // Next strips its own router headers (rsc, next-router-prefetch) before the
  // proxy runs, so spot router fetches by the browser's Sec-Fetch headers:
  // fetch() is dest "empty", a real page load is "document". They get their
  // own generous budget and don't count toward the per-page limits.
  const isRouterFetch =
    !isApi &&
    req.headers.get("sec-fetch-dest") === "empty" &&
    req.headers.get("sec-fetch-site") === "same-origin";
  const L = review
    ? { ...LIMITS.review, automatedPagesPerMinute: LIMITS.review.pagesPerMinute, automatedDetailPagesPerHour: LIMITS.review.detailPagesPerHour }
    : LIMITS;
  let over: boolean;
  if (isRouterFetch) {
    over = bump(c.routerMinute, now, 60_000) > L.routerFetchesPerMinute;
  } else {
    over =
      (isApi && bump(c.apiMinute, now, 60_000) > L.apiPerMinute) ||
      (!isApi && bump(c.minute, now, 60_000) > (automated ? L.automatedPagesPerMinute : L.pagesPerMinute));
    if (DETAIL_PATH.test(path)) {
      const n = bump(c.hour, now, 3_600_000);
      if (n === LIMITS.heavyDetailPagesPerHour) noteHeavy(ip, ua, n, "1,000+ detail pages this hour", now);
      over ||= n > (automated ? L.automatedDetailPagesPerHour : L.detailPagesPerHour);
    }
  }
  if (!over) return { action: "allow" };

  const s = (strikes.get(ip) ?? 0) + 1;
  strikes.set(ip, s);
  if (s >= LIMITS.strikes) {
    c.bannedUntil = now + LIMITS.banMs;
    strikes.delete(ip);
    noteHeavy(ip, ua, c.hour.count, "banned for 15 min after repeated limit hits", now);
  }
  return { action: "block", status: 429, reason: "rate limit", retryAfter: 60 };
}
