import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { verifyCheckinToken } from "@/lib/email-links";
import { getCheckin, getObservationForCheckin } from "@/lib/checkins";
import { CHECKIN_ANSWERS, isCheckinAnswer, type CheckinAnswer } from "@/lib/checkin-schedule";

export const metadata: Metadata = {
  title: "Check-in",
  robots: { index: false },
  referrer: "no-referrer",
};

const LABELS: Record<CheckinAnswer, string> = {
  better: "Better",
  same: "About the same",
  worse: "Worse",
  stopped: "I stopped using it",
};

// Where a check-in email's answer buttons land, with the tapped answer already
// selected. Saving is one more tap: answering on page load would let email
// link scanners (which open every link) record all four answers.
export default async function CheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ a?: string; saved?: string; error?: string }>;
}) {
  const { token: raw } = await params;
  const { a, saved, error } = await searchParams;
  const token = decodeURIComponent(raw);
  const id = verifyCheckinToken(token, new Date());
  const found = id ? getCheckin(id) : null;

  if (!found) {
    return (
      <Shell title="This check-in link doesn't work">
        <p className="text-muted-foreground">
          It may have expired (links last two months) or the email address it was sent to was deleted.
        </p>
      </Shell>
    );
  }

  const { checkin, brandName, concernName } = found;
  const product = brandName ?? "this product";
  const concern = (concernName ?? "your skin").toLowerCase();
  const existing = getObservationForCheckin(checkin.id);
  const selected: CheckinAnswer | null = isCheckinAnswer(a) ? a : ((existing?.answer as CheckinAnswer | undefined) ?? null);

  if (saved) {
    const answer = isCheckinAnswer(a) ? a : null;
    const flag = answer === "worse" || existing?.reaction === true;
    return (
      <Shell title="Thanks — saved">
        <p>
          Recorded <span className="font-medium">{answer ? LABELS[answer].toLowerCase() : "your answer"}</span> for{" "}
          {product} at {checkin.weeks} weeks. It counts only in aggregate, never shown individually.
        </p>
        {flag && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            If your skin is getting worse, stop the product. See a board-certified dermatologist if it&apos;s
            severe, spreading, blistering or painful, if you have a fever, or if it involves your eyes.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Tapped the wrong one? Use any button in the email again — your latest answer replaces this one.
        </p>
        {checkin.productId && (
          <Link href={`/product/${encodeURIComponent(checkin.productId)}`} className="font-medium text-brand hover:underline">
            See {product} →
          </Link>
        )}
      </Shell>
    );
  }

  return (
    <Shell title={`${checkin.weeks} weeks with ${product}`}>
      <form method="post" action="/api/checkin" className="space-y-5">
        <input type="hidden" name="token" value={token} />
        <fieldset className="space-y-2">
          <legend className="mb-2">Compared with when you started, how is your {concern}?</legend>
          {CHECKIN_ANSWERS.map((ans) => (
            <label key={ans} className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft/50">
              <input type="radio" name="answer" value={ans} defaultChecked={selected === ans} required className="h-4 w-4 accent-[var(--brand)]" />
              <span className="text-sm font-medium">{LABELS[ans]}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm">
            Did you have a skin reaction to it (redness, burning, itching or a rash)? <span className="text-muted-foreground">Optional</span>
          </legend>
          <div className="flex gap-4 text-sm">
            {(["yes", "no"] as const).map((v) => (
              <label key={v} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="reaction"
                  value={v}
                  defaultChecked={existing?.reaction === (v === "yes")}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {v === "yes" ? "Yes" : "No"}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">Couldn&apos;t save that. Please pick an answer and try again.</p>}
        <Button type="submit" size="lg">
          Save answer
        </Button>
        <p className="text-xs text-muted-foreground">
          No sign-in needed. Not medical advice — if your skin gets much worse, stop the product and see a
          board-certified dermatologist.
        </p>
      </form>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <PageHeader eyebrow="Check-in" title={title} />
      <div className="space-y-4">{children}</div>
    </div>
  );
}
