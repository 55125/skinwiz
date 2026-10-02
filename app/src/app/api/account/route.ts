import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSameOrigin, rateLimit, readJsonBody } from "@/lib/api-guard";
import { readDeviceSessionId, rotateDeviceSession } from "@/lib/session";
import { deletePersonAndData, getPerson, personForSession, updatePreferences } from "@/lib/identity";
import { scheduleForOpenedShelf } from "@/lib/checkins";
import { PROFILE_COOKIE } from "@/lib/profile-shared";
import { AVOID_COOKIE } from "@/lib/avoid";

async function currentPerson() {
  const device = await readDeviceSessionId();
  return device ? personForSession(device) : null;
}

// Email preferences: { checkinsEnabled?, safetyAlertsEnabled? }.
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const limited = rateLimit(request, "account", 30, 60_000);
  if (limited) return limited;
  const person = await currentPerson();
  if (!person) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = (parsed.body ?? {}) as Record<string, unknown>;
  updatePreferences(person.id, {
    checkinsEnabled: typeof body.checkinsEnabled === "boolean" ? body.checkinsEnabled : undefined,
    safetyAlertsEnabled: typeof body.safetyAlertsEnabled === "boolean" ? body.safetyAlertsEnabled : undefined,
  });
  const updated = getPerson(person.id)!;
  if (body.checkinsEnabled === true && !person.checkinsEnabled) scheduleForOpenedShelf(updated, new Date());
  return NextResponse.json({ ok: true, checkinsEnabled: updated.checkinsEnabled, safetyAlertsEnabled: updated.safetyAlertsEnabled });
}

// "Delete my email and data": everything stored under this person, then this
// browser starts over with a fresh anonymous session and no saved profile.
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const limited = rateLimit(request, "account", 30, 60_000);
  if (limited) return limited;
  const person = await currentPerson();
  if (!person) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  deletePersonAndData(person.id);
  await rotateDeviceSession();
  const store = await cookies();
  store.delete(PROFILE_COOKIE);
  store.delete(AVOID_COOKIE);
  return NextResponse.json({ ok: true });
}
