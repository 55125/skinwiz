import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Moon, ShieldAlert, Sun } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MySkinTabs } from "@/components/my-skin-tabs";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { RegimenButton } from "@/components/regimen-button";
import { HowToUse } from "@/components/how-to-use";
import { MdBadge } from "@/components/md-badge";
import { RegimenActions } from "@/components/regimen-actions";
import { ClinicianPlan } from "@/components/clinician-plan";
import { gpcEnabled } from "@/lib/gpc";
import { ProductGrid } from "@/components/product-grid";
import { ShelfOutcomePrompt } from "@/components/shelf-outcome-prompt";
import { getShelf } from "@/lib/shelf";
import { findRoutineConflicts } from "@/lib/routine-conflicts";
import { getSessionOutcomes, type OutcomeInput } from "@/lib/outcomes";
import { shelfRecallAlerts } from "@/lib/recalls";
import { EMAIL_CONFIDENCE, fdaRecallUrl } from "@/lib/recall-match";
import { EmailSignupCard } from "@/components/email-signup-card";
import { InstallAppCard } from "@/components/install-app-card";
import { readDeviceSessionId, readSessionId } from "@/lib/session";
import { personForSession } from "@/lib/identity";
import { EMPTY_REGIMEN, getRegimen, guidanceForActives, guidanceForStep, STEP_LABEL, suggestSlot, type RegimenStep } from "@/lib/regimen";
import { getClinicianPlan, getOwnedRegimen, listRegimens, type RegimenSummary } from "@/lib/regimens";
import { RxRetinoidCard } from "@/components/rx-retinoid-card";
import { describeStrengths } from "@/lib/strength-display";
import { displayManufacturer } from "@/lib/format";
import { FEATURES } from "@/lib/feature-flags";
import { escalationFor } from "@/db/escalation-guidance";
import { EscalationList } from "@/components/escalation-guidance";
import { getConcerns } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/brand";
import { canViewRxReference } from "@/lib/clinicians";

