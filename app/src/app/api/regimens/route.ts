import { NextResponse } from "next/server";
import { rateLimit, readJsonBody } from "@/lib/api-guard";
import { getOrCreateSessionId } from "@/lib/session";
import {
  canAddRegimen,
  copyClinicianPlan,
  deleteRegimen,
  getClinicianPlan,
  getOwnedRegimen,
  renameRegimen,
  setActiveRegimen,
  setStepState,
} from "@/lib/regimens";
import { getShelfEntry, setShelfEntry } from "@/lib/shelf";
import { onShelfChange } from "@/lib/checkins";

// Actions on the visitor's own list of regimens. Every action checks the
// regimen belongs to this session; a clinician plan's steps can't be edited
// here (only hidden, marked done, or marked "I have it").
export async function POST(request: Request) {
  const limited = rateLimit(request, "regimens", 60, 60_000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = (parsed.body ?? {}) as Record<string, unknown>;
  const regimenId = Number(body.regimenId);
  if (!Number.isInteger(regimenId)) return NextResponse.json({ error: "Unknown regimen." }, { status: 400 });
  const sessionId = await getOrCreateSessionId();
  if (!getOwnedRegimen(sessionId, regimenId)) return NextResponse.json({ error: "Unknown regimen." }, { status: 404 });
  const now = new Date();

  switch (body.action) {
    case "activate":
      setActiveRegimen(sessionId, regimenId);
      return NextResponse.json({ ok: true });
    case "rename": {
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
      if (!name || !renameRegimen(sessionId, regimenId, name)) return NextResponse.json({ error: "Can't rename this regimen." }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "delete":
      deleteRegimen(sessionId, regimenId);
      return NextResponse.json({ ok: true });
    case "copy": {
      if (!canAddRegimen(sessionId)) return NextResponse.json({ error: "You have the maximum number of regimens. Remove one first." }, { status: 400 });
      const copy = copyClinicianPlan(sessionId, regimenId, now);
      if (!copy) return NextResponse.json({ error: "Only a clinician's plan can be copied." }, { status: 400 });
      return NextResponse.json({ ok: true, regimenId: copy.regimen.id, skipped: copy.skipped });
    }
    case "step": {
      const stepKey = typeof body.stepKey === "string" ? body.stepKey : "";
      const patch = {
        hidden: typeof body.hidden === "boolean" ? body.hidden : undefined,
        done: typeof body.done === "boolean" ? body.done : undefined,
        have: typeof body.have === "boolean" ? body.have : undefined,
      };
      const state = setStepState(sessionId, regimenId, stepKey, patch, now);
      if (!state) return NextResponse.json({ error: "Unknown step." }, { status: 400 });
      // "I have it" on an OTC step also puts the product on the shelf as
      // owned and in use -- which is what starts email check-ins for anyone
      // who saved an email. Prescription steps stay off the shelf.
      if (patch.have === true) {
        const plan = getClinicianPlan(sessionId, regimenId)!;
        const step = plan.version.content.steps.find((s) => s.key === stepKey);
        const product = step?.productId ? plan.products.get(step.productId) : undefined;
        if (product && !product.isRx) {
          const before = getShelfEntry(sessionId, product.id);
          if (!before || before.status !== "own" || !before.opened) {
            setShelfEntry(sessionId, product.id, "own", true);
            onShelfChange(sessionId, product.id, product.concernId, before, getShelfEntry(sessionId, product.id), now);
          }
        }
      }
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
