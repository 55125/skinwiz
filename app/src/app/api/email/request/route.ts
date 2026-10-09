import { NextResponse } from "next/server";
import { isSameOrigin, rateLimit, readJsonBody } from "@/lib/api-guard";
import { getOrCreateDeviceSessionId } from "@/lib/session";
import { createSignInToken, recentTokenCount, recentTokenCountAll } from "@/lib/identity";
import { appSecret, generateSignInCode, hashSignInCode, normalizeEmail } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { signInEmail } from "@/lib/email-templates";
import { safeNextPath, signInUrl } from "@/lib/email-links";

const PER_ADDRESS_PER_HOUR = 3;
// Someone rotating IPs can still aim links at one inbox; this caps it per day.
const PER_ADDRESS_PER_DAY = 8;
// Site-wide brake so a scripted flood can't burn the sender reputation or
// the Resend quota. Far above real sign-up volume; raise it if that changes.
const ALL_ADDRESSES_PER_HOUR = 300;

// Sends a one-time sign-in link, with a code to type instead (api/email/code). The response is identical whether or not
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
  const withinLimits =
    recentTokenCount(email, now) < PER_ADDRESS_PER_HOUR &&
    recentTokenCount(email, now, 24 * 60 * 60_000) < PER_ADDRESS_PER_DAY &&
    recentTokenCountAll(now) < ALL_ADDRESSES_PER_HOUR;
  if (!withinLimits) console.warn("[email] sign-in link held back by a send limit");
  if (withinLimits) {
    const code = generateSignInCode();
    const token = createSignInToken(email, deviceSessionId, now, hashSignInCode(appSecret(), email, code));
    const msg = signInEmail(signInUrl(token, next), code);
    const res = await sendEmail({ to: email, ...msg, category: "transactional" });
    if (!res.ok) console.error(`[email] sign-in link failed: ${res.error}`);
  }
  return NextResponse.json({ ok: true });
}
