import type { Metadata } from "next";
import Link from "next/link";
import { Info, Search, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ReactionBuilder } from "@/components/reaction-builder";
import { AvoidToggleButton } from "@/components/avoid-toggle-button";
import { PrintButton } from "@/components/print-button";
import { CopyTextButton } from "@/components/copy-text-button";
import { QrCode } from "@/components/qr-code";
import { Badge } from "@/components/ui/badge";
import { readAvoidIds } from "@/lib/avoid";
import { analyzeReactions, type Suspect, type SuspectStrength } from "@/lib/reaction-detective";
import { catalogSize, detectiveQuery, loadDetectiveProducts, parseIdList } from "@/lib/reaction-detective-data";
import { siteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reaction Detective: which ingredient caused my rash?",
  description:
    "Add the products you reacted to and the ones you use without trouble. Actively compares their ingredient lists and shows which ingredients are worth suspecting, with a sheet to take to your dermatologist.",
  alternates: { canonical: "/reactions" },
};

export const dynamic = "force-dynamic";

type Search = { r?: string; f?: string; bag?: string };

const STRENGTH: Record<SuspectStrength, { label: string; className: string; blurb: string }> = {
  strong: { label: "Strong lead", className: "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200", blurb: "In every product you reacted to and none you use without trouble." },
  possible: { label: "Possible", className: "border-brand/40 bg-brand-soft text-brand-foreground", blurb: "In some of the products you reacted to and none you use without trouble." },
  weaker: { label: "Less likely", className: "border-border bg-muted text-muted-foreground", blurb: "Also in a product you use without trouble." },
};

export default async function ReactionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await searchParams;
  const bag = s.bag === "1";
  const reacted = loadDetectiveProducts(parseIdList(s.r));
  const fine = loadDetectiveProducts(parseIdList(s.f), new Set(reacted.map((p) => p.id)));
  const pick = (p: (typeof reacted)[number]) => ({ id: p.id, brandName: p.product.brandName, manufacturer: p.product.manufacturer });
  const avoidIds = await readAvoidIds();
  const result = reacted.length > 0 ? analyzeReactions(reacted, fine, catalogSize()) : null;
  const reviewUrl = `${siteUrl()}/clinic-tools/product-review${detectiveQuery(reacted.map((p) => p.id), fine.map((p) => p.id))}`;
  const leads = result?.suspects.filter((x) => x.strength !== "weaker") ?? [];
  // The "find products without" link screens out known allergens only, not every shared ingredient.
  const screen = leads.filter((x) => x.kind !== "ingredient").slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 print:space-y-4 print:py-0">
      <PageHeader
        eyebrow="Tool"
        title="Reaction Detective"
        description="Reacted to a product and not sure why? Add it, plus the products you use without trouble. We compare every ingredient list and show which ingredients are worth suspecting."
      />

      {bag && (
        <div className="flex gap-3 rounded-2xl border border-brand/40 bg-brand-soft/60 p-4 text-sm print:hidden">
          <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <p>
            <span className="font-medium">Getting ready for a dermatology visit?</span> Add everything you put on your skin, hair and lips, including
            products you stopped using. When you&apos;re done, show your dermatologist the QR code at the bottom of this page, or send them the link.
          </p>
        </div>
      )}

      <ReactionBuilder reacted={reacted.map(pick)} fine={fine.map(pick)} bag={bag} />

      {/* What the printed sheet lists, since the builder above doesn't print. */}
      <div className="hidden space-y-1 text-sm print:block">
        <p><span className="font-semibold">Reacted to:</span> {reacted.map((p) => p.name).join("; ") || "none listed"}</p>
        <p><span className="font-semibold">Used without trouble:</span> {fine.map((p) => p.name).join("; ") || "none listed"}</p>
      </div>

      {!result && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" aria-hidden /> Start with a product you reacted to.
        </p>
      )}

      {result && (
        <section className="space-y-5" aria-labelledby="suspects">
          <div className="space-y-1">
            <h2 id="suspects" className="text-2xl font-semibold">
              {leads.length > 0 ? `${leads.length} ingredient${leads.length === 1 ? "" : "s"} worth suspecting` : "No clear suspect yet"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Compared {result.reactedChecked} product{result.reactedChecked === 1 ? "" : "s"} you reacted to with {result.fineChecked} you use without trouble.
              This finds a pattern, not a diagnosis: only a patch test at a dermatologist&apos;s office can confirm an allergy.
            </p>
          </div>

          {result.needMore && (
            <Note>
              {result.reactedChecked === 0
                ? "None of the products you reacted to has a full ingredient list on file, so there's nothing to compare yet."
                : "With one product, every allergen it lists is equally possible. Add another product you reacted to, and a few you use without trouble, to narrow it down."}
            </Note>
          )}

          {result.irritants.filter((n) => n.all).map((n) => (
            <Note key={n.cls}>
              {result.reactedChecked === 1 ? "The product you reacted to contains" : "Every product you reacted to contains"} {n.label}. Stinging, burning, redness or
              peeling from {n.label} is usually irritation rather than an allergy, and often settles with less frequent use.
              {n.fineIn.length > 0 && ` You also use ${n.fineIn.join(", ")}, which ${n.fineIn.length === 1 ? "has" : "have"} ${n.label}, without trouble.`}
            </Note>
          ))}

          {result.suspects.length > 0 && (
            <ul className="space-y-3">
              {result.suspects.map((x) => (
                <SuspectCard key={`${x.kind}:${x.id}`} s={x} avoidIds={avoidIds} />
              ))}
            </ul>
          )}

          {screen.length > 0 && (
            <p className="print:hidden">
              <Link
                href={`/browse?free=${encodeURIComponent(screen.map((l) => l.avoidId).join(","))}`}
                className="font-medium text-brand hover:underline"
                data-track="reactions:browse-without"
              >
                Find products without {screen.length === 1 ? screen[0].name : "these allergens"} →
              </Link>
            </p>
          )}

          {result.unchecked.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Not checked (no full ingredient list on file): {result.unchecked.join(", ")}.
            </p>
          )}
        </section>
      )}

      {(reacted.length > 0 || fine.length > 0) && (
        <section className="space-y-4 rounded-3xl border bg-muted/40 p-6 print:break-inside-avoid print:border-0 print:bg-transparent print:p-0" aria-labelledby="derm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h2 id="derm" className="flex items-center gap-2 text-lg font-semibold">
                <Stethoscope className="h-5 w-5 text-brand print:hidden" aria-hidden /> For your dermatologist
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Your dermatologist can scan this code (or open the link) to see every product here with its active ingredients, the allergens each one lists, and
                the patch-test series that cover your suspects. The link holds only product codes, never your name.
              </p>
              <div className="flex flex-wrap gap-2 print:hidden">
                <PrintButton label="Print this sheet" track="reactions:print" />
                <CopyTextButton text={reviewUrl} label="Copy link for my dermatologist" copiedLabel="Link copied" />
              </div>
            </div>
            <QrCode value={reviewUrl} className="h-32 w-32 shrink-0 rounded-lg border bg-white p-1" title="QR code for your dermatologist" />
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Your lists stay in this browser and in the page link; we don&apos;t store them. A reaction that spreads, blisters, or affects your eyes, lips or breathing
        needs a doctor today.
      </p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-2xl border bg-card p-4 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
      <p>{children}</p>
    </div>
  );
}

