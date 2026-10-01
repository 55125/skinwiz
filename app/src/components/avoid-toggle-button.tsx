"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Adds one id to (or removes it from) the visitor's avoid list in place,
// without a trip to /avoid. `avoidIds` is the list as the server read it.
export function AvoidToggleButton({ id, avoidIds, size = "sm" }: { id: string; avoidIds: string[]; size?: "sm" | "default" }) {
  const router = useRouter();
  const [on, setOn] = useState(avoidIds.includes(id));
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = on ? avoidIds.filter((x) => x !== id) : [...new Set([...avoidIds, id])];
    startTransition(async () => {
      const res = await fetch("/api/avoid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next }),
      });
      if (res.ok) {
        setOn(!on);
        router.refresh();
      }
    });
  }

  return (
    <Button type="button" size={size} variant={on ? "default" : "outline"} onClick={toggle} disabled={isPending} className="shrink-0 rounded-full">
      {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      {on ? "On my avoid list" : "Avoid"}
    </Button>
  );
}
