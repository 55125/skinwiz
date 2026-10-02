import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { peekSignInToken } from "@/lib/identity";
import { maskEmail } from "@/lib/tokens";
import { safeNextPath } from "@/lib/email-links";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false },
  referrer: "no-referrer",
};

// The emailed link lands here. Opening it changes nothing (link scanners
// prefetch email links); the button posts to /api/email/verify, which uses up
// the one-time token. Showing the address lets someone notice a link that
// isn't for them before their shelf is merged into it.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string; next?: string }> }) {
  const { token, error, next: nextParam } = await searchParams;
  const next = safeNextPath(nextParam);
  const pending = token && token.length <= 128 ? peekSignInToken(token, new Date()) : null;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <PageHeader eyebrow="Email" title={pending ? "Confirm your email" : "This link has expired"} />
      {pending ? (
        <form method="post" action="/api/email/verify" className="space-y-4">
          <input type="hidden" name="token" value={token} />
          {next && <input type="hidden" name="next" value={next} />}
          <p>
            Save this browser&apos;s shelf to <span className="font-medium">{maskEmail(pending.email)}</span> and sign in
            on this device?
          </p>
          <Button type="submit" size="lg">
            Confirm and continue
          </Button>
          <p className="text-xs text-muted-foreground">
            If you didn&apos;t ask for this link, close this page. Nothing changes unless you confirm.
          </p>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground">
            {error
              ? "That link was already used or has expired."
              : "Sign-in links work once and expire after 15 minutes."}{" "}
            You can ask for a new one.
          </p>
          <Link href="/account" className="font-medium text-brand hover:underline">
            Send me a new link →
          </Link>
        </div>
      )}
    </div>
  );
}
