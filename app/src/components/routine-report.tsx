"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

// The one moderation lever routines have today: a report signal, collected
// but not acted on automatically (no auto-hide, no admin UI yet — see
// schema.ts's routineReports comment). This is deliberately a low-key text
// link, not a prominent button — reporting is an edge case, not something
// to invite by default the way voting is.
export function RoutineReport({ routineId, initialReported }: { routineId: number; initialReported: boolean }) {
  const [reported, setReported] = useState(initialReported);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  if (reported) {
    return <p className="text-xs text-muted-foreground">Reported — thanks, we&apos;ll take a look.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground underline hover:text-foreground"
      >
        <Flag className="h-3 w-3" /> Report this routine
      </button>
    );
  }

  function submit() {
    startTransition(async () => {
      const res = await fetch(`/api/routines/${routineId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (res.ok) setReported(true);
    });
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <label htmlFor="report-reason" className="text-xs font-medium">
        What&apos;s wrong with this routine? (optional)
      </label>
      <textarea
        id="report-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        rows={2}
        className="w-full rounded-md border bg-background p-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Submit report
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
