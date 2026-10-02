import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { HandoutBuilder, type BuilderInitial } from "@/components/handout-builder";
import { currentClinician, isVerified } from "@/lib/clinicians";
import { listsForClinician } from "@/lib/clinician-lists";
import { getOwnedHandout, getVersion } from "@/lib/handouts";
import { getTemplate, UNIVERSAL_STOP_RULES } from "@/db/handout-templates";
import { sectionsOf } from "@/lib/handout-types";

export const metadata: Metadata = { title: "Build a handout" };

export default async function NewHandoutPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; from?: string; v?: string; mode?: string }>;
}) {
  const { template: templateId, from, v, mode } = await searchParams;
  const { clinician } = await currentClinician();
  if (!clinician) redirect("/clinicians");

  let initial: BuilderInitial;
  let heading = "New handout";
  const source = from && getOwnedHandout(from, clinician.id) ? getVersion(from, Number(v)) : null;
  if (source) {
    const editing = mode === "edit";
    heading = editing ? `Edit “${source.title}”` : `Duplicate “${source.title}”`;
    initial = {
      handoutId: editing ? from! : null,
      title: editing ? source.title : `${source.title} (copy)`.slice(0, 80),
      templateId: source.templateId,
      templateDraft: false,
      sections: sectionsOf(source.content),
      steps: source.content.steps.map((s, i) => ({ uid: `v${i}`, slot: s.slot, label: s.label, productId: s.productId, kind: s.kind, productName: s.productName, directions: s.directions, search: "" })),
      stopRules: source.content.stopRules,
      notes: source.content.notes,
      avoidCode: source.content.avoidCode ?? "",
    };
  } else {
    const t = getTemplate(templateId);
    heading = t ? t.name : "Blank handout";
    initial = {
      handoutId: null,
      title: t?.title ?? "Your skincare plan",
      templateId: t?.id ?? null,
      templateDraft: !!t && !t.reviewed,
      sections: t?.sections ?? [],
      steps: (t?.steps ?? []).map((s, i) => ({
        uid: `t${i}`,
        slot: s.slot,
        label: s.label,
        productId: null,
        kind: "generic" as const,
        productName: null,
        directions: s.directions,
        search: s.search,
      })),
      stopRules: [...(t?.stopRules ?? []), ...UNIVERSAL_STOP_RULES],
      notes: t?.notes ?? "",
      avoidCode: "",
    };
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link href="/clinicians" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>
      <PageHeader
        eyebrow="Handout builder"
        title={heading}
        description="Write what the patient needs to know, add products if it's a routine, and set when to call. The patient's name goes on the print screen only and is never sent to us."
      />
      <HandoutBuilder
        initial={initial}
        rxAllowed={isVerified(clinician)}
        lists={listsForClinician(clinician.id).map((l) => ({ id: l.id, name: l.name, ids: l.ids }))}
      />
    </div>
  );
}
