// The pointers shown for topic searches (components/search-hints.tsx). Data
// rather than JSX so the clinical review copy (db/clinical-review.ts) can
// print the same words.
import type { SearchHint } from "@/lib/search-terms";

export const SEARCH_HINTS: Record<SearchHint, { title: string; body: string; href: string; cta: string }> = {
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

