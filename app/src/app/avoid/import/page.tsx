import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AvoidImportButton } from "@/components/avoid-import-button";
import { getNotOnLabel, importItemName, mainlyOffLabel, watchForNames } from "@/db/patch-test-series";
import { avoidedIngredientName, readAvoidIds, readNotOnLabelIds } from "@/lib/avoid";
import { cleanDetails, decodeImportCode, mergeAvoidIds } from "@/lib/avoid-import";
import { getSafeProductsByConcern } from "@/lib/queries";
import { EmailSignupCard } from "@/components/email-signup-card";
import { personForSession } from "@/lib/identity";
import { readDeviceSessionId } from "@/lib/session";
import { FilterChip } from "@/components/filter-chip";

// Where a dermatologist's QR code lands (/clinic-tools/patch-test-reader). A
// tool page: noindex, and /avoid is disallowed in robots.txt anyway.
export const metadata: Metadata = {
  title: "Add your patch-test allergens",
  robots: { index: false, follow: false },
};

type Params = Partial<Record<"a" | "d" | "n", string | string[]>>;

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export default async function AvoidImportPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const decoded = decodeImportCode(one(params.a));
  const { date, note } = cleanDetails({ date: one(params.d), note: one(params.n) });

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
  const savedOff = await readNotOnLabelIds();
  const offAllSaved = decoded.notOnLabel.every((id) => savedOff.includes(id));
  const device = await readDeviceSessionId();
  const signedInAs = device ? (personForSession(device)?.email ?? null) : null;
  const { already, coveredBy } = mergeAvoidIds(existing, decoded.avoidIds);
  const alreadySet = new Set(already);
  const otherOnList = existing.filter((id) => !decoded.avoidIds.includes(id));
  const safeByConcern = getSafeProductsByConcern(decoded.avoidIds);
  const safeTotal = safeByConcern.reduce((sum, c) => sum + c.n, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow={date ? "Patch-test results" : "Shared allergen list"}
        title={date ? "Your dermatologist marked these allergens" : "Allergens to avoid"}
        description="Add them to your avoid list and every product you look up here is checked for them, under every name they go by on a label."
      >
        {date && <p className="text-sm text-muted-foreground">Patch test read on {formatDate(date)}</p>}
      </PageHeader>

      {note && (
        <div className="rounded-2xl border bg-card p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note</p>
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
              const names = watchForNames(id, Infinity);
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
                  {mainlyOffLabel(id) && <p className="text-sm text-muted-foreground">{mainlyOffLabel(id)}</p>}
                </li>
              );
            })}
          </ul>
          <AvoidImportButton
            ids={decoded.avoidIds}
            notOnLabel={decoded.notOnLabel}
            allPresent={decoded.avoidIds.every((id) => alreadySet.has(id)) && offAllSaved}
          />
          {otherOnList.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Also on your list already, and kept: {otherOnList.map(avoidedIngredientName).join(", ")}.
            </p>
          )}
        </section>
      )}

      {safeByConcern.length > 0 && (
        <section className="space-y-3" aria-labelledby="import-safe">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="import-safe" className="text-base font-semibold">
              Products safe for this list
            </h2>
            <Link href={`/browse?free=${encodeURIComponent(decoded.avoidIds.join(","))}`} className="text-sm font-medium text-brand hover:underline">
              Browse all {safeTotal.toLocaleString()} →
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Full ingredient lists clear of every allergen above, including fragrance allergens that could hide in an
            undisclosed &ldquo;fragrance.&rdquo;
          </p>
          <div className="flex flex-wrap gap-1.5">
            {safeByConcern.map((c) => (
              <FilterChip key={c.id} selected={false} href={`/browse?free=${encodeURIComponent(decoded.avoidIds.join(","))}&concern=${c.id}`}>
                {c.name} ({c.n.toLocaleString()})
              </FilterChip>
            ))}
          </div>
        </section>
      )}

      {decoded.notOnLabel.length > 0 && (
        <section className="space-y-3" aria-labelledby="import-off-label">
          <h2 id="import-off-label" className="text-base font-semibold">
            Also positive, but not on cosmetic labels
          </h2>
          <p className="text-sm text-muted-foreground">
            We can&apos;t check products for these, since they aren&apos;t listed as ingredients. Here&apos;s where they
            usually turn up. Adding the list keeps them on it for reference.
          </p>
          <ul className="divide-y rounded-2xl border border-dashed">
            {decoded.notOnLabel.map((id) => (
              <li key={id} className="p-4 text-sm">
                <span className="font-medium">{getNotOnLabel(id)!.name}</span>
                <span className="block text-muted-foreground">{getNotOnLabel(id)!.foundIn}</span>
              </li>
            ))}
          </ul>
          {decoded.avoidIds.length === 0 && <AvoidImportButton ids={[]} notOnLabel={decoded.notOnLabel} allPresent={offAllSaved} />}
        </section>
      )}

      {!signedInAs && decoded.avoidIds.length > 0 && (
        <EmailSignupCard
          signedInAs={null}
          // Back here after the emailed sign-in link, so a list not yet added isn't lost.
          next={`/avoid/import?a=${encodeURIComponent(one(params.a) ?? "")}${date ? `&d=${date}` : ""}`}
          title="Keep this list on every device"
          blurb="Optional. Add your email and your avoid list is saved to your account, so it's there on any phone or computer you sign in on, along with My products and any plans from your clinic. No password; we send a one-time link."
        />
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
