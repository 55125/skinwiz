// IndexNow: tells Bing (which also serves DuckDuckGo, Yahoo, Ecosia, Copilot
// and ChatGPT search), Yandex, Seznam and Naver which pages changed, so they
// recrawl in hours instead of waiting for their own schedule. Google doesn't
// use IndexNow; it reads the <lastmod> dates the same bookkeeping produces.
//
// The hourly job (lib/jobs.ts) fingerprints every sitemap URL, compares with
// the indexnow_urls table, and queues the URLs that are new, changed or gone.
// The first run queues everything (Bing had found 0 sitemap URLs as of Oct
// 31 2026), then only real changes. Pending URLs go out in batches of up to
// 10,000 (IndexNow's per-request maximum), at most MAX_PER_RUN a run.
//
// Off until INDEXNOW_KEY is set (8-128 letters, digits or dashes). The key is
// served at /indexnow-key.txt (app/indexnow-key.txt/route.ts), which every
// request names as keyLocation. Only runs for the live https site, never for
// localhost or a Railway preview domain.
import { createHash } from "node:crypto";
import { count, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { indexnowUrls, ingredients, products } from "@/db/schema";
import { siteUrl } from "@/lib/site-url";
import { SITEMAP_PARTS, buildSitemapPart } from "@/lib/sitemap";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const BATCH_SIZE = 10_000;
export const MAX_PER_RUN = 20_000;
export const KEY_PATH = "/indexnow-key.txt";

export function indexNowKey(env: Record<string, string | undefined> = process.env): string | null {
  const key = env.INDEXNOW_KEY?.trim();
  return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

export function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("base64url").slice(0, 22);
}

type Stored = { url: string; hash: string; changedAt: string | null; submittedAt: string | null };

export type Plan = {
  insert: Stored[];
  update: Stored[];
  // URLs no longer in the sitemap: sent once so engines recrawl them (and see
  // the 404 or noindex), then forgotten.
  removed: string[];
};

/**
 * Compare the current URLs and fingerprints with what's stored. A first run
 * (nothing stored) records every page with no change date, since the real
 * one is unknown; later new or changed pages get `now`.
 */
export function planChanges(current: Map<string, string>, stored: Map<string, string>, now: string): Plan {
  const baseline = stored.size === 0;
  const plan: Plan = { insert: [], update: [], removed: [] };
  for (const [url, hash] of current) {
    const old = stored.get(url);
    if (old === undefined) plan.insert.push({ url, hash, changedAt: baseline ? null : now, submittedAt: null });
    else if (old !== hash) plan.update.push({ url, hash, changedAt: now, submittedAt: null });
  }
  for (const url of stored.keys()) if (!current.has(url)) plan.removed.push(url);
  return plan;
}

/** The live origin's host, or null when this isn't the public https site. */
export function submittableHost(base: string): string | null {
  let u: URL;
  try {
    u = new URL(base);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname === "localhost" || u.hostname.endsWith(".up.railway.app")) return null;
  return u.hostname;
}

export function batches<T>(items: T[], size = BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// --- reading the site ------------------------------------------------------

// What each product and ingredient page shows comes from these rows, so a
// change to any of them is a change to the page. Other pages (guides,
// allergens, routines...) are tracked by URL only: new ones get sent.
function pageFingerprints(base: string): Map<string, string> {
  const byUrl = new Map<string, string>();
  for (const part of SITEMAP_PARTS) for (const e of buildSitemapPart(part)) byUrl.set(e.url, "");

  const productPrefix = `${base}/product/`;
  for (const row of db.select().from(products).all()) {
    const url = productPrefix + encodeURIComponent(row.id);
    if (byUrl.has(url)) byUrl.set(url, fingerprint(row));
  }
  const ingredientPrefix = `${base}/ingredient/`;
  for (const row of db.select().from(ingredients).all()) {
    const url = ingredientPrefix + encodeURIComponent(row.id);
    if (byUrl.has(url)) byUrl.set(url, fingerprint(row));
  }
  return byUrl;
}

// --- the job ---------------------------------------------------------------

export type IndexNowReport =
  | { skipped: string }
  | { tracked: number; queued: { new: number; changed: number; removed: number }; sent: number; pending: number; error?: string };

type Fetch = typeof fetch;

export async function runIndexNow(now: Date, fetchImpl: Fetch = fetch): Promise<IndexNowReport> {
  const key = indexNowKey();
  if (!key) return { skipped: "INDEXNOW_KEY is not set" };
  const base = siteUrl();
  const host = submittableHost(base);
  if (!host) return { skipped: `not the public site (${base})` };
  const iso = now.toISOString();

  const current = pageFingerprints(base);
  const storedRows = db.select({ url: indexnowUrls.url, hash: indexnowUrls.hash }).from(indexnowUrls).all();
  const plan = planChanges(current, new Map(storedRows.map((r) => [r.url, r.hash])), iso);

  db.transaction((tx) => {
    for (const chunk of batches(plan.insert, 500)) tx.insert(indexnowUrls).values(chunk).run();
    for (const r of plan.update) {
      tx.insert(indexnowUrls)
        .values(r)
        .onConflictDoUpdate({ target: indexnowUrls.url, set: { hash: r.hash, changedAt: r.changedAt, submittedAt: null } })
        .run();
    }
  });

  const pending = db
    .select({ url: indexnowUrls.url })
    .from(indexnowUrls)
    .where(isNull(indexnowUrls.submittedAt))
    .limit(Math.max(0, MAX_PER_RUN - plan.removed.length))
    .all()
    .map((r) => r.url);
  // Removed URLs go first: they're sent once and then dropped from the table.
  const toSend = [...plan.removed, ...pending];
  const removed = new Set(plan.removed);

  let sent = 0;
  let error: string | undefined;
  for (const batch of batches(toSend)) {
    const res = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: `${base}${KEY_PATH}`, urlList: batch }),
      signal: AbortSignal.timeout(30_000),
    }).catch((err: Error) => ({ ok: false, status: 0, statusText: err.message }) as Response);
    // 200 = accepted, 202 = accepted while the key is still being checked.
    if (res.status !== 200 && res.status !== 202) {
      error = `IndexNow answered ${res.status} ${res.statusText}`.trim();
      break;
    }
    const gone = batch.filter((u) => removed.has(u));
    const kept = batch.filter((u) => !removed.has(u));
    db.transaction((tx) => {
      for (const chunk of batches(gone, 500)) tx.delete(indexnowUrls).where(inArray(indexnowUrls.url, chunk)).run();
      for (const chunk of batches(kept, 500)) tx.update(indexnowUrls).set({ submittedAt: iso }).where(inArray(indexnowUrls.url, chunk)).run();
    });
    sent += batch.length;
  }
  if (error && plan.removed.length) {
    // Couldn't announce the removals; forget them anyway so they aren't
    // re-detected forever (the engines will find the 404s on their own).
    db.transaction((tx) => {
      for (const chunk of batches(plan.removed, 500)) tx.delete(indexnowUrls).where(inArray(indexnowUrls.url, chunk)).run();
    });
  }

  const stillPending = db.select({ n: count() }).from(indexnowUrls).where(isNull(indexnowUrls.submittedAt)).get()?.n ?? 0;
  return {
    tracked: current.size,
    queued: { new: plan.insert.length, changed: plan.update.length, removed: plan.removed.length },
    sent,
    pending: stillPending,
    ...(error ? { error } : {}),
  };
}
