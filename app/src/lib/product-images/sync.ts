// Downloads the chosen DailyMed package photo for each FDA set id, renders
// WebP renditions (<=800px for the product page, <=320px for cards) onto the
// persistent volume, and links the products to them.
//
// Inputs: tools/catalog_pipeline/output/spl_media_candidates.csv (committed;
// fetch_dailymed_media.py ranks each label's images, best first) and the
// products table. State: the dailymed_images table (survives reseeds).
//
// Runs two ways:
//   npm run images:sync [-- --limit 100]   one-off backfill (no cap by default)
//   the hourly job (lib/jobs.ts "images")   capped per run, fills production
//                                            gradually after a deploy
// Polite to DailyMed: <=4 requests/second, identified User-Agent, retries
// with backoff across runs (retry_after), never on a visitor's request.
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { dailymedImages } from "@/db/schema";
import type { ImageSize } from "@/lib/image-urls";
import { imageDir, imageKey, imagePath, setDir } from "./storage";
import { linkSetImage, renditionsExist } from "./link";
import { Rejected, renderRenditions } from "./render";

export const CANDIDATES_CSV = path.join(path.resolve(process.cwd(), ".."), "tools/catalog_pipeline/output/spl_media_candidates.csv");
const IMAGE_BASE = "https://dailymed.nlm.nih.gov/dailymed/image.cfm";
export const USER_AGENT = "Actively catalog pipeline (hello@activelyskin.com)";
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;

export type Candidate = { name: string; score: number };

export type ImageSyncReport = {
  candidates: number; // set ids with a usable candidate and a product in the catalog
  ready: number; // already on disk before this run
  queued: number; // needed work
  downloaded: number;
  rejected: number; // candidate images skipped (404, not an image, too small)
  errors: number; // network/server errors, retried on a later run
  none: number; // set ids where every candidate was rejected
  linkedProducts: number;
  stoppedEarly: boolean; // hit the per-run cap or deadline with work left
  bytes: number;
};

export function dailymedImageSource(setid: string, name: string): string {
  return `${IMAGE_BASE}?${new URLSearchParams({ setid, name })}`;
}

/**
 * setid -> usable candidates, best first. The pipeline's `usable` column
 * decides (score >= 0, plus every image of a label whose images are all
 * DISC(ontinued) packaging); older CSVs without it fall back to score >= 0
 * (negative = drug facts, inserts, structures).
 */
export function loadCandidates(csvPath = CANDIDATES_CSV): Map<string, Candidate[]> {
  const out = new Map<string, Candidate[]>();
  if (!fs.existsSync(csvPath)) return out;
  const rows = parse(fs.readFileSync(csvPath, "utf-8"), { columns: true, skip_empty_lines: true }) as {
    setid: string;
    rank: string;
    image_name: string;
    score: string;
    usable?: string;
  }[];
  rows.sort((a, b) => a.setid.localeCompare(b.setid) || Number(a.rank) - Number(b.rank));
  for (const r of rows) {
    const score = Number(r.score);
    const usable = r.usable === undefined || r.usable === "" ? score >= 0 : r.usable === "1";
    if (!r.image_name || !usable) continue;
    const list = out.get(r.setid.toLowerCase()) ?? [];
    list.push({ name: r.image_name, score });
    out.set(r.setid.toLowerCase(), list);
  }
  return out;
}

class Limiter {
  private nextAt = 0;
  constructor(private readonly perSecond: number) {}
  async wait() {
    const now = Date.now();
    const at = Math.max(now, this.nextAt);
    this.nextAt = at + 1000 / this.perSecond;
    if (at > now) await new Promise((r) => setTimeout(r, at - now));
  }
}

type Fetch = typeof fetch;

