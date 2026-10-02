"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatchTestChecklist } from "@/components/patch-test-checklist";
import { importItemName } from "@/db/patch-test-series";
import { MAX_LIST_NAME } from "@/lib/clinician-list-limits";

export type StarterList = { id: string; name: string; ids: string[] };

// The practice's saved avoid lists, with an inline editor built on the same
// checklist as the patch-test sheet.
export function StarterLists({ lists }: { lists: StarterList[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; name: string; ids: Set<string> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function post(body: object, after: () => void) {
    start(async () => {
      setError(null);
      const res = await fetch("/api/clinicians/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => null);
      const out = ((await res?.json().catch(() => null)) ?? {}) as { error?: string };
      if (!res?.ok) {
        setError(out.error ?? "Couldn't save. Please try again.");
        return;
      }
      after();
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="space-y-4 rounded-2xl border bg-card p-4">
        <label className="block max-w-md space-y-1 text-sm">
          <span className="font-medium">List name</span>
          <Input
            value={editing.name}
            maxLength={MAX_LIST_NAME}
            placeholder="e.g. Fragrance-allergic starter"
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          />
        </label>
        <PatchTestChecklist selected={editing.ids} onChange={(ids) => setEditing({ ...editing, ids })} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={pending || !editing.name.trim() || editing.ids.size === 0}
            onClick={() => post({ id: editing.id, name: editing.name, ids: [...editing.ids] }, () => setEditing(null))}
          >
            {pending ? "Saving…" : `Save list (${editing.ids.size})`}
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lists.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          No lists yet. Save the avoid lists you give often (for example &ldquo;Fragrance-allergic starter&rdquo; or &ldquo;Hair dye
          (PPD)&rdquo;) and issue them in one click from the patch-test sheet or a handout.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {lists.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{l.name}</p>
                <p className="truncate text-xs text-muted-foreground">{l.ids.map((id) => importItemName(id) ?? id).join(", ")}</p>
              </div>
              <Link href={`/for-clinicians/patch-test?list=${l.id}`} className="text-sm font-medium text-brand hover:underline">
                Issue sheet
              </Link>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing({ id: l.id, name: l.name, ids: new Set(l.ids) })}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  if (confirm(`Delete "${l.name}"? Sheets and QR codes already given out keep working.`)) post({ action: "delete", id: l.id }, () => {});
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" onClick={() => setEditing({ id: null, name: "", ids: new Set() })}>
        <Plus className="h-4 w-4" /> New list
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
