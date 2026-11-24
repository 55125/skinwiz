"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { allergenCount, seriesForCount } from "@/lib/patch-test-reading";

// The patch-test tool's first question: how many allergens are on the
// panel? The size settles the series (35 is the T.R.U.E. Test, 90 the ACDS
// 2020 tray); 80 asks which tray. Other panel sizes aren't supported yet.
// Shown once per device; the answer becomes the default (lib/patch-test-reading
// saveDefaultSeries) and the series menu stays on the page to change it.
const QUICK = [35, 80, 90, 100];

export function SeriesCountDialog({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const [count, setCount] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose, count]);

  const matches = count === null ? [] : seriesForCount(count);
  // Settled by the size alone, or ask which tray.
  const choose = (n: number) => {
    const m = seriesForCount(n);
    if (m.length === 1) onPick(m[0].id);
    else setCount(n);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="series-count-h"
        className="w-full max-w-md space-y-4 rounded-2xl border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {count === null ? (
          <>
            <h2 id="series-count-h" className="text-lg font-semibold">
              How many allergens are on your panel?
            </h2>
            <p className="text-sm text-muted-foreground">We&apos;ll pick the matching series and remember it on this device.</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK.map((n) => (
                <Button key={n} type="button" variant="outline" className="h-auto flex-col gap-0 py-2" onClick={() => choose(n)}>
                  <span className="text-base font-semibold">{n}</span>
                  <span className="text-xs font-normal text-muted-foreground">{hint(n)}</span>
                </Button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 id="series-count-h" className="text-lg font-semibold">
              Which {count}-allergen tray?
            </h2>
            <div className="grid gap-2">
              {matches.map((s) => (
                <Button key={s.id} type="button" variant="outline" className="h-auto justify-between py-2 text-left" onClick={() => onPick(s.id)}>
                  <span className="font-medium">{s.short}</span>
                  <span className="text-xs font-normal text-muted-foreground">{allergenCount(s)} allergens</span>
                </Button>
              ))}
            </div>
            <Button type="button" variant="ghost" onClick={() => setCount(null)}>
              Back
            </Button>
          </>
        )}
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>You can change it any time with the Series menu.</p>
          <p>We do not support other panels at this time.</p>
        </div>
      </div>
    </div>
  );
}

function hint(n: number): string {
  const m = seriesForCount(n);
  return m.length === 1 ? m[0].short : m.length > 1 ? m.map((s) => s.short.replace(/ \(\d+\)$/, "")).join(" or ") : "";
}
