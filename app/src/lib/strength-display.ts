import { ACTIVE_DEFINITIONS } from "@/db/actives";
import { formatPct } from "@/db/strength";
import { tidyIngredientName } from "@/lib/format";

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

// An FDA active line the strength parser couldn't read ("SALICYLIC ACID 1.8
// mg/180mL", ".14 mg/1"): almost always a filing slip (mg where g was meant,
// or per patch), so converting it would print a wrong percentage. Show the
// active names alone and say the strength isn't clear.
export function unparsedActivesLine(text: string): string | null {
  // A percentage in the text is readable as printed.
  if (/\d\s*%/.test(text)) return null;
  const names = text
    .split(";")
    .map((seg) => seg.replace(/\s*[\d.]+\s*[a-z%[\]_]*\s*(\/\s*[\d.]*\s*[a-z[\]_]*)?\s*$/i, "").trim())
    .filter((n) => n.length > 1 && !/^[\d.\s/%]+$/.test(n))
    .map(tidyIngredientName);
  if (names.length === 0) return null;
  return `${[...new Set(names)].join(" · ")} · strength unclear on the label`;
}
