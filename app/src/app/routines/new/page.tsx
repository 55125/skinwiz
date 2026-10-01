import { RoutineForm } from "@/components/routine-form";
import { RoutineDisclaimer } from "@/components/routine-disclaimer";
import { getConcerns } from "@/lib/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post a routine",
  robots: { index: false },
};

// Force dynamic for the same reason as "/" and "/sitemap.xml" — this
// reads getConcerns() from the DB, and the Docker build runs before
// db:seed, so a static build would permanently bake in an empty concern
// picker with nothing selectable.
export const dynamic = "force-dynamic";

export default function NewRoutinePage() {
  const concerns = getConcerns();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Post a routine</h1>
        <p className="text-muted-foreground">Share what you use, step by step. Anyone can vote on it.</p>
      </div>
      <RoutineDisclaimer />
      <RoutineForm concerns={concerns} />
    </div>
  );
}
