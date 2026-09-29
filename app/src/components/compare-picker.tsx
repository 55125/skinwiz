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
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex-1">
        <ProductPicker selected={a} onSelect={setA} />
      </div>
      <span className="text-sm text-muted-foreground">vs.</span>
      <div className="flex-1">
        <ProductPicker selected={b} onSelect={setB} />
      </div>
      <Button
        disabled={!a || !b}
        onClick={() => a && b && router.push(`/compare?a=${encodeURIComponent(a.id)}&b=${encodeURIComponent(b.id)}`)}
      >
        Compare
      </Button>
    </div>
  );
}
