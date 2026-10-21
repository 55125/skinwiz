"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The ingredient page's main call to action: puts the avoid id the ingredient
// stands for (its contact allergen, or the free-from check it breaks) on the
// visitor's list in place. `coveredBy` names a family already on the list
// that includes it, which this button can't take off on its own.
export function IngredientAvoidButton({
  id,
  avoidIds,
  adds,
  coveredBy,
}: {
  id: string;
  avoidIds: string[];
  /** What goes on the list, when that's broader than this ingredient ("fragrance"). */
  adds?: string;
  coveredBy?: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(avoidIds.includes(id));
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (isPending) return;
    // Adding merges server-side, so a stale page can't drop anything.
    const body = on ? { ids: avoidIds.filter((x) => x !== id) } : { add: [id] };
    startTransition(async () => {
      const res = await fetch("/api/avoid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setOn(!on);
        router.refresh();
      }
    });
  }

  const wrap = "flex w-full flex-col gap-1.5 md:w-auto md:items-end";
  const big = "h-11 w-full rounded-full px-5 text-base md:w-auto [&_svg]:size-4.5";

  if (coveredBy && !on) {
    return (
      <div className={wrap}>
        <span className={cn(big, "inline-flex items-center justify-center gap-2 border border-brand/50 bg-brand-soft font-medium text-brand-foreground")}>
          <Check />
          On your avoid list
        </span>
        <p className="text-center text-xs text-muted-foreground md:text-right">
          Covered by {coveredBy}.{" "}
          <Link href="/avoid" className="underline hover:text-foreground">
            Edit your list
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={wrap}>
      <Button
        type="button"
        size="lg"
        variant={on ? "outline" : "default"}
        onClick={toggle}
        aria-pressed={on}
        aria-disabled={isPending || undefined}
        className={cn(big, "aria-disabled:opacity-60", on && "border-brand/50 bg-brand-soft text-brand-foreground hover:bg-brand-soft/70")}
      >
        {on ? <Check /> : <Plus />}
        {on ? "On your avoid list" : "Add to avoid list"}
      </Button>
      <p className="text-center text-xs text-muted-foreground md:text-right">
        {on ? "Products with it are flagged. Tap again to remove." : adds ? `Adds ${adds} to your list.` : "Flags every product that lists it."}
      </p>
    </div>
  );
}
