import { NextResponse } from "next/server";
import { isSameOrigin, rateLimit, readJsonBody } from "@/lib/api-guard";
import { consumeSignInCode } from "@/lib/identity";
import { appSecret, hashSignInCode, normalizeEmail } from "@/lib/tokens";
import { safeNextPath } from "@/lib/email-links";
import { finishSignIn } from "@/lib/sign-in";

// The typed alternative to the emailed link (the email carries both). Wrong
// guesses are capped per address in consumeSignInCode and per IP here.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const limited = rateLimit(request, "email-code", 10, 15 * 60_000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { email?: unknown; code?: unknown; next?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!email || code.length !== 6) return NextResponse.json({ error: "Enter the 6-digit code from the email." }, { status: 400 });

  const now = new Date();
  const consumed = consumeSignInCode(email, hashSignInCode(appSecret(), email, code), now);
  if (!consumed) {
    return NextResponse.json(
      { error: "That code didn't work. It may be mistyped or expired, or too many wrong codes were tried. Ask for a new email if it keeps failing." },
      { status: 400 },
    );
  }
  await finishSignIn(consumed, now);
  return NextResponse.json({ ok: true, next: safeNextPath(body?.next) ?? "/account?welcome=1" });
}
