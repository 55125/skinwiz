// The live-price refresh, run hourly by lib/jobs.ts (and by the backfill
// script). Does nothing at all -- no queries to Sovrn, no writes -- unless
// both Sovrn keys are set.
//
// Each run spends at most SOVRN_MAX_REQUESTS_PER_RUN requests (default 300,
// at <= 10 req/s), on products that are due (never checked, matched more
// than 24h ago, or past a miss's back-off), in this order:
//   1. products on someone's shelf, regimen or a clinician plan
//   2. product pages viewed in the last 7 days, most recent first
//   3. the rest of the OTC catalog, never-checked first and products with a
//      barcode or brand page ahead of keyword-only ones
// Rx rows are never selected. A 401/403, or a 429/5xx that survives the
// backoff retries, stops the run; the product in hand keeps its old quotes.
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { maxRequestsPerRun, RECENT_VIEW_MS, sovrnConfig } from "./config";
import { SovrnSource, type SovrnDeps } from "./sovrn";
import { loadLookupProducts, saveLookup, saveLookupError } from "./store";
import { BudgetExhausted, SourceUnavailable, type PriceSource } from "./types";

export type PriceRefreshReport = {
  enabled: boolean;
  requests: number;
  checked: number;
  matched: number;
  misses: number;
  stopped?: string;
};

const SOURCE = "sovrn";

// Listed products only: a merged duplicate's barcodes are looked up as its
// canonical's aliases (lib/canonical.ts), and user rows saved under a
// duplicate's id stand for the canonical.
const due = (now: string) => sql`p.is_rx = 0 AND p.canonical_id IS NULL AND NOT EXISTS (
  SELECT 1 FROM price_checks c WHERE c.product_id = p.id AND c.source = ${SOURCE} AND c.next_check_at > ${now})`;

/** Due product ids in priority order, at most `limit`. Exported for tests. */
export function pickDueProducts(now: Date, limit: number, opts: { sweep?: boolean; only?: string[] } = {}): string[] {
  const at = now.toISOString();
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (ids: { id: string | null }[]) => {
    for (const { id } of ids) {
      if (!id || seen.has(id) || out.length >= limit) continue;
      seen.add(id);
      out.push(id);
    }
  };
  if (opts.only) {
    const list = JSON.stringify(opts.only);
    add(db.all<{ id: string }>(sql`SELECT p.id FROM products p JOIN json_each(${list}) j ON j.value = p.id WHERE ${due(at)} ORDER BY j.key`));
    return out;
  }
  add(
    db.all<{ id: string }>(sql`
      SELECT p.id FROM products p WHERE ${due(at)} AND p.id IN (
        SELECT COALESCE(d.canonical_id, u.pid) FROM (
          SELECT product_id AS pid FROM shelf_items WHERE status IN ('own', 'want')
          UNION SELECT product_id FROM regimen_items
          UNION SELECT json_extract(s.value, '$.productId') FROM handout_versions v, json_each(v.content, '$.steps') s
            WHERE json_extract(s.value, '$.kind') = 'otc'
        ) u LEFT JOIN products d ON d.id = u.pid)
      ORDER BY p.id LIMIT ${limit}`),
  );
  if (out.length < limit) {
    const since = new Date(now.getTime() - RECENT_VIEW_MS).toISOString();
    add(
      db.all<{ id: string }>(sql`
        SELECT p.id FROM product_views v JOIN products p ON p.id = v.product_id
        WHERE v.last_viewed_at >= ${since} AND ${due(at)}
        ORDER BY v.last_viewed_at DESC LIMIT ${limit}`),
    );
  }
  if (opts.sweep !== false && out.length < limit) {
    add(
      db.all<{ id: string }>(sql`
        SELECT p.id FROM products p LEFT JOIN price_checks c ON c.product_id = p.id AND c.source = ${SOURCE}
        WHERE ${due(at)}
        ORDER BY c.product_id IS NOT NULL,
          (p.source_url IS NOT NULL OR EXISTS (SELECT 1 FROM product_barcodes b WHERE b.product_id = p.id)) DESC,
          c.next_check_at, p.id
        LIMIT ${limit * 2}`),
    );
  }
  return out;
}

export async function refreshPrices(
  now: Date,
  opts: {
    maxRequests?: number;
    maxProducts?: number;
    only?: string[];
    sweep?: boolean;
    deps?: SovrnDeps;
    source?: PriceSource;
    log?: (s: string) => void;
  } = {},
): Promise<PriceRefreshReport> {
  const cfg = sovrnConfig();
  const report: PriceRefreshReport = { enabled: !!cfg, requests: 0, checked: 0, matched: 0, misses: 0 };
  if (!cfg) return report;

  const budget = { remaining: opts.maxRequests ?? maxRequestsPerRun() };
  const start = budget.remaining;
  const source = opts.source ?? new SovrnSource(cfg, { ...opts.deps, budget });
  const ids = pickDueProducts(now, Math.min(budget.remaining, opts.maxProducts ?? Infinity), { only: opts.only, sweep: opts.sweep });

  try {
    for (const p of loadLookupProducts(ids)) {
      if (budget.remaining <= 0) break;
      try {
        const result = await source.lookup(p, now);
        saveLookup(p.id, SOURCE, result, now);
        report.checked++;
        if (result.status === "matched") report.matched++;
        else report.misses++;
        opts.log?.(`${p.id}: ${result.status}${result.quotes.length ? ` (${result.quotes.length} offers)` : ""}`);
      } catch (err) {
        if (err instanceof BudgetExhausted) break;
        if (err instanceof SourceUnavailable) {
          if (err.status !== 401 && err.status !== 403) saveLookupError(p.id, SOURCE, now);
          report.stopped = err.message;
          break;
        }
        throw err;
      }
    }
  } finally {
    report.requests = start - budget.remaining;
  }
  return report;
}
