"use client";

import { Globe, X } from "lucide-react";
import { originLabel, type OriginId } from "@/lib/origin-shared";
import { useOrigin } from "@/lib/use-origin";

// Above a product list while the header's region pick is on, so a short
// list never reads as the whole catalog. The server passes the pick it
// filtered by; clearing it here is the same as "All regions" in the header.
export function OriginNotice({ origin }: { origin: OriginId | undefined }) {
  const [, setOrigin] = useOrigin();
  if (!origin) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-brand-soft/60 px-4 py-3 text-sm">
      <Globe className="h-4 w-4 shrink-0 text-brand" aria-hidden />
      <p className="min-w-0 flex-1">
        Showing <span className="font-medium">{originLabel(origin)} brands</span> only.
      </p>
      <button
        type="button"
        onClick={() => setOrigin(undefined)}
        className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-brand transition-colors hover:bg-background"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Show all regions
      </button>
    </div>
  );
}
