// Regulatory status for ingredients a government has acted on for safety
// reasons (not allergy). Each note states what a regulator did and links the
// primary text, so a page can say "Washington restricts this" without making
// a health claim of its own. Keyed by contact-allergen ids
// (contact-allergens.ts), because that is how a product's ingredients are
// already matched (products.allergenHits).
//
// Keep notes to facts that can be checked at the source, with the date they
// were last checked. Re-check before relying on a note in marketing.

export type RegulatorySource = { label: string; url: string };

export type RegulatoryNote = {
  id: string;
  /** Short line for banners: what the ingredient does that regulators care about. */
  headline: string;
  /** Product pages: follows "Contains <names>" (", which releases formaldehyde"). */
  productSuffix: string;
  /** One or two sentences: who acted, what they restrict, from when. */
  body: string;
  /** Applies to cosmetics; OTC drugs are regulated separately. */
  cosmeticsOnly: boolean;
  sources: RegulatorySource[];
  checked: string; // YYYY-MM-DD
  /**
   * Well-known products to lead "Where it shows up" with, in order (ids that
   * are gone or no longer list the ingredient simply drop out). The rest
   * follow by availability and popularity.
   */
  featuredProductIds?: string[];
};

const WA_SOURCES: RegulatorySource[] = [
  { label: "Washington State Register WSR 25-18-057", url: "https://lawfilesext.leg.wa.gov/Law/WSR/2025/18/25-18-057.htm" },
  {
    label: "Washington Department of Ecology: Toxic-Free Cosmetics Act",
    url: "https://ecology.wa.gov/waste-toxics/reducing-toxic-chemicals/washingtons-toxics-in-products-laws/toxic-free-cosmetics-act",
  },
];

export const REGULATORY_NOTES: Record<string, RegulatoryNote> = {
  "wa-formaldehyde-releaser": {
    id: "wa-formaldehyde-releaser",
    headline: "Releases formaldehyde",
    productSuffix: ", which releases formaldehyde",
    featuredProductIds: [
      "4902430917872", // Olay Regenerist Retinol 24 Night Moisturiser
      "69423-194", // Olay Complete UV365 Daily Moisturizer Sensitive SPF 15
      "66800-2450", // Coppertone Kids Tear Free Mineral Sunscreen SPF 50
      "41167-0035", // Cortizone 10 Intensive Healing
      "41167-0507", // Gold Bond Intensive Relief Anti-Itch
      "5012254060735", // TRESemmé Color Revitalise shampoo
      "0383711005305", // Suave Coconut Oil Infusion conditioner
      "0022796906717", // OGX Thick & Full Biotin & Collagen conditioner
    ],
    body:
      "Formaldehyde releasers are ingredients, mostly preservatives, that slowly release small amounts of formaldehyde. Washington State restricts formaldehyde releasers in cosmetics from January 1, 2027 (stores may sell existing stock through December 31, 2027). The state adopted the rule because formaldehyde can cause cancer, asthma and skin allergies.",
    cosmeticsOnly: true,
    sources: WA_SOURCES,
    checked: "2026-11-11",
  },
  "wa-formaldehyde": {
    id: "wa-formaldehyde",
    headline: "Formaldehyde",
    productSuffix: "",
    body:
      "Washington State has restricted intentionally added formaldehyde in cosmetics since January 1, 2025, and restricts chemicals that release it from January 1, 2027. The state cites formaldehyde's links to cancer, asthma and skin allergies.",
    cosmeticsOnly: true,
    sources: WA_SOURCES,
    checked: "2026-11-11",
  },
};

// Contact-allergen ids on Washington's adopted list of 25 formaldehyde
// releasers (WAC 173-339, Table 1). Hydroxyethyl triazine isn't on it.
const WA_RELEASERS = [
  "dmdm-hydantoin",
  "diazolidinyl-urea",
  "imidazolidinyl-urea",
  "quaternium-15",
  "tosylamide-formaldehyde-resin",
  "bronopol",
  "sodium-hydroxymethylglycinate",
  "polyoxymethylene-urea",
  "melamine-formaldehyde", // polyoxymethylene melamine, CAS 9003-08-1
  "bronidox",
  "ethylbicyclooxazolidine",
  "benzylhemiformal",
  "dimethyl-oxazolidine",
  "mdm-hydantoin",
  "methenamine",
  "tris-nitro",
];

const NOTE_BY_ALLERGEN: Record<string, string> = {
  formaldehyde: "wa-formaldehyde",
  ...Object.fromEntries(WA_RELEASERS.map((id) => [id, "wa-formaldehyde-releaser"])),
};

export function regulatoryNoteFor(allergenId: string): RegulatoryNote | undefined {
  const id = NOTE_BY_ALLERGEN[allergenId];
  return id ? REGULATORY_NOTES[id] : undefined;
}

export function hasRegulatoryNote(allergenId: string): boolean {
  return allergenId in NOTE_BY_ALLERGEN;
}

/** The notes that apply to a product's allergen hits, each with the matched ingredients. */
export function regulatoryNotesForHits(hits: string[] | null | undefined): { note: RegulatoryNote; allergenIds: string[] }[] {
  const out = new Map<string, { note: RegulatoryNote; allergenIds: string[] }>();
  for (const h of hits ?? []) {
    const note = regulatoryNoteFor(h);
    if (!note) continue;
    const entry = out.get(note.id) ?? { note, allergenIds: [] };
    entry.allergenIds.push(h);
    out.set(note.id, entry);
  }
  return [...out.values()];
}

/**
 * The note for a group page: shown when every member that has a note shares
 * the same one (the formaldehyde-releasers family); mixed groups show none.
 */
export function regulatoryNoteForGroup(memberIds: string[]): RegulatoryNote | undefined {
  const ids = new Set(memberIds.map((m) => NOTE_BY_ALLERGEN[m]).filter(Boolean));
  if (ids.size === 1) return REGULATORY_NOTES[[...ids][0]];
  if (ids.size === 2 && ids.has("wa-formaldehyde") && ids.has("wa-formaldehyde-releaser")) return REGULATORY_NOTES["wa-formaldehyde"];
  return undefined;
}
