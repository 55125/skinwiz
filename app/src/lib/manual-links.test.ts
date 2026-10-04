// Hand-made affiliate links: only allowlisted affiliate hosts, never on Rx.
// Uses a fake sovrn.co URL and never requests it (a hit from code could
// count as invalid traffic). `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isAllowedManualLinkUrl, isAmazonLink, manualLinkHref, manualLinkLabel, validateManualLinks } from "./manual-links";
import { isWrappable } from "./prices/redirect";

const FAKE = "https://sovrn.co/test123";

test("only https sovrn.co short links are allowed", () => {
  assert.equal(isAllowedManualLinkUrl(FAKE), true);
  assert.equal(isAllowedManualLinkUrl(` ${FAKE} `), true);
  for (const bad of [
    "http://sovrn.co/test123", // not https
    "https://sovrn.co/", // no link code
    "https://sovrn.co.evil.com/test123",
    "https://evil.com/?u=https://sovrn.co/test123",
    "https://sovrn.co@evil.com/test123",
    "https://user:pw@sovrn.co/test123",
    "https://sovrn.co:8443/test123",
    "https://www.walmart.com/ip/12345",
    "https://redirect.viglink.com?key=x&u=y",
    "javascript:alert(1)",
    "not a url",
    "",
  ]) {
    assert.equal(isAllowedManualLinkUrl(bad), false, bad);
  }
});

test("CSV validation keeps good rows and reports the rest", () => {
  const otc = new Set(["0299-4910", "69968-0826"]);
  const { links, rejected } = validateManualLinks(
    [
      { product_id: "0299-4910", retailer: "Walmart", url: FAKE, size_label: "1.6 oz", added_at: "2026-10-03" },
      { product_id: "0299-4910", retailer: "Walmart", url: FAKE }, // duplicate
      { product_id: "rx-1", retailer: "Walmart", url: FAKE }, // Rx / unknown
      { product_id: "69968-0826", retailer: "Target", url: "https://www.target.com/p/x" }, // not affiliate host
      { product_id: "69968-0826", retailer: "", url: FAKE }, // no retailer
      { product_id: "69968-0826", retailer: "Target", url: FAKE, size_label: "" },
    ],
    otc,
  );
  assert.deepEqual(
    links.map((l) => [l.productId, l.retailer, l.sizeLabel]),
    [
      ["0299-4910", "Walmart", "1.6 oz"],
      ["69968-0826", "Target", null],
    ],
  );
  assert.deepEqual(
    rejected.map((r) => r.row),
    [3, 4, 5, 6],
  );
  assert.equal(manualLinkLabel(links[0]), "Buy at Walmart (1.6 oz)");
  assert.equal(manualLinkLabel(links[1]), "Buy at Target");
});

test("the committed CSV has the expected header", () => {
  const csv = fs.readFileSync(path.join(__dirname, "../../../tools/affiliate_feeds/manual_links.csv"), "utf-8");
  assert.equal(csv.split("\n")[0].trim(), "product_id,retailer,url,size_label,added_at");
});

let q: typeof import("./queries");
before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-manual-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  const { db } = await import("@/db/client");
  const { sql } = await import("drizzle-orm");
  q = await import("./queries");
  db.run(sql`INSERT INTO concerns (id, name, description) VALUES ('acne', 'Acne', ''), ('rx', 'Prescription', '')`);
  db.run(sql`INSERT INTO products (id, concern_id, brand_name, active_ids, is_rx) VALUES ('0299-4910', 'acne', 'Differin', '[]', 0), ('rx-1', 'rx', 'Tretinoin', '[]', 1)`);
  // Rows a bad import could leave behind: the read must still refuse them.
  db.run(sql`INSERT INTO manual_affiliate_links (product_id, retailer, url, size_label) VALUES
    ('0299-4910', 'Walmart', ${FAKE}, '1.6 oz'),
    ('0299-4910', 'Target', 'https://www.target.com/p/differin', NULL),
    ('rx-1', 'Walmart', ${FAKE}, NULL)`);
});

test("the product page read: OTC only, allowlisted hosts only", () => {
  assert.deepEqual(
    q.getManualLinksForProduct("0299-4910").map((l) => [l.retailer, l.url]),
    [["Walmart", FAKE]],
  );
  assert.deepEqual(q.getManualLinksForProduct("rx-1"), []);
});

test("Amazon product links are allowed only as amazon.com/dp/<ASIN> and always carry our tag", () => {
  assert.equal(isAllowedManualLinkUrl("https://www.amazon.com/dp/B07L1PHSY9"), true);
  assert.equal(isAllowedManualLinkUrl("https://www.amazon.com/Differin-Adapalene-Gel/dp/B07L1PHSY9/ref=sr_1_1"), true);
  assert.equal(isAllowedManualLinkUrl("https://www.amazon.com/s?k=differin"), false);
  assert.equal(isAllowedManualLinkUrl("http://www.amazon.com/dp/B07L1PHSY9"), false);
  assert.equal(isAllowedManualLinkUrl("https://amazon.evil.com/dp/B07L1PHSY9"), false);
  assert.equal(manualLinkHref("https://www.amazon.com/Differin/dp/B07L1PHSY9/ref=x?tag=someoneelse-20"), "https://www.amazon.com/dp/B07L1PHSY9?tag=mtass-20");
  assert.equal(manualLinkHref("https://sovrn.co/test123"), "https://sovrn.co/test123");
  assert.equal(isAmazonLink("https://www.amazon.com/dp/B07L1PHSY9"), true);
  assert.equal(isAmazonLink("https://sovrn.co/test123"), false);
});

test("Amazon links are never rewrapped by Sovrn", () => {
  assert.equal(isWrappable("https://www.amazon.com/dp/B07L1PHSY9?tag=mtass-20"), false);
  assert.equal(isWrappable("https://amzn.to/abc"), false);
  assert.equal(isWrappable("https://www.walmart.com/ip/123"), true);
});
