import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye } from "lucide-react";
import { ClinicianPlan } from "@/components/clinician-plan";
import { UNIVERSAL_STOP_RULES, getTemplate, type HandoutTemplate } from "@/db/handout-templates";
import { FEATURES } from "@/lib/feature-flags";
import type { HandoutVersion } from "@/lib/handouts";

// A library handout as a patient sees it on their phone after scanning the
// QR, for clinicians deciding whether to use it before they sign up. Built
// from the public template with placeholder clinic details: it never reads a
// clinician's saved handouts, a printout or any patient data.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = getTemplate((await params).id);
  return t ? { title: `${t.name}: sample patient view`, robots: { index: false, follow: false } } : {};
}

const SAMPLE_CLINIC = "Sample Dermatology";

function sampleVersion(t: HandoutTemplate): HandoutVersion {
  return {
    id: 0,
    handoutId: "sample",
    version: 1,
    ref: "SAMPLE",
    title: t.title,
    templateId: t.id,
    content: {
      sections: t.sections,
      steps: t.steps.map((s, i) => ({
        key: `s${i + 1}`,
        slot: s.slot,
        label: s.label,
        productId: null,
        kind: s.kind === "rx" ? "rx" : "generic",
        productName: null,
        directions: s.directions,
      })),
      stopRules: [...t.stopRules, ...UNIVERSAL_STOP_RULES],
      notes: t.notes,
      avoidCode: null,
    },
    clinicName: SAMPLE_CLINIC,
    clinicianName: "Your name",
    clinicianCredential: null,
    clinicPhone: null,
    clinicWebsite: null,
    createdAt: "",
  };
}

export default async function SamplePatientViewPage({ params }: { params: Promise<{ id: string }> }) {
  const t = FEATURES.HANDOUTS ? getTemplate((await params).id) : undefined;
  if (!t) notFound();
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <Link href={`/clinic-tools/handouts/${t.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to the handout
      </Link>
      <div className="space-y-1 rounded-xl border border-brand/30 bg-brand-soft/40 p-3 text-sm">
        <h1 className="flex items-center gap-2 text-base font-medium">
          <Eye className="h-4 w-4 text-brand" aria-hidden /> Sample patient view: {t.name}
        </h1>
        <p className="text-muted-foreground">
          What your patient sees on their phone after scanning the QR code and saving the plan. Your name, clinic, phone number and
          the products you pick replace the placeholders, and patients can mark steps done or hide them.
        </p>
      </div>
      <div className="mx-auto max-w-3xl">
        <ClinicianPlan version={sampleVersion(t)} products={new Map()} states={new Map()} regimenId={null} preview />
      </div>
    </div>
  );
}
