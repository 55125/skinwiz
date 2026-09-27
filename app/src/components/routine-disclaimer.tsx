import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Routines are the one part of the site with zero verification step —
// unlike products (FDA/brand-direct/community-sourced, each labeled) or
// evidence notes (dermatologist-only grading), anyone can post a routine
// and it's live immediately. This must be visible on every routines page,
// not just linked from elsewhere.
export function RoutineDisclaimer() {
  return (
    <Alert className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
      <AlertTitle>User-submitted, not reviewed by SkinWiz</AlertTitle>
      <AlertDescription>
        Routines are posted directly by other visitors and are not checked by dermatologists or
        SkinWiz staff. Vote score reflects community opinion, not clinical accuracy. Don&apos;t
        treat a routine as medical advice — see a board-certified dermatologist for guidance
        specific to you.
      </AlertDescription>
    </Alert>
  );
}
