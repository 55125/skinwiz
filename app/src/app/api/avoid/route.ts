import { NextResponse } from "next/server";
import { rateLimit, readJsonBody } from "@/lib/api-guard";
import { readAvoidIds, readNotOnLabelIds, sanitizeAvoidIds, writeAvoidIds } from "@/lib/avoid";
import { getNotOnLabel } from "@/db/patch-test-series";
import { mergeAvoidIds } from "@/lib/avoid-import";

// { ids } replaces the list; { add } merges into the current list (the
// patch-test import), so a stale page can't drop anything. Either can carry
// { addNotOnLabel } (patch-test positives that aren't on labels), merged
// into those kept; { notOnLabel } alone replaces just those. Saved to the
// account as well when the visitor is signed in (lib/avoid.ts).
export async function POST(request: Request) {
  const limited = rateLimit(request, "avoid", 60, 60_000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { add?: unknown; ids?: unknown; addNotOnLabel?: unknown; notOnLabel?: unknown } | null;
  const offLabel = (v: unknown) => (Array.isArray(v) ? v.filter((id): id is string => typeof id === "string" && !!getNotOnLabel(id)) : []);
  const keptOff = await readNotOnLabelIds();
  const mergedOff = [...new Set([...keptOff, ...offLabel(body?.addNotOnLabel)])];
  if (Array.isArray(body?.add)) {
    const existing = await readAvoidIds();
    const { merged, added, already } = mergeAvoidIds(existing, sanitizeAvoidIds(body.add));
    const newOff = mergedOff.filter((id) => !keptOff.includes(id));
    if (added.length > 0 || newOff.length > 0) await writeAvoidIds(merged, mergedOff);
    return NextResponse.json({ ok: true, ids: merged, added, already, notOnLabel: mergedOff, addedNotOnLabel: newOff });
  }
  if (Array.isArray(body?.ids)) {
    const ids = sanitizeAvoidIds(body.ids);
    await writeAvoidIds(ids, mergedOff);
    return NextResponse.json({ ok: true, ids, notOnLabel: mergedOff });
  }
  if (Array.isArray(body?.notOnLabel)) {
    const ids = await readAvoidIds();
    const off = offLabel(body.notOnLabel);
    await writeAvoidIds(ids, off);
    return NextResponse.json({ ok: true, ids, notOnLabel: off });
  }
  // Anything else is a malformed request, not "clear my list".
  return NextResponse.json({ ok: false, error: "Expected ids, add or notOnLabel." }, { status: 400 });
}
