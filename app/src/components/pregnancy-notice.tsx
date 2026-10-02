import Link from "next/link";
import { Info } from "lucide-react";
import { levelRank, type PregnancyFinding, type SafetyLevel } from "@/db/pregnancy-lactation";
import { cn } from "@/lib/utils";
import { FilterChip } from "@/components/filter-chip";

// Product-page notice for pregnancy & breastfeeding mode. Calm by design:
// neutral/amber, never red, and always framed as a screen of the label
// against general guidance -- not clearance. Rendered only when
// FEATURES.PREGNANCY_MODE is on and the visitor's profile has a flag set.

export const PREGNANCY_GUIDE_PATH = "/guide/pregnancy-breastfeeding";

const LEVEL_TEXT: Record<SafetyLevel, string> = {
  avoid: "Usually avoided",
  caution: "Ask first / use with limits",
  ok: "Generally considered OK",
};

// Cosmetic lists run roughly in descending concentration; past ~12 an
// ingredient is usually a small amount. Labelled drug actives are <= 0.
const LOW_ON_LIST = 12;

type Mode = { key: "pregnancy" | "lactation"; label: string };

export function PregnancyNotice({
  findings,
  pregnant,
  breastfeeding,
  fullList,
}: {
  findings: PregnancyFinding[];
  pregnant: boolean;
  breastfeeding: boolean;
  /** Whether the product's full ingredient list is on file (otherwise only label actives were checked). */
  fullList: boolean;
}) {
  const modes: Mode[] = [
    ...(pregnant ? [{ key: "pregnancy", label: "Pregnancy" } as Mode] : []),
    ...(breastfeeding ? [{ key: "lactation", label: "Breastfeeding" } as Mode] : []),
  ];
  if (modes.length === 0) return null;
  const whenFor = (keys: Mode["key"][]) =>
    keys.length === 2 ? "during pregnancy or breastfeeding" : keys[0] === "pregnancy" ? "during pregnancy" : "while breastfeeding";
  const when = whenFor(modes.map((m) => m.key));

  const worst = (f: PregnancyFinding) => Math.min(...modes.map((m) => levelRank(f[m.key].level)));
  const flagged = findings.filter((f) => worst(f) < levelRank("ok")).sort((a, b) => worst(a) - worst(b));
  const fine = findings.filter((f) => worst(f) === levelRank("ok"));
  const avoidModes = modes.filter((m) => flagged.some((f) => f[m.key].level === "avoid")).map((m) => m.key);
  const anyAvoid = avoidModes.length > 0;

  const footer = (
    <p className="text-xs text-muted-foreground">
      A screen of the published ingredient list against general published guidance, not medical clearance for you. Talk
      to your OB or dermatologist before starting or stopping anything.{" "}
      <Link href={PREGNANCY_GUIDE_PATH} className="underline">
        How we classify ingredients
      </Link>
      {" · "}
      <Link href="/profile" className="underline">
        Edit profile
      </Link>
    </p>
  );

  if (flagged.length === 0) {
    return (
      <div className="space-y-1.5 rounded-xl border px-3.5 py-2.5 text-sm">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            {fullList
              ? `Nothing in this ingredient list is on our list to avoid or ask about ${when}.`
              : `No full ingredient list is on file, so only the label's active ingredients were checked ${when}; none are on our list to avoid or ask about.`}
            {fine.length > 0 && (
              <span className="text-muted-foreground"> Generally considered OK: {fine.map((f) => f.entry.name).join("; ")}.</span>
            )}
          </span>
        </p>
        {footer}
      </div>
    );
  }

  return (
    <div
      role="note"
      className={cn(
        "space-y-2.5 rounded-xl border p-4 text-sm",
        anyAvoid ? "border-amber-300 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30" : "bg-card",
      )}
    >
      <p className="flex items-start gap-2 font-semibold">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        {anyAvoid ? `Contains an ingredient usually avoided ${whenFor(avoidModes)}` : `Worth checking ${when}`}
      </p>
      <ul className="space-y-2.5">
        {flagged.map((f) => (
          <li key={f.entry.id} className="space-y-1">
            <p className="font-medium">
              {f.entry.name}
              {f.position > LOW_ON_LIST && (
                <span className="font-normal text-muted-foreground"> · listed low on the ingredients, likely a small amount</span>
              )}
            </p>
            {modes.map((m) => (
              <p key={m.key} className="text-foreground/80">
                <span className="font-medium">
                  {m.label}: {LEVEL_TEXT[f[m.key].level].toLowerCase()}.
                </span>{" "}
                {f[m.key].note}
              </p>
            ))}
          </li>
        ))}
      </ul>
      {!fullList && <p className="text-xs text-muted-foreground">Only the label&apos;s active ingredients could be checked; no full ingredient list is on file.</p>}
      {fine.length > 0 && <p className="text-xs text-muted-foreground">Also in it, generally considered OK: {fine.map((f) => f.entry.name).join("; ")}.</p>}
      {footer}
    </div>
  );
}

/** Listing filter row: "Hide products to avoid in pregnancy" (?pregnancy=hide). */
export function PregnancyFilter({ href, selected }: { href: string; selected: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
      <FilterChip href={href} selected={selected} showCheck>
        {selected ? "Hiding products to avoid in pregnancy" : "Hide products to avoid in pregnancy"}
      </FilterChip>
      <Link href={PREGNANCY_GUIDE_PATH} className="text-xs font-medium text-brand hover:underline">
        What this hides
      </Link>
      {selected && (
        <p className="basis-full text-[11px] leading-relaxed text-muted-foreground">
          Hides products listing an ingredient usually avoided in pregnancy (retinoids, hydroquinone, coal tar), and
          products without a full ingredient list, since they can&apos;t be checked. Not medical clearance — talk to your
          OB or dermatologist.
        </p>
      )}
    </div>
  );
}