function SuspectCard({ s, avoidIds }: { s: Suspect; avoidIds: string[] }) {
  const st = STRENGTH[s.strength];
  const href = s.kind === "ingredient" ? `/ingredient/${encodeURIComponent(s.id)}` : s.kind === "allergen" ? `/allergens/${encodeURIComponent(s.id)}` : null;
  return (
    <li className="space-y-2 rounded-2xl border bg-card p-4 print:break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {href ? (
              <Link href={href} className="text-lg font-semibold hover:underline">{s.name}</Link>
            ) : (
              <span className="text-lg font-semibold">{s.name}</span>
            )}
            <Badge variant="outline" className={cn(st.className)} title={st.blurb}>{st.label}</Badge>
            <Badge variant="outline">{s.kind === "ingredient" ? "Shared ingredient, not a common allergen" : "Known contact allergen"}</Badge>
          </div>
          {s.members && <p className="text-sm text-muted-foreground">Related chemicals in your products: {s.members.join(", ")}</p>}
        </div>
        <span className="print:hidden">
          <AvoidToggleButton id={s.avoidId} avoidIds={avoidIds} />
        </span>
      </div>
      <dl className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="text-muted-foreground">In what you reacted to</dt>
        <dd>{s.reactedIn.join(", ")}</dd>
        {s.fineIn.length > 0 && (
          <>
            <dt className="text-muted-foreground">Also in, no trouble</dt>
            <dd>{s.fineIn.join(", ")}</dd>
          </>
        )}
        {s.kind !== "ingredient" && (
          <>
            <dt className="text-muted-foreground">Patch test</dt>
            <dd>{s.series.length > 0 ? `On the ${s.series.join(", ")}` : "Not on the standard series; ask about an extended or custom panel"}</dd>
          </>
        )}
      </dl>
    </li>
  );
}
