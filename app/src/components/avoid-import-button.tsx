"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// The one button on the import page: merges the imported ids into the
// avoid list server-side (the cookie is the source of truth, so nothing on
// the list is dropped), then points at what to do next. With `auto` (a list
// from a clinic tool) it adds on arrival instead of waiting for a tap, and
// offers Undo for just what it added.
export function AvoidImportButton({
  ids,
  notOnLabel = [],
  allPresent,
  auto = false,
}: {
  ids: string[];
  notOnLabel?: string[];
  allPresent: boolean;
  auto?: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = useState<{
    merged: string[];
    added: number;
    addedIds: string[];
    addedOff: string[];
    keptOff: string[];
  } | null>(null);
  const [error, setError] = useState(false);
  const [undone, setUndone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const tried = useRef(false);
  useEffect(() => {
    if (!auto || allPresent || tried.current) return;
    tried.current = true;
    save();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, [auto, allPresent]);

  function undo() {
    if (!result) return;
    startTransition(async () => {
      const ok1 = await fetch("/api/avoid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: result.merged.filter((id) => !result.addedIds.includes(id)),
        }),
      }).then(
        (r) => r.ok,
        () => false,
      );
      const ok2 =
        result.addedOff.length === 0 ||
        (await fetch("/api/avoid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notOnLabel: result.keptOff }),
        }).then(
          (r) => r.ok,
          () => false,
        ));
      if (!ok1 || !ok2) {
        setError(true);
        return;
      }
      setResult(null);
      setUndone(true);
      router.refresh();
    });
  }

  function save() {
    setError(false);
    startTransition(async () => {
      const res = await fetch("/api/avoid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ add: ids, addNotOnLabel: notOnLabel }),
      }).catch(() => null);
      const body = res?.ok ? await res.json().catch(() => null) : null;
      if (!body?.ok) {
        setError(true);
        return;
      }
      const addedOff: string[] = body.addedNotOnLabel ?? [];
      setResult({
        merged: body.ids,
        added: body.added.length + addedOff.length,
        addedIds: body.added,
        addedOff,
        keptOff: (body.notOnLabel ?? []).filter(
          (id: string) => !addedOff.includes(id),
        ),
      });
      router.refresh();
    });
  }

  if (auto && !result && !allPresent && !error && !undone) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Adding these to your avoid list…
      </p>
    );
  }

  if ((result || allPresent) && !undone) {
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
          {browseIds.length > 0 && (
            <Link
              href={`/browse?free=${browseIds.join(",")}`}
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Browse products without them
            </Link>
          )}
          <Link
            href="/avoid"
            className="inline-flex items-center rounded-full border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            See my full list
          </Link>
          {auto && result && result.added > 0 && (
            <button
              type="button"
              onClick={undo}
              disabled={isPending}
              className="px-2 text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              {isPending ? "Undoing…" : "Undo"}
            </button>
          )}
        </div>
        {auto && result && result.added > 0 && (
          <p className="text-xs text-muted-foreground">
            Added for you from your dermatologist&apos;s results. Saved in this
            browser, and to your account if you&apos;re signed in.
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive">
            That didn&apos;t save. Check your connection and try again.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {undone && (
        <p className="text-sm text-muted-foreground">
          Removed what was just added. Add them again any time.
        </p>
      )}
      <Button
        type="button"
        size="lg"
        onClick={() => {
          setUndone(false);
          save();
        }}
        disabled={isPending}
        className="w-full rounded-full sm:w-auto sm:px-8"
      >
        <Plus className="h-4 w-4" />{" "}
        {isPending ? "Adding…" : "Add to my avoid list"}
      </Button>
      {error && (
        <p className="text-sm text-destructive">
          That didn&apos;t save. Check your connection and try again.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Saved in this browser, and to your account if you&apos;re signed in. No
        account needed; you can edit or clear it any time.
      </p>
    </div>
  );
}
