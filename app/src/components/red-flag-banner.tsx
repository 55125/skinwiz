import { AlertTriangle } from "lucide-react";
import { SITE_NAME } from "@/lib/brand";

// project.md §3, point 2: "Red-flag gate before any recommendation ...
// Reduces liability, doubles as referral funnel." Shown before any product
// list — not gating a personalized routine (not built yet), but the same
// principle: don't let someone with a red-flag symptom read this as
// treatment guidance for their situation.
// Kept compact on purpose: it sits above every product list, so a full
// amber alert box there dominated the page. Every symptom stays visible
// (never collapsed) since it's a gate, not fine print.
export function RedFlagBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-950/80 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100/80"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
      <p>
        <strong className="font-semibold text-amber-950 dark:text-amber-100">See a board-certified dermatologist first</strong>{" "}
        if you have a changing or bleeding lesion, rapid spread, pain or fever, eye involvement, or no improvement
        after 8–12 weeks of consistent use. {SITE_NAME} is educational and doesn&apos;t diagnose your skin.
      </p>
    </div>
  );
}
