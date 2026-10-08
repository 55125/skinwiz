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
//
// `categories` is an array, not a single value, because several actives
// are recognized for more than one concern (salicylic acid: acne AND
// antidandruff; zinc oxide: sunscreen AND skin protectant) — a product's
// concernId still comes from which openFDA purpose query found it
// (tools/catalog_pipeline), this only drives the "actives for this
// concern" filter chips and which concerns get an evidence note for a
// given active.

export type Concern =
  | "acne"
  | "sunscreen"
  | "antifungal"
  | "antidandruff"
  | "anti-itch"
  | "skin-protectant"
  | "antiperspirant"
  | "brightening-texture";

// Maps each niche key (used throughout tools/catalog_pipeline and this
// file's `categories` arrays) to the concern row shown in the UI. Kept in
// one place so seed.ts and lib/queries.ts don't each hardcode their own
// copy of this mapping.
export const CONCERN_DEFINITIONS: { niche: Concern; id: string; name: string; description: string }[] = [
  { niche: "acne", id: "acne", name: "Acne", description: "Evidence-graded OTC actives and products for acne-prone skin." },
  { niche: "sunscreen", id: "sun-protection", name: "Sun Protection", description: "FDA-recognized sunscreen actives and products." },
  { niche: "antifungal", id: "antifungal", name: "Antifungal", description: "OTC actives and products for athlete's foot, jock itch, and ringworm." },
  { niche: "antidandruff", id: "dandruff-seb-derm", name: "Dandruff & Seborrheic Dermatitis", description: "OTC actives and products for flaking, itchy, or seborrheic scalp." },
  { niche: "anti-itch", id: "itch-relief", name: "Itch Relief", description: "OTC actives and products for itch from eczema, insect bites, poison ivy, and minor irritation." },
  { niche: "skin-protectant", id: "dry-skin-eczema", name: "Dry Skin & Eczema", description: "OTC skin-protectant actives and products for dry, chapped, or eczema-prone skin." },
  { niche: "antiperspirant", id: "excessive-sweating", name: "Excessive Sweating", description: "OTC antiperspirant actives and products." },
  {
    niche: "brightening-texture",
    id: "brightening-texture",
    name: "Brightening & Texture",
    description: "Cosmetic actives and products for skin tone, texture, and pore appearance — not FDA drug claims.",
  },
];

export function nicheToConcernId(niche: string): string {
  const match = CONCERN_DEFINITIONS.find((c) => c.niche === niche);
  if (!match) throw new Error(`Unknown niche: ${niche}`);
  return match.id;
}

export function concernIdToNiche(concernId: string): Concern {
  const match = CONCERN_DEFINITIONS.find((c) => c.id === concernId);
  if (!match) throw new Error(`Unknown concern id: ${concernId}`);
  return match.niche;
}

export type ActiveDefinition = {
  id: string;
  canonicalName: string;
  categories: Concern[];
  synonyms: string[];
  summary: string;
  typicalConcentrationText: string;
  // UV filters only: counts as one of the product's actives wherever it
  // appears in the full ingredient list, not just on a Drug Facts active
  // line. Several filters (bemotrizinol before its June 2026 US approval,
  // and the ones still only approved abroad) show up in "inactive" lists of
  // US labels and in cosmetic INCI lists, yet are doing a sunscreen active's
  // job. Not set for zinc oxide / titanium dioxide, which are also common
  // colorants (CI 77947 / CI 77891) in makeup.
  countsAnywhereListed?: boolean;
};

