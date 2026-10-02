"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Eye, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Per-step state on a clinician plan. The step itself is read-only; these
// only record what the patient did with it.
export function PlanStepControls({
  regimenId,
  stepKey,
  hidden,
  done,
  have,
  rx,
}: {
  regimenId: number;
  stepKey: string;
  hidden: boolean;
  done: boolean;
  have: boolean;
  rx: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set(patch: { hidden?: boolean; done?: boolean; have?: boolean }) {
    start(async () => {
      setError(null);
      const res = await fetch("/api/regimens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "step", regimenId, stepKey, ...patch }),
      }).catch(() => null);
      if (!res?.ok) setError("Couldn't save.");
      else router.refresh();
    });
  }

  const pill = (on: boolean) =>
    cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
      on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
    );
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={pill(have)} aria-pressed={have} disabled={pending} onClick={() => set({ have: !have })}>
          <PackageCheck className="h-3.5 w-3.5" /> {rx ? "I've filled it" : "I have it"}
        </button>
        <button type="button" className={pill(done)} aria-pressed={done} disabled={pending} onClick={() => set({ done: !done })}>
          <Check className="h-3.5 w-3.5" /> Done for now
        </button>
        <button type="button" className={pill(false)} disabled={pending} onClick={() => set({ hidden: !hidden })}>
          {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {hidden ? "Show" : "Hide"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
