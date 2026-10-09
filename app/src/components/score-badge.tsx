import { Stethoscope, Users } from "lucide-react";
import { DERM_PANEL_LAUNCHED, ScoreResult, USER_COUNT_SHOWN_ABOVE, scoreColorClass } from "@/lib/scoring";
import { cn } from "@/lib/utils";

function ScoreBadge({
  icon,
  label,
  result,
  hideSmallCounts,
  unscoredText,
}: {
  icon: React.ReactNode;
  label: string;
  result: ScoreResult;
  hideSmallCounts?: boolean;
  unscoredText?: string;
}) {
  const early = hideSmallCounts && result.count <= USER_COUNT_SHOWN_ABOVE;
  return (
    <div className="flex min-w-44 flex-1 items-center gap-3 rounded-xl border bg-card px-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {result.status === "scored" ? (
          <span className={cn("text-lg font-semibold tabular-nums", scoreColorClass(result.score))}>
            {result.score}%{" "}
            {early ? (
              <span
                className="rounded-full bg-muted px-1.5 py-px align-middle text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                title="Based on the first few reported outcomes"
              >
                Early
              </span>
            ) : (
              <span className="text-xs font-normal text-muted-foreground">from {result.count}</span>
            )}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            {unscoredText ?? (early ? "Not enough reports yet" : `Not yet rated · ${result.needed} more needed`)}
          </span>
        )}
      </div>
    </div>
  );
}

function CompactScore({
  icon,
  label,
  result,
  hideSmallCounts,
}: {
  icon: React.ReactNode;
  label: string;
  result: ScoreResult;
  hideSmallCounts?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      <span className="text-muted-foreground">{label}</span>
      {result.status === "scored" ? (
        <>
          <span className={cn("font-semibold tabular-nums", scoreColorClass(result.score))}>{result.score}%</span>
          {hideSmallCounts && result.count <= USER_COUNT_SHOWN_ABOVE && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground" title="Based on the first few reported outcomes">
              early
            </span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground" aria-label="not yet rated">—</span>
      )}
    </span>
  );
}

export function DualScoreBadges({
  dermScore,
  audienceScore,
  compact,
}: {
  dermScore: ScoreResult;
  audienceScore: ScoreResult;
  compact?: boolean;
}) {
  // No Derm Score slot until the dermatologist panel launches: an empty
  // "coming soon" badge on every product reads as an unfinished site.
  const showDerm = DERM_PANEL_LAUNCHED;
  if (compact) {
    return (
      <div className="flex items-center gap-4 text-xs">
        {showDerm && <CompactScore icon={<Stethoscope className="h-3.5 w-3.5 text-sky-600" />} label="Derm" result={dermScore} />}
        <CompactScore icon={<Users className="h-3.5 w-3.5 text-violet-600" />} label="User" result={audienceScore} hideSmallCounts />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      {showDerm && <ScoreBadge icon={<Stethoscope className="h-4 w-4 text-sky-600" />} label="Derm Score" result={dermScore} />}
      <ScoreBadge icon={<Users className="h-4 w-4 text-violet-600" />} label="User Score" result={audienceScore} hideSmallCounts />
    </div>
  );
}
