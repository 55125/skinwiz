"use client";

import { useMemo, useState } from "react";
import { Check, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PATCH_TEST_FAMILY as FAMILY_FOR, allergenLabel, parsePatchTestResults } from "@/db/contact-allergens";
import { cn } from "@/lib/utils";

const EXAMPLE = "Methylisothiazolinone 0.2% aq ++\nFragrance mix I 8% pet +\nAmerchol L-101 50% pet +\nQuaternium-15 2% pet negative";

// Turns a pasted patch-test results sheet into avoid-list picks: every line
// is matched against allergen names, label synonyms and series names, and
// shown for the visitor to confirm before anything is added.
export function PatchTestPaste({ onAdd, defaultOpen }: { onAdd: (ids: string[]) => void; defaultOpen?: boolean }) {
  const [text, setText] = useState("");
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<number | null>(null);

  const lines = useMemo(() => parsePatchTestResults(text), [text]);
  const rows = lines.map((l, i) => {
    const families = l.ids.flatMap((id) => (FAMILY_FOR[id] ? [FAMILY_FOR[id]] : []));
    return { ...l, key: `${i}:${l.line}`, family: families[0] };
  });
  const recognized = rows.filter((r) => r.ids.length > 0);
  const unknown = rows.filter((r) => r.ids.length === 0);

  const isOn = (key: string, byDefault: boolean) => (byDefault ? !unticked.has(key) : ticked.has(key));
  function flip(key: string, byDefault: boolean) {
    const set = byDefault ? setUnticked : setTicked;
    set((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const picked = [
    ...new Set(
      recognized.flatMap((r) => [
        ...(isOn(r.key, !r.negative) ? r.ids : []),
        ...(r.family && isOn(`${r.key}#family`, r.family.byDefault && !r.negative) ? [r.family.id] : []),
      ]),
    ),
  ];

  return (
    <details open={defaultOpen} className="group/pt rounded-2xl border border-brand/30 bg-brand-soft/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-brand">
          <ClipboardList className="h-4.5 w-4.5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Paste your patch-test results</span>
          <span className="block text-xs text-muted-foreground">
            Copy the list from your results sheet. We&apos;ll recognize patch-test, label and trade names.
          </span>
        </span>
      </summary>
      <div className="space-y-3 px-4 pb-4">
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setAdded(null);
          }}
          rows={6}
          placeholder={EXAMPLE}
          aria-label="Patch-test results"
          className="bg-card"
        />
        {recognized.length > 0 && (
          <ul className="space-y-1.5" aria-label="Recognized allergens">
            {recognized.map((r) => (
              <li key={r.key} className="space-y-1">
                <Tick on={isOn(r.key, !r.negative)} onToggle={() => flip(r.key, !r.negative)}>
                  <span className="font-medium">{r.ids.map(allergenLabel).join(" + ")}</span>
                  <span className="text-xs text-muted-foreground"> — from &ldquo;{r.line}&rdquo;</span>
                  {r.negative && <span className="text-xs text-muted-foreground"> (reads as negative)</span>}
                </Tick>
                {r.family && (
                  <div className="pl-7">
                    <Tick on={isOn(`${r.key}#family`, r.family.byDefault && !r.negative)} onToggle={() => flip(`${r.key}#family`, r.family!.byDefault && !r.negative)} small>
                      Also avoid {allergenLabel(r.family.id)}
                    </Tick>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {unknown.length > 0 && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Not on our list: {unknown.map((u) => u.line).join("; ")}. Some are allergens we don&apos;t track (rubber
            accelerators, textile dyes), so check labels for these yourself.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={picked.length === 0}
            onClick={() => {
              onAdd(picked);
              setAdded(picked.length);
            }}
            className="rounded-full"
          >
            Add {picked.length || ""} to my list
          </Button>
          {added !== null && (
            <span className="flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Added {added} and saved
            </span>
          )}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Untick anything your dermatologist didn&apos;t call relevant. Nothing you paste leaves this page; only the
          allergens you add are saved, in this browser.
        </p>
      </div>
    </details>
  );
}

function Tick({ on, onToggle, small, children }: { on: boolean; onToggle: () => void; small?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2", small ? "text-xs" : "text-sm")}>
      <input type="checkbox" className="sr-only" checked={on} onChange={onToggle} />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex shrink-0 items-center justify-center rounded border",
          small ? "h-4 w-4" : "h-5 w-5",
          on ? "border-primary bg-primary text-primary-foreground" : "bg-background",
        )}
      >
        {on && <Check className="h-3 w-3" />}
      </span>
      <span>{children}</span>
    </label>
  );
}
