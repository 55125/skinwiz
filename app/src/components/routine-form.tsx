"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductPicker } from "@/components/product-picker";

type ProductResult = { id: string; brandName: string; manufacturer: string | null };
type StepInput = { description: string; product: ProductResult | null };

export function RoutineForm({ concerns }: { concerns: { id: string; name: string }[] }) {
  const router = useRouter();
  const [concernId, setConcernId] = useState(concerns[0]?.id ?? "");
  const [steps, setSteps] = useState<StepInput[]>([
    { description: "", product: null },
    { description: "", product: null },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateStep(i: number, value: string) {
    setSteps((s) => s.map((step, idx) => (idx === i ? { ...step, description: value } : step)));
  }

  function updateStepProduct(i: number, product: ProductResult | null) {
    setSteps((s) => s.map((step, idx) => (idx === i ? { ...step, product } : step)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get("title"),
      authorName: formData.get("authorName"),
      notes: formData.get("notes"),
      concernId,
      steps: steps.map((s) => ({ description: s.description, productId: s.product?.id ?? null })),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.push(`/routines/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Routine name</Label>
        <Input id="title" name="title" required placeholder="e.g. Simple morning routine for oily skin" />
      </div>

      <div className="space-y-1.5">
        <Label>Concern</Label>
        <Select value={concernId} onValueChange={(value) => value && setConcernId(value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a concern" />
          </SelectTrigger>
          <SelectContent>
            {concerns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Steps</Label>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="space-y-1 rounded-md border p-2">
              <div className="flex gap-2">
                <Input
                  value={step.description}
                  onChange={(e) => updateStep(i, e.target.value)}
                  placeholder={`Step ${i + 1} — e.g. Cleanser: CeraVe Hydrating Cleanser`}
                  className="border-0 px-1 shadow-none focus-visible:ring-0"
                />
                {steps.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSteps((s) => s.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <ProductPicker selected={step.product} onSelect={(p) => updateStepProduct(i, p)} />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSteps((s) => [...s, { description: "", product: null }])}
        >
          <Plus className="h-3.5 w-3.5" /> Add step
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Anything else worth knowing about this routine" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="authorName">Your name (optional)</Label>
        <Input id="authorName" name="authorName" placeholder="Leave blank to post anonymously" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Posting..." : "Post routine"}
      </Button>
    </form>
  );
}
