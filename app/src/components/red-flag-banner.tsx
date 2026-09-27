import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// project.md §3, point 2: "Red-flag gate before any recommendation ...
// Reduces liability, doubles as referral funnel." Shown before any product
// list — not gating a personalized routine (not built yet), but the same
// principle: don't let someone with a red-flag symptom read this as
// treatment guidance for their situation.
export function RedFlagBanner() {
  return (
    <Alert className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle>See a board-certified dermatologist first if you have any of these</AlertTitle>
      <AlertDescription>
        A changing or bleeding lesion, rapid spread, pain or fever, eye involvement, or no
        improvement after 8–12 weeks of consistent use. This page is educational — it does not
        diagnose your skin or replace a clinical exam.
      </AlertDescription>
    </Alert>
  );
}
