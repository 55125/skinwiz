import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { rateLimit, readJsonBody } from "@/lib/api-guard";
import { clientIp, viaCloudflare } from "@/lib/anti-scrape";
import { geoFromHeaders, isBot, optOutSignal, parseEvent, tallyKind } from "@/lib/analytics/core";
import { recordEvent, tallyOptOut } from "@/lib/analytics/store";
import { ADMIN_COOKIE, isAdminCookie } from "@/lib/admin-auth";
import { buildServerEvent, metaConfig, metaEventFromBeacon, sendMetaEvent } from "@/lib/meta-capi";
import { siteUrl } from "@/lib/site-url";

// The site-statistics beacon (components/analytics-beacon.tsx). Always 204,
// whether or not anything was recorded, so the page never waits on it or
// learns anything from it. Nothing is recorded for bots or the signed-in
// admin. Global Privacy Control / Do Not Track visitors only bump a daily
// count of page views or outbound clicks (opt_out_tallies); nothing about
// them or the page is kept. See lib/analytics/.
//
// Beacons from visitors who arrived from one of our Meta ads may also carry
// a "meta" object (lib/meta-client.ts); those become Conversions API events,
// sent after the response (lib/meta-capi.ts). Opted-out, bot and admin
// beacons return above before that point.
//
// Location is the approximate country / region / city Cloudflare adds to the
// request (geoFromHeaders), believed only when the request came through
// Cloudflare. The IP itself is never stored.
export async function POST(request: Request) {
  const done = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (rateLimit(request, "beacon", 120, 60_000)) return done;
  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return done;
  const jar = await cookies();
  if (isAdminCookie(jar.get(ADMIN_COOKIE)?.value)) return done;
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
  const ip = clientIp(request.headers);
  try {
    recordEvent(event, { ip: ip ?? "unknown", ua, geo: geoFromHeaders(request.headers, viaCloudflare(request.headers)) });
  } catch (err) {
    console.error("[analytics] record failed:", (err as Error).message);
  }
  const config = metaConfig();
  const metaEvent = config ? metaEventFromBeacon(event.kind, parsed.body) : null;
  if (config && metaEvent) {
    // _fbp exists only once the visitor allowed Meta's pixel.
    const serverEvent = buildServerEvent(metaEvent, { ip, ua, fbp: jar.get("_fbp")?.value }, siteUrl());
    after(() => sendMetaEvent(config, serverEvent));
  }
  return done;
}
