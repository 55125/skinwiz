import { after, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { ALL_JOBS, jobsRunning, runJobs, type JobName } from "@/lib/jobs";

// The hourly job: recall sync + alerts, due check-ins, token cleanup, the
// daily live price refresh (once a day from 08:00 UTC; a no-op until a
// price source is configured), and capped batches of DailyMed package-photo
// downloads and label barcode scans (several minutes in all).
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://activelyskin.com/api/cron/run
// Answers 202 at once and runs the jobs after the response, logging the
// report as one "[cron] report" line: a run can take well over the few
// minutes Railway's edge holds an idle request open, and a cut connection
// made the curl cron service exit non-zero ("Deploy Crashed" emails).
// A call while a run is in progress answers 202 with skipped, not an error.
// Optional query: ?jobs=checkins,recalls,cleanup,prices,images,labels  ?forceRecallSync=1
// ?forcePrices=1 (run the price refresh even if it already ran today)
// ?wait=1 waits for the run and returns the report (manual runs; mind the edge timeout).
// Outside production only: ?now=2026-12-01T00:00:00Z to run against a faked
// clock (for testing check-in schedules).
export async function POST(request: Request) {
  if (!isCronAuthorized(request.headers)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const params = new URL(request.url).searchParams;

  let now = new Date();
  const fake = params.get("now");
  if (fake) {
    if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "now= is only for development." }, { status: 400 });
    now = new Date(fake);
    if (Number.isNaN(now.getTime())) return NextResponse.json({ error: "Invalid now=." }, { status: 400 });
  }
  const requested = params.get("jobs")?.split(",").filter((j): j is JobName => (ALL_JOBS as string[]).includes(j));
  const jobs = requested?.length ? requested : ALL_JOBS;
  const opts = {
    forceRecallSync: params.get("forceRecallSync") === "1",
    forcePrices: params.get("forcePrices") === "1",
  };

  if (params.get("wait") === "1") {
    const report = await runJobs(now, jobs, opts);
    if (!report) return NextResponse.json({ error: "A run is already in progress." }, { status: 409 });
    return NextResponse.json(report);
  }

  if (jobsRunning()) return NextResponse.json({ skipped: "A run is already in progress." }, { status: 202 });
  after(async () => {
    try {
      const report = await runJobs(now, jobs, opts);
      console.log("[cron] report", JSON.stringify(report ?? { skipped: "A run is already in progress." }));
    } catch (err) {
      console.error("[cron] run failed", err);
    }
  });
  return NextResponse.json({ started: now.toISOString(), jobs }, { status: 202 });
}
