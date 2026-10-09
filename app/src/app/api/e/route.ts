import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rateLimit, readJsonBody } from "@/lib/api-guard";
import { clientIp } from "@/lib/anti-scrape";
import { isBot, optOutSignal, parseEvent, tallyKind } from "@/lib/analytics/core";
import { recordEvent, tallyOptOut } from "@/lib/analytics/store";
import { ADMIN_COOKIE, isAdminCookie } from "@/lib/admin-auth";

// The site-statistics beacon (components/analytics-beacon.tsx). Always 204,
// whether or not anything was recorded, so the page never waits on it or
// learns anything from it. Nothing is recorded for bots or the signed-in
// admin. Global Privacy Control / Do Not Track visitors only bump a daily
// count of page views or outbound clicks (opt_out_tallies); nothing about
// them or the page is kept. See lib/analytics/.
export async function POST(request: Request) {
  const done = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (rateLimit(request, "beacon", 120, 60_000)) return done;
  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return done;
  if (isAdminCookie((await cookies()).get(ADMIN_COOKIE)?.value)) return done;
  const signal = optOutSignal(request.headers);
  if (signal) {
    const parsed = await readJsonBody(request);
    const kind = parsed.ok ? tallyKind(parsed.body) : null;
    try {
      if (kind) tallyOptOut(signal, kind);
    } catch (err) {
      console.error("[analytics] tally failed:", (err as Error).message);
    }
    return done;
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return done;
  const event = parseEvent(parsed.body, request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "");
  if (!event) return done;
  try {
    recordEvent(event, { ip: clientIp(request.headers) ?? "unknown", ua });
  } catch (err) {
    console.error("[analytics] record failed:", (err as Error).message);
  }
  return done;
}
