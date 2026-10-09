// Read side of the admin dashboard (app/admin/page.tsx): site statistics
// from analytics_events plus counts from the app's own tables. Server-only.
// Every query is an aggregate; the only rows listed individually are the
// owner's own work queues (clinician applications, reported routines,
// pending clinician verifications) and recent server errors.
import fs from "node:fs";
import path from "node:path";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { dayRange, percentChange } from "./core";
import { ANALYTICS_RETENTION_DAYS } from "./store";

export const RANGES = [7, 30, 90, 365] as const;
export type RangeDays = (typeof RANGES)[number];

export function parseRange(raw: string | undefined): RangeDays {
  const n = Number(raw);
  return (RANGES as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

type Row = Record<string, string | number | null>;
const all = <T = Row>(q: SQL) => db.all<T>(q);
const one = (q: SQL) => Number(Object.values(db.get<Row>(q) ?? { n: 0 })[0] ?? 0);

export type Count = { label: string; n: number; extra?: number };
export type DayPoint = { day: string; visitors: number; pageviews: number };
export type Kpi = { label: string; value: number; change: number | null; hint?: string };

/** The range [from, to] as UTC days, plus the equally long period before it. */
function periods(now: Date, days: number) {
  const days_ = dayRange(now, days * 2);
  return { prevFrom: days_[0], prevTo: days_[days - 1], from: days_[days], to: days_[days * 2 - 1] };
}

function counts(q: SQL): Count[] {
  return all<{ label: string | null; n: number; extra?: number }>(q).map((r) => ({
    label: r.label ?? "(none)",
    n: Number(r.n),
    ...(r.extra !== undefined ? { extra: Number(r.extra) } : {}),
  }));
}

export function trafficReport(now: Date, days: RangeDays) {
  const { from, to, prevFrom, prevTo } = periods(now, days);
  const inRange = sql`day BETWEEN ${from} AND ${to}`;

  // "Visitors" = distinct daily visitor ids, summed over the days. The id
  // changes every day by design, so one person visiting on three days counts
  // three times; there is no cross-day identity to dedupe against.
  const daily = all<{ day: string; visitors: number; pageviews: number }>(sql`
    SELECT day, COUNT(DISTINCT visitor) AS visitors, COUNT(*) AS pageviews
    FROM analytics_events WHERE kind = 'pageview' AND ${inRange} GROUP BY day`);
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const series: DayPoint[] = dayRange(now, days).map((day) => ({
    day,
    visitors: Number(byDay.get(day)?.visitors ?? 0),
    pageviews: Number(byDay.get(day)?.pageviews ?? 0),
  }));

  const sumVisitors = (a: string, b: string) =>
    one(sql`SELECT COALESCE(SUM(v), 0) FROM (SELECT COUNT(DISTINCT visitor) AS v FROM analytics_events
      WHERE kind = 'pageview' AND day BETWEEN ${a} AND ${b} GROUP BY day)`);
  const countKind = (kind: string, a: string, b: string) =>
    one(sql`SELECT COUNT(*) FROM analytics_events WHERE kind = ${kind} AND day BETWEEN ${a} AND ${b}`);
  const signups = (table: string, col: string, a: string, b: string) =>
    one(sql`SELECT COUNT(*) FROM ${sql.identifier(table)} WHERE substr(${sql.identifier(col)}, 1, 10) BETWEEN ${a} AND ${b}`);

  const kpi = (label: string, cur: number, prev: number, hint?: string): Kpi => ({ label, value: cur, change: percentChange(cur, prev), hint });
  const kpis: Kpi[] = [
    kpi("Visitors", sumVisitors(from, to), sumVisitors(prevFrom, prevTo), "Unique per day, summed"),
    kpi("Pageviews", countKind("pageview", from, to), countKind("pageview", prevFrom, prevTo)),
    kpi("Retailer clicks", countKind("outbound", from, to), countKind("outbound", prevFrom, prevTo), "Outbound shopping and brand links"),
    kpi("Searches", countKind("search", from, to), countKind("search", prevFrom, prevTo)),
    kpi("Email sign-ups", signups("people", "created_at", from, to), signups("people", "created_at", prevFrom, prevTo)),
    kpi("Clinician sign-ups", signups("clinicians", "created_at", from, to), signups("clinicians", "created_at", prevFrom, prevTo)),
  ];

  const pv = sql`kind = 'pageview' AND ${inRange}`;
  return {
    from,
    to,
    kpis,
    series,
    topPages: counts(sql`SELECT path AS label, COUNT(*) AS n, COUNT(DISTINCT day || visitor) AS extra
      FROM analytics_events WHERE ${pv} GROUP BY path ORDER BY n DESC LIMIT 25`),
    referrers: counts(sql`SELECT referrer AS label, COUNT(*) AS n FROM analytics_events
      WHERE ${pv} AND referrer IS NOT NULL GROUP BY referrer ORDER BY n DESC LIMIT 20`),
    direct: one(sql`SELECT COUNT(*) FROM analytics_events WHERE ${pv} AND referrer IS NULL AND utm_source IS NULL`),
    campaigns: counts(sql`SELECT utm_source || COALESCE(' / ' || utm_medium, '') || COALESCE(' / ' || utm_campaign, '') AS label,
      COUNT(*) AS n FROM analytics_events WHERE ${pv} AND utm_source IS NOT NULL GROUP BY label ORDER BY n DESC LIMIT 20`),
    devices: counts(sql`SELECT device AS label, COUNT(DISTINCT day || visitor) AS n FROM analytics_events
      WHERE ${pv} GROUP BY device ORDER BY n DESC`),
    outboundByRetailer: counts(sql`SELECT detail AS label, COUNT(*) AS n FROM analytics_events
      WHERE kind = 'outbound' AND ${inRange} GROUP BY detail ORDER BY n DESC LIMIT 20`),
    outboundByProduct: counts(sql`SELECT COALESCE(p.brand_name || ' (' || e.product_id || ')', e.product_id) AS label, COUNT(*) AS n
      FROM analytics_events e LEFT JOIN products p ON p.id = e.product_id
      WHERE e.kind = 'outbound' AND e.product_id IS NOT NULL AND e.day BETWEEN ${from} AND ${to}
      GROUP BY e.product_id ORDER BY n DESC LIMIT 20`),
    outboundByPage: counts(sql`SELECT path AS label, COUNT(*) AS n FROM analytics_events
      WHERE kind = 'outbound' AND ${inRange} AND product_id IS NULL GROUP BY path ORDER BY n DESC LIMIT 10`),
    searchTerms: counts(sql`SELECT detail AS label, COUNT(*) AS n, MAX(value) AS extra FROM analytics_events
      WHERE kind = 'search' AND ${inRange} GROUP BY detail ORDER BY n DESC LIMIT 25`),
    zeroResultSearches: counts(sql`SELECT detail AS label, COUNT(*) AS n FROM analytics_events
      WHERE kind = 'search' AND ${inRange} AND value = 0 GROUP BY detail ORDER BY n DESC LIMIT 25`),
    toolEvents: counts(sql`SELECT detail AS label, COUNT(*) AS n FROM analytics_events
      WHERE kind = 'tool' AND ${inRange} GROUP BY detail ORDER BY n DESC`),
    clinicianPages: counts(sql`SELECT path AS label, COUNT(*) AS n, COUNT(DISTINCT day || visitor) AS extra FROM analytics_events
      WHERE ${pv} AND (path LIKE '/for-clinicians%' OR path LIKE '/clinic-tools%' OR path LIKE '/clinicians%' OR path = '/h/[token]')
      GROUP BY path ORDER BY n DESC`),
    clientErrors: countKind("client_error", from, to),
  };
}

export function clinicianReport(now: Date, days: RangeDays) {
  const { from } = periods(now, days);
  const since = `${from}T00:00:00.000Z`;
  return {
    clinicians: one(sql`SELECT COUNT(*) FROM clinicians`),
    verified: one(sql`SELECT COUNT(*) FROM clinicians WHERE verified_at IS NOT NULL`),
    dermatology: one(sql`SELECT COUNT(*) FROM clinicians WHERE is_dermatology = 1`),
    handouts: one(sql`SELECT COUNT(*) FROM handouts`),
    handoutsNew: one(sql`SELECT COUNT(*) FROM handouts WHERE created_at >= ${since}`),
    versions: one(sql`SELECT COUNT(*) FROM handout_versions`),
    printed: one(sql`SELECT COUNT(*) FROM handout_instances`),
    printedNew: one(sql`SELECT COUNT(*) FROM handout_instances WHERE created_at >= ${since}`),
    qrOpens: one(sql`SELECT COALESCE(SUM(open_count), 0) FROM handout_instances`),
    qrOpened: one(sql`SELECT COUNT(*) FROM handout_instances WHERE open_count > 0`),
    claimed: one(sql`SELECT COUNT(*) FROM handout_instances WHERE claimed_at IS NOT NULL`),
    savedLists: one(sql`SELECT COUNT(*) FROM clinician_lists`),
    pending: all<{ name: string; npi: string; clinic: string; created: string }>(sql`
      SELECT COALESCE(first_name || ' ', '') || last_name AS name, npi, clinic_name AS clinic, created_at AS created
      FROM clinicians WHERE verified_at IS NULL ORDER BY created_at DESC LIMIT 20`),
    applications: all<{ id: number; name: string; email: string; credential: string | null; message: string | null; created: string }>(sql`
      SELECT id, name, email, credential, message, created_at AS created FROM rater_applications ORDER BY id DESC LIMIT 20`),
    applicationsTotal: one(sql`SELECT COUNT(*) FROM rater_applications`),
  };
}

export function communityReport(now: Date, days: RangeDays) {
  const { from } = periods(now, days);
  const since = `${from}T00:00:00.000Z`;
  return {
    people: one(sql`SELECT COUNT(*) FROM people`),
    shelves: one(sql`SELECT COUNT(DISTINCT session_id) FROM shelf_items`),
    shelfItems: one(sql`SELECT COUNT(*) FROM shelf_items`),
    outcomes: one(sql`SELECT COUNT(*) FROM audience_outcomes`),
    checkinsSent: one(sql`SELECT COUNT(*) FROM checkins WHERE status = 'sent'`),
    checkinsDue: one(sql`SELECT COUNT(*) FROM checkins WHERE status = 'scheduled'`),
    checkinsFailed: one(sql`SELECT COUNT(*) FROM checkins WHERE status = 'failed'`),
    checkinAnswers: one(sql`SELECT COUNT(*) FROM outcome_observations`),
    checkinAnswersNew: one(sql`SELECT COUNT(*) FROM outcome_observations WHERE observed_at >= ${since}`),
    regimens: one(sql`SELECT COUNT(*) FROM regimens`),
    routines: one(sql`SELECT COUNT(*) FROM routines`),
    votes: one(sql`SELECT COUNT(*) FROM routine_votes`),
    reported: all<{ id: number; title: string; reports: number; reasons: string | null; last: string }>(sql`
      SELECT r.id, r.title, COUNT(*) AS reports, GROUP_CONCAT(rr.reason, ' | ') AS reasons, MAX(rr.created_at) AS last
      FROM routine_reports rr JOIN routines r ON r.id = rr.routine_id
      GROUP BY r.id ORDER BY reports DESC, last DESC LIMIT 20`),
    recallAlertsSent: one(sql`SELECT COUNT(*) FROM recall_notifications WHERE status = 'sent'`),
  };
}

export function catalogReport(now: Date) {
  const fresh = new Date(now.getTime() - 72 * 3_600_000).toISOString();
  return {
    products: one(sql`SELECT COUNT(*) FROM products`),
    otc: one(sql`SELECT COUNT(*) FROM products WHERE is_rx = 0`),
    rx: one(sql`SELECT COUNT(*) FROM products WHERE is_rx = 1`),
    withImage: one(sql`SELECT COUNT(*) FROM products WHERE image_url IS NOT NULL AND is_rx = 0`),
    bySource: counts(sql`SELECT data_source AS label, COUNT(*) AS n FROM products GROUP BY data_source ORDER BY n DESC`),
    actives: one(sql`SELECT COUNT(*) FROM actives`),
    ingredients: one(sql`SELECT COUNT(*) FROM ingredients`),
    manualLinks: one(sql`SELECT COUNT(*) FROM manual_affiliate_links`),
    manualLinkProducts: one(sql`SELECT COUNT(DISTINCT product_id) FROM manual_affiliate_links`),
    quotesFresh: one(sql`SELECT COUNT(*) FROM price_quotes WHERE fetched_at >= ${fresh}`),
    quotesStale: one(sql`SELECT COUNT(*) FROM price_quotes WHERE fetched_at < ${fresh}`),
    pricedProducts: one(sql`SELECT COUNT(DISTINCT product_id) FROM price_quotes WHERE fetched_at >= ${fresh}`),
    lastPriceFetch: (db.get<{ v: string | null }>(sql`SELECT MAX(fetched_at) AS v FROM price_quotes`)?.v ?? null) as string | null,
    // The Kroger catalog check: of the OTC products Kroger has been asked
    // about, how many it carries (priced at our store, or listed without one).
    krogerChecked: one(sql`SELECT COUNT(*) FROM price_checks WHERE source = 'kroger' AND status != 'error'`),
    krogerCarried: one(sql`SELECT COUNT(*) FROM price_checks WHERE source = 'kroger' AND status IN ('matched', 'listed')`),
    krogerPriced: one(sql`SELECT COUNT(DISTINCT product_id) FROM price_quotes WHERE source = 'kroger' AND fetched_at >= ${fresh}`),
    krogerStore: (db.get<{ v: string | null }>(sql`SELECT location AS v FROM price_quotes WHERE source = 'kroger' ORDER BY fetched_at DESC LIMIT 1`)?.v ??
      null) as string | null,
    priceChecks: counts(sql`SELECT source || ' ' || status AS label, COUNT(*) AS n FROM price_checks GROUP BY source, status ORDER BY source, n DESC`),
    images: counts(sql`SELECT status AS label, COUNT(*) AS n FROM dailymed_images GROUP BY status ORDER BY n DESC`),
    recalls: one(sql`SELECT COUNT(*) FROM recalls`),
    recallMatches: one(sql`SELECT COUNT(DISTINCT product_id) FROM recall_matches`),
  };
}

export function errorReport(now: Date, days: RangeDays) {
  const { from } = periods(now, days);
  const since = `${from}T00:00:00.000Z`;
  const last24 = new Date(now.getTime() - 86_400_000).toISOString();
  return {
    total: one(sql`SELECT COUNT(*) FROM server_errors WHERE at >= ${since}`),
    last24h: one(sql`SELECT COUNT(*) FROM server_errors WHERE at >= ${last24}`),
    byRoute: counts(sql`SELECT COALESCE(route, path) AS label, COUNT(*) AS n FROM server_errors
      WHERE at >= ${since} GROUP BY label ORDER BY n DESC LIMIT 10`),
    recent: all<{ at: string; method: string; path: string; message: string; digest: string | null }>(sql`
      SELECT at, method, path, message, digest FROM server_errors ORDER BY id DESC LIMIT 15`),
  };
}

function fileSize(p: string): number | null {
  try {
    return fs.statSync(p).size;
  } catch {
    return null;
  }
}

export function healthReport() {
  const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "skinwiz.db");
  let dbOk = true;
  try {
    db.get(sql`SELECT 1`);
  } catch {
    dbOk = false;
  }
  const backupDir = path.join(path.dirname(dbPath), "backups");
  let backups: { name: string; size: number; at: string }[] = [];
  try {
    backups = fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith(".db"))
      .map((name) => {
        const st = fs.statSync(path.join(backupDir, name));
        return { name, size: st.size, at: st.mtime.toISOString() };
      })
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  } catch {
    // no backups yet
  }
  const mem = process.memoryUsage();
  return {
    dbOk,
    dbSize: (fileSize(dbPath) ?? 0) + (fileSize(`${dbPath}-wal`) ?? 0),
    onVolume: Boolean(process.env.DATABASE_PATH),
    backups,
    uptimeSeconds: Math.round(process.uptime()),
    rssBytes: mem.rss,
    heapBytes: mem.heapUsed,
    node: process.version,
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    jobs: all<{ key: string; value: string; updatedAt: string }>(sql`
      SELECT key, value, updated_at AS updatedAt FROM job_state ORDER BY key`),
    analyticsRows: one(sql`SELECT COUNT(*) FROM analytics_events`),
    retentionDays: ANALYTICS_RETENTION_DAYS,
  };
}

/** CSV of the daily series plus the main breakdowns, for a spreadsheet. */
export function trafficCsv(now: Date, days: RangeDays): string {
  const t = trafficReport(now, days);
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = ["section,label,value,extra"];
  for (const p of t.series) lines.push(["daily", p.day, p.visitors, p.pageviews].map(esc).join(","));
  const add = (section: string, rows: Count[]) => {
    for (const r of rows) lines.push([section, r.label, r.n, r.extra ?? ""].map(esc).join(","));
  };
  add("page", t.topPages);
  add("referrer", t.referrers);
  add("campaign", t.campaigns);
  add("device", t.devices);
  add("retailer_clicks", t.outboundByRetailer);
  add("product_clicks", t.outboundByProduct);
  add("search", t.searchTerms);
  add("zero_result_search", t.zeroResultSearches);
  add("tool", t.toolEvents);
  return lines.join("\n") + "\n";
}
