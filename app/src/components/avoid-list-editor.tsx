"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FREE_FROM_CHECKS } from "@/db/ingredient-flags";
import { cn } from "@/lib/utils";

export function AvoidListEditor({ initialIds }: { initialIds: string[] }) {
  const router = useRouter();
  const [ids, setIds] = useState<Set<string>>(new Set(initialIds));
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      const res = await fetch("/api/avoid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...ids] }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  const groups = [
    { title: "Common preferences", items: FREE_FROM_CHECKS.filter((c) => c.category === "clean") },
    { title: "Common contact-dermatitis allergens", items: FREE_FROM_CHECKS.filter((c) => c.category === "contact-allergen") },
  ];

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <fieldset key={group.title} className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((c) => {
              const on = ids.has(c.id);
              return (
                <label
                  key={c.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors",
                    on ? "border-brand/50 bg-brand-soft" : "bg-card hover:bg-muted",
                  )}
                >
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(c.id)} />
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      on ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                    )}
                  >
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-medium">{c.label.replace(/-free$/, "")}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saved || isPending} className="rounded-full px-5">
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            `Save ${ids.size} ${ids.size === 1 ? "ingredient" : "ingredients"}`
          )}
        </Button>
        {ids.size === 0 && !saved && <p className="text-sm text-muted-foreground">Saving with nothing selected clears your list.</p>}
      </div>
    </div>
  );
}
