import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SITE_NAME } from "@/lib/brand";

// Routines are the one part of the site with zero verification step —
// unlike products (FDA/brand-direct/community-sourced, each labeled) or
// evidence notes (dermatologist-only grading), anyone can post a routine
// and it's live immediately. This must be visible on every routines page,
// not just linked from elsewhere.
export function RoutineDisclaimer() {
  return (
    <Alert className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
      <AlertTitle>Visitor routines aren&apos;t reviewed by {SITE_NAME}</AlertTitle>
      <AlertDescription>
        Routines are posted directly by other visitors and are not checked by dermatologists or{" "}
        {SITE_NAME} staff. Vote score reflects community opinion, not clinical accuracy. Routines marked
        Starter were written by {SITE_NAME} from the published dermatology guidance each one links to.
        Don&apos;t treat any routine as medical advice — see a board-certified dermatologist for guidance
        specific to you.
      </AlertDescription>
    </Alert>
  );
}

// Shown instead of the visitor disclaimer on a starter routine's own page.
export function StarterRoutineNotice({ source }: { source?: { sourceName: string; sourceTitle: string; sourceUrl: string } }) {
  return (
    <Alert>
      <AlertTitle>Starter routine from {SITE_NAME}</AlertTitle>
      <AlertDescription>
        <p>
          Written by {SITE_NAME} from published dermatology guidance
          {source ? (
            <>
              {": "}
              <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
                {source.sourceName}, &ldquo;{source.sourceTitle}&rdquo;
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            </>
          ) : null}
          . A general starting point, not medical advice — see a board-certified dermatologist for guidance specific to you.
        </p>
      </AlertDescription>
    </Alert>
  );
}
