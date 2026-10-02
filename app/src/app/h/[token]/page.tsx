import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/feature-flags";
import { readSessionId } from "@/lib/session";
import { findInstance, isExpiredUnclaimed, ownsInstance, recordOpen } from "@/lib/handouts";
import { regimenForInstance } from "@/lib/regimens";
import { SITE_NAME } from "@/lib/brand";

// The QR / short URL printed on a clinician's handout. Shows NO plan
// content to anyone but its owner:
//  - unclaimed: who it's from and a "Save my plan" button (the POST claims it
//    for this browser -- a link preview fetching this page claims nothing);
//  - claimed by this visitor (any of their signed-in devices): straight to
//    their plan;
//  - claimed by someone else, expired or unknown: a neutral page.
export const metadata: Metadata = {
  title: "Your skincare plan",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function HandoutClaimPage({ params }: { params: Promise<{ token: string }> }) {
  if (!FEATURES.HANDOUTS) notFound();
  const { token } = await params;
  const found = findInstance(token);
  const now = new Date();
  if (!found) return <Neutral title="This link isn't valid" body="Check the address on your handout, or scan the QR code again." />;
  const { instance, version } = found;
  recordOpen(instance.id);

  if (instance.claimedAt) {
    const sessionId = await readSessionId();
    if (ownsInstance(instance, sessionId)) {
      const regimen = regimenForInstance(sessionId!, instance.id);
      if (regimen) redirect(`/regimen?r=${regimen.id}`);
      // Owner removed it from their list: offer to restore it (same POST).
      return <SaveForm token={token} clinicName={version.clinicName} restore />;
    }
    return (
      <Neutral
        title="This plan has already been saved"
        body="Each printed plan can be saved once, and it stays private to whoever saved it. If it's yours, sign in with the email you saved it under."
        signIn
      />
    );
  }
  if (isExpiredUnclaimed(instance, now)) {
    return <Neutral title="This link has expired" body="Printed plans can be saved for 90 days. Ask your clinic for a new copy." />;
  }
  return <SaveForm token={token} clinicName={version.clinicName} />;
}

function SaveForm({ token, clinicName, restore = false }: { token: string; clinicName: string; restore?: boolean }) {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand">From {clinicName}</p>
      <h1 className="text-3xl font-semibold">{restore ? "Restore your skincare plan" : "Your skincare plan"}</h1>
      <p className="text-muted-foreground">
        Save the plan your clinician printed for you to {SITE_NAME}: your steps morning and night, their directions, and when to call them.
      </p>
      <form method="post" action="/api/handouts/claim" className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" size="lg" className="w-full rounded-full">
          {restore ? "Restore my plan" : "Save my plan"}
        </Button>
      </form>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          Private to you: once saved, this link only opens on this browser, or on devices where you sign in with the email you add.
        </li>
        <li className="flex gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          No account needed. Your clinic doesn&apos;t see what you do here, and we don&apos;t know your name.
        </li>
      </ul>
    </div>
  );
}

function Neutral({ title, body, signIn = false }: { title: string; body: string; signIn?: boolean }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      {signIn && (
        <Link href="/account" className="font-medium text-brand hover:underline">
          Sign in with your email →
        </Link>
      )}
    </div>
  );
}
