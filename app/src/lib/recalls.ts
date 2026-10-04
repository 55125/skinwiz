// FDA drug recalls: incremental sync from the openFDA enforcement API,
// matching to the catalog (pure rules in recall-match.ts), shelf alerts and
// one-time emails. Driven by the cron job (lib/jobs.ts) and the backfill
// script (db/backfill-recalls.ts).
import { and, desc, eq, gte, inArray, ne, sql, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db/client";
import { jobState, people, products, recallMatches, recallNotifications, recalls, shelfItems } from "@/db/schema";
import { inProductGroup, resolvedProductId } from "@/lib/canonical";
import { iso } from "@/lib/identity";
import { sendEmail, SEND_SPACING_MS } from "@/lib/email";
import { recallEmail } from "@/lib/email-templates";
import { productUrl, settingsUrl, unsubscribeUrl } from "@/lib/email-links";
import {
  buildCatalogIndex,
  classMeaning,
  EMAIL_CONFIDENCE,
  fdaDate,
  fdaRecallUrl,
  matchRecall,
  type RecallMatch,
} from "@/lib/recall-match";

const API = "https://api.fda.gov/drug/enforcement.json";
const PAGE = 1000; // openFDA's max limit
const MAX_SKIP = 25_000; // openFDA rejects skip beyond this
// Without a key openFDA allows 240 requests/minute and 1,000/day per IP; a
// pause between pages keeps even a backfill far below that.
const REQUEST_SPACING_MS = 400;
const SYNC_EVERY_MS = 6 * 60 * 60_000;
const STATUS_REFRESH_MS = 7 * 24 * 60 * 60_000;
// Emails go out for recalls that are still in effect and recent; an old or
// terminated recall still shows on the product page and shelf, but isn't
// worth an email.
const EMAIL_WINDOW_DAYS = 365;
const MAX_ATTEMPTS = 5;
const STALE_CLAIM_MS = 60 * 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- job state ------------------------------------------------------------

export function getState(key: string): string | null {
  return db.select({ value: jobState.value }).from(jobState).where(eq(jobState.key, key)).get()?.value ?? null;
}

export function setState(key: string, value: string, now = new Date()) {
  db.insert(jobState)
    .values({ key, value, updatedAt: iso(now) })
    .onConflictDoUpdate({ target: jobState.key, set: { value, updatedAt: iso(now) } })
    .run();
}

// --- fetching -------------------------------------------------------------

type FdaRecord = {
  recall_number: string;
  event_id?: string;
  classification?: string;
  status?: string;
  reason_for_recall?: string;
  product_description?: string;
  code_info?: string;
  recalling_firm?: string;
  recall_initiation_date?: string;
  report_date?: string;
  termination_date?: string;
  openfda?: { product_ndc?: string[]; brand_name?: string[] };
};

async function fetchPage(search: string, skip: number): Promise<{ total: number; results: FdaRecord[] }> {
  const key = process.env.OPENFDA_API_KEY;
  // openFDA wants the literal "+TO+" / "+" syntax, so the query is built by hand.
  const url = `${API}?search=${search}&sort=report_date:asc&limit=${PAGE}&skip=${skip}${key ? `&api_key=${encodeURIComponent(key)}` : ""}`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000), headers: { Accept: "application/json" } });
    if (res.status === 404) return { total: 0, results: [] }; // openFDA's "No matches found"
    if (res.ok) {
      const body = (await res.json()) as { meta?: { results?: { total?: number } }; results?: FdaRecord[] };
      return { total: body.meta?.results?.total ?? 0, results: body.results ?? [] };
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(attempt * 5_000);
      continue;
    }
    throw new Error(`openFDA ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

async function fetchAll(search: string): Promise<FdaRecord[]> {
  const out: FdaRecord[] = [];
  for (let skip = 0; skip <= MAX_SKIP; skip += PAGE) {
    const page = await fetchPage(search, skip);
    out.push(...page.results);
    if (skip + PAGE >= page.total || page.results.length < PAGE) break;
    await sleep(REQUEST_SPACING_MS);
  }
  return out;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

function upsertRecords(records: FdaRecord[], now: Date): number {
  let n = 0;
  db.transaction((tx) => {
    for (const r of records) {
      if (!r.recall_number || !r.product_description) continue;
      const row = {
        recallNumber: r.recall_number,
        eventId: r.event_id ?? null,
        classification: r.classification ?? null,
        status: r.status ?? null,
        reasonForRecall: r.reason_for_recall ?? null,
        productDescription: r.product_description,
        codeInfo: r.code_info ?? null,
        recallingFirm: r.recalling_firm ?? null,
        recallInitiationDate: fdaDate(r.recall_initiation_date),
        reportDate: fdaDate(r.report_date),
        terminationDate: fdaDate(r.termination_date),
        productNdcs: r.openfda?.product_ndc ?? [],
        brandNames: r.openfda?.brand_name ?? [],
        fetchedAt: iso(now),
      };
      const { recallNumber, ...rest } = row;
      void recallNumber;
      tx.insert(recalls).values(row).onConflictDoUpdate({ target: recalls.recallNumber, set: rest }).run();
      n++;
    }
  });
  return n;
}

export type SyncResult = { skipped?: string; fetched: number; refreshed: number; from?: string; to?: string; matches?: number };

/**
 * Pulls recalls reported since the newest report_date we already have (the
 * same day again, so nothing reported later that day is missed; upserts make
 * the overlap harmless). First run: the last `initialYears` years. Then
 * re-checks the status of matched, still-open recalls weekly (openFDA updates
 * status in place without a new report_date). Runs at most every 6 hours
 * unless forced.
 */
export async function syncRecalls(now: Date, opts: { force?: boolean; initialYears?: number; fullWindow?: boolean } = {}): Promise<SyncResult> {
  const last = getState("recalls.lastSyncAt");
  if (!opts.force && last && now.getTime() - Date.parse(last) < SYNC_EVERY_MS) {
    return { skipped: "synced recently", fetched: 0, refreshed: 0 };
  }
  const since = opts.fullWindow ? null : getState("recalls.lastReportDate");
  const from = since ?? ymd(new Date(now.getTime() - (opts.initialYears ?? 3) * 365.25 * 24 * 60 * 60_000));
  const to = ymd(new Date(now.getTime() + 24 * 60 * 60_000));

  // One-year windows keep each query far under openFDA's 25k skip ceiling.
  let fetched = 0;
  let maxReport = since ?? from;
  for (let start = Number(from.slice(0, 4)); start <= Number(to.slice(0, 4)); start++) {
    const a = start === Number(from.slice(0, 4)) ? from : `${start}0101`;
    const b = start === Number(to.slice(0, 4)) ? to : `${start}1231`;
    const records = await fetchAll(`report_date:[${a}+TO+${b}]`);
    fetched += upsertRecords(records, now);
    for (const r of records) if (r.report_date && r.report_date > maxReport && r.report_date <= ymd(now)) maxReport = r.report_date;
    await sleep(REQUEST_SPACING_MS);
  }

  // Status refresh for recalls that matter to us.
  const stale = db
    .selectDistinct({ recallNumber: recalls.recallNumber })
    .from(recalls)
    .innerJoin(recallMatches, eq(recallMatches.recallNumber, recalls.recallNumber))
    .where(and(ne(sql`coalesce(${recalls.status}, '')`, "Terminated"), sql`${recalls.fetchedAt} < ${iso(new Date(now.getTime() - STATUS_REFRESH_MS))}`))
    .all()
    .map((r) => r.recallNumber);
  let refreshed = 0;
  for (let i = 0; i < stale.length; i += 25) {
    const q = stale
      .slice(i, i + 25)
      .map((n) => `recall_number:"${encodeURIComponent(n)}"`)
      .join("+");
    refreshed += upsertRecords(await fetchAll(q), now);
    await sleep(REQUEST_SPACING_MS);
  }

  setState("recalls.lastReportDate", maxReport, now);
  setState("recalls.lastSyncAt", iso(now), now);
  const matches = rematchAll();
  return { fetched, refreshed, from, to, matches };
}

// --- matching -------------------------------------------------------------

/** Recomputes every recall -> product match from scratch (fast: index lookups). */
export function rematchAll(): number {
  const index = buildCatalogIndex(
    db.select({ id: products.id, brandName: products.brandName, manufacturer: products.manufacturer }).from(products).all(),
  );
  const all = db.select().from(recalls).all();
  const rows: (RecallMatch & { recallNumber: string })[] = [];
  for (const r of all) for (const m of matchRecall(r, index)) rows.push({ ...m, recallNumber: r.recallNumber });
  db.transaction((tx) => {
    tx.delete(recallMatches).run();
    for (let i = 0; i < rows.length; i += 100) tx.insert(recallMatches).values(rows.slice(i, i + 100)).run();
  });
  return rows.length;
}

// --- reads for the UI -----------------------------------------------------

export type ProductRecall = {
  recallNumber: string;
  classification: string | null;
  status: string | null;
  reasonForRecall: string | null;
  productDescription: string;
  codeInfo: string | null;
  recallInitiationDate: string | null;
  reportDate: string | null;
  eventId: string | null;
  confidence: number;
  matchType: string;
};

const recallFields = {
  recallNumber: recalls.recallNumber,
  classification: recalls.classification,
  status: recalls.status,
  reasonForRecall: recalls.reasonForRecall,
  productDescription: recalls.productDescription,
  codeInfo: recalls.codeInfo,
  recallInitiationDate: recalls.recallInitiationDate,
  reportDate: recalls.reportDate,
  eventId: recalls.eventId,
  confidence: recallMatches.confidence,
  matchType: recallMatches.matchType,
};

export function recallsForProduct(productId: string): ProductRecall[] {
  return db
    .select(recallFields)
    .from(recallMatches)
    .innerJoin(recalls, eq(recalls.recallNumber, recallMatches.recallNumber))
    .where(inProductGroup(recallMatches.productId, productId))
    .orderBy(desc(recallMatches.confidence), desc(recalls.reportDate))
    .all()
    .filter((r, i, all) => all.findIndex((x) => x.recallNumber === r.recallNumber) === i);
}

// Recall matches are computed per listing (rematchAll). A merged duplicate
// (lib/canonical.ts) is the same product as its canonical, so shelf rows and
// matches are joined on the listed id each resolves to: a recall matched to
// either listing reaches a shelf row saved under either id.
const sameProduct = (a: SQLWrapper, b: SQLWrapper) => sql`${resolvedProductId(a)} = ${resolvedProductId(b)}`;

/** Recalls touching products on this shelf (owned or wanted). */
export function shelfRecallAlerts(sessionId: string) {
  return db
    .select({ ...recallFields, productId: products.id, brandName: products.brandName, shelfStatus: shelfItems.status })
    .from(shelfItems)
    .innerJoin(recallMatches, sameProduct(recallMatches.productId, shelfItems.productId))
    .innerJoin(recalls, eq(recalls.recallNumber, recallMatches.recallNumber))
    .innerJoin(products, eq(products.id, resolvedProductId(shelfItems.productId)))
    .where(and(eq(shelfItems.sessionId, sessionId), inArray(shelfItems.status, ["own", "want"])))
    .orderBy(desc(recallMatches.confidence), desc(recalls.reportDate))
    .all()
    .filter((r, i, all) => all.findIndex((x) => x.recallNumber === r.recallNumber && x.productId === r.productId) === i);
}

// --- emails ---------------------------------------------------------------

export type NotifyResult = { sent: number; failed: number; deferred: number };

export async function notifyRecalls(now: Date, opts: { maxEmails?: number; spacingMs?: number } = {}): Promise<NotifyResult> {
  const maxEmails = opts.maxEmails ?? 100;
  const spacingMs = opts.spacingMs ?? SEND_SPACING_MS;
  const result: NotifyResult = { sent: 0, failed: 0, deferred: 0 };
  const windowStart = new Date(now.getTime() - EMAIL_WINDOW_DAYS * 24 * 60 * 60_000).toISOString().slice(0, 10);

  const candidates = db
    .select({
      personId: people.id,
      email: people.email,
      recallNumber: recalls.recallNumber,
      productId: products.id,
      brandName: products.brandName,
      classification: recalls.classification,
      reason: recalls.reasonForRecall,
      initiated: recalls.recallInitiationDate,
      description: recalls.productDescription,
      codeInfo: recalls.codeInfo,
      eventId: recalls.eventId,
      notified: recallNotifications.status,
    })
    .from(people)
    .innerJoin(shelfItems, and(eq(shelfItems.sessionId, people.homeSessionId), inArray(shelfItems.status, ["own", "want"])))
    .innerJoin(recallMatches, and(sameProduct(recallMatches.productId, shelfItems.productId), gte(recallMatches.confidence, EMAIL_CONFIDENCE)))
    .innerJoin(recalls, eq(recalls.recallNumber, recallMatches.recallNumber))
    .innerJoin(products, eq(products.id, resolvedProductId(shelfItems.productId)))
    .leftJoin(recallNotifications, and(eq(recallNotifications.personId, people.id), eq(recallNotifications.recallNumber, recalls.recallNumber)))
    .where(
      and(
        eq(people.safetyAlertsEnabled, true),
        ne(sql`coalesce(${recalls.status}, '')`, "Terminated"),
        gte(recalls.reportDate, windowStart),
        sql`coalesce(${recallNotifications.status}, '') <> 'sent'`,
      ),
    )
    .all();

  const seen = new Set<string>();
  for (const c of candidates) {
    const key = `${c.personId}\u0000${c.recallNumber}`;
    if (seen.has(key)) continue; // one email per recall even if two shelf products match it
    seen.add(key);
    if (result.sent + result.failed >= maxEmails) {
      result.deferred++;
      continue;
    }
    if (!claimNotification(c.personId, c.recallNumber, c.productId, now)) continue;

    const fmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
    const unsub = unsubscribeUrl(c.personId, "safety", now);
    const email = recallEmail(
      {
        brandName: c.brandName,
        productUrl: productUrl(c.productId),
        classification: c.classification,
        classMeaning: classMeaning(c.classification),
        reason: c.reason,
        initiated: c.initiated ? fmt.format(new Date(`${c.initiated}T00:00:00Z`)) : null,
        description: c.description,
        codeInfo: c.codeInfo,
        fdaUrl: fdaRecallUrl(c.eventId),
      },
      unsub,
      settingsUrl(),
    );
    const res = await sendEmail({
      to: c.email,
      ...email,
      category: "safety",
      unsubscribeUrl: unsub,
      idempotencyKey: `recall-${c.personId}-${c.recallNumber}`,
    });
    const where = and(eq(recallNotifications.personId, c.personId), eq(recallNotifications.recallNumber, c.recallNumber));
    if (res.ok) {
      db.update(recallNotifications).set({ status: "sent", sentAt: iso(now) }).where(where).run();
      result.sent++;
    } else {
      console.error(`[recalls] alert to person ${c.personId} for ${c.recallNumber} failed: ${res.error}`);
      db.update(recallNotifications).set({ status: res.retryable ? "retry" : "failed" }).where(where).run();
      result.failed++;
    }
    if (spacingMs) await sleep(spacingMs);
  }
  return result;
}

/** The exactly-once gate: a fresh row, or a retryable/stale one, can be claimed; a sent one never. */
function claimNotification(personId: string, recallNumber: string, productId: string, now: Date): boolean {
  const inserted = db.run(sql`INSERT OR IGNORE INTO recall_notifications (person_id, recall_number, product_id, status, attempts, claimed_at)
    VALUES (${personId}, ${recallNumber}, ${productId}, 'sending', 1, ${iso(now)})`).changes;
  if (inserted) return true;
  const stale = iso(new Date(now.getTime() - STALE_CLAIM_MS));
  return (
    db.run(sql`UPDATE recall_notifications SET status = 'sending', attempts = attempts + 1, claimed_at = ${iso(now)}
      WHERE person_id = ${personId} AND recall_number = ${recallNumber} AND attempts < ${MAX_ATTEMPTS}
        AND (status = 'retry' OR (status = 'sending' AND claimed_at < ${stale}))`).changes === 1
  );
}
