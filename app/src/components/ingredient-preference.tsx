"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function IngredientPreference({ id, initial }: { id: string; initial: "like" | "dislike" | null }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [pending, start] = useTransition();

  function toggle(kind: "like" | "dislike") {
    start(async () => {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", list: kind === "like" ? "likes" : "dislikes", id }),
      });
      if (res.ok) {
        setState((s) => (s === kind ? null : kind));
        router.refresh();
      }
    });
  }

  const base = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pending} aria-pressed={state === "like"} onClick={() => toggle("like")} className={cn(base, state === "like" ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-card hover:bg-muted")}>
        <ThumbsUp className="h-3.5 w-3.5" /> {state === "like" ? "You like this" : "I like this"}
      </button>
      <button type="button" disabled={pending} aria-pressed={state === "dislike"} onClick={() => toggle("dislike")} className={cn(base, state === "dislike" ? "border-red-400 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300" : "bg-card hover:bg-muted")}>
        <ThumbsDown className="h-3.5 w-3.5" /> {state === "dislike" ? "You dislike this" : "I dislike this"}
      </button>
    </div>
  );
}
