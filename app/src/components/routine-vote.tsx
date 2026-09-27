"use client";

import { useState, useTransition } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function RoutineVote({
  routineId,
  initialScore,
  initialVote,
}: {
  routineId: number;
  initialScore: number;
  initialVote: number | null;
}) {
  const [score, setScore] = useState(initialScore);
  const [myVote, setMyVote] = useState(initialVote);
  const [isPending, startTransition] = useTransition();

  function vote(value: 1 | -1) {
    // Toggling the same direction again removes the vote's effect visually
    // (score reverts) but the server still records it as that direction —
    // there's no "un-vote" endpoint, only change-direction, since the
    // unique index is (routine, session), not a nullable vote.
    const previous = myVote;
    const delta = previous === value ? 0 : value - (previous ?? 0);
    setScore((s) => s + delta);
    setMyVote(value);

    startTransition(async () => {
      const res = await fetch(`/api/routines/${routineId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        const data = await res.json();
        setScore(data.score);
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => vote(1)}
        disabled={isPending}
        aria-label="Upvote"
        className={cn(
          "rounded p-1 hover:bg-muted disabled:opacity-50",
          myVote === 1 && "text-emerald-600",
        )}
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <span className="min-w-6 text-center text-sm font-medium tabular-nums">{score}</span>
      <button
        type="button"
        onClick={() => vote(-1)}
        disabled={isPending}
        aria-label="Downvote"
        className={cn(
          "rounded p-1 hover:bg-muted disabled:opacity-50",
          myVote === -1 && "text-red-600",
        )}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
