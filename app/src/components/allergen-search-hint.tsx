import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { QueryAllergen } from "@/lib/allergen-search";

// For a search that names patch-test allergens (lib/allergen-search.ts): each
// one's page lists its label names and the products free of it.
export function AllergenSearchHint({ allergens }: { allergens: QueryAllergen[] }) {
  if (allergens.length === 0) return null;
  const onLabels = allergens.filter((a) => a.href);
  const offLabels = allergens.filter((a) => !a.href);
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="text-base font-semibold">Patch-test allergens in your search</h2>
      {onLabels.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Each page lists every name the allergen goes by on an ingredient label, and products whose full ingredient lists are free of it.
          </p>
          <div className="flex flex-wrap gap-2">
            {onLabels.map((a) => (
              <Link
                key={a.id}
                href={a.href!}
                className="inline-flex h-8 items-center rounded-full border bg-background px-3 text-sm transition-colors hover:border-brand/40 hover:bg-brand-soft"
              >
                {a.name}
              </Link>
            ))}
          </div>
        </>
      )}
      {offLabels.length > 0 && (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {offLabels.map((a) => (
            <li key={a.id}>
              <span className="font-medium text-foreground">{a.name}</span> isn&apos;t listed on skincare labels. {a.foundIn}
            </li>
          ))}
        </ul>
      )}
      <Link href="/avoid" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        Add them to the ingredients you avoid <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
