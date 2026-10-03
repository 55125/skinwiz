import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { ALL_JOBS, runJobs, type JobName } from "@/lib/jobs";

// The hourly job: recall sync + alerts, due check-ins, token cleanup, live
// price refresh (a no-op until the Sovrn keys are set).
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://activelyskin.com/api/cron/run
// Optional query: ?jobs=checkins,recalls,cleanup,prices  ?forceRecallSync=1
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
  const report = await runJobs(now, requested?.length ? requested : ALL_JOBS, { forceRecallSync: params.get("forceRecallSync") === "1" });
  if (!report) return NextResponse.json({ error: "A run is already in progress." }, { status: 409 });
  return NextResponse.json(report);
}
