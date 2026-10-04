import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Eye } from "lucide-react";
import { productsByStoredId } from "@/lib/canonical";
import { ClinicianPlan } from "@/components/clinician-plan";
import { canViewRxReference, currentClinician } from "@/lib/clinicians";
import { getOwnedHandout, getVersion } from "@/lib/handouts";

export const metadata: Metadata = { title: "Patient preview" };

// The clinician's own preview of what a patient sees after saving the plan.
// Clinician-only, never claims a printout, no step controls.
export default async function HandoutPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { id } = await params;
  const { v } = await searchParams;
  const { clinician } = await currentClinician();
  if (!clinician) redirect("/clinicians");
  const handout = getOwnedHandout(id, clinician.id);
  if (!handout) notFound();
  const version = getVersion(id, Number(v) || handout.latestVersion);
  if (!version) notFound();
  const ids = version.content.steps.map((s) => s.productId).filter((x): x is string => !!x);
  const prods = productsByStoredId(ids); // merged duplicates show as their canonical (lib/canonical.ts)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <Link href={`/clinicians/handouts/${id}?v=${version.version}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to printing
      </Link>
      <p className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft/40 p-3 text-sm">
        <Eye className="h-4 w-4 text-brand" /> Preview: this is what your patient sees on their phone after saving the plan.
      </p>
      <ClinicianPlan version={version} products={prods} states={new Map()} regimenId={null} preview rxLinks={await canViewRxReference()} />
    </div>
  );
}
