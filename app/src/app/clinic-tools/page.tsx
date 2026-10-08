import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, FilePlus2, FileText, ListChecks, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { HandoutLibrary } from "@/components/handout-library";
import { HANDOUT_CATEGORIES, libraryItems } from "@/db/handout-templates";
import { FEATURES } from "@/lib/feature-flags";
import { SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Free tools for dermatology practices",
  description: `Ready-made patient handouts, a patch-test reading tool for medical assistants, and patch-test result sheets with QR codes. Free from ${SITE_NAME}; no patient data stored.`,
  alternates: { canonical: "/clinic-tools" },
};

export const dynamic = "force-dynamic";

export default function ClinicToolsPage() {
  const items = FEATURES.HANDOUTS ? libraryItems() : [];
  const tools = [
    ...(items.length
      ? [{ href: "#library", icon: BookOpen, title: `${items.length} patient handouts`, body: "Conditions, surgery and procedures, cosmetic, pediatric and treatment how-tos. Use as is or customize, or write your own." }]
      : []),
    ...(FEATURES.HANDOUTS
      ? [{ href: "/clinicians", icon: FilePlus2, title: "Handout builder", body: "Start blank or from the library, print with a QR code or email the link, and see anonymous printed, opened and saved counts." }]
      : []),
    { href: "/clinic-tools/patch-test-reader", icon: ClipboardCheck, title: "Patch-test reader", body: "For MAs: tap each chamber to grade it, then copy a ready-to-chart write-up and hand the patient a QR code." },
    { href: "/for-clinicians/patch-test", icon: FileText, title: "Patch-test results sheet", body: "Tick the positives and print a one-page sheet whose QR code loads the patient's avoid list." },
    { href: "/clinicians#lists", icon: ListChecks, title: "Starter lists", body: "Save your practice's standard avoid lists (for example, fragrance-allergic) and issue them in one click." },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-10">
      <PageHeader
        eyebrow="For clinicians"
        title="Free tools for your clinic"
        description={`Patient handouts, patch-test reading and allergen lists that send patients somewhere useful afterwards. Free to use; we never receive your patients' names or contact details.`}
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {tools.map((t) => (
          <li key={t.title}>
            <Link href={t.href} className="group flex h-full gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-brand/50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <t.icon className="h-5 w-5" />
              </span>
              <span className="space-y-1">
                <span className="flex items-center gap-1 font-semibold">
                  {t.title} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="block text-sm text-muted-foreground">{t.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="space-y-3 rounded-3xl border bg-muted/40 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 text-brand" /> How it reaches your patients
        </h2>
        <ul className="grid gap-3 text-sm sm:grid-cols-3">
          <li>
            <span className="font-medium">Print, QR, email or link.</span>{" "}
            <span className="text-muted-foreground">
              Every copy gets its own one-time link. &ldquo;Email&rdquo; opens your own email app, so the address never reaches us.
            </span>
          </li>
          <li>
            <span className="font-medium">Their own page.</span>{" "}
            <span className="text-muted-foreground">
              Patients save it on their phone with no account, then find products that fit, check ingredients and track their routine.
            </span>
          </li>
          <li>
            <span className="font-medium">No patient data.</span>{" "}
            <span className="text-muted-foreground">
              Names typed for printing stay in your browser. You see anonymous counts (printed, opened, saved), never who.
            </span>
          </li>
        </ul>
      </section>

      {items.length > 0 && (
        <section id="library" className="scroll-mt-24 space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Handout library</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Plain-language handouts written to be edited. Using one needs a free clinician account (email plus NPI) so the copy
              carries your name and clinic.
            </p>
            <p className="text-xs text-muted-foreground">
              {items.every((t) => !t.draft)
                ? "Drafted with AI assistance and reviewed by the site's dermatologist before clinical use."
                : "Drafted with AI assistance; physician review in progress. Read each one before you hand it out."}
            </p>
          </div>
          <HandoutLibrary items={items} categories={HANDOUT_CATEGORIES} useHref="/clinicians/handouts/new?template=" previewHref="/clinic-tools/handouts/" />
        </section>
      )}

      <p className="text-sm text-muted-foreground">
        Board-certified dermatologist?{" "}
        <Link href="/for-clinicians" className="font-medium text-brand hover:underline">
          Request to join the Derm Score rating panel →
        </Link>
      </p>
    </div>
  );
}
