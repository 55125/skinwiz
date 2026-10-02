import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Moon, Sun } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { RegimenButton } from "@/components/regimen-button";
import { HowToUse } from "@/components/how-to-use";
import { readSessionId } from "@/lib/session";
import { getRegimen, guidanceForActives, guidanceForStep, STEP_LABEL, suggestSlot, type RegimenStep } from "@/lib/regimen";
import { describeStrengths } from "@/lib/strength-display";
import { displayManufacturer } from "@/lib/format";
import { FEATURES } from "@/lib/feature-flags";
import { escalationFor, type EscalationGuidance } from "@/db/escalation-guidance";
import { EscalationList } from "@/components/escalation-guidance";
import { getConcerns } from "@/lib/queries";

export const metadata: Metadata = {
  title: "My regimen",
  description: "Your morning and night skincare steps, in the order to apply them, with each product's own label directions.",
  robots: { index: false },
};

function StepRow({ s, index }: { s: RegimenStep; index: number }) {
  const strength = describeStrengths(s.product.strengths, s.product.activeIds);
  const suggestion = suggestSlot(s.product);
  const activeGuidance = guidanceForActives(s.product.activeIds ?? []);
  const formulation = guidanceForStep(s.step);
  const hasHowTo = !!(s.label?.directions || s.label?.warnings || activeGuidance.length || formulation);
  return (
    <li className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-foreground tabular-nums">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {STEP_LABEL[s.step]}
            {s.product.manufacturer && <> · {displayManufacturer(s.product.manufacturer)}</>}
          </p>
          <Link href={`/product/${encodeURIComponent(s.product.id)}`} className="block font-semibold leading-snug hover:text-brand">
            {s.product.brandName}
          </Link>
          {strength && <p className="text-xs font-medium text-foreground/80">{strength}</p>}
        </div>
      </div>
      <RegimenButton productId={s.product.id} initialSlot={s.slot} suggestedSlot={suggestion.slot} suggestedReason={null} compact />
      {hasHowTo && (
        <details className="group border-t pt-3">
          <summary className="cursor-pointer text-sm font-medium text-brand">How to use</summary>
          <div className="mt-3">
            <HowToUse label={s.label} activeGuidance={activeGuidance} formulation={formulation} compact />
          </div>
        </details>
      )}
    </li>
  );
}

function SlotColumn({ title, icon: Icon, steps, empty }: { title: string; icon: typeof Sun; steps: RegimenStep[]; empty: string }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <Icon className="h-5 w-5 text-brand" /> {title}
        <span className="text-sm font-normal text-muted-foreground">
          {steps.length} {steps.length === 1 ? "step" : "steps"}
        </span>
      </h2>
      {steps.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <StepRow key={s.product.id} s={s} index={i} />
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function RegimenPage() {
  const sessionId = await readSessionId();
  const regimen = sessionId ? getRegimen(sessionId) : { am: [], pm: [], count: 0, conflicts: [] };
  const sameTime = regimen.conflicts.filter((c) => c.status === "same-time");
  const split = regimen.conflicts.filter((c) => c.status === "split");
  // Gated "When OTC isn't enough" guidance for the concerns this regimen covers.
  const concernNames = new Map(getConcerns().map((c) => [c.id, c.name]));
  const escalations = FEATURES.ESCALATION_GUIDANCE
    ? [...new Set([...regimen.am, ...regimen.pm].map((s) => s.product.concernId))].flatMap((id) => {
        const guidance = escalationFor(id);
        return guidance ? [{ guidance, concernName: concernNames.get(id) ?? id }] : ([] as { guidance: EscalationGuidance; concernName: string }[]);
      })
    : [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Your products"
        title="My regimen"
        description="What you use morning and night, in the order to apply it: thinnest to thickest, with sunscreen last in the morning. Saved in this browser only, with no account."
      />

      <RedFlagBanner />

      {regimen.count === 0 ? (
        <div className="space-y-3 rounded-2xl border bg-card p-6">
          <p className="font-medium">Your regimen is empty.</p>
          <p className="text-sm text-muted-foreground">
            Open any product and choose <span className="font-medium text-foreground">Add to my regimen</span>. It&apos;ll land in the
            morning, at night or both, and you can move it any time.
          </p>
          <Link href="/browse" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            Browse products <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <>
          {sameTime.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Worth a look: used at the same time
              </p>
              <ul className="space-y-2 text-sm">
                {sameTime.map((c) => (
                  <li key={`${c.a.productId}-${c.b.productId}-${c.note}`}>
                    <span className="font-medium">{c.a.brand}</span> ({c.a.cls}) and <span className="font-medium">{c.b.brand}</span> ({c.b.cls}).{" "}
                    <span className="text-foreground/80">{c.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {split.length > 0 && (
            <div className="space-y-2 rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-brand" /> Already split between morning and night
              </p>
              <ul className="space-y-1 text-sm text-foreground/80">
                {split.map((c) => (
                  <li key={`${c.a.productId}-${c.b.productId}-${c.note}`}>
                    {c.a.brand} ({c.a.cls}) and {c.b.brand} ({c.b.cls}) aren&apos;t used at the same time, which is the usual way to
                    combine them.
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-8 md:grid-cols-2">
            <SlotColumn title="Morning" icon={Sun} steps={regimen.am} empty="Nothing in the morning yet." />
            <SlotColumn title="Night" icon={Moon} steps={regimen.pm} empty="Nothing at night yet." />
          </div>

          <EscalationList
            title="When OTC isn't enough"
            intro="For the concerns your regimen covers: how long to give it before judging, and signs that mean seeing a dermatologist."
            items={escalations}
          />

          <p className="text-xs text-muted-foreground">
            Steps are ordered by formulation, not by importance, and this page doesn&apos;t tell you what to use. Directions are quoted
            from each product&apos;s FDA label; the product&apos;s own label always comes first. Products in your regimen also show as in
            use on <Link href="/shelf" className="underline underline-offset-4 hover:text-foreground">your shelf</Link>.
          </p>
        </>
      )}
    </div>
  );
}