export const metadata: Metadata = {
  title: "My products",
  description:
    "Your morning and night skincare steps, in the order to apply them, with each product's own label directions, plus what you own, want and have finished.",
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
  const device = await readDeviceSessionId();
  const person = device ? personForSession(device) : null;
  if (selected && plan) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <MySkinTabs />
        <PageHeader title="My products" />
        {saved && (
          <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            Saved. This plan is now in your regimens, private to this browser
            {person ? " and the devices signed in with your email" : ""}. Bookmark this page, or add your email below to open it anywhere.
          </p>
        )}
        <RegimenTabs list={list} selectedId={selected.id} />
        {FEATURES.HANDOUTS ? (
          <>
            <ClinicianPlan version={plan.version} products={plan.products} states={plan.states} regimenId={selected.id} rxLinks={rxLinks} gpc={await gpcEnabled()} />
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
  const own = regimenId !== null && sessionId ? getOwnedRegimen(sessionId, regimenId) : null;
  const regimen = regimenId !== null ? getRegimen(regimenId, own?.rxRetinoidSlot ?? null) : EMPTY_REGIMEN;
  const sameTime = regimen.conflicts.filter((c) => c.status === "same-time");
  const split = regimen.conflicts.filter((c) => c.status === "split");

  // What you own, want and have finished. Adding a product to the morning or
  // night steps marks it as owned and in use; owned products that aren't in
  // those steps are listed under "Not in my routine".
  const alerts = sessionId ? shelfRecallAlerts(sessionId) : [];
  const items = sessionId ? getShelf(sessionId) : [];
  const inRoutine = new Set([...regimen.am, ...regimen.pm].map((s) => s.product.id));
  const inUse = items.filter((i) => i.status === "own" && i.opened);
  const notInRoutine = items
    .filter((i) => i.status === "own" && !inRoutine.has(i.product.id))
    .sort((a, b) => Number(b.opened) - Number(a.opened));
  const want = items.filter((i) => i.status === "want");
  const empties = items.filter((i) => i.status === "empty");
  // Opened products worth checking together, beyond the pairs the
  // morning/night check already covers.
  const shelfConflicts = findRoutineConflicts(inUse.map((i) => ({ productId: i.product.id, productBrandName: i.product.brandName }))).filter(
    (c) => !(inRoutine.has(c.a.productId) && inRoutine.has(c.b.productId)),
  );

  // Finished products first -- that's when someone actually knows whether
  // it worked. In-use ones are asked too; an answer can be changed later.
  const askable = [...empties, ...inUse];
  const outcomes = sessionId
    ? getSessionOutcomes(sessionId, askable.map((i) => ({ productId: i.product.id, concernId: i.product.concernId })))
    : new Map<string, OutcomeInput>();
  const logged = new Set(outcomes.keys());
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

  // Gated "When OTC isn't enough" guidance: first for concerns where you said
  // a product didn't help, then for the concerns your routine covers.
  const notHelped = FEATURES.ESCALATION_GUIDANCE ? askable.filter((i) => outcomes.get(i.product.id)?.improved === false) : [];
  const escalationConcerns = FEATURES.ESCALATION_GUIDANCE
    ? [...new Set([...notHelped.map((i) => i.product.concernId), ...[...regimen.am, ...regimen.pm].map((s) => s.product.concernId)])]
    : [];
  const escalations = escalationConcerns.flatMap((concernId) => {
    const guidance = escalationFor(concernId);
    if (!guidance) return [];
    const names = notHelped.filter((i) => i.product.concernId === concernId).map((i) => i.product.brandName);
    const note = names.length
      ? `You said ${names.slice(0, 2).join(" and ")}${names.length > 2 ? ` and ${names.length - 2} more` : ""} didn't help.`
      : undefined;
    return [{ guidance, concernName: concernNames.get(concernId) ?? concernId, note }];
  });

  const hasRoutine = regimenId !== null && regimen.count > 0;
  const isEmpty = !hasRoutine && items.length === 0;
  const shelfSections = [
    { title: "Want", items: want },
    { title: "Finished", items: empties },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <MySkinTabs />
      <PageHeader
        title={selected && list.length > 1 ? selected.name : "My products"}
        description="What you use morning and night, in the order to apply it (thinnest to thickest, with sunscreen last in the morning), and what you own, want and have finished. Saved in this browser with no account. Add an email in the card below if you want it on other devices too."
      />

      <RedFlagBanner />
      <InstallAppCard />
      {selected && <RegimenTabs list={list} selectedId={selected.id} />}
      {skipped && (
        <p role="status" className="rounded-xl border bg-muted/40 p-3 text-sm">
          Your personal copy is ready. {skipped} step{skipped === "1" ? "" : "s"} without a specific product couldn&apos;t be copied; the
          clinician&apos;s plan still has {skipped === "1" ? "it" : "them"}.
        </p>
      )}

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
                  ({a.shelfStatus === "want" ? "on your want list" : "one of your products"}) —{" "}
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
            {person ? " We email you once about each new recall." : " Add an email below to be told about new ones."}
          </p>
        </section>
      )}

      {isEmpty && (
        <div className="space-y-3 rounded-2xl border bg-card p-6">
          <p className="font-medium">No products here yet.</p>
          <p className="text-sm text-muted-foreground">
            Open any product and choose <span className="font-medium text-foreground">Add to my regimen</span> to put it in your morning or
            night steps, or <span className="font-medium text-foreground">I own this</span>,{" "}
            <span className="font-medium text-foreground">Want it</span> or <span className="font-medium text-foreground">Finished it</span>{" "}
            to keep track of it.
          </p>
          <Link href="/browse" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            Browse products <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {selected && list.length > 1 && <RegimenActions regimenId={selected.id} kind="own" active={selected.active} name={selected.name} />}
        </div>
      )}
      {regimenId !== null && <RxRetinoidCard key={regimenId} regimenId={regimenId} initialSlot={regimen.rxRetinoid} />}

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
                {c.a.brand} ({c.a.cls}) and {c.b.brand} ({c.b.cls}) aren&apos;t used at the same time, which is the usual way to combine
                them.
              </li>
            ))}
          </ul>
        </div>
      )}
      {shelfConflicts.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Products you&apos;re using that are worth checking together
          </p>
          <ul className="space-y-2 text-sm">
            {shelfConflicts.map((c) => (
              <li key={`${c.a.productId}-${c.b.productId}-${c.note}`}>
                <span className="font-medium">
                  {c.a.brand} ({c.a.cls}) + {c.b.brand} ({c.b.cls}):
                </span>{" "}
                <span className="text-muted-foreground">{c.note}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            General interaction cautions from ingredient lists, not medical advice. Many people use these on different days or at different
            times — ask a board-certified dermatologist.
          </p>
        </div>
      )}

      {!isEmpty && (
        <div className="grid gap-8 md:grid-cols-2">
          <SlotColumn title="Morning" icon={Sun} steps={regimen.am} empty="Nothing in the morning yet." regimenId={regimenId ?? 0} rxLinks={rxLinks} />
          <SlotColumn title="Night" icon={Moon} steps={regimen.pm} empty="Nothing at night yet." regimenId={regimenId ?? 0} rxLinks={rxLinks} />
        </div>
      )}

      {!isEmpty && selected && list.length > 1 && <RegimenActions regimenId={selected.id} kind="own" active={selected.active} name={selected.name} />}

      {notInRoutine.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">
              Not in my routine <span className="text-sm font-normal text-muted-foreground tabular-nums">({notInRoutine.length})</span>
            </h2>
            <p className="text-sm text-muted-foreground">Products you own that aren&apos;t in your morning or night steps, opened ones first.</p>
          </div>
          <ProductGrid products={notInRoutine.map((i) => i.product)} />
        </section>
      )}
      {shelfSections.map((s) => (
        <section key={s.title} className="space-y-4">
          <h2 className="text-xl font-semibold">
            {s.title} <span className="text-sm font-normal text-muted-foreground tabular-nums">({s.items.length})</span>
          </h2>
          <ProductGrid products={s.items.map((i) => i.product)} />
        </section>
      ))}

      {toAsk.length > 0 && <ShelfOutcomePrompt items={toAsk} />}

      <EscalationList
        title="When OTC isn't enough"
        intro="For the concerns your products cover: how long to give them before judging, and signs that mean seeing a dermatologist."
        items={escalations}
      />

      {hasRoutine && (
        <p className="text-xs text-muted-foreground">
          Steps are ordered by formulation, not by importance, and this page doesn&apos;t tell you what to use. Directions are quoted from
          each product&apos;s FDA label; the product&apos;s own label always comes first. Adding a product to your morning or night steps also
          marks it as one you own; taking it out moves it to Not in my routine.
        </p>
      )}

      <EmailSignupCard signedInAs={person?.email ?? null} />
    </div>
  );
}
