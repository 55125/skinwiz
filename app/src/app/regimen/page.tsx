import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Moon, Sun } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MySkinTabs } from "@/components/my-skin-tabs";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { RegimenButton } from "@/components/regimen-button";
import { HowToUse } from "@/components/how-to-use";
import { MdBadge } from "@/components/md-badge";
import { RegimenActions } from "@/components/regimen-actions";
import { ClinicianPlan } from "@/components/clinician-plan";
import { EmailSignupCard } from "@/components/email-signup-card";
import { readDeviceSessionId, readSessionId } from "@/lib/session";
import { personForSession } from "@/lib/identity";
import { EMPTY_REGIMEN, getRegimen, guidanceForActives, guidanceForStep, STEP_LABEL, suggestSlot, type RegimenStep } from "@/lib/regimen";
import { getClinicianPlan, listRegimens, type RegimenSummary } from "@/lib/regimens";
import { describeStrengths } from "@/lib/strength-display";
import { displayManufacturer } from "@/lib/format";
import { FEATURES } from "@/lib/feature-flags";
import { escalationFor, type EscalationGuidance } from "@/db/escalation-guidance";
import { EscalationList } from "@/components/escalation-guidance";
import { getConcerns } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/brand";
import { canViewRxReference } from "@/lib/clinicians";

export const metadata: Metadata = {
  title: "My regimen",
  description: "Your morning and night skincare steps, in the order to apply them, with each product's own label directions.",
  robots: { index: false },
};

function StepRow({ s, index, regimenId, rxLinks }: { s: RegimenStep; index: number; regimenId: number; rxLinks: boolean }) {
  const strength = describeStrengths(s.product.strengths, s.product.activeIds);
  const suggestion = suggestSlot(s.product);
  const activeGuidance = guidanceForActives(s.product.activeIds ?? []);
  const formulation = guidanceForStep(s.step);
  const hasHowTo = !!(s.label?.directions || s.label?.warnings || activeGuidance.length || formulation);
  const href = s.product.isRx ? (rxLinks ? `/rx/${encodeURIComponent(s.product.id)}` : null) : `/product/${encodeURIComponent(s.product.id)}`;
  return (
    <li className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-foreground tabular-nums">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {s.product.isRx ? "Prescription" : STEP_LABEL[s.step]}
            {s.product.manufacturer && <> · {displayManufacturer(s.product.manufacturer)}</>}
          </p>
          {href ? (
            <Link href={href} className="block font-semibold leading-snug hover:text-brand">
              {s.product.brandName}
            </Link>
          ) : (
            <p className="font-semibold leading-snug">{s.product.brandName}</p>
          )}
          {strength && <p className="text-xs font-medium text-foreground/80">{strength}</p>}
          {s.product.isRx && s.product.strengthText && <p className="text-xs font-medium text-foreground/80">{s.product.strengthText}</p>}
          {s.directions && <p className="pt-1 text-sm">Copied from your clinician&apos;s plan: {s.directions}</p>}
        </div>
      </div>
      <RegimenButton productId={s.product.id} initialSlot={s.slot} suggestedSlot={suggestion.slot} suggestedReason={null} compact regimenId={regimenId} />
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

function SlotColumn({
  title,
  icon: Icon,
  steps,
  empty,
  regimenId,
  rxLinks,
}: {
  title: string;
  icon: typeof Sun;
  steps: RegimenStep[];
  empty: string;
  regimenId: number;
  rxLinks: boolean;
}) {
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
            <StepRow key={s.product.id} s={s} index={i} regimenId={regimenId} rxLinks={rxLinks} />
          ))}
        </ol>
      )}
    </section>
  );
}

function RegimenTabs({ list, selectedId }: { list: RegimenSummary[]; selectedId: number }) {
  if (list.length < 2) return null;
  return (
    <nav aria-label="Your regimens" className="flex flex-wrap gap-2">
      {list.map((r) => (
        <Link
          key={r.id}
          href={`/regimen?r=${r.id}`}
          aria-current={r.id === selectedId ? "page" : undefined}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
            r.id === selectedId ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
          )}
        >
          {r.name}
          {r.badge && <MdBadge credential={r.badge.credential} className={r.id === selectedId ? "border-white/40 bg-white/15 text-inherit" : ""} />}
          {r.active && <span className="text-[10px] uppercase tracking-wide opacity-70">default</span>}
        </Link>
      ))}
    </nav>
  );
}

