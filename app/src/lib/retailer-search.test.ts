// Retailer search fallback links. Pure: env is passed in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { retailerQuery, retailerSearchLinks } from "./retailer-search";

const KEYED = { SOVRN_SITE_API_KEY: "abc123key" } as unknown as NodeJS.ProcessEnv;
const UNSET = {} as unknown as NodeJS.ProcessEnv;

test("query collapses whitespace and caps long names at a word boundary", () => {
  assert.equal(retailerQuery("  CeraVe   Acne\nControl Cleanser "), "CeraVe Acne Control Cleanser");
  const long = retailerQuery("word ".repeat(30));
  assert.ok(long.length <= 80);
  assert.ok(!long.endsWith(" "));
  assert.deepEqual(retailerSearchLinks("   ", null, UNSET), []);
});

test("plain search links while Sovrn is not configured", () => {
  const links = retailerSearchLinks("CeraVe Acne Control Cleanser", null, UNSET);
  assert.deepEqual(links.map((l) => l.name), ["Target", "Walmart", "CVS"]);
  assert.equal(links[1].href, "https://www.walmart.com/search?q=CeraVe%20Acne%20Control%20Cleanser");
  assert.ok(links.every((l) => !l.wrapped && l.rel === "noopener noreferrer"));
});

test("wrapped through Sovrn, marked sponsored, once the site key is set", () => {
  const links = retailerSearchLinks("Differin Gel", null, KEYED);
  assert.ok(links.every((l) => l.wrapped && l.href.startsWith("https://redirect.viglink.com?key=abc123key&u=")));
  assert.ok(links.every((l) => l.rel.includes("sponsored")));
  assert.equal(new URL(links[0].href).searchParams.get("u"), "https://www.target.com/s?searchTerm=Differin%20Gel");
});

test("brand leads the query only when the name doesn't already contain it", () => {
  assert.equal(retailerQuery("Glycolic Acid 7% Exfoliating Toner", "The Ordinary"), "The Ordinary Glycolic Acid 7% Exfoliating Toner");
  assert.equal(retailerQuery("CeraVe Acne Control Cleanser", "CeraVe"), "CeraVe Acne Control Cleanser");
  assert.equal(retailerQuery("Differin Gel", null), "Differin Gel");
  assert.equal(retailerQuery("Hydrating Cleanser", "CeraVe, L'Oréal"), "CeraVe Hydrating Cleanser");
  assert.equal(retailerQuery("   ", "The Ordinary"), "");
});
