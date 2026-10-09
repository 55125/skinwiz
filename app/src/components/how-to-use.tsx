import { BookOpen, ClipboardList } from "lucide-react";
import type { labelSections } from "@/db/schema";
import type { ActiveGuidance, FormulationGuidance } from "@/db/usage-guidance";
import { ACTIVE_DEFINITIONS } from "@/db/actives";
import { IngredientLink } from "@/components/ingredient-link";

const ACTIVE_NAME = new Map(ACTIVE_DEFINITIONS.map((a) => [a.id, a.canonicalName]));

type Label = typeof labelSections.$inferSelect;

// Labels often run their bullet points together on one line; break them out
// so the wording stays verbatim but reads as a list.
function labelText(text: string) {
  return text.replace(/\s*[•■▪●◦]\s*/g, "\n• ").replace(/^\n/, "").trim();
}

const WARNING_PARTS: { key: keyof Label; title: string }[] = [
  { key: "doNotUse", title: "Do not use" },
  { key: "whenUsing", title: "When using this product" },
  { key: "stopUse", title: "Stop use and ask a doctor if" },
  { key: "askDoctor", title: "Ask a doctor before use if you have" },
  { key: "warnings", title: "Warnings" },
];

/**
 * How to use a product: its FDA label's own Directions (verbatim), then any
 * dermatologist-reviewed guidance for its actives and formulation. Renders
 * nothing when there's neither.
 */
export function HowToUse({
  label,
  activeGuidance,
  formulation,
  compact,
}: {
  label: Label | null;
  activeGuidance: (ActiveGuidance & { draft: boolean })[];
  formulation: (FormulationGuidance & { draft: boolean }) | null;
  compact?: boolean;
}) {
  const warnings = label ? WARNING_PARTS.filter((w) => label[w.key]) : [];
  if (!label?.directions && warnings.length === 0 && activeGuidance.length === 0 && !formulation) return null;

  return (
    <div className={compact ? "space-y-3" : "space-y-4 rounded-xl border bg-card p-4"}>
      {!compact && (
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> How to use
        </h2>
      )}

      {label?.directions && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Directions (from the FDA label)</p>
          <p className="whitespace-pre-line text-sm leading-relaxed">{labelText(label.directions)}</p>
        </div>
      )}

      {warnings.length > 0 && (
        <details className="group rounded-lg border bg-background/60 px-3 py-2 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Warnings (from the FDA label)</summary>
          <div className="mt-2 space-y-2">
            {warnings.map((w) => (
              <div key={w.key}>
                <p className="text-xs font-semibold">{w.title}</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{labelText(label![w.key] as string)}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {activeGuidance.map((g) => (
        <div key={g.activeId} className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" /> Using{" "}
            <IngredientLink id={g.activeId}>{(ACTIVE_NAME.get(g.activeId) ?? g.activeId).toLowerCase()}</IngredientLink>
            {g.draft && <span className="rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-amber-900">Draft</span>}
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm leading-relaxed">
            {g.howToUse.map((h) => <li key={h}>{h}</li>)}
          </ul>
          <p className="text-sm text-foreground/85"><span className="font-medium">How often:</span> {g.frequency}</p>
          {g.startSlowly && <p className="text-sm text-foreground/85"><span className="font-medium">Starting out:</span> {g.startSlowly}</p>}
          {g.waitBeforeNext && <p className="text-sm text-foreground/85"><span className="font-medium">Before the next step:</span> {g.waitBeforeNext}</p>}
          {g.cautions.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
              {g.cautions.map((c) => <li key={c}>{c}</li>)}
            </ul>
          )}
        </div>
      ))}

      {formulation && (
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            Applying a {formulation.label.toLowerCase()}
            {formulation.draft && <span className="rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-amber-900">Draft</span>}
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm leading-relaxed">
            {formulation.howToApply.map((h) => <li key={h}>{h}</li>)}
          </ul>
          <p className="text-sm text-muted-foreground">{formulation.layering}</p>
        </div>
      )}

      {(activeGuidance.length > 0 || formulation) && (
        <p className="text-xs text-muted-foreground">General information, not medical advice. The product&apos;s own label always comes first.</p>
      )}
    </div>
  );
}
