import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Marks a clinician-issued plan. Only ever rendered from a claimed handout
// version (lib/regimens.ts listRegimens / getClinicianPlan), never from
// anything the visitor can edit, so it always means "exactly what your
// clinician wrote". The credential is the clinician's own (MD, DO, PA-C, NP).
export function MdBadge({ credential, className }: { credential: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-foreground",
        className,
      )}
      title="Issued by your clinician. Read-only: make a personal copy to change it."
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {credential}
    </span>
  );
}
