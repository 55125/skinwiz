import { NextResponse } from "next/server";
import { isSameOrigin, rateLimit, readJsonBody } from "@/lib/api-guard";
import { FEATURES } from "@/lib/feature-flags";
import {
  currentClinician,
  MAX_CLINIC_NAME,
  MAX_CLINIC_PHONE,
  MAX_CLINIC_WEBSITE,
  saveClinicianProfile,
  updateClinicDetails,
} from "@/lib/clinicians";
import { lastNameMatches, lookupNpi, normalizeNpi, NPI_REASON_TEXT } from "@/lib/npi";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Create or update the signed-in person's clinician profile; verifies the NPI
// against NPPES unless it's the same, already-verified NPI and name.
export async function POST(request: Request) {
  if (!FEATURES.HANDOUTS) return new NextResponse(null, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const limited = rateLimit(request, "clinician-profile", 10, 15 * 60_000);
  if (limited) return limited;
  const { person, clinician } = await currentClinician();
  if (!person) return NextResponse.json({ error: "Sign in with your email first." }, { status: 401 });
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = (parsed.body ?? {}) as Record<string, unknown>;

  const npi = normalizeNpi(body.npi);
  const lastName = text(body.lastName, 60);
  const clinicName = text(body.clinicName, MAX_CLINIC_NAME);
  const clinicPhone = text(body.clinicPhone, MAX_CLINIC_PHONE) || null;
  let clinicWebsite = text(body.clinicWebsite, MAX_CLINIC_WEBSITE) || null;
  if (clinicWebsite && !/^https?:\/\//i.test(clinicWebsite)) clinicWebsite = `https://${clinicWebsite}`;
  if (clinicWebsite) {
    try {
      new URL(clinicWebsite);
    } catch {
      return NextResponse.json({ error: "That website doesn't look like a web address." }, { status: 400 });
    }
  }
  if (!npi) return NextResponse.json({ error: "Enter your 10-digit NPI." }, { status: 400 });
  if (!lastName) return NextResponse.json({ error: "Enter your last name as it appears in NPPES." }, { status: 400 });
  if (!clinicName) return NextResponse.json({ error: "Enter the clinic name to print on handouts." }, { status: 400 });

  const now = new Date();
  // Same verified NPI and name: only the clinic text changed, no lookup.
  if (clinician?.verifiedAt && clinician.npi === npi && lastNameMatches(lastName, clinician)) {
    updateClinicDetails(clinician.id, { clinicName, clinicPhone, clinicWebsite }, now);
    return NextResponse.json({ ok: true, verified: true });
  }

  const lookup = await lookupNpi(npi, now);
  const saved = saveClinicianProfile(person.id, { npi, lastName, clinicName, clinicPhone, clinicWebsite }, lookup, now);
  if (saved.conflict) {
    return NextResponse.json({ error: "That NPI is already linked to another account. Contact us if that's wrong." }, { status: 409 });
  }
  if (!saved.outcome.ok) {
    const reason = saved.outcome.reason;
    // NPPES down: the profile is saved as pending (OTC-only until verified).
    if (reason === "unavailable" && saved.clinician) return NextResponse.json({ ok: true, verified: false, message: NPI_REASON_TEXT.unavailable });
    return NextResponse.json({ error: NPI_REASON_TEXT[reason] }, { status: 400 });
  }
  return NextResponse.json({ ok: true, verified: true });
}
