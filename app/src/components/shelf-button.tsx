"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Bookmark, Check, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "own" | "want" | "empty" | null;

export function ShelfButton({ productId, initialStatus, initialOpened }: { productId: string; initialStatus: Status; initialOpened: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [opened, setOpened] = useState(initialOpened);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(next: Status, nextOpened: boolean) {
    start(async () => {
      setError(null);
      const res = await fetch("/api/shelf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, status: next, opened: nextOpened }),
      });
      if (res.ok) {
        setStatus(next);
        setOpened(nextOpened);
        router.refresh();
      } else {
        setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Couldn't save.");
      }
    });
  }

  const options: { id: Exclude<Status, null>; label: string; icon: typeof Check }[] = [
    { id: "own", label: "I own this", icon: Check },
    { id: "want", label: "Want it", icon: Bookmark },
    { id: "empty", label: "Finished it", icon: Archive },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = status === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={pending}
              aria-pressed={on}
              onClick={() => save(on ? null : o.id, o.id === "own" ? opened : false)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
                on ? "border-brand/50 bg-brand-soft text-brand-foreground" : "bg-card hover:bg-muted",
              )}
            >
              <o.icon className="h-3.5 w-3.5" /> {o.label}
            </button>
          );
        })}
        {status === "own" && (
          <button
            type="button"
            disabled={pending}
            aria-pressed={opened}
            onClick={() => save("own", !opened)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
              opened ? "border-brand/50 bg-brand-soft text-brand-foreground" : "bg-card hover:bg-muted",
            )}
          >
            <PackageOpen className="h-3.5 w-3.5" /> {opened ? "In use" : "Unopened"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
