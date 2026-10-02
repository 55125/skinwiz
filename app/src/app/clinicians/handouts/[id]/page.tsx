import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { HandoutPrint } from "@/components/handout-print";
import { ChartNoteButton } from "@/components/chart-note-button";
import { buttonVariants } from "@/components/ui/button";
import { currentClinician } from "@/lib/clinicians";
import { countsForVersions, getOwnedHandout, getVersion } from "@/lib/handouts";
import { SLOT_LABEL, sectionsOf } from "@/lib/handout-types";
import { HandoutSections } from "@/components/handout-sections";

export const metadata: Metadata = { title: "Print handout" };

// One version of a handout: what it says, print copies (each with its own
// QR), copy the chart note. A version never changes; "Edit" saves a new one.
export default async function HandoutVersionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { id } = await params;
  const { v } = await searchParams;
  const { clinician } = await currentClinician();
  if (!clinician) redirect("/clinicians");
  const handout = getOwnedHandout(id, clinician.id);
  if (!handout) notFound();
  const version = getVersion(id, Number(v) || handout.latestVersion);
  if (!version) notFound();
  const counts = countsForVersions([version.id]).get(version.id) ?? { printed: 0, opened: 0, saved: 0 };
  const c = version.content;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <Link href="/clinicians" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>
      <PageHeader
        eyebrow={`Version ${version.version}${version.version < handout.latestVersion ? ` (latest is ${handout.latestVersion})` : ""} · ref ${version.ref}`}
        title={version.title}
        description={`${version.clinicianName} · ${version.clinicName}. Printed ${counts.printed}, opened ${counts.opened}, saved by patient ${counts.saved}.`}
      />
      <div className="flex flex-wrap gap-2">
        <Link href={`/clinicians/handouts/${id}/preview?v=${version.version}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Preview what the patient sees
        </Link>
        <Link href={`/clinicians/handouts/new?from=${id}&v=${version.version}&mode=edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Edit (new version)
        </Link>
        <Link href={`/clinicians/handouts/new?from=${id}&v=${version.version}&mode=duplicate`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Duplicate
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {sectionsOf(c).length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <HandoutSections sections={sectionsOf(c)} />
            </div>
          )}
          <ol className="space-y-2">
            {c.steps.map((s) => (
              <li key={s.key} className="rounded-xl border bg-card p-3 text-sm">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {SLOT_LABEL[s.slot]} · {s.label}
                  {s.kind === "rx" && " · Rx"}
                </p>
                {s.productName && <p className="font-medium">{s.productName}</p>}
                {s.directions && <p>{s.directions}</p>}
              </li>
            ))}
          </ol>
          {c.stopRules.length > 0 && (
            <div className="rounded-xl border p-3 text-sm">
              <p className="font-medium">Stop and call us if:</p>
              <ul className="list-disc pl-5">
                {c.stopRules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {c.notes && <p className="whitespace-pre-line rounded-xl border p-3 text-sm">{c.notes}</p>}
          <section className="space-y-2 rounded-2xl border bg-card p-4">
            <h2 className="text-base font-semibold">Chart note</h2>
            <ChartNoteButton version={{ ref: version.ref, title: version.title, createdAt: version.createdAt, content: c }} />
          </section>
        </div>
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <HandoutPrint
            v={{
              handoutId: id,
              version: version.version,
              ref: version.ref,
              title: version.title,
              clinicName: version.clinicName,
              clinicianName: version.clinicianName,
              clinicPhone: version.clinicPhone,
              clinicWebsite: version.clinicWebsite,
              content: c,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
