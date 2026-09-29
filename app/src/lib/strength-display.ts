import { ACTIVE_DEFINITIONS } from "@/db/actives";
import { formatPct } from "@/db/strength";

const NAME_BY_ID = new Map(ACTIVE_DEFINITIONS.map((a) => [a.id, a.canonicalName]));

export function activeName(activeId: string): string {
  return NAME_BY_ID.get(activeId) ?? activeId;
}

// "Benzoyl peroxide 5% · Salicylic acid 2%" -- actives in the product's own
// order; an active with no parsed strength is listed by name alone rather
// than dropped, so the line never hides an ingredient.
export function describeStrengths(strengths: Record<string, number> | null | undefined, activeIds: string[]): string | null {
  if (!strengths) return null;
  return activeIds
    .map((id) => (id in strengths ? `${activeName(id)} ${formatPct(strengths[id])}` : activeName(id)))
    .join(" · ");
}
