import { rateLimit } from "@/lib/api-guard";
import { updatePreferences, getPerson } from "@/lib/identity";
import { verifyUnsubscribeToken } from "@/lib/email-links";

// The List-Unsubscribe target. Mail clients that support RFC 8058 POST here
// ("List-Unsubscribe=One-Click") and that's the unsubscribe. A plain GET
// (someone clicking the URL, or a link scanner) only shows the confirmation
// page, which posts back here with confirm=1.
export async function GET(request: Request) {
  const t = new URL(request.url).searchParams.get("t") ?? "";
  return seeOther(`/email/unsubscribe?t=${encodeURIComponent(t)}`);
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "email-unsubscribe", 30, 15 * 60_000);
  if (limited) return limited;
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const token = url.searchParams.get("t") ?? (form?.get("t") as string | null) ?? "";
  const target = verifyUnsubscribeToken(token, new Date());
  const fromPage = form?.get("confirm") === "1";
  if (!target || !getPerson(target.personId)) {
    return fromPage ? seeOther("/email/unsubscribe?error=invalid") : new Response("Invalid or expired link.", { status: 400 });
  }
  updatePreferences(target.personId, target.category === "checkins" ? { checkinsEnabled: false } : { safetyAlertsEnabled: false });
  return fromPage
    ? seeOther(`/email/unsubscribe?done=${target.category}`)
    : new Response("Unsubscribed.", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function seeOther(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}
