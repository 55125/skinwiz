import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Clock, FilePlus2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmailSignupCard } from "@/components/email-signup-card";
import { ClinicianProfileForm } from "@/components/clinician-profile-form";
import { ChartNoteButton } from "@/components/chart-note-button";
import { buttonVariants } from "@/components/ui/button";
import { clinicianDisplayName, currentClinician, saveClinicianProfile, type Clinician } from "@/lib/clinicians";
import { findVersionByRef, listHandoutsForClinician } from "@/lib/handouts";
import { lookupNpi } from "@/lib/npi";
import { HANDOUT_CATEGORIES, libraryItems } from "@/db/handout-templates";
import { HandoutLibrary } from "@/components/handout-library";
import { StarterLists } from "@/components/starter-lists";
import { listsForClinician } from "@/lib/clinician-lists";

export const metadata: Metadata = { title: "Dashboard" };

// A pending (NPPES-was-down) profile retries verification on each visit.
async function retryPending(personId: string, c: Clinician): Promise<Clinician> {
  if (c.verifiedAt) return c;
  const lookup = await lookupNpi(c.npi);
  if (lookup === "unavailable") return c;
  const saved = saveClinicianProfile(
    personId,
    { npi: c.npi, lastName: c.lastName, clinicName: c.clinicName, clinicPhone: c.clinicPhone, clinicWebsite: c.clinicWebsite },
    lookup,
    new Date(),
  );
  return saved.clinician ?? c;
}

