"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductPicker } from "@/components/product-picker";
import { Button } from "@/components/ui/button";

type P = { id: string; brandName: string; manufacturer: string | null };

export function ComparePicker({ initialA, initialB }: { initialA: P | null; initialB: P | null }) {
  const router = useRouter();
  const [a, setA] = useState<P | null>(initialA);
  const [b, setB] = useState<P | null>(initialB);
  const missing = !a && !b ? "Pick two products to compare." : !a || !b ? "Pick one more product." : null;
  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">First product</p>
          <ProductPicker selected={a} onSelect={setA} size="field" label="First product" placeholder="Search by name or brand" />
        </div>
        <span className="hidden pb-2.5 text-sm text-muted-foreground sm:block">vs.</span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Second product</p>
          <ProductPicker selected={b} onSelect={setB} size="field" label="Second product" placeholder="Search by name or brand" />
        </div>
        <Button
          className="h-10"
          aria-disabled={!a || !b}
          onClick={() => a && b && router.push(`/compare?a=${encodeURIComponent(a.id)}&b=${encodeURIComponent(b.id)}`)}
        >
          Compare
        </Button>
      </div>
      {missing && (
        <p role="status" className="text-xs text-muted-foreground">
          {missing}
        </p>
      )}
    </div>
  );
}
