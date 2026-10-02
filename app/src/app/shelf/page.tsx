import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProductGrid } from "@/components/product-grid";
import { readDeviceSessionId, readSessionId } from "@/lib/session";
import { getShelf } from "@/lib/shelf";
import { findRoutineConflicts } from "@/lib/routine-conflicts";
import { getSessionOutcomes, type OutcomeInput } from "@/lib/outcomes";
import { getConcerns } from "@/lib/queries";
import { ShelfOutcomePrompt } from "@/components/shelf-outcome-prompt";
import { FEATURES } from "@/lib/feature-flags";
import { escalationFor } from "@/db/escalation-guidance";
import { EscalationList } from "@/components/escalation-guidance";
import { EmailSignupCard } from "@/components/email-signup-card";
import { personForSession } from "@/lib/identity";
import { shelfRecallAlerts } from "@/lib/recalls";
import { EMAIL_CONFIDENCE, fdaRecallUrl } from "@/lib/recall-match";

export const metadata: Metadata = {
  title: "My shelf",
  description: "The skincare products you own, want and have finished, with a check for actives that shouldn't be combined.",
  robots: { index: false },
};

export default async function ShelfPage() {
  const sessionId = await readSessionId();
  const device = await readDeviceSessionId();
  const person = device ? personForSession(device) : null;
  const alerts = sessionId ? shelfRecallAlerts(sessionId) : [];
  const items = sessionId ? getShelf(sessionId) : [];
  const inUse = items.filter((i) => i.status === "own" && i.opened);
  const sealed = items.filter((i) => i.status === "own" && !i.opened);
  const want = items.filter((i) => i.status === "want");
  const empties = items.filter((i) => i.status === "empty");
  const conflicts = findRoutineConflicts(inUse.map((i) => ({ productId: i.product.id, productBrandName: i.product.brandName })));

  // Finished products first -- that's when someone actually knows whether
  // it worked. In-use ones are asked too; an answer can be changed later.
  const askable = [...empties, ...inUse];
  const outcomes = sessionId
    ? getSessionOutcomes(sessionId, askable.map((i) => ({ productId: i.product.id, concernId: i.product.concernId })))
    : new Map<string, OutcomeInput>();
  const logged = new Set(outcomes.keys());
  const concernNames = new Map(getConcerns().map((c) => [c.id, c.name]));
  // Gated: products the visitor said didn't help point to "When OTC isn't
  // enough" for their concern, one row per concern.
  const notHelped = FEATURES.ESCALATION_GUIDANCE ? askable.filter((i) => outcomes.get(i.product.id)?.improved === false) : [];
  const escalations = [...new Set(notHelped.map((i) => i.product.concernId))].flatMap((concernId) => {
    const guidance = escalationFor(concernId);
    if (!guidance) return [];
    const names = notHelped.filter((i) => i.product.concernId === concernId).map((i) => i.product.brandName);
    return [
      {
        guidance,
        concernName: concernNames.get(concernId) ?? concernId,
        note: `You said ${names.slice(0, 2).join(" and ")}${names.length > 2 ? ` and ${names.length - 2} more` : ""} didn't help.`,
      },
    ];
  });
  const toAsk = askable
    .filter((i) => !logged.has(i.product.id))
    .slice(0, 8)
    .map((i) => ({
      productId: i.product.id,
      brandName: i.product.brandName,
      concernName: concernNames.get(i.product.concernId) ?? "this concern",
      finished: i.status === "empty",
    }));

  const sections = [
    { title: "In use", items: inUse },
    { title: "Unopened", items: sealed },
    { title: "Wishlist", items: want },
    { title: "Empties", items: empties },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Your products"
        title="My shelf"
        description="Track what you own, what you want and what you've finished. Saved against an anonymous cookie in this browser — no account. Add an email if you want it on other devices too."
      />

      <Link href="/regimen" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        See your morning and night order on My regimen →
      </Link>

      <EmailSignupCard signedInAs={person?.email ?? null} />

      {alerts.length > 0 && (
        <section aria-labelledby="safety-alerts" className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 id="safety-alerts" className="flex items-center gap-2 text-base font-semibold">
            <ShieldAlert className="h-5 w-5" aria-hidden /> Safety alerts
          </h2>
          <ul className="space-y-2 text-sm">
            {alerts.map((a) => (
              <li key={`${a.recallNumber}-${a.productId}`}>
                <Link href={`/product/${encodeURIComponent(a.productId)}`} className="font-medium hover:underline">
                  {a.brandName}
                </Link>{" "}
                <span className="text-muted-foreground">
                  ({a.shelfStatus === "want" ? "wishlist" : "on your shelf"}) —{" "}
                  {a.confidence >= EMAIL_CONFIDENCE ? "FDA recall" : "a recall may cover it"}
                  {a.classification && <>, {a.classification}</>}
                  {a.recallInitiationDate && <>, started {a.recallInitiationDate}</>}
                  {a.status === "Terminated" && <>, recall has ended</>}.{" "}
                </span>
                <a href={fdaRecallUrl(a.eventId)} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                  FDA notice<span className="sr-only"> for {a.brandName} (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Recalls usually cover specific lots — compare your package&apos;s lot number with the notice.
            {person ? " We email you once about each new recall." : " Add an email above to be told about new ones."}
          </p>
        </section>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          Nothing on your shelf yet. Open any product and use &ldquo;I own this&rdquo;, &ldquo;Want it&rdquo; or
          &ldquo;Finished it&rdquo;.{" "}
          <Link href="/browse" className="font-medium text-brand hover:underline">
            Browse products →
          </Link>
        </div>
      ) : (
        <>
          {conflicts.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" aria-hidden /> Products you&apos;re using that are worth checking together
              </p>
              <ul className="space-y-2 text-sm">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">
                      {c.a.brand} ({c.a.cls}) + {c.b.brand} ({c.b.cls}):
                    </span>{" "}
                    <span className="text-muted-foreground">{c.note}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                General interaction cautions from ingredient lists, not medical advice. Many people use these on
                different days or at different times — ask a board-certified dermatologist.
              </p>
            </div>
          )}

          {toAsk.length > 0 && <ShelfOutcomePrompt items={toAsk} />}

          <EscalationList
            title="Not seeing results?"
            intro="Some products didn't help, by your answers. Here's how long a fair try usually is, and when it's worth seeing a dermatologist."
            items={escalations}
          />

          {sections.map((s) => (
            <section key={s.title} className="space-y-4">
              <h2 className="text-lg font-semibold">
                {s.title} <span className="text-sm font-normal text-muted-foreground tabular-nums">({s.items.length})</span>
              </h2>
              <ProductGrid products={s.items.map((i) => i.product)} />
            </section>
          ))}
        </>
      )}
    </div>
  );
}
