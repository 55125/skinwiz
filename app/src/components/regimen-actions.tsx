"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Star, Trash2 } from "lucide-react";

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; regimenId?: number; skipped?: number; error?: string }> {
  const res = await fetch("/api/regimens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const json = ((await res?.json().catch(() => null)) ?? {}) as { regimenId?: number; skipped?: number; error?: string };
  return { ok: !!res?.ok, ...json };
}

// Small actions on one regimen in the visitor's list.
export function RegimenActions({
  regimenId,
  kind,
  active,
  name,
}: {
  regimenId: number;
  kind: "own" | "clinician";
  active: boolean;
  name: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function run(body: Record<string, unknown>, after?: (r: Awaited<ReturnType<typeof post>>) => void) {
    start(async () => {
      setError(null);
      const r = await post({ regimenId, ...body });
      if (!r.ok) {
        setError(r.error ?? "Couldn't save.");
        return;
      }
      after?.(r);
      router.refresh();
    });
  }

  const btn = "inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60";
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {!active && (
          <button type="button" className={btn} disabled={pending} onClick={() => run({ action: "activate" })}>
            <Star className="h-3.5 w-3.5" /> Open this one by default
          </button>
        )}
        {kind === "clinician" && (
          <button
            type="button"
            className={btn}
            disabled={pending}
            onClick={() =>
              run({ action: "copy" }, (r) => {
                if (r.regimenId) router.push(`/regimen?r=${r.regimenId}${r.skipped ? `&skipped=${r.skipped}` : ""}`);
              })
            }
          >
            <Copy className="h-3.5 w-3.5" /> Make a personal copy
          </button>
        )}
        {kind === "own" && (
          <button
            type="button"
            className={btn}
            disabled={pending}
            onClick={() => {
              const next = window.prompt("Name this regimen", name)?.trim();
              if (next) run({ action: "rename", name: next });
            }}
          >
            <Pencil className="h-3.5 w-3.5" /> Rename
          </button>
        )}
        <button
          type="button"
          className={btn}
          disabled={pending}
          onClick={() => {
            const msg =
              kind === "clinician"
                ? "Remove this plan from your list? Scanning the QR on your printed handout again brings it back."
                : "Delete this regimen and its products? This can't be undone.";
            if (window.confirm(msg)) run({ action: "delete" }, () => setNote("Removed."));
          }}
        >
          <Trash2 className="h-3.5 w-3.5" /> {kind === "clinician" ? "Remove plan" : "Delete"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
