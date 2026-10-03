// The hourly background job, run by POST /api/cron/run. Every step is
// idempotent, so calling it twice in a row (or overlapping) is harmless:
// check-ins and recall emails are claimed row-by-row before sending, and the
// recall sync throttles itself to every 6 hours. The price refresh only
// touches products that are due, and does nothing until both Sovrn keys are
// set (lib/prices/refresh.ts).
import { purgeExpiredTokens } from "@/lib/identity";
import { sendDueCheckins, type CheckinRunResult } from "@/lib/checkins";
import { notifyRecalls, syncRecalls, type NotifyResult, type SyncResult } from "@/lib/recalls";
import { refreshPrices, type PriceRefreshReport } from "@/lib/prices/refresh";

export type JobName = "checkins" | "recalls" | "cleanup" | "prices";
export const ALL_JOBS: JobName[] = ["recalls", "checkins", "cleanup", "prices"];

export type JobReport = {
  now: string;
  recallSync?: SyncResult | { error: string };
  recallEmails?: NotifyResult;
  checkins?: CheckinRunResult;
  purgedTokens?: number;
  prices?: PriceRefreshReport | { error: string };
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
    if (jobs.includes("cleanup")) report.purgedTokens = purgeExpiredTokens(now);
    if (jobs.includes("prices")) {
      try {
        report.prices = await refreshPrices(now);
      } catch (err) {
        report.prices = { error: (err as Error).message };
      }
    }
    return report;
  } finally {
    running = false;
  }
}
