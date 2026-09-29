// Layered, best-effort defence against bulk scraping of the catalog. None of
// this stops a determined attacker rotating IPs and spoofing a browser -- that
// needs an edge service (e.g. Cloudflare bot management) -- but it shuts out
// the default tooling, AI/data crawlers, and anything hammering the site.
// State is in-process, which is right for one Railway instance; with several
// replicas each would enforce its own (looser) share.

// Crawlers that have no business copying the catalog. Search-engine crawlers
// (Googlebot, Bingbot, DuckDuckBot, Applebot) are deliberately absent.
const BLOCKED_UA = new RegExp(
  [
    // AI training / dataset crawlers (answer-engine fetchers -- OAI-SearchBot,
    // ChatGPT-User, PerplexityBot -- are allowed: they send readers our way)
    "gptbot", "ccbot", "claudebot", "claude-web", "anthropic-ai",
    "bytespider", "amazonbot", "google-extended", "applebot-extended",
    "meta-externalagent", "meta-externalfetcher", "facebookbot", "diffbot", "imagesiftbot", "omgili",
    "cohere-ai", "mistralai-user", "youbot", "timpibot", "ai2bot", "friendlycrawler", "petalbot",
    // SEO / data-mining crawlers
    "semrushbot", "ahrefsbot", "mj12bot", "dotbot", "dataforseobot", "blexbot", "serpstatbot", "barkrowler",
    // scripting libraries and headless automation
    "python-requests", "python-urllib", "python-httpx", "aiohttp", "httpx", "scrapy", "curl/", "wget",
    "libwww", "go-http-client", "java/", "apache-httpclient", "okhttp", "node-fetch", "axios", "undici",
    "got \\(", "postmanruntime", "insomnia", "headlesschrome", "phantomjs", "puppeteer", "playwright",
    "selenium", "webdriver", "crawler", "scraper", "spider(?!.*(googlebot|bingbot))",
  ].join("|"),
  "i",
);

// Fetchers that must keep working: platform health checks.
const ALLOWED_UA = /railwayhealthcheck|googlebot|bingbot|duckduckbot|applebot(?!-extended)|slurp|yandexbot/i;

export type Verdict = { action: "allow" } | { action: "block"; status: number; reason: string; retryAfter?: number };

type Window = { start: number; count: number };
type Client = { minute: Window; hour: Window; apiMinute: Window; bannedUntil: number };

const clients = new Map<string, Client>();
const MAX_CLIENTS = 50_000;

export const LIMITS = {
  pagesPerMinute: 100,
  detailPagesPerHour: 500,
  apiPerMinute: 40,
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
  now?: number;
};

const DETAIL_PATH = /^\/(product|ingredient)\//;
const DATA_API = /^\/api\/(search|products)\//;

export function judge(req: RequestInfo): Verdict {
  const now = req.now ?? Date.now();
  const ua = req.headers.get("user-agent") ?? "";
  const path = req.pathname;

  // Always reachable so well-behaved crawlers can read the rules.
  if (path === "/robots.txt" || path === "/sitemap.xml") return { action: "allow" };

  if (!ALLOWED_UA.test(ua)) {
    if (ua.trim().length < 12) return { action: "block", status: 403, reason: "missing user agent" };
    if (BLOCKED_UA.test(ua)) return { action: "block", status: 403, reason: "automated client" };
  }

  // The JSON endpoints exist for our own pages. Browsers label those calls
  // same-origin; a script scraping them directly generally won't.
  if (DATA_API.test(path) && req.method === "GET") {
    const site = req.headers.get("sec-fetch-site");
    if (site !== "same-origin") return { action: "block", status: 403, reason: "api is for on-site use" };
  }

  const ip = req.ip;
  if (!ip) return { action: "allow" };
  sweep(now);

  let c = clients.get(ip);
  if (!c) {
    c = { minute: { start: now, count: 0 }, hour: { start: now, count: 0 }, apiMinute: { start: now, count: 0 }, bannedUntil: 0 };
    clients.set(ip, c);
  }
  if (c.bannedUntil > now) {
    return { action: "block", status: 429, reason: "temporarily blocked", retryAfter: Math.ceil((c.bannedUntil - now) / 1000) };
  }

  // Link prefetches return only a shell, so they don't count as page views.
  if (req.headers.has("next-router-prefetch")) return { action: "allow" };

  const isApi = DATA_API.test(path);
  const over =
    (isApi && bump(c.apiMinute, now, 60_000) > LIMITS.apiPerMinute) ||
    (!isApi && bump(c.minute, now, 60_000) > LIMITS.pagesPerMinute) ||
    (DETAIL_PATH.test(path) && bump(c.hour, now, 3_600_000) > LIMITS.detailPagesPerHour);
  if (!over) return { action: "allow" };

  const s = (strikes.get(ip) ?? 0) + 1;
  strikes.set(ip, s);
  if (s >= LIMITS.strikes) {
    c.bannedUntil = now + LIMITS.banMs;
    strikes.delete(ip);
  }
  return { action: "block", status: 429, reason: "rate limit", retryAfter: 60 };
}
