import { Stethoscope, Users } from "lucide-react";
import { ScoreResult, scoreColorClass } from "@/lib/scoring";
import { cn } from "@/lib/utils";

function ScoreBadge({
  icon,
  label,
  result,
}: {
  icon: React.ReactNode;
  label: string;
  result: ScoreResult;
}) {
  return (
    <div className="flex min-w-44 flex-1 items-center gap-3 rounded-xl border bg-card px-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {result.status === "scored" ? (
          <span className={cn("text-lg font-semibold tabular-nums", scoreColorClass(result.score))}>
            {result.score}%{" "}
            <span className="text-xs font-normal text-muted-foreground">from {result.count}</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            Not yet rated · {result.needed} more needed
          </span>
        )}
      </div>
    </div>
  );
}

function CompactScore({ icon, label, result }: { icon: React.ReactNode; label: string; result: ScoreResult }) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      <span className="text-muted-foreground">{label}</span>
      {result.status === "scored" ? (
        <span className={cn("font-semibold tabular-nums", scoreColorClass(result.score))}>{result.score}%</span>
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
  if (compact) {
    return (
      <div className="flex items-center gap-4 text-xs">
        <CompactScore icon={<Stethoscope className="h-3.5 w-3.5 text-sky-600" />} label="Derm" result={dermScore} />
        <CompactScore icon={<Users className="h-3.5 w-3.5 text-violet-600" />} label="Audience" result={audienceScore} />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      <ScoreBadge icon={<Stethoscope className="h-4 w-4 text-sky-600" />} label="Derm Score" result={dermScore} />
      <ScoreBadge icon={<Users className="h-4 w-4 text-violet-600" />} label="Audience Score" result={audienceScore} />
    </div>
  );
}
