import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PatchTestReader } from "@/components/patch-test-reader";

// A tool page: kept out of search, free to link to.
export const metadata: Metadata = {
  title: "Patch-test reader",
  description: "Tap-to-grade patch-test reading for medical assistants, with a chart-ready write-up and a QR code for the patient. Nothing is stored.",
  alternates: { canonical: "/clinic-tools/patch-test-reader" },
  robots: { index: false, follow: true },
};

export default function PatchTestReaderPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 print:hidden">
      <PageHeader
        eyebrow="Clinic tools"
        title="Patch-test reader"
        description="Pick the series, tap each chamber to grade it, then copy the write-up to the chart and hand the patient their avoid list. Everything stays on this device; nothing is sent to us."
      />
      <PatchTestReader />
      <p className="text-xs text-muted-foreground">
        Grades are recorded as read; clinical relevance is the clinician&apos;s call. Reloading the page clears the reading.{" "}
        <Link href="/clinic-tools" className="font-medium text-brand hover:underline">
          More clinic tools →
        </Link>
      </p>
    </div>
  );
}
