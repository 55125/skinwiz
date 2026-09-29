// EWG's own hazard-score bands (1-2 low, 3-6 moderate, 7-10 high) --
// see db/enrich-ewg.ts. Colors run the opposite direction from
// scoreColorClass in lib/scoring.ts: there, higher is better (more people
// rated it well); here, lower is better (less hazardous).
export function ewgHazardBadge(score: number): { label: string; className: string } {
  if (score <= 2) {
    return { label: `EWG ${score}/10`, className: "border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400" };
  }
  if (score <= 6) {
    return { label: `EWG ${score}/10`, className: "border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-400" };
  }
  return { label: `EWG ${score}/10`, className: "border-red-300 text-red-700 dark:border-red-900 dark:text-red-400" };
}
