// Outbound link wrapping through Sovrn's Redirect API. Pure: env is passed in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isWrappable, outboundLink, sovrnRedirectUrl } from "./redirect";

const KEYED = { SOVRN_SITE_API_KEY: "abc123key" } as unknown as NodeJS.ProcessEnv;
const UNSET = {} as unknown as NodeJS.ProcessEnv;

test("redirect URL follows the documented format", () => {
  const url = sovrnRedirectUrl("abc123key", "https://www.walmart.com/ip/Differin/12345?x=1&y=2", "product");
  assert.equal(url, "https://redirect.viglink.com?key=abc123key&u=https%3A%2F%2Fwww.walmart.com%2Fip%2FDifferin%2F12345%3Fx%3D1%26y%3D2&cuid=product");
  const u = new URL(url);
  assert.equal(u.searchParams.get("u"), "https://www.walmart.com/ip/Differin/12345?x=1&y=2");
  assert.throws(() => sovrnRedirectUrl("k", "https://a.com", "has space"));
  assert.throws(() => sovrnRedirectUrl("k", "https://a.com", "x".repeat(33)));
});

test("dormant without the site key: the link comes back untouched", () => {
  assert.deepEqual(outboundLink("https://theordinary.com/en-us/x.html", { placement: "product", rel: "noopener noreferrer" }, UNSET), {
    href: "https://theordinary.com/en-us/x.html",
    rel: "noopener noreferrer",
    wrapped: false,
  });
  // the secret alone does nothing; the site key alone is enough
  assert.equal(outboundLink("https://www.target.com/s?searchTerm=x", { placement: "plan", rel: "nofollow" }, { SOVRN_SECRET_KEY: "s" } as unknown as NodeJS.ProcessEnv).wrapped, false);
  assert.equal(outboundLink("https://www.target.com/s?searchTerm=x", { placement: "plan", rel: "nofollow" }, KEYED).wrapped, true);
});

test("wraps retailer and brand links, adding sponsored nofollow", () => {
  const l = outboundLink("https://www.target.com/s?searchTerm=adapalene", { placement: "plan", rel: "nofollow noopener noreferrer" }, KEYED);
  assert.equal(l.wrapped, true);
  assert.ok(l.href.startsWith("https://redirect.viglink.com?key=abc123key&u=https%3A%2F%2Fwww.target.com"));
  assert.ok(l.href.endsWith("&cuid=plan"));
  assert.equal(l.rel, "nofollow noopener noreferrer sponsored");
});

test("never wraps regulatory, clinical, Rx-price or already-affiliate links", () => {
  for (const url of [
    "https://www.fda.gov/safety/recalls",
    "https://www.accessdata.fda.gov/scripts/ires/index.cfm",
    "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=1",
    "https://pubchem.ncbi.nlm.nih.gov/compound/1",
    "https://www.irs.gov/publications/p502",
    "https://find-a-derm.aad.org/",
    "https://www.goodrx.com/tretinoin",
    "https://costplusdrugs.com/medications/x",
    "https://redirect.viglink.com?key=a&u=b",
    "https://sovrn.co/abc",
    "mailto:hello@example.com",
    "/product/123",
    "not a url",
  ]) {
    assert.equal(isWrappable(url), false, url);
    const l = outboundLink(url, { placement: "product", rel: "noopener" }, KEYED);
    assert.deepEqual(l, { href: url, rel: "noopener", wrapped: false }, url);
  }
});

test("never wraps anything for an Rx product", () => {
  const l = outboundLink("https://www.walmart.com/search?q=tretinoin", { placement: "plan", rel: "nofollow", isRx: true }, KEYED);
  assert.deepEqual(l, { href: "https://www.walmart.com/search?q=tretinoin", rel: "nofollow", wrapped: false });
});
