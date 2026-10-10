import { AlertTriangle, ChevronDown } from "lucide-react";
import { SITE_NAME } from "@/lib/brand";

// project.md §3, point 2: "Red-flag gate before any recommendation ...
// Reduces liability, doubles as referral funnel." Shown before any product
// list — not gating a personalized routine (not built yet), but the same
// principle: don't let someone with a red-flag symptom read this as
// treatment guidance for their situation.
// Kept compact on purpose: it sits above every product list, and the full
// four-line box took the first 210 px of a phone screen. The emergency
// sentence is always visible; the when-to-see-a-dermatologist list sits
// one tap away behind a native <details> (still in the page, no client JS),
// wording unchanged.
export function RedFlagBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-950/80 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100/80"
    >
      <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium text-amber-950 dark:text-amber-100">
          Fever with a spreading rash, blistering or peeling skin, swelling of the face or lips, or trouble breathing needs
          urgent care or 911 today.
        </p>
        <details className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium text-amber-900 underline-offset-2 hover:underline dark:text-amber-200 [&::-webkit-details-marker]:hidden">
            When to see a dermatologist
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="mt-1">
            <strong className="font-semibold text-amber-950 dark:text-amber-100">See a board-certified dermatologist first</strong>{" "}
            if you have a changing or bleeding lesion, rapid spread, pain or fever, eye involvement, or no improvement
            within the time on the product&apos;s label (as short as 7 days for hydrocortisone). {SITE_NAME} is educational
            and doesn&apos;t diagnose your skin.
          </p>
        </details>
      </div>
    </div>
  );
}
