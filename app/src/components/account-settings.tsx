"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Prefs = { checkinsEnabled: boolean; safetyAlertsEnabled: boolean };

export function AccountSettings({ email, initial }: { email: string; initial: Prefs }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Something went wrong. Please try again.");
      return null;
    }
    return res.json();
  }

  async function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    const data = await call("/api/account", "PATCH", { [key]: next[key] });
    if (data) setPrefs({ checkinsEnabled: data.checkinsEnabled, safetyAlertsEnabled: data.safetyAlertsEnabled });
  }

  async function signOut() {
    if (await call("/api/account/signout", "POST")) {
      router.push("/regimen");
      router.refresh();
    }
  }

  async function deleteAll() {
    if (await call("/api/account", "DELETE")) {
      router.push("/account?deleted=1");
      router.refresh();
    }
  }

  const row = (key: keyof Prefs, title: string, text: string) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[var(--brand)]"
        checked={prefs[key]}
        disabled={busy}
        onChange={() => toggle(key)}
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Email</h2>
        <p className="text-sm">
          Your shelf is saved to <span className="font-medium">{email}</span>. To use a different address, sign out
          and save your shelf again with the new one.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What we send</h2>
        {row(
          "checkinsEnabled",
          "Outcome check-ins",
          "A one-tap question at 2, 4, 8 and 12 weeks after you mark a product as opened. Your 8-week answer counts toward that product's User Score.",
        )}
        {row("safetyAlertsEnabled", "Safety alerts", "An email when the FDA recalls a product on your shelf (owned or wanted). Once per recall.")}
        <p className="text-xs text-muted-foreground">The one-time sign-in link is the only other email we send.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">This device</h2>
        <p className="text-sm text-muted-foreground">
          Signing out leaves your shelf saved to your email; this browser starts empty until you sign in again.
        </p>
        <Button variant="outline" disabled={busy} onClick={signOut}>
          Sign out on this device
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-red-200 p-4 dark:border-red-900">
        <h2 className="text-lg font-semibold">Delete my email and data</h2>
        <p className="text-sm text-muted-foreground">
          Permanently deletes your email address, your shelf, regimen, outcome answers and check-ins (they leave the
          User Score), votes, reports and any routines you posted, on every device. This can&apos;t be undone.
        </p>
        {confirmDelete ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" disabled={busy} onClick={deleteAll}>
              Yes, delete everything
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="outline" disabled={busy} onClick={() => setConfirmDelete(true)}>
            Delete my email and data…
          </Button>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
