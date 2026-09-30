import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp, judge } from "@/lib/anti-scrape";

export function proxy(request: NextRequest) {
  if (process.env.ANTI_SCRAPE === "off") return NextResponse.next();
  // Owner-only escape hatch for our own automated testing: set the secret in
  // the environment and send it as this header. Unset (the default) = disabled.
  const bypass = process.env.ANTI_SCRAPE_BYPASS_TOKEN;
  if (bypass && bypass.length >= 16 && request.headers.get("x-skinwiz-bypass") === bypass) return NextResponse.next();
  const verdict = judge({
    pathname: request.nextUrl.pathname,
    method: request.method,
    headers: request.headers,
    ip: clientIp(request.headers),
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
