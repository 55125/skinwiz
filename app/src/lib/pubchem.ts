// These canonical active ids are deliberately a family of several distinct
// real compounds grouped under one consumer-facing name (see the comments
// on each in db/actives.ts) -- a single PubChem CID for one of them isn't
// "the" structure the way it is for e.g. niacinamide, so the link is
// worded as "a representative structure" for these specifically.
const GROUPED_ACTIVE_IDS = new Set(["peptides", "ceramides", "aluminum-zirconium-complex"]);

export function pubchemLinkText(activeId: string, molecularFormula: string | null | undefined): string {
  const formula = molecularFormula ? ` (${molecularFormula})` : "";
  return GROUPED_ACTIVE_IDS.has(activeId)
    ? `View a representative structure on PubChem${formula} →`
    : `View chemical structure on PubChem${formula} →`;
}
