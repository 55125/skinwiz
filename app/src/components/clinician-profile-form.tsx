"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ProfileDefaults = { npi: string; lastName: string; clinicName: string; clinicPhone: string; clinicWebsite: string };

// NPI + clinic details. The server checks the NPI against the public NPPES
// registry; nothing here is about patients.
export function ClinicianProfileForm({ initial, submitLabel = "Verify and save" }: { initial: ProfileDefaults; submitLabel?: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const set = (k: keyof ProfileDefaults) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      setError(null);
      setMessage(null);
      const res = await fetch("/api/clinicians/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      }).catch(() => null);
      const body = ((await res?.json().catch(() => null)) ?? {}) as { error?: string; message?: string; verified?: boolean };
      if (!res?.ok) {
        setError(body.error ?? "Couldn't save. Please try again.");
        return;
      }
      setMessage(body.verified ? "Verified and saved." : body.message ?? "Saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="NPI (10 digits)" hint="Your individual (Type 1) NPI.">
          <Input value={v.npi} onChange={set("npi")} inputMode="numeric" autoComplete="off" maxLength={12} required />
        </Field>
        <Field label="Last name" hint="As it appears in the NPPES registry.">
          <Input value={v.lastName} onChange={set("lastName")} autoComplete="family-name" maxLength={60} required />
        </Field>
        <Field label="Clinic name" hint="Printed on handouts and shown to patients.">
          <Input value={v.clinicName} onChange={set("clinicName")} autoComplete="organization" maxLength={80} required />
        </Field>
        <Field label="Clinic phone (optional)" hint="For the 'stop and call us' box.">
          <Input value={v.clinicPhone} onChange={set("clinicPhone")} autoComplete="tel" maxLength={30} />
        </Field>
        <Field label="Clinic website (optional)">
          <Input value={v.clinicWebsite} onChange={set("clinicWebsite")} autoComplete="url" maxLength={120} />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        NPI verification confirms you are a licensed prescriber; it is not board certification. We check the number against the public
        NPPES registry and store your registry name, credential, primary specialty and state.
      </p>
      <p className="text-xs text-muted-foreground">
        By saving, you confirm this NPI is your own and agree to the{" "}
        <a href="/terms#clinic-tools" className="underline underline-offset-2">
          terms for clinic tools
        </a>
        : you stay responsible for what you hand out, never type patient details into a handout, and know that the
        patient&apos;s view may include affiliate links for over-the-counter products.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : submitLabel}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </p>
      )}
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
