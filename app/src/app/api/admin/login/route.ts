import { NextResponse } from "next/server";
import { clientIp } from "@/lib/api-guard";
import { appSecret } from "@/lib/tokens";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MS,
  adminPassword,
  issueAdminToken,
  loginThrottle,
  passwordMatches,
} from "@/lib/admin-auth";

// Form POST from the /admin sign-in form. Redirects back to /admin either
// way (303), with ?e=1 on a wrong password or ?locked=N while throttled.
// The proxy already refuses cross-site POSTs to /api/.
export async function POST(request: Request) {
  const password = adminPassword();
  if (!password) return new NextResponse("Not found", { status: 404 });
  // Relative Location: behind Railway's edge, request.url is the container's
  // own address, not the public one.
  const back = (query = "") =>
    new NextResponse(null, { status: 303, headers: { Location: `/admin${query}`, "Cache-Control": "no-store" } });

  const ip = clientIp(request);
  const now = Date.now();
  const wait = loginThrottle.retryAfter(ip, now);
  if (wait > 0) return back(`?locked=${Math.ceil(wait / 60)}`);

  const form = await request.formData().catch(() => null);
  const attempt = form?.get("password");
  if (typeof attempt !== "string" || attempt.length > 200 || !passwordMatches(attempt, password)) {
    loginThrottle.fail(ip, now);
    // Slows scripted guessing a little more without holding a lock.
    await new Promise((r) => setTimeout(r, 400));
    console.warn(JSON.stringify({ level: "warn", event: "admin_login_failed", at: new Date(now).toISOString() }));
    return back("?e=1");
  }
  loginThrottle.succeed(ip);
  const res = back();
  res.cookies.set(ADMIN_COOKIE, issueAdminToken(password, appSecret(), new Date(now)), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MS / 1000,
  });
  return res;
}
