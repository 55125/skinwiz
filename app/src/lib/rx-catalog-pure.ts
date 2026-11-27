// Pure helpers for prescription rows (no DB), shared by lib/rx-catalog.ts and lib/rx-browse.ts.

/** "Tretinoin 0.025% cream" -- generic + strength + vehicle, the way a prescriber writes it. */
export function rxDisplayName(p: { genericName: string | null; strengthText: string | null; dosageForm: string | null; brandName: string }): string {
  const generic = p.genericName?.trim() || p.brandName;
  const strengths = (p.strengthText ?? "")
    .split(";")
    .map((s) => s.trim().match(/(\d[\d.]*\s*(?:%|mg|mcg|ug|g)(?![a-z]).*)$/i)?.[1] ?? "")
    .filter(Boolean);
  const form = (p.dosageForm ?? "").toLowerCase().replace(/^aerosol, /, "").replace(/, augmented$/, " (augmented)");
  const words = [generic, strengths.join(" / "), form].filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
