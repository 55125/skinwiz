// Clinician profiles on top of the optional email identity (lib/identity.ts).
// A clinician is a signed-in person plus an NPI checked against NPPES
// (lib/npi.ts). Unverified (pending) clinicians can build OTC-only handouts;
// prescription products unlock once the NPI verifies.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clinicians } from "@/db/schema";
import { iso, personForSession } from "@/lib/identity";
import { readDeviceSessionId } from "@/lib/session";
import { judgeNpi, type NpiRecord, type VerifyOutcome } from "@/lib/npi";
import { FEATURES } from "@/lib/feature-flags";

export type Clinician = typeof clinicians.$inferSelect;

export const MAX_CLINIC_NAME = 80;
export const MAX_CLINIC_PHONE = 30;
export const MAX_CLINIC_WEBSITE = 120;

export function getClinicianForPerson(personId: string): Clinician | null {
  return db.select().from(clinicians).where(eq(clinicians.personId, personId)).get() ?? null;
}

export function getClinician(id: string): Clinician | null {
  return db.select().from(clinicians).where(eq(clinicians.id, id)).get() ?? null;
}

/** The signed-in person and their clinician profile (either may be null). For Server Components and routes. */
export async function currentClinician() {
  const device = await readDeviceSessionId();
  const person = device ? personForSession(device) : null;
  return { person, clinician: person ? getClinicianForPerson(person.id) : null };
}

export const isVerified = (c: Clinician | null | undefined): boolean => !!c?.verifiedAt;

/**
 * Prescription reference pages (/rx) are for verified clinicians building
 * handouts, not the public: consumers never see an Rx page or a link to one.
 * A patient still sees the Rx steps their own clinician put in their plan.
 */
export async function canViewRxReference(): Promise<boolean> {
  if (!FEATURES.RX_CATALOG || !FEATURES.HANDOUTS) return false;
  return isVerified((await currentClinician()).clinician);
}

/** "Dr. Adams, MD" / "Jane Smith, PA-C" -- for the badge, print sheet and chart. */
export function clinicianDisplayName(c: Pick<Clinician, "firstName" | "lastName" | "credential">): string {
  const cred = normalizeCredential(c.credential);
  const physician = cred === "MD" || cred === "DO";
  const name = physician ? `Dr. ${c.lastName}` : [c.firstName, c.lastName].filter(Boolean).join(" ");
  return cred ? `${name}, ${cred}` : name;
}

/** NPPES credentials are free text ("M.D.", "md", "PA-C"); tidy the common ones. */
export function normalizeCredential(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.replace(/\./g, "").trim().toUpperCase();
  if (!t) return null;
  if (t === "MD" || t === "DO" || t === "NP" || t === "PA" || t === "PA-C" || t === "FNP" || t === "DNP" || t === "APRN") return t;
  return raw.trim();
}

/** The short badge on a clinician-issued regimen: MD / DO / PA-C / NP, else "Clinician". */
export function badgeCredential(credential: string | null | undefined): string {
  const c = normalizeCredential(credential);
  if (!c) return "Clinician";
  if (/^(MD|DO|PA-C|PA|NP|FNP|DNP|APRN)$/.test(c)) return c;
  return "Clinician";
}

export type ProfileInput = { npi: string; lastName: string; clinicName: string; clinicPhone: string | null; clinicWebsite: string | null };

/**
 * Creates or updates the person's clinician profile from a lookup result.
 * - verified: NPPES record matched -> verifiedAt set, registry names stored.
 * - "unavailable": saved as pending (typed last name kept) so they can start.
 * - any other failure: nothing saved; the outcome says why.
 * An NPI already claimed by another person is refused.
 */
export function saveClinicianProfile(
  personId: string,
  input: ProfileInput,
  lookup: NpiRecord | null | "unavailable",
  now: Date,
): { outcome: VerifyOutcome; clinician: Clinician | null; conflict?: true } {
  const outcome = judgeNpi(input.npi, input.lastName, lookup);
  if (!outcome.ok && outcome.reason !== "unavailable") return { outcome, clinician: null };

  const other = db.select().from(clinicians).where(eq(clinicians.npi, input.npi)).get();
  if (other && other.personId && other.personId !== personId) return { outcome, clinician: null, conflict: true };
  // An unlinked profile (its person deleted their email) can be picked up
  // again by whoever verifies the same NPI -- the same bar as a new sign-up.
  const mine = getClinicianForPerson(personId) ?? (other && !other.personId ? other : null);
  if (mine && other && mine.id !== other.id) return { outcome, clinician: null, conflict: true };

  const rec = outcome.ok ? outcome.record : null;
  const fields = {
    npi: input.npi,
    firstName: rec?.firstName ?? mine?.firstName ?? null,
    lastName: rec?.lastName ?? input.lastName.trim(),
    credential: rec?.credential ?? mine?.credential ?? null,
    taxonomyCode: rec?.taxonomyCode ?? null,
    taxonomyDesc: rec?.taxonomyDesc ?? null,
    isDermatology: rec?.isDermatology ?? false,
    state: rec?.state ?? null,
    verifiedAt: rec ? iso(now) : null,
    clinicName: input.clinicName,
    clinicPhone: input.clinicPhone,
    clinicWebsite: input.clinicWebsite,
    updatedAt: iso(now),
  };
  if (mine) {
    // Changing the NPI on an existing profile re-verifies from scratch.
    db.update(clinicians)
      .set({ ...fields, personId })
      .where(eq(clinicians.id, mine.id))
      .run();
    return { outcome, clinician: getClinician(mine.id) };
  }
  const id = randomUUID();
  db.insert(clinicians)
    .values({ id, personId, createdAt: iso(now), ...fields })
    .run();
  return { outcome, clinician: getClinician(id) };
}

/** Clinic text only (no re-verification). */
export function updateClinicDetails(clinicianId: string, d: { clinicName: string; clinicPhone: string | null; clinicWebsite: string | null }, now: Date) {
  db.update(clinicians)
    .set({ ...d, updatedAt: iso(now) })
    .where(eq(clinicians.id, clinicianId))
    .run();
}
