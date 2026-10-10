import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PatchTestReader } from "@/components/patch-test-reader";
import { PatchTestIssuer } from "@/components/patch-test-issuer";
import { FEATURES } from "@/lib/feature-flags";
import { currentClinician } from "@/lib/clinicians";
import { listsForClinician } from "@/lib/clinician-lists";
import { cn } from "@/lib/utils";

// A tool page: kept out of search, free to link to.
export const metadata: Metadata = {
  title: "Patch-test reader",
  description:
    "Tap-to-grade patch-test reading for medical assistants, with a chart-ready write-up and a QR code for the patient. Already read? Tick the positives and print a one-page sheet instead. Nothing is stored.",
  alternates: { canonical: "/clinic-tools/patch-test-reader" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

// Two ways in: grade the panel chamber by chamber, or (when the reading is
// already done, or for a starter list) tick the positives straight off the
// series and print the sheet. The tick list used to be its own page at
// /for-clinicians/patch-test, which now redirects here with ?mode=tick.
export default async function PatchTestReaderPage({ searchParams }: { searchParams: Promise<{ mode?: string; list?: string }> }) {
  const { mode, list } = await searchParams;
  const tick = mode === "tick" || !!list;
  // A signed-in clinician's starter lists; anyone else gets the plain tick list.
  const { clinician } = tick && FEATURES.HANDOUTS ? await currentClinician() : { clinician: null };
  const lists = clinician ? listsForClinician(clinician.id).map((l) => ({ id: l.id, name: l.name, ids: l.ids })) : [];
  const initialIds = lists.find((l) => l.id === list)?.ids ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 print:hidden">
      <PageHeader
        eyebrow="Clinic tools"
        title="Patch-test reader"
        description={
          tick
            ? "Already have the results? Tick the patient's positives, add an optional note, and print a one-page sheet whose QR code fills in their avoid list. The patient's name stays on this device; only the allergen list, date and note travel in the link."
            : "Pick the series, tap each chamber to grade it, then copy the write-up to the chart and hand the patient their avoid list. Grades, the write-up and the patient's name stay on this device; only the avoid-list link (allergen code and date) leaves it, when you share it."
        }
      />

      <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="How to enter results">
        {(
          [
            [false, "/clinic-tools/patch-test-reader", "Grade the panel"],
            [true, "/clinic-tools/patch-test-reader?mode=tick", "Tick the positives"],
          ] as const
        ).map(([isTick, href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={tick === isTick ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 font-medium transition-colors",
              tick === isTick ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tick ? <PatchTestIssuer lists={lists} initialIds={initialIds} key={list ?? "none"} /> : <PatchTestReader />}

      {tick ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Allergens that never appear on cosmetic labels (rubber accelerators, epoxy, textile dyes) are printed as information with
          where they&apos;re usually found, but can&apos;t be checked against products. Matching uses the label synonyms in our{" "}
          <Link href="/allergens" className="font-medium text-brand hover:underline">
            contact allergen guide
          </Link>
          ; products without a full ingredient list show as &ldquo;couldn&apos;t check,&rdquo; never as clear. No sign-in is needed to
          make a sheet, so a link can&apos;t prove who made it, and the patient page says so.{" "}
          <Link href="/clinic-tools" className="font-medium text-brand hover:underline">
            More clinic tools →
          </Link>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Grades are recorded as read; clinical relevance is the clinician&apos;s call. The reading survives a reload in this tab, and only in this tab; New reading clears it.{" "}
          <Link href="/clinic-tools" className="font-medium text-brand hover:underline">
            More clinic tools →
          </Link>
        </p>
      )}
    </div>
  );
}
