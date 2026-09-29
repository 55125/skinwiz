"use client";

import { useState } from "react";
import { LIMITS } from "@/lib/limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function RaterApplicationForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/rater-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong.");
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
        Thanks — we&apos;ll follow up by email once we&apos;re ready to verify board certification and NPI
        for the panel.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required maxLength={LIMITS.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required maxLength={LIMITS.email} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="credential">Board certification (ABD/AOBD) and NPI</Label>
        <Input id="credential" name="credential" maxLength={LIMITS.credential} placeholder="e.g. ABD-certified, NPI 1234567890" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Anything else</Label>
        <Textarea id="message" name="message" rows={3} maxLength={LIMITS.message} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending..." : "Request to join the panel"}
      </Button>
    </form>
  );
}
