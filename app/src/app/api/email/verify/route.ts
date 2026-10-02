import { rateLimit } from "@/lib/api-guard";
import { getOrCreateDeviceSessionId } from "@/lib/session";
import { completeSignIn, consumeSignInToken } from "@/lib/identity";
import { scheduleForOpenedShelf } from "@/lib/checkins";
import { safeNextPath } from "@/lib/email-links";

// The confirmation page (/email/verify) posts here. The emailed link itself
// is a GET of that page, which changes nothing -- mail scanners that
// prefetch links (Outlook Safe Links and others) would otherwise use up the
// one-time token before the person clicks it.
export async function POST(request: Request) {
  const limited = rateLimit(request, "email-verify", 20, 15 * 60_000);
  if (limited) return limited;
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  const now = new Date();
  const consumed = typeof token === "string" && token.length <= 128 ? consumeSignInToken(token, now) : null;
  if (!consumed) return seeOther("/email/verify?error=expired");

  const deviceSessionId = await getOrCreateDeviceSessionId();
  const { person } = completeSignIn({ email: consumed.email, requestSessionId: consumed.requestSessionId, deviceSessionId, now });
  scheduleForOpenedShelf(person, now);
  return seeOther(safeNextPath(form?.get("next")) ?? "/account?welcome=1");
}

// Relative Location: behind Railway's proxy, request.url is the container's
// own address, not the public one.
function seeOther(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}
