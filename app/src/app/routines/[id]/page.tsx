import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RoutineDisclaimer } from "@/components/routine-disclaimer";
import { RoutineVote } from "@/components/routine-vote";
import { RoutineReport } from "@/components/routine-report";
import { getRoutine, getSessionVote, getSessionReported } from "@/lib/routines";
import { readSessionId } from "@/lib/session";

export default async function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const routine = getRoutine(parseInt(id, 10));
  if (!routine) notFound();

  const sessionId = await readSessionId();
  const myVote = sessionId ? getSessionVote(routine.id, sessionId) : null;
  const alreadyReported = sessionId ? getSessionReported(routine.id, sessionId) : false;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <Link href={`/routines?concern=${routine.concernId}`} className="text-sm text-muted-foreground underline">
        ← Back to {routine.concernName} routines
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{routine.title}</h1>
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
