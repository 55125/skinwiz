import { NextResponse } from "next/server";
import { rateLimit, readJsonBody } from "@/lib/api-guard";
import { readAvoidIds, sanitizeAvoidIds, writeAvoidIds } from "@/lib/avoid";
import { mergeAvoidIds } from "@/lib/avoid-import";

// { ids } replaces the list; { add } merges into the current list (the
// patch-test import), so a stale page can't drop anything. Saved to the
// account as well when the visitor is signed in (lib/avoid.ts).
export async function POST(request: Request) {
  const limited = rateLimit(request, "avoid", 60, 60_000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { add?: unknown; ids?: unknown } | null;
  if (Array.isArray(body?.add)) {
    const existing = await readAvoidIds();
    const { merged, added, already } = mergeAvoidIds(existing, sanitizeAvoidIds(body.add));
    if (added.length > 0) await writeAvoidIds(merged);
    return NextResponse.json({ ok: true, ids: merged, added, already });
  }
  // Anything else is a malformed request, not "clear my list".
  if (!Array.isArray(body?.ids)) return NextResponse.json({ ok: false, error: "Expected ids or add." }, { status: 400 });
  const ids = sanitizeAvoidIds(body.ids);
  await writeAvoidIds(ids);
  return NextResponse.json({ ok: true, ids });
}
