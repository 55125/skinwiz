// Meta ad-measurement helpers shared by browser and server. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { AD_CLICK_WINDOW_MS, clickStillFresh, fbcFromClickId, fbcTime, isShoppingLink, validEventId, validFbc, validFbp, validPixelId } from "./meta-shared";

const CLICK = "IwAR2abcDEF_123-xyz";

test("fbc is built in Meta's format and round-trips its time", () => {
  const fbc = fbcFromClickId(CLICK, 1763251200123);
  assert.equal(fbc, `fb.1.1763251200123.${CLICK}`);
  assert.ok(validFbc(fbc));
  assert.equal(fbcTime(fbc!), 1763251200123);
});

test("odd click ids are refused", () => {
  assert.equal(fbcFromClickId("short", 1763251200123), null);
  assert.equal(fbcFromClickId("has spaces in it ok", 1763251200123), null);
  assert.equal(fbcFromClickId("<script>alert(1)</script>", 1763251200123), null);
  assert.equal(validFbc("fb.1.123.x"), false);
  assert.equal(validFbc(42), false);
});

test("fbp, event id and pixel id validation", () => {
  assert.ok(validFbp("fb.1.1763251200123.1234567890"));
  assert.equal(validFbp("fb.1.abc.1"), false);
  assert.ok(validEventId("3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90"));
  assert.equal(validEventId("short"), false);
  assert.equal(validEventId("has space 12345"), false);
  assert.ok(validPixelId("123456789012345"));
  assert.equal(validPixelId("12ab"), false);
  assert.equal(validPixelId(undefined), false);
});

test("an ad click counts for 7 days", () => {
  const fbc = fbcFromClickId(CLICK, 1_763_251_200_000)!;
  const at = 1_763_251_200_000;
  assert.ok(clickStillFresh({ fbc, at }, at + 1000));
  assert.ok(clickStillFresh({ fbc, at }, at + AD_CLICK_WINDOW_MS - 1));
  assert.equal(clickStillFresh({ fbc, at }, at + AD_CLICK_WINDOW_MS), false);
  assert.equal(clickStillFresh({ fbc, at }, at - 1000), false);
  assert.equal(clickStillFresh({ fbc: "nope", at }, at), false);
  assert.equal(clickStillFresh(null, at), false);
});

test("retailer and brand links are shopping; references, social and Rx price checks are not", () => {
  assert.ok(isShoppingLink("https://www.walmart.com/ip/123"));
  assert.ok(isShoppingLink("https://www.cerave.com/skincare/moisturizers"));
  assert.ok(isShoppingLink("https://www.amazon.com/dp/B00TTD9BRC?tag=x-20"));
  assert.ok(isShoppingLink(`https://redirect.viglink.com?key=k&u=${encodeURIComponent("https://www.target.com/p/x")}&cuid=product`));
  assert.equal(isShoppingLink(`https://redirect.viglink.com?key=k&u=${encodeURIComponent("https://www.fda.gov/x")}&cuid=product`), false);
  assert.equal(isShoppingLink("https://dailymed.nlm.nih.gov/dailymed/x"), false);
  assert.equal(isShoppingLink("https://www.fda.gov/x"), false);
  assert.equal(isShoppingLink("https://www.youtube.com/watch?v=1"), false);
  assert.equal(isShoppingLink("https://www.instagram.com/activelyskin"), false);
  assert.equal(isShoppingLink("https://www.goodrx.com/tretinoin"), false);
  assert.equal(isShoppingLink("mailto:a@b.c"), false);
  assert.equal(isShoppingLink("not a url"), false);
});

test("consent notice: shown outside the US, in privacy-law states, and when location is unknown", async () => {
  const { consentRequiredFor } = await import("./meta-shared");
  for (const c of ["DE", "FR", "GB", "CH", "NO", "CA", "BR", "AU", "XX", "T1", "", null, undefined]) {
    assert.equal(consentRequiredFor(c, "ZZ"), true, String(c));
  }
  for (const r of ["CA", "ca", "WA", "NV", "TX", "VA", "CO", "NJ"]) assert.equal(consentRequiredFor("US", r), true, r);
  for (const r of [null, undefined, "", "California", "1"]) assert.equal(consentRequiredFor("US", r), true, String(r));
  for (const r of ["FL", "NY", "GA", "OH", "IL", "AZ", "NC"]) assert.equal(consentRequiredFor("US", r), false, r);
  assert.equal(consentRequiredFor(" us ", "fl"), false);
});
