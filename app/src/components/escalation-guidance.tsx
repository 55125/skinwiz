import { ExternalLink, Stethoscope } from "lucide-react";
import { UNIVERSAL_URGENT, type EscalationGuidance } from "@/db/escalation-guidance";
import { DERM_FINDER } from "@/lib/derm-finder";
import { cn } from "@/lib/utils";

// "When OTC isn't enough" (db/escalation-guidance.ts). Callers render it only
// when FEATURES.ESCALATION_GUIDANCE is on. Educational, never a diagnosis:
// it says when to get seen, not what something is.

export function DermFinderLink({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <a
        href={DERM_FINDER.href}
        target="_blank"
        rel={DERM_FINDER.paid ? "sponsored noopener noreferrer" : "noopener noreferrer"}
        className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3.5 py-1.5 text-sm font-medium text-brand hover:bg-muted"
      >
        {DERM_FINDER.label}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only"> (opens in new tab)</span>
      </a>
      {DERM_FINDER.paid && DERM_FINDER.disclosure && (
        <p className="text-xs font-medium text-foreground">{DERM_FINDER.disclosure}</p>
      )}
      <p className="text-xs text-muted-foreground">{DERM_FINDER.provider}</p>
    </div>
  );
}

function Body({ g }: { g: EscalationGuidance }) {
  const urgent = [...g.urgent, ...UNIVERSAL_URGENT];
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">A fair OTC trial</h3>
        <p className="mt-1">{g.fairTrial}</p>
      </div>
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">See a dermatologist if</h3>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {g.seeDermatologistIf.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">Get care right away</h3>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {urgent.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const FOOTNOTE =
  "General information from OTC labeling and dermatology guidelines, not a diagnosis or advice about your skin.";

/** Full panel for a concern page. */
export function EscalationPanel({ guidance, concernName }: { guidance: EscalationGuidance; concernName: string }) {
  return (
    <section aria-labelledby="otc-not-enough" className="space-y-4 rounded-2xl border bg-card p-5">
      <h2 id="otc-not-enough" className="flex items-center gap-2 text-lg font-semibold">
        <Stethoscope className="h-5 w-5 text-brand" aria-hidden />
        When OTC isn&apos;t enough for {concernName.toLowerCase()}
      </h2>
      <Body g={guidance} />
      <DermFinderLink />
      <p className="text-xs text-muted-foreground">{FOOTNOTE}</p>
    </section>
  );
}

/** Compact, collapsible version for the regimen and shelf pages, one row per concern. */
export function EscalationList({
  title,
  intro,
  items,
}: {
  title: string;
  intro?: React.ReactNode;
  items: { guidance: EscalationGuidance; concernName: string; note?: React.ReactNode }[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Stethoscope className="h-4 w-4 text-brand" aria-hidden /> {title}
      </h2>
      {intro && <div className="text-sm text-muted-foreground">{intro}</div>}
      <div className="divide-y rounded-xl border">
        {items.map(({ guidance, concernName, note }) => (
          <details key={guidance.concernId} className="group px-3.5 py-2.5">
            <summary className="cursor-pointer text-sm font-medium">
              {concernName}
              {guidance.trialWeeks && <span className="font-normal text-muted-foreground"> · a fair trial is about {guidance.trialWeeks === 1 ? "1 week" : `${guidance.trialWeeks} weeks`}</span>}
            </summary>
            <div className="mt-3 space-y-3">
              {note && <p className="text-sm text-foreground/80">{note}</p>}
              <Body g={guidance} />
            </div>
          </details>
        ))}
      </div>
      <DermFinderLink />
      <p className="text-xs text-muted-foreground">{FOOTNOTE}</p>
    </section>
  );
}