export default async function RegimenPage({ searchParams }: { searchParams: Promise<{ r?: string; saved?: string; skipped?: string }> }) {
  const { r, saved, skipped } = await searchParams;
  const sessionId = await readSessionId();
  const rxLinks = await canViewRxReference();
  const list = sessionId ? listRegimens(sessionId) : [];
  const selected = list.find((x) => String(x.id) === r) ?? list.find((x) => x.active) ?? list[0] ?? null;

  const plan = sessionId && selected?.kind === "clinician" ? getClinicianPlan(sessionId, selected.id) : null;
  if (selected && plan) {
    const device = await readDeviceSessionId();
    const person = device ? personForSession(device) : null;
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <MySkinTabs />
        <PageHeader title="My regimen" />
        {saved && (
          <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            Saved. This plan is now in your regimens, private to this browser
            {person ? " and the devices signed in with your email" : ""}. Bookmark this page, or add your email below to open it anywhere.
          </p>
        )}
        <RegimenTabs list={list} selectedId={selected.id} />
        {FEATURES.HANDOUTS ? (
          <>
            <ClinicianPlan version={plan.version} products={plan.products} states={plan.states} regimenId={selected.id} rxLinks={rxLinks} />
            <RegimenActions regimenId={selected.id} kind="clinician" active={selected.active} name={selected.name} />
            <EmailSignupCard
              signedInAs={person?.email ?? null}
              next={`/regimen?r=${selected.id}`}
              title="Keep this plan & get check-ins"
              blurb="Optional. Add an email to open this plan on any device, get a short check-in at 2, 4, 8 and 12 weeks after you mark a product as one you have, and hear about FDA recalls. Your clinic doesn't see your email or answers. No password; we send a one-time link."
            />
          </>
        ) : (
          <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">This plan isn&apos;t available right now. Your printed handout has everything your clinician wrote.</p>
        )}
        <p className="text-xs text-muted-foreground">
          This plan is between you and your clinician; {SITE_NAME} shows it as written and doesn&apos;t change it. Questions about your treatment go to
          your clinician.
        </p>
      </div>
    );
  }

  const regimenId = selected?.kind === "own" ? selected.id : null;
  const regimen = regimenId !== null ? getRegimen(regimenId) : EMPTY_REGIMEN;
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
      <MySkinTabs />
      <PageHeader
        title={selected && list.length > 1 ? selected.name : "My regimen"}
        description="What you use morning and night, in the order to apply it: thinnest to thickest, with sunscreen last in the morning. Saved in this browser with no account. Add an email in Email settings if you want it on other devices too."
      />

      <RedFlagBanner />
      {selected && <RegimenTabs list={list} selectedId={selected.id} />}
      {skipped && (
        <p role="status" className="rounded-xl border bg-muted/40 p-3 text-sm">
          Your personal copy is ready. {skipped} step{skipped === "1" ? "" : "s"} without a specific product couldn&apos;t be copied; the
          clinician&apos;s plan still has {skipped === "1" ? "it" : "them"}.
        </p>
      )}

      {regimenId === null || regimen.count === 0 ? (
        <div className="space-y-3 rounded-2xl border bg-card p-6">
          <p className="font-medium">Your regimen is empty.</p>
          <p className="text-sm text-muted-foreground">
            Open any product and choose <span className="font-medium text-foreground">Add to my regimen</span>. It&apos;ll land in the
            morning, at night or both, and you can move it any time.
          </p>
          <Link href="/browse" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            Browse products <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {selected && list.length > 1 && <RegimenActions regimenId={selected.id} kind="own" active={selected.active} name={selected.name} />}
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
            <SlotColumn title="Morning" icon={Sun} steps={regimen.am} empty="Nothing in the morning yet." regimenId={regimenId} rxLinks={rxLinks} />
            <SlotColumn title="Night" icon={Moon} steps={regimen.pm} empty="Nothing at night yet." regimenId={regimenId} rxLinks={rxLinks} />
          </div>

          {selected && list.length > 1 && <RegimenActions regimenId={selected.id} kind="own" active={selected.active} name={selected.name} />}

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
