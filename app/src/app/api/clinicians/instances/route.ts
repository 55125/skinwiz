import { NextResponse } from "next/server";
import { isSameOrigin, rateLimit, readJsonBody } from "@/lib/api-guard";
import { FEATURES } from "@/lib/feature-flags";
import { currentClinician } from "@/lib/clinicians";
import { createInstance, getOwnedHandout, getVersion } from "@/lib/handouts";
import { siteUrl } from "@/lib/site-url";

// One printout = one instance with its own claim token. The token goes back
// to the clinician's browser once, to draw the QR and short URL on the sheet;
// only its hash is kept. Never logged, never in the chart note.
export async function POST(request: Request) {
  if (!FEATURES.HANDOUTS) return new NextResponse(null, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const limited = rateLimit(request, "clinician-instances", 120, 15 * 60_000);
  if (limited) return limited;
  const { clinician } = await currentClinician();
  if (!clinician) return NextResponse.json({ error: "Clinicians only." }, { status: 401 });
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = (parsed.body ?? {}) as { handoutId?: unknown; version?: unknown };
  if (typeof body.handoutId !== "string" || !Number.isInteger(body.version)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (!getOwnedHandout(body.handoutId, clinician.id)) return NextResponse.json({ error: "Handout not found." }, { status: 404 });
  const version = getVersion(body.handoutId, body.version as number);
  if (!version) return NextResponse.json({ error: "Version not found." }, { status: 404 });

  const { token, instance } = createInstance(version.id, new Date());
  const url = `${siteUrl()}/h/${token}`;
  return NextResponse.json(
    { ok: true, url, shortUrl: url.replace(/^https?:\/\//, ""), expiresAt: instance.expiresAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
