import type { ReactNode } from "react";
import { LEGAL_UPDATED } from "@/lib/legal";

// Shared layout for /privacy and /terms: one readable column, with styling
// for the plain h2/p/ul/table markup the documents are written in.
export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-6 text-muted-foreground">{intro}</div>
      <div
        className={[
          "mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground",
          "[&_h2]:scroll-mt-24 [&_h2]:pt-4 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-foreground",
          "[&_h3]:pt-1 [&_h3]:font-medium [&_h3]:text-foreground",
          "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
          "[&_strong]:text-foreground [&_a]:underline [&_a]:underline-offset-2",
          "[&_table]:w-full [&_table]:text-left [&_th]:py-2 [&_th]:pr-3 [&_th]:font-medium [&_th]:text-foreground",
          "[&_td]:border-t [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
