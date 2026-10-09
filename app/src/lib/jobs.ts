// The hourly background job, run by POST /api/cron/run. Every step is
// idempotent, so calling it twice in a row (or overlapping) is harmless:
// check-ins and recall emails are claimed row-by-row before sending, and the
// recall sync throttles itself to every 6 hours. The price refresh only
// touches products that are due, and does nothing until both Sovrn keys are
// set (lib/prices/refresh.ts). The image sync downloads a capped batch of
// DailyMed package photos per run (lib/product-images/sync.ts), so a fresh
// volume fills itself over the first day or two after a deploy.
import { purgeExpiredTokens } from "@/lib/identity";
import { sendDueCheckins, type CheckinRunResult } from "@/lib/checkins";
import { notifyRecalls, setState, syncRecalls, type NotifyResult, type SyncResult } from "@/lib/recalls";
import { purgeAnalytics } from "@/lib/analytics/store";
import { refreshPrices, type PriceRefreshReport } from "@/lib/prices/refresh";
import { syncDailymedImages, type ImageSyncReport } from "@/lib/product-images/sync";

export type JobName = "checkins" | "recalls" | "cleanup" | "prices" | "images";
// images last: it's the slowest step and nothing else waits on it
export const ALL_JOBS: JobName[] = ["recalls", "checkins", "cleanup", "prices", "images"];

// Per-run cap for the image sync, count and wall clock, whichever comes
// first (IMAGE_SYNC_PER_RUN, IMAGE_SYNC_SECONDS; IMAGE_SYNC=off disables).
export function imageSyncBudget(env: Record<string, string | undefined> = process.env): { limit: number; deadlineMs: number } | null {
  if (env.IMAGE_SYNC === "off") return null;
  const limit = Number(env.IMAGE_SYNC_PER_RUN ?? 300);
  const seconds = Number(env.IMAGE_SYNC_SECONDS ?? 240);
  if (!(limit > 0)) return null;
  return { limit, deadlineMs: (seconds > 0 ? seconds : 240) * 1000 };
}

export type JobReport = {
  now: string;
  recallSync?: SyncResult | { error: string };
  recallEmails?: NotifyResult;
  checkins?: CheckinRunResult;
  purgedTokens?: number;
  purgedAnalytics?: number;
  prices?: PriceRefreshReport | { error: string };
  images?: ImageSyncReport | { error: string } | { skipped: string };
};

let running = false;

export async function runJobs(now: Date, jobs: JobName[] = ALL_JOBS, opts: { forceRecallSync?: boolean } = {}): Promise<JobReport | null> {
  // One run at a time per process (the app runs as a single instance).
  if (running) return null;
  running = true;
  try {
    const report: JobReport = { now: now.toISOString() };
    if (jobs.includes("recalls")) {
      try {
        report.recallSync = await syncRecalls(now, { force: opts.forceRecallSync });
      } catch (err) {
        // An openFDA outage mustn't stop check-ins; emails still go out for
        // recalls already stored.
        report.recallSync = { error: (err as Error).message };
      }
      report.recallEmails = await notifyRecalls(now);
    }
    if (jobs.includes("checkins")) report.checkins = await sendDueCheckins(now);
    if (jobs.includes("cleanup")) {
      report.purgedTokens = purgeExpiredTokens(now);
      report.purgedAnalytics = purgeAnalytics(now);
    }
    if (jobs.includes("prices")) {
      try {
        report.prices = await refreshPrices(now);
      } catch (err) {
        report.prices = { error: (err as Error).message };
      }
    }
    if (jobs.includes("images")) {
      const budget = imageSyncBudget();
      if (!budget) report.images = { skipped: "IMAGE_SYNC is off" };
      else {
        try {
          report.images = await syncDailymedImages(budget);
        } catch (err) {
          report.images = { error: (err as Error).message };
        }
      }
    }
    // Shown on the admin page's health panel (real clock, not the test one).
    setState("cron:last_run", jobs.join(","));
    return report;
  } finally {
    running = false;
  }
}
