// The bot filter's review mode (OPEN_FOR_REVIEW): `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp, judge, LIMITS, recentHeavyVisitors } from "./anti-scrape";

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
let n = 0;
// a fresh IP per call so tests don't share rate-limit state
const ip = () => `198.51.100.${++n}`;
const req = (ua: string, extra: Partial<Parameters<typeof judge>[0]> = {}) => ({
  pathname: "/",
  method: "GET",
  headers: new Headers({ "user-agent": ua }),
  ip: ip(),
  ...extra,
});

test("AI-training crawlers and scraping frameworks are refused in review mode too", () => {
  for (const ua of ["Mozilla/5.0 (compatible; GPTBot/1.2)", "Mozilla/5.0 (compatible; Bytespider)", "Mozilla/5.0 (Amazonbot/0.1)", "Scrapy/2.11"]) {
    for (const reviewMode of [false, true]) assert.equal(judge(req(ua, { reviewMode })).action, "block", `${ua} review=${reviewMode}`);
  }
});

test("SEO crawlers are let in only in review mode", () => {
  const ua = "Mozilla/5.0 (compatible; SemrushBot/7)";
  assert.equal(judge(req(ua)).action, "block");
  assert.equal(judge(req(ua, { reviewMode: true })).action, "allow");
});

test("the JSON endpoints stay on-site-only in review mode", () => {
  const v = judge(req(CHROME, { pathname: "/api/products/search", reviewMode: true }));
  assert.equal(v.action, "block");
  const ok = judge({ ...req(CHROME, { pathname: "/api/products/search", reviewMode: true }), headers: new Headers({ "user-agent": CHROME, "sec-fetch-site": "same-origin" }) });
  assert.equal(ok.action, "allow");
});

test("review mode gives tooling the high ceiling instead of the tight automated budget", () => {
  const a = ip();
  const page = (i: number) => judge({ pathname: `/product/p${i}`, method: "GET", headers: new Headers({ "user-agent": "curl/8.0" }), ip: a, reviewMode: true, now: 1_000 + i });
  for (let i = 0; i < LIMITS.automatedPagesPerMinute + 50; i++) assert.equal(page(i).action, "allow", `page ${i}`);
  // but a full-speed crawl still hits the ceiling within the minute
  let blocked = false;
  for (let i = 0; i < LIMITS.review.pagesPerMinute; i++) if (page(1_000 + i).action === "block") blocked = true;
  assert.equal(blocked, true);
});

test("an IP passing the heavy-visitor mark shows up in the list", () => {
  const a = ip();
  for (let i = 0; i < LIMITS.heavyDetailPagesPerHour; i++) {
    // spread over the hour so the per-minute ceiling never trips
    judge({ pathname: `/ingredient/i${i}`, method: "GET", headers: new Headers({ "user-agent": CHROME }), ip: a, reviewMode: true, now: 10_000_000 + i * 2_000 });
  }
  assert.ok(recentHeavyVisitors().some((h) => h.ip === a && h.detailPagesThisHour === LIMITS.heavyDetailPagesPerHour));
});

test("a flood of first-visit listing loads from many IPs is cut off; visitors already on the site are not", () => {
  const regular = ip();
  const at = 50_000_000;
  const browse = (who: string, t: number) => judge({ pathname: "/browse", method: "GET", headers: new Headers({ "user-agent": CHROME }), ip: who, now: t });
  assert.equal(judge({ pathname: "/", method: "GET", headers: new Headers({ "user-agent": CHROME }), ip: regular, now: at }).action, "allow");
  for (let i = 0; i < LIMITS.surge.firstVisitListingLoadsPerMinute; i++) assert.equal(browse(ip(), at + i).action, "allow", `load ${i}`);
  const v = browse(ip(), at + 500);
  assert.equal(v.action, "block");
  assert.equal(v.action === "block" && v.status, 503);
  assert.equal(browse(regular, at + 600).action, "allow");
  // a new minute starts a fresh count
  assert.equal(browse(ip(), at + 61_000).action, "allow");
});

test("the visitor IP comes from CF-Connecting-IP only when the request arrives from Cloudflare", () => {
  const h = (realIp: string) => new Headers({ "x-real-ip": realIp, "cf-connecting-ip": "203.0.113.7" });
  assert.equal(clientIp(h("172.70.1.2")), "203.0.113.7");
  assert.equal(clientIp(h("2606:4700::1")), "203.0.113.7");
  // straight to the origin: a forged header is ignored
  assert.equal(clientIp(h("198.51.100.9")), "198.51.100.9");
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 198.51.100.9" })), "198.51.100.9");
});

test("AI assistants calling the MCP endpoint from scripting libraries get the API budget, not the automated page budget", () => {
  const at = ip();
  const call = (ua: string) => judge({ pathname: "/mcp", method: "POST", headers: new Headers({ "user-agent": ua }), ip: at, now: 1_000 });
  for (let i = 0; i < LIMITS.apiPerMinute; i++) assert.equal(call("python-httpx/0.27").action, "allow", `call ${i + 1}`);
  assert.equal(call("python-httpx/0.27").action, "block");
  // training crawlers stay out of it too
  assert.equal(judge({ pathname: "/mcp", method: "POST", headers: new Headers({ "user-agent": "ClaudeBot/1.0" }), ip: ip() }).action, "block");
});

test("answer-engine fetchers that send readers here are not refused", () => {
  for (const ua of ["Mozilla/5.0 (compatible; OAI-SearchBot/1.0)", "Mozilla/5.0 (compatible; ChatGPT-User/1.0)", "Mozilla/5.0 (compatible; PerplexityBot/1.0)", "Claude-User/1.0", "Mozilla/5.0 (compatible; Claude-SearchBot/1.0)"]) {
    assert.equal(judge(req(ua, { pathname: "/ingredient/niacinamide" })).action, "allow", ua);
  }
});
