"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIMITS } from "@/lib/limits";

// "Save your shelf & get alerts": optional email via a one-time link. When
// the browser is already linked, collapses to a one-line status.
export function EmailSignupCard({
  signedInAs,
  next,
  title = "Save your shelf & get alerts",
  blurb = "Optional. Add an email to keep your shelf on any device, get a short check-in at 2, 4, 8 and 12 weeks after you open a product, and hear about FDA recalls of anything on your shelf. No password; we send a one-time link.",
}: {
  signedInAs: string | null;
  /** Where the emailed link lands after confirming (allow-listed server-side). */
  next?: string;
  title?: string;
  blurb?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (signedInAs) {
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Mail className="h-4 w-4 text-brand" aria-hidden />
        Saved to <span className="font-medium text-foreground">{signedInAs}</span> ·
        <Link href="/account" className="font-medium text-brand hover:underline">
          Email settings
        </Link>
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const res = await fetch("/api/email/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next ? { email, next } : { email }),
    }).catch(() => null);
    if (res?.ok) {
      setState("sent");
      return;
    }
    setState("idle");
    setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Couldn't send the link. Please try again.");
  }

  return (
    <section aria-labelledby="email-card-title" className="space-y-3 rounded-2xl border bg-gradient-to-br from-brand-soft/50 to-card p-5">
      <div className="space-y-1">
        <h2 id="email-card-title" className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-brand" aria-hidden /> {title}
        </h2>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </div>
      {state === "sent" ? (
        <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Check your inbox for a link from us. It works once and expires in 15 minutes.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="email-card-input" className="sr-only">
            Email address
          </label>
          <Input
            id="email-card-input"
            type="email"
            required
            autoComplete="email"
            maxLength={LIMITS.email}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Email me a link"}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        We only email about your shelf. Turn any of it off or delete everything at any time.{" "}
        <Link href="/privacy#email" className="underline">
          Privacy
        </Link>
      </p>
    </section>
  );
}
