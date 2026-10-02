import { rateLimit } from "@/lib/api-guard";
import { FEATURES } from "@/lib/feature-flags";
import { getOrCreateSessionId } from "@/lib/session";
import { CLAIM_TOKEN_RE, claimInstance } from "@/lib/handouts";
import { createClinicianRegimen, regimenForInstance } from "@/lib/regimens";

// The patient's "Save my plan" button on /h/[token] posts here. A POST, not
// the page load itself, so a link preview or scanner that fetches the URL
// can't claim the printout before the patient does.
export async function POST(request: Request) {
  if (!FEATURES.HANDOUTS) return new Response(null, { status: 404 });
  const limited = rateLimit(request, "handout-claim", 30, 15 * 60_000);
  if (limited) return limited;
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  if (typeof token !== "string" || !CLAIM_TOKEN_RE.test(token)) return seeOther("/");

  const sessionId = await getOrCreateSessionId();
  const now = new Date();
  const result = claimInstance(token, sessionId, now);
  if (result.status === "claimed" || result.status === "owner") {
    // The owner may have deleted the plan from their list; scanning again restores it.
    const regimen = regimenForInstance(sessionId, result.instance.id) ?? createClinicianRegimen(sessionId, result.instance.id, result.version.title, now);
    return seeOther(`/regimen?r=${regimen.id}${result.status === "claimed" ? "&saved=1" : ""}`);
  }
  return seeOther(`/h/${token}`);
}

function seeOther(path: string) {
  return new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });
}
