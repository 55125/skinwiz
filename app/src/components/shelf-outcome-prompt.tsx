"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { productId: string; brandName: string; concernName: string; finished: boolean };

// One-tap outcomes for shelf products the visitor hasn't answered for yet.
// Posts to the same endpoint as the product page's OutcomeForm (weeks left
// unset); a row stays visible after answering, showing the choice, so a
// mis-tap can be corrected in place.
export function ShelfOutcomePrompt({ items }: { items: Item[] }) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function answer(productId: string, improved: boolean) {
    setBusy(productId);
    setError(null);
    const res = await fetch(`/api/products/${encodeURIComponent(productId)}/outcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ improved, weeksUsed: null }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      setError("Couldn't save that answer. Please try again.");
      return;
    }
    setAnswers((a) => ({ ...a, [productId]: improved }));
  }

  const done = Object.keys(answers).length;

  return (
    <section className="space-y-4 rounded-2xl border bg-gradient-to-br from-brand-soft/60 to-card p-5">
      <div className="space-y-1">
        <h2 className="text-lg">Did they help?</h2>
        <p className="text-sm text-muted-foreground">
          One tap each, anonymous. Your answers build the User Score for people deciding whether to buy.
          {done > 0 && <span className="font-medium text-foreground"> Thanks — {done} logged.</span>}
        </p>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {items.map((item) => {
          const a = answers[item.productId];
          const btn = (value: boolean, Icon: typeof ThumbsUp, label: string, on: string) => (
            <button
              type="button"
              disabled={busy === item.productId}
              onClick={() => answer(item.productId, value)}
              aria-pressed={a === value}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
                a === value ? on : "hover:bg-muted",
              )}
            >
              {a === value ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              {label}
            </button>
          );
          return (
            <li key={item.productId} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link href={`/product/${encodeURIComponent(item.productId)}`} className="block truncate text-sm font-medium hover:underline">
                  {item.brandName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {item.finished ? "Finished" : "In use"} · for {item.concernName.toLowerCase()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {btn(true, ThumbsUp, "Helped", "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300")}
                {btn(false, ThumbsDown, "Didn't help", "border-red-400 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300")}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Not medical advice. Stop and see a board-certified dermatologist if anything gets worse.
      </p>
    </section>
  );
}
