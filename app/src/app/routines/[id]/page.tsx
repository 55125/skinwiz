import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RoutineDisclaimer } from "@/components/routine-disclaimer";
import { RoutineVote } from "@/components/routine-vote";
import { RoutineReport } from "@/components/routine-report";
import { getRoutine, getSessionVote, getSessionReported } from "@/lib/routines";
import { readSessionId } from "@/lib/session";
import { findRoutineConflicts } from "@/lib/routine-conflicts";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const routine = getRoutine(parseInt(id, 10));
  if (!routine) return {};
  return {
    title: `${routine.title} — ${routine.concernName} routine`,
    description: `A community-submitted ${routine.concernName.toLowerCase()} routine on SkinWiz. User-posted and not reviewed by dermatologists.`,
    alternates: { canonical: `/routines/${routine.id}` },
  };
}

export default async function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const routine = getRoutine(parseInt(id, 10));
  if (!routine) notFound();

  const sessionId = await readSessionId();
  const myVote = sessionId ? getSessionVote(routine.id, sessionId) : null;
  const alreadyReported = sessionId ? getSessionReported(routine.id, sessionId) : false;
  const conflicts = findRoutineConflicts(routine.steps);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <Link href={`/routines?concern=${routine.concernId}`} className="text-sm text-muted-foreground underline">
        ← Back to {routine.concernName} routines
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{routine.title}</h1>
          <p className="text-muted-foreground">
            <Badge variant="secondary">{routine.concernName}</Badge>
            {routine.authorName && <span className="ml-2">by {routine.authorName}</span>}
          </p>
        </div>
        <RoutineVote routineId={routine.id} initialScore={routine.score} initialVote={myVote} />
      </div>

      <RoutineDisclaimer />

      <RoutineReport routineId={routine.id} initialReported={alreadyReported} />

      {routine.notes && <p className="text-sm text-muted-foreground">{routine.notes}</p>}

      {conflicts.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Worth checking before you combine these
          </p>
          <ul className="space-y-2 text-sm">
            {conflicts.map((c, i) => (
              <li key={i}>
                <span className="font-medium">
                  {c.a.brand} ({c.a.cls}) + {c.b.brand} ({c.b.cls}):
                </span>{" "}
                <span className="text-muted-foreground">{c.note}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            General interaction cautions based only on the products linked in the steps above — not medical advice.
            Ask a board-certified dermatologist how to combine actives for your skin.
          </p>
        </div>
      )}

      <Separator />

      <ol className="space-y-3">
        {routine.steps.map((step, i) => (
          <li key={step.id} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {i + 1}
            </span>
            <span className="text-sm">
              {step.description}
              {step.productId && step.productBrandName && (
                <>
                  {" — "}
                  <Link href={`/product/${encodeURIComponent(step.productId)}`} className="underline">
                    view {step.productBrandName}
                  </Link>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
