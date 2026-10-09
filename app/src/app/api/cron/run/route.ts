import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { ALL_JOBS, runJobs, type JobName } from "@/lib/jobs";

// The hourly job: recall sync + alerts, due check-ins, token cleanup, the
// daily live price refresh (once a day from 08:00 UTC; a no-op until a
// price source is configured), and a capped batch of DailyMed package-photo
// downloads (up to ~4 minutes).
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://activelyskin.com/api/cron/run
// Optional query: ?jobs=checkins,recalls,cleanup,prices,images  ?forceRecallSync=1
// ?forcePrices=1 (run the price refresh even if it already ran today)
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
  const report = await runJobs(now, requested?.length ? requested : ALL_JOBS, {
    forceRecallSync: params.get("forceRecallSync") === "1",
    forcePrices: params.get("forcePrices") === "1",
  });
  if (!report) return NextResponse.json({ error: "A run is already in progress." }, { status: 409 });
  return NextResponse.json(report);
}
