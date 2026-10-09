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

// A cosmetic with no recognized actives: the first few names of its full
// ingredient list ("Water, Glycerin, Cetearyl Alcohol…") stand in for the
// actives line on a card. Commas inside parentheses ("Parfum (Fragrance,
// Linalool)") don't split, and a leading "Ingredients:" label is dropped.
export function firstIngredients(text: string, count = 3): string | null {
  const body = text.replace(/^\s*ingredients?\s*:\s*/i, "");
  const names: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(" || ch === "[") depth++;
    if ((ch === ")" || ch === "]") && depth > 0) depth--;
    if (ch === "," && depth === 0) {
      names.push(current);
      current = "";
    } else current += ch;
  }
  names.push(current);
  const tidy = names.map((n) => tidyIngredientName(n.trim().replace(/\.$/, ""))).filter((n) => n.length > 1);
  if (tidy.length === 0) return null;
  return tidy.slice(0, count).join(", ") + (tidy.length > count ? "…" : "");
}

// The label's dosage form as plain card text: "AEROSOL, SPRAY" becomes
// "Aerosol, spray". Null for a missing or generic form, which says nothing.
export function dosageFormLabel(form: string | null | undefined): string | null {
  const f = form?.trim();
  if (!f || /^otc( product)?$/i.test(f)) return null;
  const lower = f.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
