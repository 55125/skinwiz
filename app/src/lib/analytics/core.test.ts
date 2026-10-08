// What the site statistics store, and in what redacted form. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanPath,
  cleanSearchTerm,
  dayRange,
  deviceFromUa,
  isBot,
  optedOut,
  outboundHost,
  parseEvent,
  percentChange,
  referrerHost,
  utmTag,
  visitorHash,
} from "./core";

const CHROME_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_TABLET = "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

test("GPC and DNT opt a browser out", () => {
  assert.equal(optedOut(new Headers({ "sec-gpc": "1" })), true);
  assert.equal(optedOut(new Headers({ dnt: "1" })), true);
  assert.equal(optedOut(new Headers({ dnt: "0" })), false);
  assert.equal(optedOut(new Headers()), false);
});

test("bots and scripts are not counted; browsers are", () => {
  for (const ua of ["Googlebot/2.1", "curl/8.4", "python-requests/2.31", "Mozilla/5.0 HeadlessChrome/120", "", "facebookexternalhit/1.1"]) {
    assert.equal(isBot(ua), true, ua);
  }
  assert.equal(isBot(CHROME_MAC), false);
  assert.equal(isBot(IPHONE), false);
});

test("device split", () => {
  assert.equal(deviceFromUa(CHROME_MAC), "desktop");
  assert.equal(deviceFromUa(IPHONE), "mobile");
  assert.equal(deviceFromUa(IPAD), "tablet");
  assert.equal(deviceFromUa(ANDROID_TABLET), "tablet");
});

test("visitor hash depends on the daily salt and never contains the IP", () => {
  const a = visitorHash("salt-1", "203.0.113.9", CHROME_MAC);
  assert.equal(a, visitorHash("salt-1", "203.0.113.9", CHROME_MAC));
  assert.notEqual(a, visitorHash("salt-2", "203.0.113.9", CHROME_MAC));
  assert.notEqual(a, visitorHash("salt-1", "203.0.113.10", CHROME_MAC));
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.ok(!a.includes("203"));
});

test("paths lose query strings and private link tokens", () => {
  assert.equal(cleanPath("/product/123?utm_source=x#top"), "/product/123");
  assert.equal(cleanPath("/h/SECRETTOKEN"), "/h/[token]");
  assert.equal(cleanPath("/checkin/abc.def"), "/checkin/[token]");
  assert.equal(cleanPath("/clinicians/handouts/xyz/preview"), "/clinicians/handouts/[id]/preview");
  assert.equal(cleanPath("/clinicians/handouts/new"), "/clinicians/handouts/new");
  assert.equal(cleanPath("/browse/"), "/browse");
  assert.equal(cleanPath("/"), "/");
  assert.equal(cleanPath("https://evil.example/x"), null);
  assert.equal(cleanPath("//evil.example/x"), null);
  assert.equal(cleanPath(42), null);
});

test("referrer keeps only an external host", () => {
  assert.equal(referrerHost("https://www.google.com/search?q=acne", "activelyskin.com"), "google.com");
  assert.equal(referrerHost("https://l.instagram.com/?u=x", "activelyskin.com"), "instagram.com");
  assert.equal(referrerHost("https://activelyskin.com/browse", "activelyskin.com"), null);
  assert.equal(referrerHost("https://www.activelyskin.com/", "activelyskin.com"), null);
  assert.equal(referrerHost("", "activelyskin.com"), null);
  assert.equal(referrerHost("javascript:alert(1)", "activelyskin.com"), null);
});

test("UTM tags are normalized", () => {
  assert.equal(utmTag(" Newsletter "), "newsletter");
  assert.equal(utmTag("<script>"), "script");
  assert.equal(utmTag(""), null);
  assert.equal(utmTag(null), null);
});

test("search terms drop personal-looking input", () => {
  assert.equal(cleanSearchTerm("  Benzoyl   PEROXIDE "), "benzoyl peroxide");
  assert.equal(cleanSearchTerm("me@example.com"), null);
  assert.equal(cleanSearchTerm("call 555-123-4567"), null);
  assert.equal(cleanSearchTerm("spf 50"), "spf 50");
  assert.equal(cleanSearchTerm("   "), null);
});

test("outbound host unwraps Sovrn redirects", () => {
  assert.equal(outboundHost("https://www.target.com/p/x?tracking=1"), "target.com");
  const wrapped = `https://redirect.viglink.com?key=k&u=${encodeURIComponent("https://www.ulta.com/p/1")}&cuid=product`;
  assert.equal(outboundHost(wrapped), "ulta.com");
  assert.equal(outboundHost("mailto:x@y.z"), null);
});

test("parseEvent validates each kind", () => {
  const host = "activelyskin.com";
  assert.equal(parseEvent(null, host), null);
  assert.equal(parseEvent({ kind: "nope", path: "/" }, host), null);
  assert.equal(parseEvent({ kind: "pageview", path: "/admin" }, host), null);
  assert.equal(parseEvent({ kind: "pageview", path: "/admin/x" }, host), null);

  const pv = parseEvent({ kind: "pageview", path: "/?utm_source=x", referrer: "https://reddit.com/r/skincare", utm_source: "Reddit" }, host)!;
  assert.deepEqual([pv.path, pv.referrer, pv.utmSource, pv.detail], ["/", "reddit.com", "reddit", null]);

  const out = parseEvent({ kind: "outbound", path: "/product/abc-1", href: "https://www.amazon.com/dp/X?tag=me" }, host)!;
  assert.deepEqual([out.detail, out.productId], ["amazon.com", "abc-1"]);
  assert.equal(parseEvent({ kind: "outbound", path: "/", href: "not a url" }, host), null);

  const s = parseEvent({ kind: "search", path: "/search", term: "Azelaic", results: 0 }, host)!;
  assert.deepEqual([s.detail, s.value], ["azelaic", 0]);
  assert.equal(parseEvent({ kind: "search", path: "/search", term: "a@b.co", results: 3 }, host), null);

  assert.equal(parseEvent({ kind: "tool", path: "/for-clinicians/patch-test", tool: "patch-test:print" }, host)!.detail, "patch-test:print");
  assert.equal(parseEvent({ kind: "tool", path: "/", tool: "Bad Tool!" }, host), null);

  assert.equal(parseEvent({ kind: "client_error", path: "/x", digest: "123<b>" }, host)!.detail, "123b");
});

test("day ranges and percent change", () => {
  assert.deepEqual(dayRange(new Date("2026-10-08T05:00:00Z"), 3), ["2026-10-06", "2026-10-07", "2026-10-08"]);
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(5, 0), null);
});
