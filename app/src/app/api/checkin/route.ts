import { rateLimit } from "@/lib/api-guard";
import { verifyCheckinToken } from "@/lib/email-links";
import { recordCheckinAnswer } from "@/lib/checkins";
import { isCheckinAnswer } from "@/lib/checkin-schedule";

// The check-in page (/checkin/[token]) posts here. The signed token is the
// authorization -- no login -- and expires 60 days after the email.
export async function POST(request: Request) {
  const limited = rateLimit(request, "checkin", 30, 15 * 60_000);
  if (limited) return limited;
  const form = await request.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  const answer = form?.get("answer");
  const reactionRaw = form?.get("reaction");
  const reaction = reactionRaw === "yes" ? true : reactionRaw === "no" ? false : null;
  const now = new Date();
  const id = verifyCheckinToken(token, now);
  if (!id || !isCheckinAnswer(answer)) return seeOther(`/checkin/${encodeURIComponent(token)}?error=1`);
  const ok = recordCheckinAnswer(id, answer, reaction, now);
  return seeOther(`/checkin/${encodeURIComponent(token)}?${ok ? `saved=1&a=${answer}` : "error=1"}`);
}

function seeOther(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}
