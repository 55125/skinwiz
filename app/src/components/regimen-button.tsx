"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Moon, Plus, Sun, SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";

type Slot = "am" | "pm" | "both";

const SLOT_OPTIONS: { id: Slot; label: string; icon: typeof Sun }[] = [
  { id: "am", label: "Morning", icon: Sun },
  { id: "pm", label: "Night", icon: Moon },
  { id: "both", label: "Both", icon: SunMoon },
];

export function RegimenButton({
  productId,
  initialSlot,
  suggestedSlot,
  suggestedReason,
  compact,
  regimenId,
}: {
  productId: string;
  /** Which of the visitor's own regimens (the regimen page); omitted = their primary one. */
  regimenId?: number;
  initialSlot: Slot | null;
  suggestedSlot: Slot;
  suggestedReason: string | null;
  /** Just the slot pills and Remove, for rows on the regimen page. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [slot, setSlot] = useState<Slot | null>(initialSlot);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Adding swaps the Add button for the slot pills (and Remove swaps back),
  // so the button that had focus is gone: move focus to its replacement
  // rather than letting it fall to the top of the page.
  const addRef = useRef<HTMLButtonElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    if (slot === null) addRef.current?.focus();
    else pillsRef.current?.querySelector<HTMLButtonElement>("[aria-pressed=true]")?.focus();
  }, [slot]);

  function save(next: Slot | null) {
    if (pending) return;
    start(async () => {
      setError(null);
      const res = await fetch("/api/regimen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regimenId === undefined ? { productId, slot: next } : { productId, slot: next, regimenId }),
      });
      if (res.ok) {
        refocus.current = (next === null) !== (slot === null);
        setSlot(next);
        router.refresh();
      } else {
        setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Couldn't save.");
      }
    });
  }

  if (slot === null) {
    return (
      <div className="space-y-2">
        <button
          ref={addRef}
          type="button"
          aria-disabled={pending || undefined}
          onClick={() => save(suggestedSlot)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 aria-disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Add to my regimen
        </button>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const pills = (
    <div ref={pillsRef} className="flex flex-wrap items-center gap-2" role="group" aria-label="When you use it">
      {SLOT_OPTIONS.map((o) => {
        const on = slot === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-disabled={pending || undefined}
            aria-pressed={on}
            onClick={() => !on && save(o.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors aria-disabled:opacity-60",
              on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            <o.icon className="h-3.5 w-3.5" /> {o.label}
          </button>
        );
      })}
      <button
        type="button"
        aria-disabled={pending || undefined}
        onClick={() => save(null)}
        className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline aria-disabled:opacity-60"
      >
        Remove
      </button>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-1">
        {pills}
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">In your regimen</p>
        <Link href="/regimen" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          View my regimen <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {pills}
      {suggestedReason && slot === suggestedSlot && <p className="text-xs text-muted-foreground">{suggestedReason}</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
