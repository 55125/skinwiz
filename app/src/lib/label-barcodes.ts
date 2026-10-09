// Retail barcodes read off DailyMed label photos, for FDA products with no
// barcode from openFDA (about two thirds of them). The carton artwork in a
// label usually shows the UPC, so decoding it gives an exact code to search,
// price-check and link retailers by.
//
// Two ways in:
//   - the image sync (lib/product-images/sync.ts) decodes every package
//     photo it downloads, while the bytes are in memory, at no extra request;
//   - the hourly "labels" job (lib/jobs.ts) works through the other label
//     images of OTC products still missing a barcode, capped per run, polite
//     to DailyMed the same way the image sync is. Nothing is kept but the
//     barcodes: images are decoded in memory and dropped.
//   npm run labels:scan [-- --limit 50]    one-off run (no cap by default)
//
// State lives in label_scans (one row per image, never fetched twice) and
// label_barcodes (what was found, per set id), neither touched by the seed.
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { labelScans } from "@/db/schema";
import { decodeLabelBarcodes, recordLabelScan } from "@/lib/label-decode";
import { dailymedImageSource, download, Limiter, loadCandidates, type Candidate } from "@/lib/product-images/sync";
import { Rejected } from "@/lib/product-images/render";

// Images per set id the job will try: the photo ranking puts the carton
// first, and a label rarely has more than four images.
const MAX_IMAGES_PER_SET = 4;

function recordFailure(setid: string, imageName: string, status: "rejected" | "error", message: string, attempts: number, now: Date) {
  const hours = Math.min(2 ** Math.max(0, attempts - 1), 24 * 7);
  const row = {
    status,
    attempts,
    lastError: message.slice(0, 300),
    scannedAt: now.toISOString(),
    retryAfter: status === "error" ? new Date(now.getTime() + hours * 3_600_000).toISOString() : null,
  };
  db.insert(labelScans)
    .values({ splSetId: setid, imageName, barcodes: [], ...row })
    .onConflictDoUpdate({ target: [labelScans.splSetId, labelScans.imageName], set: row })
    .run();
}

export type LabelScanReport = {
  sets: number; // OTC set ids still without any barcode
  queued: number; // images to scan for them
  scanned: number;
  setsFound: number; // set ids that got a barcode this run
  rejected: number;
  errors: number;
  stoppedEarly: boolean;
};

/**
 * Every label image of every OTC set id still missing a barcode (none from
 * openFDA or Open Beauty Facts, none read off a label yet), recently viewed
 * products first, best-ranked image first; images already scanned skipped.
 */
function queue(candidates: Map<string, Candidate[]>, now: Date) {
  const sets = db.all<{ setid: string }>(sql`
    SELECT lower(p.spl_set_id) AS setid
    FROM products p LEFT JOIN product_views v ON v.product_id = p.id
    WHERE p.spl_set_id IS NOT NULL AND p.is_rx = 0 AND p.data_source IN ('openfda', 'dailymed')
    GROUP BY lower(p.spl_set_id)
    HAVING NOT EXISTS (
        SELECT 1 FROM product_barcodes b JOIN products q ON q.id = b.product_id
        WHERE lower(q.spl_set_id) = lower(p.spl_set_id) AND b.source IN ('openfda_upc', 'obf_id'))
      AND NOT EXISTS (SELECT 1 FROM label_barcodes l WHERE l.spl_set_id = lower(p.spl_set_id))
    ORDER BY MAX(v.last_viewed_at) IS NULL, MAX(v.last_viewed_at) DESC, setid`);
  const done = new Map<string, { status: string; retryAfter: string | null; attempts: number }>();
  for (const r of db.select().from(labelScans).all()) done.set(`${r.splSetId}|${r.imageName}`, r);
  const work: { setid: string; name: string; attempts: number }[] = [];
  for (const { setid } of sets) {
    for (const c of (candidates.get(setid) ?? []).slice(0, MAX_IMAGES_PER_SET)) {
      const prev = done.get(`${setid}|${c.name}`);
      if (prev && (prev.status !== "error" || (prev.retryAfter && prev.retryAfter > now.toISOString()))) continue;
      work.push({ setid, name: c.name, attempts: prev?.attempts ?? 0 });
    }
  }
  return { sets: sets.length, work };
}

export async function scanLabelBarcodes(
  opts: {
    limit?: number;
    deadlineMs?: number;
    fetchImpl?: typeof fetch;
    perSecond?: number;
    candidates?: Map<string, Candidate[]>;
    now?: Date;
    log?: (msg: string) => void;
  } = {},
): Promise<LabelScanReport> {
  const now = opts.now ?? new Date();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const limiter = new Limiter(opts.perSecond ?? 4);
  const deadline = opts.deadlineMs ? Date.now() + opts.deadlineMs : Infinity;
  const log = opts.log ?? (() => {});
  // Every label image, not just the usable photos: a barcode is often on a
  // panel the photo ranking scores low (back of carton, drug facts).
  const candidates = opts.candidates ?? loadCandidates(undefined, { all: true });
  const { sets, work } = queue(candidates, now);
  const report: LabelScanReport = { sets, queued: work.length, scanned: 0, setsFound: 0, rejected: 0, errors: 0, stoppedEarly: false };
  const todo = opts.limit ? work.slice(0, opts.limit) : work;
  if (todo.length < work.length) report.stoppedEarly = true;
  log(`${sets} OTC labels without a barcode, ${work.length} images to scan, doing ${todo.length}`);

  const found = new Set<string>();
  for (const item of todo) {
    if (found.has(item.setid)) continue; // got one from an earlier image of this label
    if (Date.now() > deadline) {
      report.stoppedEarly = true;
      break;
    }
    try {
      const buf = await download(dailymedImageSource(item.setid, item.name), fetchImpl, limiter);
      const barcodes = recordLabelScan(item.setid, item.name, await decodeLabelBarcodes(buf), now);
      report.scanned++;
      if (barcodes.length) {
        found.add(item.setid);
        report.setsFound++;
      }
    } catch (err) {
      if (err instanceof Rejected) {
        report.rejected++;
        recordFailure(item.setid, item.name, "rejected", (err as Error).message, item.attempts + 1, now);
      } else {
        report.errors++;
        recordFailure(item.setid, item.name, "error", (err as Error).message, item.attempts + 1, now);
      }
    }
    if ((report.scanned + report.rejected + report.errors) % 100 === 0) log(`  ${report.scanned} scanned, ${report.setsFound} labels with a barcode`);
  }
  return report;
}