export const ACTIVE_DEFINITIONS: ActiveDefinition[] = [
  // --- Acne ---
  {
    id: "benzoyl-peroxide",
    canonicalName: "Benzoyl Peroxide",
    categories: ["acne"],
    synonyms: ["benzoyl peroxide"],
    summary:
      "An FDA OTC monograph antimicrobial acne active. Works by reducing acne-causing bacteria on the skin.",
    typicalConcentrationText: "Typically formulated at 2.5%–10% in OTC products.",
  },
  {
    id: "salicylic-acid",
    canonicalName: "Salicylic Acid",
    categories: ["acne", "antidandruff"],
    synonyms: ["salicylic acid"],
    summary:
      "An FDA OTC monograph active recognized for both acne and dandruff/seborrheic dermatitis (also used for wart removal in other product categories). Works as a keratolytic, helping shed dead skin cells.",
    typicalConcentrationText: "Typically 0.5%–2% for acne use; concentration varies for dandruff/scalp use.",
  },
  {
    id: "sulfur",
    canonicalName: "Sulfur",
    categories: ["acne", "antidandruff"],
    synonyms: ["sulfur", "sulphur"],
    summary:
      "An FDA OTC monograph active recognized for both acne and dandruff/seborrheic dermatitis, one of the oldest recognized topical treatments in either use.",
    typicalConcentrationText: "Typically formulated at 3%–10%.",
  },
  {
    id: "adapalene",
    canonicalName: "Adapalene",
    categories: ["acne"],
    synonyms: ["adapalene"],
    summary:
      "A retinoid switched from prescription to OTC status at 0.1% in 2016. A higher 0.3% strength remains prescription-only.",
    typicalConcentrationText: "OTC formulations are 0.1%.",
  },
  {
    id: "azelaic-acid",
    canonicalName: "Azelaic Acid",
    categories: ["acne", "brightening-texture"],
    synonyms: ["azelaic acid"],
    summary:
      "In the US, higher-strength azelaic acid (e.g. 15–20%) is prescription-only (Finacea, Azelex). Lower-concentration azelaic acid appears in some cosmetic-labeled products; those are not FDA OTC drug monograph acne treatments.",
    typicalConcentrationText: "Varies — see individual product labeling; not a standardized OTC monograph concentration.",
  },
  {
    id: "resorcinol",
    canonicalName: "Resorcinol",
    categories: ["acne"],
    synonyms: ["resorcinol monoacetate", "resorcinol"],
    summary:
      "An FDA OTC monograph acne active permitted only in combination with sulfur (resorcinol 2% or resorcinol monoacetate 3%). Works as a keratolytic.",
    typicalConcentrationText: "2% (or 3% as resorcinol monoacetate), combined with 3%–8% sulfur.",
  },

  // --- Sunscreen ---
  {
    id: "zinc-oxide",
    canonicalName: "Zinc Oxide",
    categories: ["sunscreen", "skin-protectant"],
    synonyms: ["zinc oxide"],
    summary:
      "An FDA-recognized mineral active with two distinct monograph uses: broad-spectrum UVA/UVB sunscreen, and skin protectant (e.g. diaper rash, minor skin irritation).",
    typicalConcentrationText: "Concentration varies by product and intended use.",
  },
  {
    id: "titanium-dioxide",
    canonicalName: "Titanium Dioxide",
    categories: ["sunscreen"],
    synonyms: ["titanium dioxide"],
    summary: "An FDA-recognized mineral (physical) sunscreen active, primarily providing UVB and shorter-UVA protection.",
    typicalConcentrationText: "Concentration varies by product and target SPF.",
  },
  {
    id: "avobenzone",
    canonicalName: "Avobenzone",
    categories: ["sunscreen"],
    synonyms: ["avobenzone", "butyl methoxydibenzoylmethane"],
    summary:
      "The only FDA-approved chemical sunscreen active that absorbs across the full UVA1 range. Often paired with other actives for photostability.",
    typicalConcentrationText: "FDA monograph maximum is 3%.",
    countsAnywhereListed: true,
  },
  {
    id: "octisalate",
    canonicalName: "Octisalate",
    categories: ["sunscreen"],
    synonyms: ["octisalate", "ethylhexyl salicylate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection, often used to help stabilize avobenzone.",
    typicalConcentrationText: "FDA monograph maximum is 5%.",
    countsAnywhereListed: true,
  },
  {
    id: "octocrylene",
    canonicalName: "Octocrylene",
    categories: ["sunscreen"],
    synonyms: ["octocrylene"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection and photostabilizing other actives.",
    typicalConcentrationText: "FDA monograph maximum is 10%.",
    countsAnywhereListed: true,
  },
  {
    id: "homosalate",
    canonicalName: "Homosalate",
    categories: ["sunscreen"],
    synonyms: ["homosalate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection.",
    typicalConcentrationText: "FDA monograph maximum is 15%.",
    countsAnywhereListed: true,
  },
  {
    id: "octinoxate",
    canonicalName: "Octinoxate",
    categories: ["sunscreen"],
    synonyms: ["octinoxate", "ethylhexyl methoxycinnamate", "octyl methoxycinnamate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection. One of the most widely used sunscreen actives globally.",
    typicalConcentrationText: "FDA monograph maximum is 7.5%.",
    countsAnywhereListed: true,
  },
  {
    id: "oxybenzone",
    canonicalName: "Oxybenzone",
    categories: ["sunscreen"],
    synonyms: ["oxybenzone", "benzophenone-3", "benzophenone 3"],
    summary:
      "An FDA-recognized chemical sunscreen active providing broad UVA/UVB protection. Has drawn environmental and some safety-signal scrutiny in recent years; a board-certified dermatologist should weigh in before any comparative claims are published here.",
    typicalConcentrationText: "FDA monograph maximum is 6%.",
    countsAnywhereListed: true,
  },
  {
    id: "ensulizole",
    canonicalName: "Ensulizole",
    categories: ["sunscreen"],
    synonyms: ["ensulizole", "phenylbenzimidazole sulfonic acid"],
    summary: "An FDA-recognized water-soluble chemical sunscreen active providing UVB protection.",
    typicalConcentrationText: "FDA monograph maximum is 4%.",
    countsAnywhereListed: true,
  },
  {
    id: "meradimate",
    canonicalName: "Meradimate",
    categories: ["sunscreen"],
    synonyms: ["meradimate", "menthyl anthranilate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVA2 protection, typically used alongside other actives.",
    typicalConcentrationText: "FDA monograph maximum is 5%.",
    countsAnywhereListed: true,
  },

  // Monograph filters with no current catalog use, tracked so a label that
  // lists one isn't silently dropped (21 CFR 352.10).
  {
    id: "sulisobenzone",
    canonicalName: "Sulisobenzone",
    categories: ["sunscreen"],
    synonyms: ["sulisobenzone", "benzophenone-4", "benzophenone 4"],
    summary: "An FDA-recognized water-soluble chemical sunscreen active (benzophenone-4) providing UVB and short-UVA protection.",
    typicalConcentrationText: "FDA monograph maximum is 10%.",
    countsAnywhereListed: true,
  },
  {
    id: "dioxybenzone",
    canonicalName: "Dioxybenzone",
    categories: ["sunscreen"],
    synonyms: ["dioxybenzone", "benzophenone-8"],
    summary: "An FDA-recognized chemical sunscreen active (benzophenone-8), rarely used in current products.",
    typicalConcentrationText: "FDA monograph maximum is 3%.",
    countsAnywhereListed: true,
  },
  {
    id: "cinoxate",
    canonicalName: "Cinoxate",
    categories: ["sunscreen"],
    synonyms: ["cinoxate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection, rarely used in current products.",
    typicalConcentrationText: "FDA monograph maximum is 3%.",
    countsAnywhereListed: true,
  },
  {
    id: "padimate-o",
    canonicalName: "Padimate O",
    categories: ["sunscreen"],
    synonyms: ["padimate o", "padimate-o", "ethylhexyl dimethyl paba", "octyl dimethyl paba"],
    summary: "An FDA-recognized PABA-derived chemical sunscreen active providing UVB protection.",
    typicalConcentrationText: "FDA monograph maximum is 8%.",
    countsAnywhereListed: true,
  },
  {
    id: "aminobenzoic-acid",
    canonicalName: "Aminobenzoic Acid (PABA)",
    categories: ["sunscreen"],
    synonyms: ["aminobenzoic acid", "para-aminobenzoic acid", "p-aminobenzoic acid"],
    summary:
      "A UVB sunscreen active in the original FDA monograph. FDA's 2019 proposed rule found it not generally recognized as safe and effective, and it has largely disappeared from US products.",
    typicalConcentrationText: "FDA monograph maximum is 15%.",
    countsAnywhereListed: true,
  },
  {
    id: "trolamine-salicylate",
    canonicalName: "Trolamine Salicylate",
    categories: ["sunscreen"],
    synonyms: ["trolamine salicylate"],
    summary:
      "A UVB sunscreen active in the original FDA monograph (also sold as a topical analgesic). FDA's 2019 proposed rule found it not generally recognized as safe and effective as a sunscreen.",
    typicalConcentrationText: "FDA monograph maximum is 12%.",
    countsAnywhereListed: true,
  },

  // Newer UV filters. Bemotrizinol joined the US monograph in June 2026; the
  // rest are approved in the EU, UK, Australia, Japan and/or Korea but not
  // (yet) as US OTC sunscreen actives, so they turn up in imported and
  // cosmetic-labeled products, often in the "inactive" list.
  {
    id: "bemotrizinol",
    canonicalName: "Bemotrizinol (Tinosorb S)",
    categories: ["sunscreen"],
    synonyms: [
      "bemotrizinol",
      "bis-ethylhexyloxyphenol methoxyphenyl triazine",
      "bis ethylhexyloxyphenol methoxyphenyl triazine",
      "bisethylhexyloxyphenol methoxyphenyl triazine",
      "tinosorb s",
      "parsol shield",
      "escalol s",
      "anisotriazine",
      "bemt",
    ],
    summary:
      "A broad-spectrum (UVB through long UVA) photostable chemical sunscreen filter, also sold as Tinosorb S. Long approved in the EU, Australia and Asia; FDA added it to the US OTC sunscreen monograph in June 2026, the first new US sunscreen active in over 20 years.",
    typicalConcentrationText: "US monograph maximum is 6%; EU maximum is 10%.",
    countsAnywhereListed: true,
  },
  {
    id: "bisoctrizole",
    canonicalName: "Bisoctrizole (Tinosorb M)",
    categories: ["sunscreen"],
    synonyms: ["bisoctrizole", "methylene bis-benzotriazolyl tetramethylbutylphenol", "methylene bis benzotriazolyl tetramethylbutylphenol", "tinosorb m"],
    summary:
      "A broad-spectrum particulate organic UV filter (Tinosorb M). Approved in the EU, Australia and Asia; not an FDA-recognized US sunscreen active.",
    typicalConcentrationText: "EU maximum is 10%; not a US monograph active.",
    countsAnywhereListed: true,
  },
  {
    id: "ecamsule",
    canonicalName: "Ecamsule (Mexoryl SX)",
    categories: ["sunscreen"],
    synonyms: ["ecamsule", "terephthalylidene dicamphor sulfonic acid", "mexoryl sx"],
    summary:
      "A water-soluble UVA filter (Mexoryl SX). Approved in the US only within specific L'Oréal products under a new drug application, not the OTC monograph; widely approved abroad.",
    typicalConcentrationText: "EU maximum is 10%; US use is limited to the approved product formulations.",
    countsAnywhereListed: true,
  },
  {
    id: "drometrizole-trisiloxane",
    canonicalName: "Drometrizole Trisiloxane (Mexoryl XL)",
    categories: ["sunscreen"],
    synonyms: ["drometrizole trisiloxane", "mexoryl xl"],
    summary: "An oil-soluble UVB/UVA filter (Mexoryl XL). Approved in the EU and elsewhere; not an FDA-recognized US sunscreen active.",
    typicalConcentrationText: "EU maximum is 15%; not a US monograph active.",
    countsAnywhereListed: true,
  },
  {
    id: "diethylamino-hydroxybenzoyl-hexyl-benzoate",
    canonicalName: "Diethylamino Hydroxybenzoyl Hexyl Benzoate (Uvinul A Plus)",
    categories: ["sunscreen"],
    synonyms: ["diethylamino hydroxybenzoyl hexyl benzoate", "uvinul a plus", "dhhb"],
    summary: "A photostable UVA1 filter (Uvinul A Plus). Approved in the EU, Japan and elsewhere; not an FDA-recognized US sunscreen active.",
    typicalConcentrationText: "EU maximum is 10%; not a US monograph active.",
    countsAnywhereListed: true,
  },
  {
    id: "ethylhexyl-triazone",
    canonicalName: "Ethylhexyl Triazone (Uvinul T 150)",
    categories: ["sunscreen"],
    synonyms: ["ethylhexyl triazone", "octyl triazone", "octyltriazone", "uvinul t 150", "uvinul t-150"],
    summary: "A highly efficient, photostable UVB filter (Uvinul T 150). Approved in the EU and elsewhere; not an FDA-recognized US sunscreen active.",
    typicalConcentrationText: "EU maximum is 5%; not a US monograph active.",
    countsAnywhereListed: true,
  },
  {
    id: "iscotrizinol",
    canonicalName: "Iscotrizinol (Uvasorb HEB)",
    categories: ["sunscreen"],
    synonyms: ["iscotrizinol", "diethylhexyl butamido triazone", "uvasorb heb"],
    summary: "A photostable UVB/UVA2 filter (Uvasorb HEB). Approved in the EU and elsewhere; pending, not yet recognized, as a US sunscreen active.",
    typicalConcentrationText: "EU maximum is 10%; not a US monograph active.",
    countsAnywhereListed: true,
  },
  {
    id: "amiloxate",
    canonicalName: "Amiloxate",
    categories: ["sunscreen"],
    synonyms: ["amiloxate", "isoamyl p-methoxycinnamate", "isoamyl methoxycinnamate", "isopentyl-4-methoxycinnamate", "isopentyl 4-methoxycinnamate"],
    summary: "A UVB filter (isoamyl p-methoxycinnamate) approved in the EU and pending, not yet recognized, as a US sunscreen active.",
    typicalConcentrationText: "EU maximum is 10%; not a US monograph active.",
    countsAnywhereListed: true,
  },
  {
    id: "enzacamene",
    canonicalName: "Enzacamene (4-MBC)",
    categories: ["sunscreen"],
    synonyms: ["enzacamene", "4-methylbenzylidene camphor", "4-methylbenzylidene-camphor", "4-mbc"],
    summary:
      "A UVB filter (4-methylbenzylidene camphor). Pending, not recognized, in the US, and the EU withdrew its approval in 2025 over endocrine-disruption concerns; it may still appear in older or non-EU products.",
    typicalConcentrationText: "Not a US monograph active; no longer permitted in EU cosmetics.",
    countsAnywhereListed: true,
  },
  {
    id: "polysilicone-15",
    canonicalName: "Polysilicone-15 (Parsol SLX)",
    categories: ["sunscreen"],
    synonyms: ["polysilicone-15", "polysilicone 15", "parsol slx"],
    summary: "A silicone-based UVB filter (Parsol SLX). Approved in the EU and elsewhere; not an FDA-recognized US sunscreen active.",
    typicalConcentrationText: "EU maximum is 10%; not a US monograph active.",
    countsAnywhereListed: true,
  },
  {
    id: "bisdisulizole-disodium",
    canonicalName: "Bisdisulizole Disodium (Neo Heliopan AP)",
    categories: ["sunscreen"],
    synonyms: ["bisdisulizole disodium", "disodium phenyl dibenzimidazole tetrasulfonate", "neo heliopan ap"],
    summary: "A water-soluble UVA filter (Neo Heliopan AP). Approved in the EU and elsewhere; not an FDA-recognized US sunscreen active.",
    typicalConcentrationText: "EU maximum is 10% (as acid); not a US monograph active.",
    countsAnywhereListed: true,
  },
  {
    id: "methoxypropylamino-cyclohexenylidene-ethoxyethylcyanoacetate",
    canonicalName: "Mexoryl 400",
    categories: ["sunscreen"],
    synonyms: ["methoxypropylamino cyclohexenylidene ethoxyethylcyanoacetate", "mexoryl 400"],
    summary: "A long-UVA (UVA1) filter (Mexoryl 400), approved in the EU in 2022; not an FDA-recognized US sunscreen active.",
    typicalConcentrationText: "EU maximum is 3%; not a US monograph active.",
    countsAnywhereListed: true,
  },
  {
    id: "phenylene-bis-diphenyltriazine",
    canonicalName: "Phenylene Bis-Diphenyltriazine (TriAsorB)",
    categories: ["sunscreen"],
    synonyms: ["phenylene bis-diphenyltriazine", "phenylene bis diphenyltriazine", "triasorb"],
    summary: "A broad-spectrum particulate UV filter (TriAsorB), approved in the EU in 2023; not an FDA-recognized US sunscreen active.",
    typicalConcentrationText: "EU maximum is 5%; not a US monograph active.",
    countsAnywhereListed: true,
  },

  // --- Antifungal (athlete's foot, ringworm, jock itch, yeast) ---
  {
    id: "clotrimazole",
    canonicalName: "Clotrimazole",
    categories: ["antifungal"],
    synonyms: ["clotrimazole"],
    summary: "An FDA OTC monograph antifungal active for athlete's foot, jock itch, and ringworm.",
    typicalConcentrationText: "Typically formulated at 1%.",
  },
  {
    id: "miconazole-nitrate",
    canonicalName: "Miconazole Nitrate",
    categories: ["antifungal"],
    synonyms: ["miconazole nitrate", "miconazole"],
    summary: "An FDA OTC monograph antifungal active for athlete's foot, jock itch, ringworm, and yeast infections.",
    typicalConcentrationText: "Typically formulated at 2%.",
  },
  {
    id: "tolnaftate",
    canonicalName: "Tolnaftate",
    categories: ["antifungal"],
    synonyms: ["tolnaftate"],
    summary: "An FDA OTC monograph antifungal active for athlete's foot, jock itch, and ringworm.",
    typicalConcentrationText: "Typically formulated at 1%.",
  },
  {
    id: "terbinafine",
    canonicalName: "Terbinafine Hydrochloride",
    categories: ["antifungal"],
    synonyms: ["terbinafine"],
    summary: "An FDA OTC monograph antifungal active for athlete's foot, jock itch, and ringworm.",
    typicalConcentrationText: "Typically formulated at 1%.",
  },
  {
    id: "butenafine",
    canonicalName: "Butenafine Hydrochloride",
    categories: ["antifungal"],
    synonyms: ["butenafine"],
    summary: "An FDA OTC monograph antifungal active for athlete's foot, jock itch, and ringworm.",
    typicalConcentrationText: "Typically formulated at 1%.",
  },
  {
    id: "undecylenic-acid",
    canonicalName: "Undecylenic Acid",
    categories: ["antifungal"],
    synonyms: ["undecylenic acid", "zinc undecylenate"],
    summary: "An FDA OTC monograph antifungal active for athlete's foot, one of the older recognized OTC antifungals.",
    typicalConcentrationText: "Varies by formulation and salt form used.",
  },
  {
    id: "tioconazole",
    canonicalName: "Tioconazole",
    categories: ["antifungal"],
    synonyms: ["tioconazole"],
    summary: "An FDA OTC monograph antifungal active, most commonly formulated for vaginal yeast infections.",
    typicalConcentrationText: "Typically formulated at 6.5% (single-dose vaginal products).",
  },

  // --- Antidandruff / seborrheic dermatitis ---
  {
    id: "pyrithione-zinc",
    canonicalName: "Pyrithione Zinc",
    categories: ["antidandruff"],
    synonyms: ["pyrithione zinc", "zinc pyrithione"],
    summary: "The most common FDA OTC monograph antidandruff active, found in most medicated dandruff shampoos.",
    typicalConcentrationText: "Typically formulated at 1%–2%.",
  },
  {
    id: "selenium-sulfide",
    canonicalName: "Selenium Sulfide",
    categories: ["antidandruff"],
    synonyms: ["selenium sulfide"],
    summary: "An FDA OTC monograph antidandruff/seborrheic dermatitis active.",
    typicalConcentrationText: "OTC formulations are typically 1%; higher strengths are prescription-only.",
  },
  {
    id: "coal-tar",
    canonicalName: "Coal Tar",
    categories: ["antidandruff"],
    synonyms: ["coal tar"],
    summary: "An FDA OTC monograph active for dandruff, seborrheic dermatitis, and psoriasis.",
    typicalConcentrationText: "Concentration varies widely by formulation.",
  },
  {
    id: "ketoconazole",
    canonicalName: "Ketoconazole",
    categories: ["antidandruff", "antifungal"],
    synonyms: ["ketoconazole"],
    summary:
      "An azole antifungal. The 1% shampoo is sold OTC for dandruff under an approved application (an Rx-to-OTC switch, not the monograph); 2% shampoo and creams are prescription-only.",
    typicalConcentrationText: "OTC shampoo is 1%; 2% is prescription-only.",
  },

  // --- Anti-itch (eczema, poison ivy, insect bites, rashes) ---
  {
    id: "hydrocortisone",
    canonicalName: "Hydrocortisone",
    categories: ["anti-itch"],
    synonyms: ["hydrocortisone"],
    summary:
      "The only FDA OTC monograph topical corticosteroid, for itch relief from eczema, insect bites, poison ivy, and minor skin irritation.",
    typicalConcentrationText: "OTC formulations are 0.5%–1%; higher strengths are prescription-only.",
  },
  {
    id: "pramoxine",
    canonicalName: "Pramoxine Hydrochloride",
    categories: ["anti-itch", "skin-protectant"],
    synonyms: ["pramoxine"],
    summary: "An FDA OTC monograph topical anesthetic recognized for itch relief, often combined with a skin protectant.",
    typicalConcentrationText: "Typically formulated at 1%.",
  },
  {
    id: "diphenhydramine",
    canonicalName: "Diphenhydramine Hydrochloride",
    categories: ["anti-itch", "skin-protectant"],
    synonyms: ["diphenhydramine"],
    summary: "An FDA OTC monograph topical antihistamine for itch relief from insect bites and minor skin irritation.",
    typicalConcentrationText: "Typically formulated at 1%–2%.",
  },
  {
    id: "menthol",
    canonicalName: "Menthol",
    categories: ["anti-itch"],
    synonyms: ["menthol"],
    summary: "An external analgesic active (21 CFR part 348) that relieves itch through a cooling sensation; also a counterirritant at higher strengths.",
    typicalConcentrationText: "0.1%–1% for itch relief.",
  },
  {
    id: "camphor",
    canonicalName: "Camphor",
    categories: ["anti-itch"],
    synonyms: ["camphor"],
    summary: "An external analgesic active (21 CFR part 348) used for itch relief, often alongside menthol.",
    typicalConcentrationText: "0.1%–3% for itch relief.",
  },
  {
    id: "lidocaine",
    canonicalName: "Lidocaine",
    categories: ["anti-itch"],
    synonyms: ["lidocaine"],
    summary: "A topical anesthetic recognized as an external analgesic active (21 CFR part 348) for temporary relief of itch and minor skin pain.",
    typicalConcentrationText: "Typically 0.5%–4% in OTC products.",
  },
  {
    id: "benzocaine",
    canonicalName: "Benzocaine",
    categories: ["anti-itch"],
    synonyms: ["benzocaine"],
    summary:
      "A topical anesthetic recognized as an external analgesic active (21 CFR part 348) for temporary relief of itch and minor skin pain. A known contact allergen (part of the caine mix patch test).",
    typicalConcentrationText: "Typically 5%–20% in OTC products.",
  },

  // --- Skin protectant (dry skin, eczema, diaper rash, chapped skin) ---
  {
    id: "petrolatum",
    canonicalName: "Petrolatum",
    categories: ["skin-protectant"],
    synonyms: ["petrolatum", "white petrolatum"],
    summary: "An FDA OTC monograph skin protectant, one of the most widely used, for dry/chapped skin and minor wound protection.",
    typicalConcentrationText: "Often used at or near 100% (e.g. petroleum jelly).",
  },
  {
    id: "colloidal-oatmeal",
    canonicalName: "Colloidal Oatmeal",
    categories: ["skin-protectant"],
    synonyms: ["oatmeal", "colloidal oatmeal"],
    summary: "An FDA OTC monograph skin protectant, the classic active in eczema-focused bath treatments and moisturizers.",
    typicalConcentrationText: "Typically formulated at 0.5%–1% in leave-on products, higher in bath treatments.",
  },
  {
    id: "dimethicone",
    canonicalName: "Dimethicone",
    categories: ["skin-protectant"],
    synonyms: ["dimethicone"],
    summary: "An FDA OTC monograph skin protectant, a silicone-based occlusive used broadly in dry-skin and barrier-repair products.",
    typicalConcentrationText: "Typically formulated at 1%–30% depending on product type.",
  },
  {
    id: "allantoin",
    canonicalName: "Allantoin",
    categories: ["skin-protectant"],
    synonyms: ["allantoin"],
    summary: "An FDA OTC monograph skin protectant recognized for soothing dry or irritated skin.",
    typicalConcentrationText: "Typically formulated at 0.5%–2%.",
  },
  {
    id: "lanolin",
    canonicalName: "Lanolin",
    categories: ["skin-protectant"],
    synonyms: ["lanolin"],
    summary: "An FDA OTC monograph skin protectant derived from sheep's wool, used for dry/chapped skin.",
    typicalConcentrationText: "Concentration varies by formulation.",
  },
  {
    id: "zinc-acetate",
    canonicalName: "Zinc Acetate",
    categories: ["skin-protectant", "anti-itch"],
    synonyms: ["zinc acetate"],
    summary: "An FDA OTC monograph skin protectant that dries the oozing and weeping of poison ivy, oak and sumac; usually paired with an itch-relief active.",
    typicalConcentrationText: "0.1%–2% under the skin protectant monograph.",
  },
  {
    id: "calamine",
    canonicalName: "Calamine",
    categories: ["skin-protectant", "anti-itch"],
    synonyms: ["calamine"],
    summary: "An FDA OTC monograph skin protectant (zinc oxide with a little ferric oxide) that dries the oozing and weeping of poison ivy, oak and sumac.",
    typicalConcentrationText: "1%–25% under the skin protectant monograph.",
  },
  {
    id: "kaolin",
    canonicalName: "Kaolin",
    categories: ["skin-protectant"],
    synonyms: ["kaolin"],
    summary: "A clay recognized as an FDA OTC monograph skin protectant. As an inactive ingredient it is also common in cosmetic masks.",
    typicalConcentrationText: "4%–20% under the skin protectant monograph.",
  },
  {
    id: "glycerin",
    canonicalName: "Glycerin",
    categories: ["skin-protectant"],
    synonyms: ["glycerin", "glycerine", "glycerol"],
    summary:
      "A humectant recognized as an FDA OTC monograph skin protectant at high strength. It is also one of the most common inactive ingredients in skin care; it only counts as a product's active when the Drug Facts label says so.",
    typicalConcentrationText: "20%–45% under the skin protectant monograph.",
  },
  {
    id: "mineral-oil",
    canonicalName: "Mineral Oil",
    categories: ["skin-protectant"],
    synonyms: ["mineral oil", "paraffinum liquidum"],
    summary:
      "An occlusive recognized as an FDA OTC monograph skin protectant. Also a very common inactive ingredient; it only counts as a product's active when the Drug Facts label says so.",
    typicalConcentrationText: "50%–100% under the skin protectant monograph (30%–35% when combined with colloidal oatmeal).",
  },
  {
    id: "aluminum-hydroxide",
    canonicalName: "Aluminum Hydroxide Gel",
    categories: ["skin-protectant"],
    synonyms: ["aluminum hydroxide"],
    summary: "An FDA OTC monograph skin protectant, most often found in diaper-rash and minor-irritation products.",
    typicalConcentrationText: "0.15%–5% under the skin protectant monograph.",
  },
  {
    id: "sodium-bicarbonate",
    canonicalName: "Sodium Bicarbonate",
    categories: ["skin-protectant"],
    synonyms: ["sodium bicarbonate"],
    summary: "An FDA OTC monograph skin protectant used in soaks and baths for itch from poison ivy, insect bites and minor irritation.",
    typicalConcentrationText: "Concentration depends on the soak or bath directions on the label.",
  },

  // --- Antiperspirant (excessive sweating) ---
  {
    id: "aluminum-chlorohydrate",
    canonicalName: "Aluminum Chlorohydrate",
    categories: ["antiperspirant"],
    synonyms: ["aluminum chlorohydrate", "aluminum chloride", "aluminum sesquichlorohydrate"],
    summary: "An FDA OTC monograph antiperspirant active that works by temporarily blocking sweat ducts.",
    typicalConcentrationText: "Concentration varies by product strength (regular vs. clinical-strength).",
  },
  {
    id: "aluminum-zirconium-complex",
    canonicalName: "Aluminum Zirconium Complexes",
    categories: ["antiperspirant"],
    synonyms: [
      "aluminum zirconium tetrachlorohydrex gly",
      "aluminum zirconium trichlorohydrex gly",
      "aluminum zirconium octachlorohydrex gly",
      "aluminum zirconium pentachlorohydrex gly",
      "aluminum zirconium tetrachlorohydrate",
      "aluminum zirconium trichlorohydrate",
      "aluminum zirconium octachlorohydrate",
      "aluminum zirconium pentachlorohydrate",
    ],
    summary:
      "A family of FDA OTC monograph antiperspirant actives (differing in aluminum:zirconium ratio), grouped here as one canonical entry since the ratio distinction isn't a consumer-meaningful difference without a dermatologist's input.",
    typicalConcentrationText: "Concentration varies by product strength (regular vs. clinical-strength).",
  },

  // --- Brightening & texture (cosmetic ingredients, NOT FDA drug actives) ---
  // These have no OTC monograph status at all — no Drug Facts panel, no
  // FDA-recognized concentration limits, no "purpose" claim. Products
  // containing them come from Open Beauty Facts (community-sourced,
  // unverified — see build_cosmetic_catalog.py), not openFDA/DailyMed.
  // Summaries here describe what the ingredient is, explicitly note the
  // lack of FDA drug status, and make no efficacy claim.
  {
    id: "niacinamide",
    canonicalName: "Niacinamide",
    categories: ["brightening-texture"],
    synonyms: ["niacinamide"],
    summary:
      "A form of vitamin B3 widely used in cosmetic serums and moisturizers for skin tone and texture. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly formulated at 2%–10% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "vitamin-c",
    canonicalName: "Vitamin C (Ascorbic Acid)",
    categories: ["brightening-texture"],
    synonyms: ["ascorbic acid"],
    summary:
      "An antioxidant used in cosmetic serums, often for brightening. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it. Formulation and stability vary widely by product.",
    typicalConcentrationText: "Commonly formulated at 5%–20% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "hyaluronic-acid",
    canonicalName: "Hyaluronic Acid",
    // Dual-categorized 2026-09-28: hydration is this ingredient's dominant
    // real-world use, not brightening -- see build_cosmetic_catalog.py's
    // pick_niche() for how a product's concern is now actually decided.
    categories: ["brightening-texture", "skin-protectant"],
    synonyms: ["hyaluronic acid", "sodium hyaluronate"],
    summary:
      "A humectant that draws moisture into skin, used broadly in cosmetic serums and moisturizers. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Concentration varies by molecular weight and formulation; not standardized.",
  },
  {
    id: "retinol-cosmetic",
    canonicalName: "Retinol (cosmetic)",
    categories: ["brightening-texture"],
    synonyms: ["retinol"],
    summary:
      "A cosmetic vitamin-A derivative, distinct from the FDA OTC monograph acne active adapalene and from prescription retinoids (tretinoin) — retinol itself has no OTC monograph or FDA drug status. Potency and stability vary widely by formulation.",
    typicalConcentrationText: "Concentration varies widely by product; not standardized.",
  },
  {
    id: "ceramides",
    canonicalName: "Ceramides",
    categories: ["brightening-texture", "skin-protectant"],
    synonyms: ["ceramide"],
    summary:
      "Lipids naturally found in skin's barrier, added to cosmetic moisturizers to support barrier function. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Concentration varies by formulation; not standardized.",
  },
  {
    id: "alpha-arbutin",
    canonicalName: "Alpha Arbutin",
    categories: ["brightening-texture"],
    synonyms: ["alpha arbutin", "alpha-arbutin"],
    summary:
      "A cosmetic brightening ingredient, often paired with hyaluronic acid in serums. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly formulated at 1%–2% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "glycolic-acid",
    canonicalName: "Glycolic Acid",
    categories: ["brightening-texture"],
    synonyms: ["glycolic acid"],
    summary:
      "An alpha-hydroxy acid (AHA) exfoliant used in cosmetic peels and toners. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it, unlike the OTC monograph acne actives.",
    typicalConcentrationText: "Commonly formulated at 5%–30% depending on product type (leave-on vs. peel); not standardized.",
  },
  {
    id: "squalane",
    canonicalName: "Squalane",
    categories: ["brightening-texture", "skin-protectant"],
    synonyms: ["squalane"],
    summary:
      "A stable, plant- or lab-derived emollient oil used in cosmetic moisturizers and face oils. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Often used at or near 100% in single-ingredient face oils; varies in blended formulations.",
  },
  {
    id: "peptides",
    canonicalName: "Peptides",
    categories: ["brightening-texture"],
    // Grouped the way "Aluminum Zirconium Complexes" groups its variants —
    // several distinct peptide compounds, none individually common enough
    // to warrant its own catalog row, but the family as a whole shows up
    // constantly in searched cosmetic products.
    synonyms: ["palmitoyl pentapeptide", "palmitoyl tripeptide", "palmitoyl hexapeptide", "copper tripeptide", "copper peptide", "acetyl hexapeptide", "matrixyl"],
    summary:
      "A broad family of short amino-acid chains added to cosmetic serums and moisturizers, often marketed for texture and firmness. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Concentration and specific peptide compound vary widely by formulation; not standardized.",
  },
  {
    id: "bakuchiol",
    canonicalName: "Bakuchiol",
    categories: ["brightening-texture"],
    synonyms: ["bakuchiol"],
    summary:
      "A plant-derived cosmetic ingredient often marketed as a gentler alternative to retinol. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it, and it is chemically unrelated to retinol.",
    typicalConcentrationText: "Concentration varies widely by product; not standardized.",
  },
  {
    id: "tranexamic-acid",
    canonicalName: "Tranexamic Acid",
    categories: ["brightening-texture"],
    synonyms: ["tranexamic acid"],
    summary:
      "A cosmetic brightening ingredient increasingly used for uneven tone. Separately, higher-dose tranexamic acid is also an oral/injectable prescription drug for unrelated uses — the cosmetic topical form here has no OTC drug monograph or FDA efficacy claim.",
    typicalConcentrationText: "Commonly formulated at 2%–5% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "centella-asiatica",
    canonicalName: "Centella Asiatica (Cica)",
    categories: ["brightening-texture", "skin-protectant"],
    synonyms: ["centella asiatica"],
    summary:
      "A plant extract widely used in cosmetic moisturizers and serums for soothing/barrier-support marketing claims (often labeled \"cica\"). Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Concentration varies widely by formulation; not standardized.",
  },
  {
    id: "panthenol",
    canonicalName: "Panthenol",
    categories: ["brightening-texture", "skin-protectant"],
    synonyms: ["panthenol", "dexpanthenol", "provitamin b5"],
    summary:
      "A provitamin-B5 derivative used broadly in cosmetic moisturizers for hydration and soothing marketing claims. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly formulated at 1%–5% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "kojic-acid",
    canonicalName: "Kojic Acid",
    categories: ["brightening-texture"],
    synonyms: ["kojic acid"],
    summary:
      "A fungal-derived cosmetic brightening ingredient. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it; a known skin-irritation/sensitization risk in some users is worth a dermatologist note, not established here.",
    typicalConcentrationText: "Commonly formulated at 1%–4% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "mandelic-acid",
    canonicalName: "Mandelic Acid",
    categories: ["brightening-texture"],
    synonyms: ["mandelic acid"],
    summary:
      "An alpha-hydroxy acid (AHA) exfoliant, often marketed as gentler than glycolic acid due to its larger molecule size. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly formulated at 5%–10% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "lactic-acid",
    canonicalName: "Lactic Acid",
    categories: ["brightening-texture"],
    synonyms: ["lactic acid"],
    summary:
      "An alpha-hydroxy acid (AHA) exfoliant with humectant properties, used in cosmetic peels, serums, and moisturizers. Not an FDA-regulated drug ingredient — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly formulated at 5%–12% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "hydroquinone",
    canonicalName: "Hydroquinone",
    categories: ["brightening-texture"],
    synonyms: ["hydroquinone"],
    summary:
      "A skin-lightening drug. Since the 2020 CARES Act OTC reform it is no longer permitted in US OTC products and is prescription-only (typically 4%); listings here are older OTC labels, prescription kits or imports.",
    typicalConcentrationText: "Prescription products are typically 4%; no longer a legal US OTC active.",
  },
  {
    id: "retinal",
    canonicalName: "Retinal (Retinaldehyde)",
    categories: ["brightening-texture"],
    synonyms: ["retinaldehyde", "retinal"],
    summary:
      "A cosmetic vitamin-A derivative one conversion step closer to retinoic acid than retinol. Not an FDA-regulated drug ingredient; no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly 0.05%–0.1% in cosmetic products; not standardized.",
  },
  {
    id: "hydroxypinacolone-retinoate",
    canonicalName: "Hydroxypinacolone Retinoate",
    categories: ["brightening-texture"],
    synonyms: ["hydroxypinacolone retinoate"],
    summary:
      "A cosmetic retinoid ester of retinoic acid (often sold as Granactive Retinoid). Not an FDA-regulated drug ingredient; no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Concentration varies by product; not standardized.",
  },
  {
    id: "retinyl-retinoate",
    canonicalName: "Retinyl Retinoate",
    categories: ["brightening-texture"],
    synonyms: ["retinyl retinoate"],
    summary:
      "A cosmetic retinoid made by joining retinol and retinoic acid. Not an FDA-regulated drug ingredient; no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Concentration varies by product; not standardized.",
  },
  {
    id: "gluconolactone",
    canonicalName: "Gluconolactone",
    categories: ["brightening-texture"],
    synonyms: ["gluconolactone"],
    summary:
      "A polyhydroxy acid (PHA) exfoliant, often marketed as gentler than AHAs. Not an FDA-regulated drug ingredient; no OTC monograph or FDA efficacy claim applies to it. Also used at low levels as a preservative booster.",
    typicalConcentrationText: "Commonly 2%–10% when used as an exfoliant; not standardized.",
  },
  {
    id: "lactobionic-acid",
    canonicalName: "Lactobionic Acid",
    categories: ["brightening-texture"],
    synonyms: ["lactobionic acid"],
    summary:
      "A polyhydroxy acid (PHA) exfoliant with humectant properties. Not an FDA-regulated drug ingredient; no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Concentration varies by product; not standardized.",
  },
  {
    id: "capryloyl-salicylic-acid",
    canonicalName: "Capryloyl Salicylic Acid (LHA)",
    categories: ["brightening-texture"],
    synonyms: ["capryloyl salicylic acid"],
    summary:
      "A lipophilic salicylic acid derivative (LHA) used as a cosmetic exfoliant. Not the FDA OTC monograph acne active salicylic acid, and no FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly under 1% in cosmetic products; not standardized.",
  },
  {
    id: "betaine-salicylate",
    canonicalName: "Betaine Salicylate",
    categories: ["brightening-texture"],
    synonyms: ["betaine salicylate"],
    summary:
      "A salicylic acid derivative used as a cosmetic exfoliant, common in Korean skin care. Not the FDA OTC monograph acne active salicylic acid, and no FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly 1%–4% in cosmetic products; not standardized.",
  },
];

// Longest synonym first, and each match is blanked out before shorter ones
// are tried, so a name inside another active's name doesn't count twice:
// "4-methylbenzylidene camphor" is enzacamene, not also camphor;
// "capryloyl salicylic acid" is not also salicylic acid.
const SYNONYMS_LONGEST_FIRST = ACTIVE_DEFINITIONS.flatMap((a) => a.synonyms.map((s) => ({ s, id: a.id }))).sort(
  (a, b) => b.s.length - a.s.length,
);
const DEFINITION_ORDER = new Map(ACTIVE_DEFINITIONS.map((a, i) => [a.id, i]));

/** Returns the canonical active ids whose synonyms appear in the given free text. */
export function matchActiveIds(freeText: string): string[] {
  let lowered = freeText.toLowerCase();
  const found = new Set<string>();
  for (const { s, id } of SYNONYMS_LONGEST_FIRST) {
    if (!lowered.includes(s)) continue;
    found.add(id);
    lowered = lowered.split(s).join(" ");
  }
  return [...found].sort((a, b) => DEFINITION_ORDER.get(a)! - DEFINITION_ORDER.get(b)!);
}

/** Active ids that count wherever they're listed (see countsAnywhereListed). */
export const ANYWHERE_LISTED_ACTIVE_IDS = new Set(ACTIVE_DEFINITIONS.filter((a) => a.countsAnywhereListed).map((a) => a.id));
