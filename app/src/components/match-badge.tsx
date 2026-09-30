import { Badge } from "@/components/ui/badge";
import { matchClasses, type Match } from "@/lib/profile-shared";

export function MatchBadge({ match }: { match: Match }) {
  return (
    <Badge variant="outline" className={matchClasses(match.label)} title={match.reasons.map((r) => r.text).join("; ")}>
      {match.score}% · {match.label}
    </Badge>
  );
}
