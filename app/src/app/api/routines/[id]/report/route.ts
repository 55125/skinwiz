import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { reportRoutine, getRoutine } from "@/lib/routines";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const routineId = parseInt(id, 10);
  if (!getRoutine(routineId)) {
    return NextResponse.json({ error: "Routine not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) || null : null;

  const sessionId = await getOrCreateSessionId();
  reportRoutine(routineId, sessionId, reason);

  return NextResponse.json({ ok: true });
}
