import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { reportRoutine, getRoutine } from "@/lib/routines";
import { LIMITS, rateLimit, readJsonBody } from "@/lib/api-guard";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request, "routine-report", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const { id } = await params;
  const routineId = parseInt(id, 10);
  if (!getRoutine(routineId)) {
    return NextResponse.json({ error: "Routine not found." }, { status: 404 });
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const rawReason = (parsed.body as { reason?: unknown } | null)?.reason;
  const reason = typeof rawReason === "string" ? rawReason.trim().slice(0, LIMITS.reason) || null : null;

  const sessionId = await getOrCreateSessionId();
  reportRoutine(routineId, sessionId, reason);

  return NextResponse.json({ ok: true });
}
