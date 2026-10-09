import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SearchHint } from "@/lib/search-terms";

// Pointers for searches that are about a topic rather than a product name
// (lib/search-terms.ts decides which).
const HINTS: Record<SearchHint, { title: string; body: string; href: string; cta: string }> = {
  hsa: {
    title: "HSA/FSA-eligible skincare",
    body: "Which products your spending account usually covers, why, and a filter for every eligible product in the catalog.",
    href: "/guide/hsa-fsa-eligible",
    cta: "Read the HSA/FSA guide",
  },
  "rx-retinoid": {
    title: "Using a prescription retinoid?",
    body: "Prescription medicines like tretinoin aren't in our product catalog, and we don't give directions for them: your prescriber does. Our guide covers the everyday products that usually pair well with one, and what to space out.",
    href: "/guide/prescription-retinoids",
    cta: "Read the prescription retinoid guide",
  },
  kids: {
    title: "Children's skin",
    body: "Plain-language guides for parents on eczema, diaper rash, cradle cap, molluscum and more. Check each product's label for the ages it covers; many say to ask a doctor below a certain age.",
    href: "/guide/kids",
    cta: "Guides for parents",
  },
};

export function SearchHints({ hints }: { hints: SearchHint[] }) {
  if (hints.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {hints.map((h) => {
        const hint = HINTS[h];
        return (
          <div key={h} className="space-y-2 rounded-2xl border bg-card p-5">
            <h2 className="text-base font-semibold">{hint.title}</h2>
            <p className="text-sm text-muted-foreground">{hint.body}</p>
            <Link href={hint.href} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              {hint.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
