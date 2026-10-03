import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSameOrigin, rateLimit } from "@/lib/api-guard";
import { readDeviceSessionId, rotateDeviceSession } from "@/lib/session";
import { unlinkSession } from "@/lib/identity";
import { PROFILE_COOKIE } from "@/lib/profile-shared";
import { AVOID_COOKIE } from "@/lib/avoid";

// Signs this browser out of the email: unlinks it and gives it a fresh, empty
// anonymous session. The shelf, avoid list and skin profile stay saved to the
// email (and on any other signed-in device); this browser's copies of the
// profile and avoid list are removed, so the next person on a shared computer
// doesn't inherit them -- that includes the pregnancy and breastfeeding
// answers, which live only in this browser's cookie.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const limited = rateLimit(request, "account", 30, 60_000);
  if (limited) return limited;
  const device = await readDeviceSessionId();
  if (device) unlinkSession(device);
  await rotateDeviceSession();
  const store = await cookies();
  store.delete(PROFILE_COOKIE);
  store.delete(AVOID_COOKIE);
  return NextResponse.json({ ok: true });
}