export default async function CliniciansPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const { person, clinician: found } = await currentClinician();

  if (!person) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <PageHeader
          eyebrow="For clinicians"
          title="Patient handouts"
          description="Build a one-page regimen handout with a QR code your patient scans to save the plan privately. Sign in with your work email; you'll add your NPI next."
        />
        <EmailSignupCard
          signedInAs={null}
          next="/clinicians"
          title="Sign in with your email"
          blurb="We send a one-time sign-in link. No password. Your email identifies your clinician account; it's never shown to patients."
          footnote="We only email you sign-in links and notices about your clinician account. Delete the account and everything in it at any time."
        />
      </div>
    );
  }

  const clinician = found ? await retryPending(person.id, found) : null;
  if (!clinician) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <PageHeader eyebrow="For clinicians" title="Your clinician profile" description={`Signed in as ${person.email}. Add your NPI and the clinic name to print on handouts.`} />
        <ClinicianProfileForm initial={{ npi: "", lastName: "", clinicName: "", clinicPhone: "", clinicWebsite: "" }} />
      </div>
    );
  }

  const handouts = listHandoutsForClinician(clinician.id);
  const refHit = ref ? findVersionByRef(clinician.id, ref) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <PageHeader eyebrow="For clinicians" title="Patient handouts" description={`${clinicianDisplayName(clinician)} · ${clinician.clinicName}`}>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
          {clinician.verifiedAt ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
              <BadgeCheck className="h-4 w-4" /> NPI {clinician.npi} verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <Clock className="h-4 w-4" /> NPI {clinician.npi} pending verification (prescription products locked)
            </span>
          )}
          {clinician.taxonomyDesc && (
            <span className="text-muted-foreground">
              · {clinician.taxonomyDesc}
              {clinician.state ? `, ${clinician.state}` : ""}
              {!clinician.isDermatology && " (not a dermatology taxonomy)"}
            </span>
          )}
        </div>
      </PageHeader>

      <section className="space-y-3" aria-labelledby="new-h">
        <h2 id="new-h" className="text-lg font-semibold">
          New handout
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/clinicians/handouts/new" className="inline-flex items-center gap-2 rounded-full border border-dashed px-4 py-2 text-sm font-medium hover:border-brand">
            <FilePlus2 className="h-4 w-4" /> Start blank
          </Link>
          <span className="text-sm text-muted-foreground">or start from {libraryItems().length} ready-made handouts:</span>
        </div>
        <HandoutLibrary items={libraryItems()} categories={HANDOUT_CATEGORIES} useHref="/clinicians/handouts/new?template=" />
      </section>

      <section id="lists" className="scroll-mt-24 space-y-3" aria-labelledby="lists-h">
        <div className="space-y-1">
          <h2 id="lists-h" className="text-lg font-semibold">
            Starter lists
          </h2>
          <p className="text-sm text-muted-foreground">Your practice&apos;s standard avoid lists, ready for the patch-test reader and handouts.</p>
        </div>
        <StarterLists lists={listsForClinician(clinician.id).map((l) => ({ id: l.id, name: l.name, ids: l.ids }))} />
      </section>

      <section className="space-y-3" aria-labelledby="list-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="list-h" className="text-lg font-semibold">
            Your handouts
          </h2>
          <form className="flex gap-2 text-sm" action="/clinicians">
            <label htmlFor="ref" className="sr-only">
              Find by chart reference
            </label>
            <input id="ref" name="ref" defaultValue={ref ?? ""} placeholder="Chart ref, e.g. AB12-CD34" className="h-9 rounded-md border bg-background px-3" />
            <button className={buttonVariants({ variant: "outline", size: "sm" })}>Find</button>
          </form>
        </div>
        {ref && (
          <p className="text-sm">
            {refHit ? (
              <Link href={`/clinicians/handouts/${refHit.handoutId}?v=${refHit.version}`} className="text-brand hover:underline">
                {refHit.ref}: {refHit.title}, version {refHit.version} →
              </Link>
            ) : (
              <span className="text-muted-foreground">No handout of yours has the reference {ref}.</span>
            )}
          </p>
        )}
        {handouts.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No handouts yet. Pick a template above.</p>
        ) : (
          <ul className="space-y-4">
            {handouts.map(({ handout, versions }) => {
              const latest = versions[0];
              return (
                <li key={handout.id} className="space-y-3 rounded-2xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{handout.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {versions.length} version{versions.length === 1 ? "" : "s"} · updated {new Date(handout.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Link href={`/clinicians/handouts/${handout.id}?v=${latest.version.version}`} className={buttonVariants({ size: "sm" })}>
                        Print
                      </Link>
                      <Link href={`/clinicians/handouts/new?from=${handout.id}&v=${latest.version.version}&mode=edit`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                        Edit (new version)
                      </Link>
                      <Link href={`/clinicians/handouts/new?from=${handout.id}&v=${latest.version.version}&mode=duplicate`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                        Duplicate
                      </Link>
                    </div>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        <th className="py-1 font-medium">Version</th>
                        <th className="py-1 font-medium">Chart ref</th>
                        <th className="py-1 text-right font-medium">Printed</th>
                        <th className="py-1 text-right font-medium">Opened</th>
                        <th className="py-1 text-right font-medium">Saved by patient</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map(({ version, counts }) => (
                        <tr key={version.id} className="border-t">
                          <td className="py-1.5">
                            v{version.version} <span className="text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleDateString()}</span>
                          </td>
                          <td className="py-1.5 font-mono text-xs">{version.ref}</td>
                          <td className="py-1.5 text-right tabular-nums">{counts.printed}</td>
                          <td className="py-1.5 text-right tabular-nums">{counts.opened}</td>
                          <td className="py-1.5 text-right tabular-nums">{counts.saved}</td>
                          <td className="py-1.5 text-right">
                            <Link href={`/clinicians/handouts/${handout.id}?v=${version.version}`} className="text-xs text-brand hover:underline">
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ChartNoteButton
                    compact
                    version={{ ref: latest.version.ref, title: latest.version.title, createdAt: latest.version.createdAt, content: latest.version.content }}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Counts are per printed copy: printed, opened at least once, and saved by the patient. We don&apos;t know or show who your
          patients are.
        </p>
      </section>

      <section className="space-y-3 border-t pt-6" aria-labelledby="profile-h">
        <h2 id="profile-h" className="text-lg font-semibold">
          Profile and clinic
        </h2>
        <ClinicianProfileForm
          submitLabel="Save"
          initial={{
            npi: clinician.npi,
            lastName: clinician.lastName,
            clinicName: clinician.clinicName,
            clinicPhone: clinician.clinicPhone ?? "",
            clinicWebsite: clinician.clinicWebsite ?? "",
          }}
        />
      </section>
    </div>
  );
}
