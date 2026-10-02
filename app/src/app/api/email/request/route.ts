import { NextResponse } from "next/server";
import { isSameOrigin, rateLimit, readJsonBody } from "@/lib/api-guard";
import { getOrCreateDeviceSessionId } from "@/lib/session";
import { createSignInToken, recentTokenCount } from "@/lib/identity";
import { normalizeEmail } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { signInEmail } from "@/lib/email-templates";
import { safeNextPath, signInUrl } from "@/lib/email-links";

const PER_ADDRESS_PER_HOUR = 3;

// Sends a one-time sign-in link. The response is identical whether or not
// the address is already known, and whether or not the per-address limit
// held this one back, so it can't be used to probe who has signed up.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const limited = rateLimit(request, "email-link", 5, 15 * 60_000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const email = normalizeEmail((parsed.body as { email?: unknown } | null)?.email);
  const next = safeNextPath((parsed.body as { next?: unknown } | null)?.next);
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const now = new Date();
  const deviceSessionId = await getOrCreateDeviceSessionId();
  if (recentTokenCount(email, now) < PER_ADDRESS_PER_HOUR) {
    const token = createSignInToken(email, deviceSessionId, now);
    const msg = signInEmail(signInUrl(token, next));
    const res = await sendEmail({ to: email, ...msg, category: "transactional" });
    if (!res.ok) console.error(`[email] sign-in link failed: ${res.error}`);
  }
  return NextResponse.json({ ok: true });
}
