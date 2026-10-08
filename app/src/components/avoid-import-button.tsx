"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// The one button on the import page: merges the imported ids into the
// avoid list server-side (the cookie is the source of truth, so nothing on
// the list is dropped), then points at what to do next.
export function AvoidImportButton({ ids, allPresent }: { ids: string[]; allPresent: boolean }) {
  const router = useRouter();
  const [result, setResult] = useState<{ merged: string[]; added: number } | null>(null);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(false);
    startTransition(async () => {
      const res = await fetch("/api/avoid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ add: ids }),
      }).catch(() => null);
      const body = res?.ok ? await res.json().catch(() => null) : null;
      if (!body?.ok) {
        setError(true);
        return;
      }
      setResult({ merged: body.ids, added: body.added.length });
      router.refresh();
    });
  }

  if (result || allPresent) {
    const browseIds = result?.merged ?? ids;
    return (
      <div className="space-y-3 rounded-2xl border border-emerald-600/30 bg-emerald-50 p-4 dark:bg-emerald-950/30">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
          <Check className="h-4 w-4" />
          {result
            ? result.added > 0
              ? `Added ${result.added} to your avoid list.`
              : "Everything here was already on your avoid list."
            : "Everything here is already on your avoid list."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/browse?free=${browseIds.join(",")}`}
            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Browse products without them
          </Link>
          <Link href="/avoid" className="inline-flex items-center rounded-full border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">
            See my full list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button type="button" size="lg" onClick={save} disabled={isPending} className="w-full rounded-full sm:w-auto sm:px-8">
        <Plus className="h-4 w-4" /> {isPending ? "Adding…" : "Add to my avoid list"}
      </Button>
      {error && <p className="text-sm text-destructive">That didn&apos;t save. Check your connection and try again.</p>}
      <p className="text-xs text-muted-foreground">Saved in this browser, and to your account if you&apos;re signed in. No account needed; you can edit or clear it any time.</p>
    </div>
  );
}
