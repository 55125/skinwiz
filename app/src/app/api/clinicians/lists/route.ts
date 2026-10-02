import { NextResponse } from "next/server";
import { isSameOrigin, rateLimit, readJsonBody } from "@/lib/api-guard";
import { FEATURES } from "@/lib/feature-flags";
import { currentClinician } from "@/lib/clinicians";
import { deleteList, saveList } from "@/lib/clinician-lists";

// Save or delete one of the clinician's starter lists.
export async function POST(request: Request) {
  if (!FEATURES.HANDOUTS) return new NextResponse(null, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const limited = rateLimit(request, "clinician-lists", 120, 15 * 60_000);
  if (limited) return limited;
  const { clinician } = await currentClinician();
  if (!clinician) return NextResponse.json({ error: "Clinicians only." }, { status: 401 });
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = (parsed.body ?? {}) as { action?: unknown; id?: unknown; name?: unknown; ids?: unknown };
  const id = typeof body.id === "string" && body.id ? body.id : null;

  if (body.action === "delete") {
    if (!id || !deleteList(id, clinician.id)) return NextResponse.json({ error: "List not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  const saved = saveList(clinician.id, { id, name: body.name, ids: body.ids });
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 });
  return NextResponse.json({ ok: true, list: { id: saved.list.id, name: saved.list.name, ids: saved.list.ids } });
}
