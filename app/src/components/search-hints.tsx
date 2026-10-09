import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SEARCH_HINTS as HINTS } from "@/lib/search-hint-copy";
import type { SearchHint } from "@/lib/search-terms";

// Pointers for searches that are about a topic rather than a product name
// (lib/search-terms.ts decides which; the text is in lib/search-hint-copy.ts).
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
