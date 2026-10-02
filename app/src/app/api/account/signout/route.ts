import { NextResponse } from "next/server";
import { isSameOrigin, rateLimit } from "@/lib/api-guard";
import { readDeviceSessionId, rotateDeviceSession } from "@/lib/session";
import { unlinkSession } from "@/lib/identity";

// Signs this browser out of the email: unlinks it and gives it a fresh, empty
// anonymous session. The shelf stays saved to the email (and on any other
// signed-in device).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const limited = rateLimit(request, "account", 30, 60_000);
  if (limited) return limited;
  const device = await readDeviceSessionId();
  if (device) unlinkSession(device);
  await rotateDeviceSession();
  return NextResponse.json({ ok: true });
}
