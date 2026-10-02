import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getPerson } from "@/lib/identity";
import { verifyUnsubscribeToken } from "@/lib/email-links";
import { maskEmail } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false },
  referrer: "no-referrer",
};

const LABEL = { checkins: "outcome check-in emails", safety: "safety alert (recall) emails" } as const;

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; error?: string }> }) {
  const { t, done, error } = await searchParams;

  if (done === "checkins" || done === "safety") {
    return (
      <Shell title="You're unsubscribed">
        <p>We won&apos;t send you any more {LABEL[done]}.</p>
        <Link href="/account" className="font-medium text-brand hover:underline">
          Change email settings →
        </Link>
      </Shell>
    );
  }

  const target = t ? verifyUnsubscribeToken(t, new Date()) : null;
  const person = target ? getPerson(target.personId) : null;
  if (!target || !person || error) {
    return (
      <Shell title="This link doesn't work">
        <p className="text-muted-foreground">
          It may be incomplete, or the email address was deleted. You can change what we send on the{" "}
          <Link href="/account" className="text-brand hover:underline">
            email settings
          </Link>{" "}
          page from a signed-in browser.
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="Unsubscribe">
      <form method="post" action={`/api/email/unsubscribe?t=${encodeURIComponent(t!)}`} className="space-y-4">
        <input type="hidden" name="confirm" value="1" />
        <p>
          Stop {LABEL[target.category]} to <span className="font-medium">{maskEmail(person.email)}</span>?
        </p>
        <Button type="submit" size="lg">
          Unsubscribe
        </Button>
      </form>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <PageHeader eyebrow="Email" title={title} />
      <div className="space-y-4">{children}</div>
    </div>
  );
}
