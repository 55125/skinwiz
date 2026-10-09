// Site statistics end to end on a scratch database: recording, the daily
// salt, de-duplication, purge, and the admin dashboard's report queries
// (which also run against every app table, so a renamed column fails here
// rather than on /admin). `npm test`.
import { before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let db: typeof import("@/db/client").db;
let sql: typeof import("drizzle-orm").sql;
let store: typeof import("./store");
let report: typeof import("./report");
let core: typeof import("./core");

const NOW = new Date("2026-10-08T12:00:00Z");
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1";
const HOST = "activelyskin.com";

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-analytics-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  ({ db } = await import("@/db/client"));
  ({ sql } = await import("drizzle-orm"));
  store = await import("./store");
  report = await import("./report");
  core = await import("./core");
});

beforeEach(() => {
  db.run(sql`DELETE FROM analytics_events`);
  db.run(sql`DELETE FROM analytics_salts`);
  db.run(sql`DELETE FROM server_errors`);
});

function record(body: Record<string, unknown>, ip: string, at = NOW) {
  const e = core.parseEvent(body, HOST);
  assert.ok(e, JSON.stringify(body));
  store.recordEvent(e, { ip, ua: UA }, at);
}

test("records no IP address, only a daily hash", () => {
  record({ kind: "pageview", path: "/", referrer: "https://google.com/" }, "198.51.100.7");
  const rows = db.all<Record<string, unknown>>(sql`SELECT * FROM analytics_events`);
  assert.equal(rows.length, 1);
  assert.ok(!JSON.stringify(rows).includes("198.51.100.7"));
  assert.equal(rows[0].device, "mobile");
  assert.equal(rows[0].referrer, "google.com");
});

test("the salt rotates daily and old salts are deleted", () => {
  const today = store.dailySalt(NOW);
  assert.equal(store.dailySalt(NOW), today);
  const tomorrow = store.dailySalt(new Date(NOW.getTime() + 86_400_000));
  assert.notEqual(tomorrow, today);
  assert.equal(db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM analytics_salts`)!.n, 1);
});

test("the same visitor reloading a page within a minute counts once", () => {
  record({ kind: "pageview", path: "/browse" }, "1.1.1.1");
  record({ kind: "pageview", path: "/browse" }, "1.1.1.1", new Date(NOW.getTime() + 10_000));
  record({ kind: "pageview", path: "/browse" }, "1.1.1.1", new Date(NOW.getTime() + 120_000));
  record({ kind: "pageview", path: "/browse" }, "2.2.2.2");
  assert.equal(db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM analytics_events`)!.n, 3);
});

test("traffic report: visitors, pages, referrers, clicks, searches", () => {
  const yesterday = new Date(NOW.getTime() - 86_400_000);
  record({ kind: "pageview", path: "/", referrer: "https://reddit.com/r/x", utm_source: "reddit" }, "1.1.1.1");
  record({ kind: "pageview", path: "/product/p1" }, "1.1.1.1");
  record({ kind: "pageview", path: "/" }, "2.2.2.2");
  record({ kind: "pageview", path: "/" }, "1.1.1.1", yesterday);
  record({ kind: "outbound", path: "/product/p1", href: "https://www.target.com/x" }, "1.1.1.1");
  record({ kind: "search", path: "/search", term: "Snail mucin", results: 0 }, "2.2.2.2");
  record({ kind: "search", path: "/search", term: "adapalene", results: 4 }, "2.2.2.2");
  record({ kind: "tool", path: "/for-clinicians/patch-test", tool: "patch-test:print" }, "3.3.3.3");

  const t = report.trafficReport(NOW, 7);
  assert.equal(t.series.length, 7);
  assert.deepEqual(t.series.at(-1), { day: "2026-10-08", visitors: 2, pageviews: 3 });
  assert.deepEqual(t.series.at(-2), { day: "2026-10-07", visitors: 1, pageviews: 1 });
  const kpi = Object.fromEntries(t.kpis.map((k) => [k.label, k.value]));
  assert.equal(kpi.Visitors, 3, "unique per day, summed");
  assert.equal(kpi.Pageviews, 4);
  assert.equal(kpi["Retailer clicks"], 1);
  assert.equal(kpi.Searches, 2);
  assert.deepEqual(t.topPages[0], { label: "/", n: 3, extra: 3 });
  assert.deepEqual(t.referrers, [{ label: "reddit.com", n: 1 }]);
  assert.equal(t.campaigns[0].label, "reddit");
  assert.deepEqual(t.outboundByRetailer, [{ label: "target.com", n: 1 }]);
  assert.equal(t.outboundByProduct[0].label, "p1", "unknown product falls back to its id");
  assert.deepEqual(t.zeroResultSearches, [{ label: "snail mucin", n: 1 }]);
  assert.deepEqual(t.toolEvents, [{ label: "patch-test:print", n: 1 }]);
  assert.match(report.trafficCsv(NOW, 7), /^section,label,value,extra\ndaily,2026-10-02,0,0\n/);
});

