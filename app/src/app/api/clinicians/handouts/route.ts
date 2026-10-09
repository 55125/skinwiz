import { NextResponse } from "next/server";
import { isSameOrigin, rateLimit, readJsonBody } from "@/lib/api-guard";
import { FEATURES } from "@/lib/feature-flags";
import { currentClinician, isVerified } from "@/lib/clinicians";
import { addVersion, createHandout, validateHandoutInput } from "@/lib/handouts";
import { getTemplate } from "@/db/handout-templates";
import { findPrivacyHits, handoutFreeText, PRIVACY_HIT_TEXT } from "@/lib/note-privacy";

// Save a handout: a new handout (version 1), or with handoutId a NEW version
// of an existing one. Versions are never edited in place.
export async function POST(request: Request) {
  if (!FEATURES.HANDOUTS) return new NextResponse(null, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const limited = rateLimit(request, "clinician-handouts", 30, 15 * 60_000);
  if (limited) return limited;
  const { clinician } = await currentClinician();
  if (!clinician) return NextResponse.json({ error: "Clinicians only." }, { status: 401 });
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = (parsed.body ?? {}) as Record<string, unknown>;

  const result = validateHandoutInput(body, { allowRx: isVerified(clinician) });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  // Versions can't be deleted, so a labelled patient identifier never gets stored.
  const blocked = findPrivacyHits(handoutFreeText({ title: result.title, ...result.content, sections: result.content.sections ?? [] })).find((h) => h.blocking);
  if (blocked) {
    return NextResponse.json({ error: `Remove ${PRIVACY_HIT_TEXT[blocked.kind]} (“${blocked.match}”) before saving. Handouts can't hold patient details.` }, { status: 400 });
  }
  const templateId = getTemplate(typeof body.templateId === "string" ? body.templateId : null)?.id ?? null;
  const input = { title: result.title, templateId, content: result.content };
  const now = new Date();
  const saved =
    typeof body.handoutId === "string" && body.handoutId ? addVersion(clinician, body.handoutId, input, now) : createHandout(clinician, input, now);
  if (!saved) return NextResponse.json({ error: "Handout not found." }, { status: 404 });
  return NextResponse.json({ ok: true, handoutId: saved.handoutId, version: saved.version.version, ref: saved.version.ref });
}
