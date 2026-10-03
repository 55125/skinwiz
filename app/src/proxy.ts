import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { claimedCrawler, clientIp, judge, verifyCrawler } from "@/lib/anti-scrape";
import { CRON_PATH_PREFIX, isCronAuthorized } from "@/lib/cron-auth";
import { openForReview } from "@/lib/review-mode";

export async function proxy(request: NextRequest) {
  // One canonical host: www.activelyskin.com -> activelyskin.com, path intact.
  // Read the Host header, not nextUrl, which is the container's own address
  // behind Railway's edge.
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("www.")) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(`https://${host.slice(4)}${pathname}${search}`, 308);
  }
  // OPEN_FOR_REVIEW (lib/review-mode.ts) is a temporary switch for affiliate
  // network reviews; it lets everything through like ANTI_SCRAPE=off.
  if (process.env.ANTI_SCRAPE === "off" || openForReview()) return NextResponse.next();
  // Owner-only escape hatch for our own automated testing: set the secret in
  // the environment and send it as this header. Unset (the default) = disabled.
  const bypass = process.env.ANTI_SCRAPE_BYPASS_TOKEN;
  if (bypass && bypass.length >= 16 && request.headers.get("x-skinwiz-bypass") === bypass) return NextResponse.next();
  // The scheduled job (curl from a Railway cron service or an external
  // pinger) skips the bot limits only when it carries the cron secret; the
  // route checks the secret again. Without it, it's judged like anything else.
  if (request.nextUrl.pathname.startsWith(CRON_PATH_PREFIX) && isCronAuthorized(request.headers)) return NextResponse.next();
  const ip = clientIp(request.headers);
  const ua = request.headers.get("user-agent") ?? "";
  // Only UAs claiming to be a search crawler pay for a DNS check (cached per
  // IP, capped at ~1.5s); everyone else stays synchronous.
  const verifiedCrawler = ip && claimedCrawler(ua) ? await verifyCrawler(ip, ua) : false;
  const verdict = judge({
    pathname: request.nextUrl.pathname,
    method: request.method,
    headers: request.headers,
    ip,
    verifiedCrawler,
  });
  if (verdict.action === "allow") return NextResponse.next();
  return new NextResponse("Automated access is not permitted. See /robots.txt.", {
    status: verdict.status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...(verdict.retryAfter ? { "Retry-After": String(verdict.retryAfter) } : {}),
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?)$).*)"],
};
