// Which crawlers stay refused while OPEN_FOR_REVIEW is on: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { alwaysBlockedCrawler, judge } from "./anti-scrape";

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

test("AI-training crawlers and scraping frameworks are always refused", () => {
  for (const ua of ["Mozilla/5.0 (compatible; GPTBot/1.2)", "Mozilla/5.0 (compatible; Bytespider)", "Mozilla/5.0 (Amazonbot/0.1)", "Scrapy/2.11"]) {
    assert.equal(alwaysBlockedCrawler(ua), true, ua);
  }
});

test("review mode lets browsers, search engines and SEO crawlers through", () => {
  for (const ua of [CHROME, "Mozilla/5.0 (compatible; Googlebot/2.1)", "Mozilla/5.0 (compatible; SemrushBot/7)", "Mozilla/5.0 (compatible; AhrefsBot/7.0)", "Applebot/0.1", "curl/8.0"]) {
    assert.equal(alwaysBlockedCrawler(ua), false, ua);
  }
});

test("outside review mode SEO crawlers are still refused", () => {
  const v = judge({ pathname: "/", method: "GET", headers: new Headers({ "user-agent": "Mozilla/5.0 (compatible; SemrushBot/7)" }), ip: "203.0.113.9" });
  assert.equal(v.action, "block");
});
