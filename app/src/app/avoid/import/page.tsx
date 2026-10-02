import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AvoidImportButton } from "@/components/avoid-import-button";
import { getNotOnLabel, importItemName, watchForNames } from "@/db/patch-test-series";
import { avoidedIngredientName, readAvoidIds } from "@/lib/avoid";
import { cleanDetails, decodeImportCode, mergeAvoidIds } from "@/lib/avoid-import";

// Where a dermatologist's QR code lands (/for-clinicians/patch-test). A
// tool page: noindex, and /avoid is disallowed in robots.txt anyway.
export const metadata: Metadata = {
  title: "Add your patch-test allergens",
  robots: { index: false, follow: false },
};

type Params = Partial<Record<"a" | "c" | "d" | "n", string | string[]>>;

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export default async function AvoidImportPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const decoded = decodeImportCode(one(params.a));
  const { clinic, date, note } = cleanDetails({ clinic: one(params.c), date: one(params.d), note: one(params.n) });

  if (!decoded.ok || (decoded.avoidIds.length === 0 && decoded.notOnLabel.length === 0)) {
    const why =
      !decoded.ok && decoded.reason === "too-long"
        ? "This link is much longer than the ones we make, so it may have been changed or garbled."
        : !decoded.ok && decoded.reason === "missing"
          ? "This link doesn't include an allergen list."
          : "We couldn't read the allergen list in this link. It may have been cut off when it was copied.";
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <PageHeader eyebrow="Patch-test results" title="We couldn't read this link" description={why} />
        <p className="text-sm text-muted-foreground">
          Try scanning the QR code on your sheet again, or ask your dermatologist&apos;s office to resend it. You can also
          add your allergens yourself:
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/avoid?series=1" className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Pick from a patch-test series
          </Link>
          <Link href="/avoid?paste=1" className="inline-flex rounded-full border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">
            Paste your results
          </Link>
        </div>
      </div>
    );
  }

  const existing = await readAvoidIds();
  const { already, coveredBy } = mergeAvoidIds(existing, decoded.avoidIds);
  const alreadySet = new Set(already);
  const otherOnList = existing.filter((id) => !decoded.avoidIds.includes(id));

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow={clinic ? `From ${clinic}` : "Patch-test results"}
        title="Your dermatologist marked these allergens"
        description="Add them to your avoid list and every product you look up here is checked for them, under every name they go by on a label."
      >
        {date && <p className="text-sm text-muted-foreground">Patch test read on {formatDate(date)}</p>}
      </PageHeader>

      {note && (
        <div className="rounded-2xl border bg-card p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note{clinic ? ` from ${clinic}` : ""}</p>
          <p className="mt-1 whitespace-pre-line">{note}</p>
        </div>
      )}

      {decoded.avoidIds.length > 0 && (
        <section className="space-y-3" aria-labelledby="import-avoid">
          <h2 id="import-avoid" className="text-base font-semibold">
            To avoid ({decoded.avoidIds.length})
          </h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {decoded.avoidIds.map((id) => {
              const names = watchForNames(id);
              return (
                <li key={id} className="space-y-1 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/allergens/${id}`} className="font-medium hover:text-brand hover:underline">
                      {importItemName(id)}
                    </Link>
                    {alreadySet.has(id) ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Already on your list</span>
                    ) : coveredBy[id] ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Covered by {importItemName(coveredBy[id])}</span>
                    ) : null}
                  </div>
                  {names.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground/80">On labels: </span>
                      {names.join(", ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <AvoidImportButton ids={decoded.avoidIds} allPresent={decoded.avoidIds.every((id) => alreadySet.has(id))} />
          {otherOnList.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Also on your list already, and kept: {otherOnList.map(avoidedIngredientName).join(", ")}.
            </p>
          )}
        </section>
      )}

      {decoded.notOnLabel.length > 0 && (
        <section className="space-y-3" aria-labelledby="import-off-label">
          <h2 id="import-off-label" className="text-base font-semibold">
            Also positive, but not on cosmetic labels
          </h2>
          <p className="text-sm text-muted-foreground">
            We can&apos;t check products for these, since they aren&apos;t listed as ingredients. Here&apos;s where they
            usually turn up:
          </p>
          <ul className="divide-y rounded-2xl border border-dashed">
            {decoded.notOnLabel.map((id) => (
              <li key={id} className="p-4 text-sm">
                <span className="font-medium">{getNotOnLabel(id)!.name}</span>
                <span className="block text-muted-foreground">{getNotOnLabel(id)!.foundIn}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {decoded.unknown > 0 && (
        <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
          {decoded.unknown === 1 ? "One item" : `${decoded.unknown} items`} in this link aren&apos;t on our list, so they&apos;re not
          shown. Check your printed sheet for {decoded.unknown === 1 ? "it" : "them"}.
        </p>
      )}

      <div className="space-y-2 rounded-2xl border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          This list came from the link you opened. We don&apos;t store it, and we can&apos;t verify who created the
          link, so if anything looks wrong, check it against your printed sheet or ask your dermatologist.
        </p>
        <p>
          Labels can use names we don&apos;t know, and &ldquo;fragrance&rdquo; or &ldquo;parfum&rdquo; can hide
          fragrance allergens. This is not medical advice. Learn more in the{" "}
          <Link href="/allergens" className="font-medium text-brand hover:underline">
            contact allergen guide
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