async function download(url: string, fetchImpl: Fetch, limiter: Limiter): Promise<Buffer> {
  await limiter.wait();
  const res = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(45_000) });
  if (res.status === 404 || res.status === 410) throw new Rejected(`HTTP ${res.status}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (type && !type.startsWith("image/")) throw new Rejected(`not an image (${type})`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_DOWNLOAD_BYTES) throw new Rejected("too large");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_DOWNLOAD_BYTES) throw new Rejected("too large");
  return buf;
}

function writeAtomic(file: string, data: Buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

type StateRow = typeof dailymedImages.$inferSelect;

function upsert(row: Omit<StateRow, "rejected" | "attempts"> & { rejected: string[]; attempts: number }) {
  db.insert(dailymedImages)
    .values(row)
    .onConflictDoUpdate({ target: dailymedImages.splSetId, set: { ...row, splSetId: undefined } })
    .run();
}

// 1h, 2h, 4h ... capped at a week.
function retryAfter(now: Date, attempts: number): string {
  const hours = Math.min(2 ** Math.max(0, attempts - 1), 24 * 7);
  return new Date(now.getTime() + hours * 3_600_000).toISOString();
}

export async function syncDailymedImages(
  opts: {
    limit?: number;
    deadlineMs?: number;
    root?: string;
    fetchImpl?: Fetch;
    perSecond?: number;
    concurrency?: number;
    candidates?: Map<string, Candidate[]>;
    now?: Date;
    log?: (msg: string) => void;
  } = {},
): Promise<ImageSyncReport> {
  const root = opts.root ?? imageDir();
  const now = opts.now ?? new Date();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const limiter = new Limiter(opts.perSecond ?? 4);
  const log = opts.log ?? (() => {});
  const deadline = opts.deadlineMs ? Date.now() + opts.deadlineMs : Infinity;
  const candidates = opts.candidates ?? loadCandidates();
  const report: ImageSyncReport = {
    candidates: 0, ready: 0, queued: 0, downloaded: 0, rejected: 0, errors: 0, none: 0, linkedProducts: 0, stoppedEarly: false, bytes: 0,
  };

  // Recently viewed products first (product_views), then OTC before Rx.
  const sets = db.all<{ setid: string }>(sql`
    SELECT lower(p.spl_set_id) AS setid
    FROM products p LEFT JOIN product_views v ON v.product_id = p.id
    WHERE p.spl_set_id IS NOT NULL AND p.data_source IN ('openfda', 'dailymed')
    GROUP BY lower(p.spl_set_id)
    ORDER BY MAX(v.last_viewed_at) IS NULL, MAX(v.last_viewed_at) DESC, MIN(p.is_rx), setid`);
  const state = new Map(db.select().from(dailymedImages).all().map((r) => [r.splSetId, r]));

  const queue: { setid: string; cands: Candidate[]; row: StateRow | undefined }[] = [];
  for (const { setid } of sets) {
    const cands = candidates.get(setid);
    if (!cands?.length) continue;
    report.candidates++;
    const row = state.get(setid);
    const rejected = new Set(row?.rejected ?? []);
    const desired = cands.find((c) => !rejected.has(c.name));
    if (!desired) {
      if (row?.status !== "none") {
        upsert({ ...emptyRow(setid, now), status: "none", rejected: [...rejected], attempts: row?.attempts ?? 0 });
        linkSetImage(setid, null);
      }
      continue;
    }
    if (row?.status === "ok" && row.imageName === desired.name && row.imageKey && renditionsExist(setid, row.imageKey, root)) {
      report.ready++;
      continue;
    }
    if (row?.status === "error" && row.retryAfter && row.retryAfter > now.toISOString()) continue;
    queue.push({ setid, cands, row });
  }
  report.queued = queue.length;
  const work = opts.limit ? queue.slice(0, opts.limit) : queue;
  if (work.length < queue.length) report.stoppedEarly = true;
  log(`${report.candidates} set ids with candidates, ${report.ready} already on disk, ${queue.length} to sync, doing ${work.length}`);

  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < work.length) {
      if (Date.now() > deadline) {
        report.stoppedEarly = true;
        return;
      }
      const item = work[next++];
      await syncOne(item.setid, item.cands, item.row);
      if (++done % 100 === 0) log(`  ${done}/${work.length} (${report.downloaded} downloaded, ${report.rejected} rejected, ${report.errors} errors)`);
    }
  };

  const syncOne = async (setid: string, cands: Candidate[], row: StateRow | undefined) => {
    const rejected = new Set(row?.rejected ?? []);
    const attempts = (row?.attempts ?? 0) + 1;
    for (const c of cands) {
      if (rejected.has(c.name)) continue;
      try {
        const buf = await download(dailymedImageSource(setid, c.name), fetchImpl, limiter);
        const { width, height, files } = await renderRenditions(buf);
        const key = imageKey(setid, c.name);
        let bytes = 0;
        for (const size of Object.keys(files) as ImageSize[]) {
          writeAtomic(imagePath(setid, key, size, root)!, files[size]);
          bytes += files[size].length;
        }
        // drop renditions of an image this set id no longer uses
        for (const f of fs.readdirSync(setDir(setid, root))) {
          if (!f.startsWith(`${key}-`)) fs.rmSync(path.join(setDir(setid, root), f), { force: true });
        }
        upsert({
          ...emptyRow(setid, now), status: "ok", imageName: c.name, imageKey: key, width, height, bytes,
          rejected: [...rejected], attempts: 0,
        });
        report.downloaded++;
        report.bytes += bytes;
        report.linkedProducts += linkSetImage(setid, key);
        return;
      } catch (err) {
        if (err instanceof Rejected) {
          rejected.add(c.name);
          report.rejected++;
          continue;
        }
        report.errors++;
        upsert({
          ...emptyRow(setid, now), status: "error", imageName: row?.imageName ?? null, imageKey: row?.imageKey ?? null,
          width: row?.width ?? null, height: row?.height ?? null, bytes: row?.bytes ?? null,
          rejected: [...rejected], attempts, lastError: (err as Error).message.slice(0, 300), retryAfter: retryAfter(now, attempts),
        });
        return;
      }
    }
    report.none++;
    upsert({ ...emptyRow(setid, now), status: "none", rejected: [...rejected], attempts: 0 });
    linkSetImage(setid, null);
  };

  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency ?? 3) }, worker));
  return report;
}

function emptyRow(setid: string, now: Date) {
  return {
    splSetId: setid,
    imageName: null,
    imageKey: null,
    width: null,
    height: null,
    bytes: null,
    lastError: null,
    updatedAt: now.toISOString(),
    retryAfter: null,
  };
}
