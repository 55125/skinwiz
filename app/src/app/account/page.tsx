import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AccountSettings } from "@/components/account-settings";
import { EmailSignupCard } from "@/components/email-signup-card";
import { readDeviceSessionId } from "@/lib/session";
import { personForSession } from "@/lib/identity";

export const metadata: Metadata = {
  title: "Email settings",
  description: "Your optional email: check-ins, safety alerts, sign-out and deletion.",
  robots: { index: false },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string; deleted?: string }> }) {
  const { welcome, deleted } = await searchParams;
  const device = await readDeviceSessionId();
  const person = device ? personForSession(device) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <PageHeader eyebrow="Your email" title="Email settings" />
      {welcome && person && (
        <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Email confirmed. Your shelf is saved to it — open the same kind of link on another device to see it there.{" "}
          <Link href="/shelf" className="font-medium underline">
            Go to my shelf →
          </Link>
        </p>
      )}
      {deleted && !person && (
        <p role="status" className="rounded-xl border bg-muted/40 p-4 text-sm">
          Deleted. Your email address and everything saved with it are gone, and this browser has a fresh, empty
          session.
        </p>
      )}
      {person ? (
        <AccountSettings
          email={person.email}
          initial={{ checkinsEnabled: person.checkinsEnabled, safetyAlertsEnabled: person.safetyAlertsEnabled }}
        />
      ) : (
        <EmailSignupCard signedInAs={null} />
      )}
      <p className="text-xs text-muted-foreground">
        How we handle your email: <Link href="/privacy#email" className="underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
