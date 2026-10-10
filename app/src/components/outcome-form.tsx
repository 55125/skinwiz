"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEK_OPTIONS = [
  { label: "Under 2 weeks", value: 1 },
  { label: "2–4 weeks", value: 3 },
  { label: "4–8 weeks", value: 6 },
  { label: "8+ weeks", value: 10 },
];

export function OutcomeForm({
  productId,
  concernName,
  initial,
  finished = false,
}: {
  productId: string;
  concernName: string;
  initial: { improved: boolean; weeksUsed: number | null } | null;
  /** On the visitor's shelf as finished: ask directly, they've used it up. */
  finished?: boolean;
}) {
  const router = useRouter();
  const [improved, setImproved] = useState<boolean | null>(initial?.improved ?? null);
  const [weeks, setWeeks] = useState<number | null>(initial?.weeksUsed ?? null);
  const [saved, setSaved] = useState(initial !== null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (improved === null) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ improved, weeksUsed: weeks }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't save your answer. Please try again.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const choice = (value: boolean, Icon: typeof ThumbsUp, label: string, activeClass: string) => (
    <button
      type="button"
      onClick={() => {
        setImproved(value);
        setSaved(false);
      }}
      aria-pressed={improved === value}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
        improved === value ? activeClass : "bg-card hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div className="space-y-4 rounded-2xl border bg-gradient-to-br from-brand-soft/60 to-card p-5">
      <div className="space-y-1">
        <h2 className="font-semibold">
          {finished && !initial
            ? `You finished this — did it help with ${concernName.toLowerCase()}?`
            : `Used this for ${concernName.toLowerCase()}? Log your result`}
        </h2>
        <p className="text-sm text-muted-foreground">
          Anonymous, one answer per visitor. Answers make up the User Score: reported results, not store reviews.
        </p>
      </div>

      <div className="flex gap-2">
        {choice(true, ThumbsUp, "It helped", "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300")}
        {choice(false, ThumbsDown, "It didn't help", "border-red-400 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300")}
      </div>

      {improved !== null && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How long did you use it?</p>
          <div className="flex flex-wrap gap-1.5">
            {WEEK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setWeeks(opt.value);
                  setSaved(false);
                }}
                aria-pressed={weeks === opt.value}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  weeks === opt.value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden until an answer is picked -- a disabled pale button read as
          broken rather than "choose first". */}
      {improved !== null && (
      <div className="flex items-center gap-3">
        <Button type="button" onClick={submit} disabled={isPending || saved} className="rounded-full px-5">
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : initial ? (
            "Update my answer"
          ) : (
            "Submit"
          )}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      )}
      <p className="text-xs text-muted-foreground">
        Not medical advice. If anything gets worse, stop and see a board-certified dermatologist.{" "}
        <Link href="/about#how-we-check" className="font-medium text-brand hover:underline">
          How we check
        </Link>
      </p>
    </div>
  );
}
