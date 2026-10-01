import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProductGrid } from "@/components/product-grid";
import { readSessionId } from "@/lib/session";
import { getShelf } from "@/lib/shelf";
import { findRoutineConflicts } from "@/lib/routine-conflicts";
import { getLoggedProductIds } from "@/lib/outcomes";
import { getConcerns } from "@/lib/queries";
import { ShelfOutcomePrompt } from "@/components/shelf-outcome-prompt";

export const metadata: Metadata = {
  title: "My shelf",
  description: "The skincare products you own, want and have finished, with a check for actives that shouldn't be combined.",
  robots: { index: false },
};

export default async function ShelfPage() {
  const sessionId = await readSessionId();
  const items = sessionId ? getShelf(sessionId) : [];
  const inUse = items.filter((i) => i.status === "own" && i.opened);
  const sealed = items.filter((i) => i.status === "own" && !i.opened);
  const want = items.filter((i) => i.status === "want");
  const empties = items.filter((i) => i.status === "empty");
  const conflicts = findRoutineConflicts(inUse.map((i) => ({ productId: i.product.id, productBrandName: i.product.brandName })));

  // Finished products first -- that's when someone actually knows whether
  // it worked. In-use ones are asked too; an answer can be changed later.
  const askable = [...empties, ...inUse];
  const logged = sessionId
    ? getLoggedProductIds(sessionId, askable.map((i) => ({ productId: i.product.id, concernId: i.product.concernId })))
    : new Set<string>();
  const concernNames = new Map(getConcerns().map((c) => [c.id, c.name]));
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
        description="Track what you own, what you want and what you've finished. Saved against an anonymous cookie in this browser — no account, and clearing your cookies clears your shelf."
      />

      <Link href="/regimen" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        See your morning and night order on My regimen →
      </Link>

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
