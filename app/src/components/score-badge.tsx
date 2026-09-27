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
    <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5">
      {icon}
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        {result.status === "scored" ? (
          <span className={cn("text-sm font-semibold", scoreColorClass(result.score))}>
            {result.score}% <span className="font-normal text-muted-foreground">({result.count})</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Not yet rated — {result.needed} more needed
          </span>
        )}
      </div>
    </div>
  );
}

export function DualScoreBadges({
  dermScore,
  audienceScore,
}: {
  dermScore: ScoreResult;
  audienceScore: ScoreResult;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ScoreBadge icon={<Stethoscope className="h-4 w-4 text-sky-600" />} label="Derm Score" result={dermScore} />
      <ScoreBadge icon={<Users className="h-4 w-4 text-violet-600" />} label="Audience Score" result={audienceScore} />
    </div>
  );
}
