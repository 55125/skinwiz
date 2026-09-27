// Canonical active-ingredient definitions, shared between the seed script
// and any future admin tooling. Synonym lists fold openFDA's raw
// substance_name duplication (e.g. octinoxate == ethylhexyl
// methoxycinnamate) into one canonical id — see
// tools/catalog_pipeline/README.md's "ingredient-name normalization"
// finding for why this is needed.
//
// `summary` and `typicalConcentrationText` are factual/regulatory
// descriptions only (what the FDA monograph recognizes, not an efficacy
// judgment) — deliberately conservative. No evidenceGrade is set here;
// that field stays null until a verified dermatologist assigns one.

export type ActiveDefinition = {
  id: string;
  canonicalName: string;
  category: "acne" | "sunscreen";
  synonyms: string[];
  summary: string;
  typicalConcentrationText: string;
};

export const ACTIVE_DEFINITIONS: ActiveDefinition[] = [
  {
    id: "benzoyl-peroxide",
    canonicalName: "Benzoyl Peroxide",
    category: "acne",
    synonyms: ["benzoyl peroxide"],
    summary:
      "An FDA OTC monograph antimicrobial acne active. Works by reducing acne-causing bacteria on the skin.",
    typicalConcentrationText: "Typically formulated at 2.5%–10% in OTC products.",
  },
  {
    id: "salicylic-acid",
    canonicalName: "Salicylic Acid",
    category: "acne",
    synonyms: ["salicylic acid"],
    summary:
      "An FDA OTC monograph acne active (also used for other skin concerns like dandruff and wart removal in other product categories). Works as a keratolytic, helping shed dead skin cells that clog pores.",
    typicalConcentrationText: "Typically formulated at 0.5%–2% for acne use.",
  },
  {
    id: "sulfur",
    canonicalName: "Sulfur",
    category: "acne",
    synonyms: ["sulfur", "sulphur"],
    summary: "An FDA OTC monograph acne active, one of the oldest recognized topical acne treatments.",
    typicalConcentrationText: "Typically formulated at 3%–10%.",
  },
  {
    id: "adapalene",
    canonicalName: "Adapalene",
    category: "acne",
    synonyms: ["adapalene"],
    summary:
      "A retinoid switched from prescription to OTC status at 0.1% in 2016. A higher 0.3% strength remains prescription-only.",
    typicalConcentrationText: "OTC formulations are 0.1%.",
  },
  {
    id: "azelaic-acid",
    canonicalName: "Azelaic Acid",
    category: "acne",
    synonyms: ["azelaic acid"],
    summary:
      "In the US, higher-strength azelaic acid (e.g. 15–20%) is prescription-only (Finacea, Azelex). Lower-concentration azelaic acid appears in some cosmetic-labeled products; those are not FDA OTC drug monograph acne treatments.",
    typicalConcentrationText: "Varies — see individual product labeling; not a standardized OTC monograph concentration.",
  },
  {
    id: "zinc-oxide",
    canonicalName: "Zinc Oxide",
    category: "sunscreen",
    synonyms: ["zinc oxide"],
    summary: "An FDA-recognized mineral (physical) sunscreen active, providing broad-spectrum UVA/UVB protection.",
    typicalConcentrationText: "Concentration varies by product and target SPF.",
  },
  {
    id: "titanium-dioxide",
    canonicalName: "Titanium Dioxide",
    category: "sunscreen",
    synonyms: ["titanium dioxide"],
    summary: "An FDA-recognized mineral (physical) sunscreen active, primarily providing UVB and shorter-UVA protection.",
    typicalConcentrationText: "Concentration varies by product and target SPF.",
  },
  {
    id: "avobenzone",
    canonicalName: "Avobenzone",
    category: "sunscreen",
    synonyms: ["avobenzone", "butyl methoxydibenzoylmethane"],
    summary:
      "The only FDA-approved chemical sunscreen active that absorbs across the full UVA1 range. Often paired with other actives for photostability.",
    typicalConcentrationText: "FDA monograph maximum is 3%.",
  },
  {
    id: "octisalate",
    canonicalName: "Octisalate",
    category: "sunscreen",
    synonyms: ["octisalate", "ethylhexyl salicylate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection, often used to help stabilize avobenzone.",
    typicalConcentrationText: "FDA monograph maximum is 5%.",
  },
  {
    id: "octocrylene",
    canonicalName: "Octocrylene",
    category: "sunscreen",
    synonyms: ["octocrylene"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection and photostabilizing other actives.",
    typicalConcentrationText: "FDA monograph maximum is 10%.",
  },
  {
    id: "homosalate",
    canonicalName: "Homosalate",
    category: "sunscreen",
    synonyms: ["homosalate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection.",
    typicalConcentrationText: "FDA monograph maximum is 15%.",
  },
  {
    id: "octinoxate",
    canonicalName: "Octinoxate",
    category: "sunscreen",
    synonyms: ["octinoxate", "ethylhexyl methoxycinnamate", "octyl methoxycinnamate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection. One of the most widely used sunscreen actives globally.",
    typicalConcentrationText: "FDA monograph maximum is 7.5%.",
  },
  {
    id: "oxybenzone",
    canonicalName: "Oxybenzone",
    category: "sunscreen",
    synonyms: ["oxybenzone"],
    summary:
      "An FDA-recognized chemical sunscreen active providing broad UVA/UVB protection. Has drawn environmental and some safety-signal scrutiny in recent years; a board-certified dermatologist should weigh in before any comparative claims are published here.",
    typicalConcentrationText: "FDA monograph maximum is 6%.",
  },
  {
    id: "ensulizole",
    canonicalName: "Ensulizole",
    category: "sunscreen",
    synonyms: ["ensulizole", "phenylbenzimidazole sulfonic acid"],
    summary: "An FDA-recognized water-soluble chemical sunscreen active providing UVB protection.",
    typicalConcentrationText: "FDA monograph maximum is 4%.",
  },
  {
    id: "meradimate",
    canonicalName: "Meradimate",
    category: "sunscreen",
    synonyms: ["meradimate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVA2 protection, typically used alongside other actives.",
    typicalConcentrationText: "FDA monograph maximum is 5%.",
  },
];

/** Returns the canonical active ids whose synonyms appear in the given free text. */
export function matchActiveIds(freeText: string): string[] {
  const lowered = freeText.toLowerCase();
  return ACTIVE_DEFINITIONS.filter((a) => a.synonyms.some((s) => lowered.includes(s))).map((a) => a.id);
}
