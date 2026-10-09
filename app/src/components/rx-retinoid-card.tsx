"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Moon, Pill, Sun, SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";

type Slot = "am" | "pm" | "both";

const SLOT_OPTIONS: { id: Slot; label: string; icon: typeof Sun }[] = [
  { id: "am", label: "Morning", icon: Sun },
  { id: "pm", label: "Night", icon: Moon },
  { id: "both", label: "Both", icon: SunMoon },
];

// "I also use a prescription retinoid": no product and no dosing, just when
// it's on the skin, so the regimen's retinoid cautions can account for it.
export function RxRetinoidCard({ regimenId, initialSlot }: { regimenId: number; initialSlot: Slot | null }) {
  const router = useRouter();
  const [slot, setSlot] = useState<Slot | null>(initialSlot);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(next: Slot | null) {
    start(async () => {
      setError(null);
      const res = await fetch("/api/regimens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regimenId, action: "rx-retinoid", slot: next }),
      });
      if (res.ok) {
        setSlot(next);
        router.refresh();
      } else {
        setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Couldn't save.");
      }
    });
  }

  return (
    <section aria-labelledby="rx-retinoid-title" className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <Pill className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <div className="space-y-1">
          <h2 id="rx-retinoid-title" className="text-base font-semibold">
            {slot ? "You use a prescription retinoid" : "Also using a prescription retinoid?"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Tretinoin, tazarotene or another retinoid from your doctor. Mark when you use it and the cautions on this page take it
            into account. Keep using it exactly as your prescriber told you; we don&apos;t give directions for prescription
            medicines.{" "}
            <Link href="/guide/prescription-retinoids" className="font-medium text-brand hover:underline">
              What usually pairs well with one
            </Link>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="When you use your prescription retinoid">
        {SLOT_OPTIONS.map((o) => {
          const on = slot === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={pending}
              aria-pressed={on}
              onClick={() => !on && save(o.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
                on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              <o.icon className="h-3.5 w-3.5" aria-hidden /> {o.label}
            </button>
          );
        })}
        {slot && (
          <button
            type="button"
            disabled={pending}
            onClick={() => save(null)}
            className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-60"
          >
            I don&apos;t use one
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
