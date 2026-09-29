import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { createRoutine } from "@/lib/routines";
import { getConcern, getProduct } from "@/lib/queries";
import { LIMITS, optionalText, rateLimit, readJsonBody } from "@/lib/api-guard";

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "routine-post", 5, 60 * 60 * 1000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown> | null;

  if (!body || typeof body.title !== "string" || typeof body.concernId !== "string") {
    return bad("Title and concern are required.");
  }
  const title = optionalText(body.title, LIMITS.title);
  if (title === undefined) return bad(`Title must be ${LIMITS.title} characters or fewer.`);
  if (!title) return bad("Please provide a title.");
  if (!getConcern(body.concernId)) return bad("Unknown concern.");

  const authorName = optionalText(body.authorName, LIMITS.authorName);
  if (authorName === undefined) return bad(`Name must be ${LIMITS.authorName} characters or fewer.`);
  const notes = optionalText(body.notes, LIMITS.notes);
  if (notes === undefined) return bad(`Notes must be ${LIMITS.notes} characters or fewer.`);

  const rawSteps: unknown[] = Array.isArray(body.steps) ? body.steps : [];
  if (rawSteps.length > LIMITS.maxSteps) return bad(`A routine can have at most ${LIMITS.maxSteps} steps.`);
  const steps: { description: string; productId: string | null }[] = [];
  for (const s of rawSteps) {
    if (typeof s !== "object" || s === null) continue;
    const step = s as { description?: unknown; productId?: unknown };
    const description = optionalText(step.description, LIMITS.stepDescription);
    if (description === undefined) return bad(`Each step must be ${LIMITS.stepDescription} characters or fewer.`);
    if (!description) continue;
    steps.push({
      description,
      // routine_steps.productId is a real foreign key and this app enforces
      // FK constraints (better-sqlite3's default) -- a stale or fabricated
      // id would throw on insert, not silently no-op, so it's checked here
      // and dropped rather than trusted from the client.
      productId: typeof step.productId === "string" && getProduct(step.productId) ? step.productId : null,
    });
  }
  if (steps.length === 0) return bad("Please add at least one step.");

  const sessionId = await getOrCreateSessionId();
  const routineId = createRoutine({ title, concernId: body.concernId, authorName, notes, steps, sessionId });

  return NextResponse.json({ ok: true, id: routineId });
}