test("every dashboard report runs against the real schema", () => {
  store.recordServerError({ method: "GET", path: "/product/x", route: "/product/[id]", message: "boom" }, NOW);
  assert.equal(report.errorReport(NOW, 30).total, 1);
  assert.equal(report.errorReport(NOW, 30).byRoute[0].label, "/product/[id]");
  report.clinicianReport(NOW, 30);
  report.communityReport(NOW, 30);
  report.catalogReport(NOW);
  assert.equal(report.healthReport().dbOk, true);
});

test("purge removes events past retention and old errors", () => {
  const old = new Date(NOW.getTime() - (store.ANALYTICS_RETENTION_DAYS + 2) * 86_400_000);
  record({ kind: "pageview", path: "/" }, "1.1.1.1", old);
  record({ kind: "pageview", path: "/" }, "1.1.1.1");
  store.recordServerError({ method: "GET", path: "/", message: "old" }, new Date(NOW.getTime() - 100 * 86_400_000));
  store.purgeAnalytics(NOW);
  assert.equal(db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM analytics_events`)!.n, 1);
  assert.equal(db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM server_errors`)!.n, 0);
});

test("range parsing", () => {
  assert.equal(report.parseRange("90"), 90);
  assert.equal(report.parseRange("13"), 30);
  assert.equal(report.parseRange(undefined), 30);
});

test("GPC visitors: only a daily count of page views and clicks, shown apart in the report", () => {
  db.run(sql`DELETE FROM opt_out_tallies`);
  assert.equal(core.sentGpc(new Headers({ "sec-gpc": "1" })), true);
  assert.equal(core.sentGpc(new Headers({ dnt: "1" })), false, "Do Not Track alone is not tallied");
  assert.equal(core.tallyKind({ kind: "search", term: "x" }), null);
  assert.equal(core.tallyKind(null), null);
  store.tallyOptOut("pageview", NOW);
  store.tallyOptOut("pageview", NOW);
  store.tallyOptOut("outbound", NOW);
  store.tallyOptOut("outbound", new Date("2025-01-01T00:00:00Z"));
  assert.deepEqual(db.all(sql`SELECT * FROM opt_out_tallies WHERE day = '2026-10-08' ORDER BY kind`), [
    { day: "2026-10-08", kind: "outbound", count: 1 },
    { day: "2026-10-08", kind: "pageview", count: 2 },
  ]);
  const t = report.trafficReport(NOW, 7);
  assert.equal(t.optOut.pageviews, 2);
  assert.equal(t.optOut.clicks, 1);
  assert.equal(Object.fromEntries(t.kpis.map((k) => [k.label, k.value])).Pageviews, 0, "not mixed into tracked figures");
  store.purgeAnalytics(NOW);
  assert.equal(db.all(sql`SELECT * FROM opt_out_tallies WHERE day = '2025-01-01'`).length, 0, "purged with the statistics");
});
