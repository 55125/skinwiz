"use client";

import { useState } from "react";
import { Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// "Email this to me" on the patient's QR page: one email with this list's
// link, to an address the patient types. Nothing is saved; for an account
// that keeps the list, there's the sign-in card below it.
export function EmailListToMe({ a, d, n, c }: { a: string; d?: string; n?: string; c?: "1" }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-brand" aria-hidden /> Sent. Check your inbox for &ldquo;Your skin allergy list.&rdquo;
      </p>
    );
  }
  if (!open) {
    return (
      <Button type="button" variant="outline" className="rounded-full" data-track="avoid-import:email-open" onClick={() => setOpen(true)}>
        <Mail className="h-4 w-4" /> Email this list to me
      </Button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const res = await fetch("/api/avoid/email-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, a, d, n, c }),
    }).catch(() => null);
    if (res?.ok) {
      setState("sent");
      return;
    }
    const body = res ? ((await res.json().catch(() => null)) as { error?: string } | null) : null;
    setError(body?.error ?? "Couldn't send right now. Try again in a minute.");
    setState("idle");
  }

  return (
    <form onSubmit={submit} className="space-y-2" data-track="avoid-import:email-form">
      <label className="block max-w-sm space-y-1 text-sm">
        <span className="font-medium">Your email</span>
        <div className="flex gap-2">
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" disabled={state === "sending"} data-track="avoid-import:email-send">
            {state === "sending" ? "Sending…" : "Send"}
          </Button>
        </div>
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">We send one email with this page&apos;s link and don&apos;t keep your address.</p>
    </form>
  );
}
