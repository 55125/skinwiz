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
      "The only chemical sunscreen active on the FDA's OTC sunscreen monograph list that absorbs across the full UVA1 range. Often paired with other actives for photostability.",
    typicalConcentrationText: "FDA monograph maximum is 3%.",
  },
  {
    id: "octisalate",
    canonicalName: "Octisalate",
    categories: ["sunscreen"],
    synonyms: ["octisalate", "ethylhexyl salicylate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection, often used to help stabilize avobenzone.",
    typicalConcentrationText: "FDA monograph maximum is 5%.",
  },
  {
    id: "octocrylene",
    canonicalName: "Octocrylene",
    categories: ["sunscreen"],
    synonyms: ["octocrylene"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection and photostabilizing other actives.",
    typicalConcentrationText: "FDA monograph maximum is 10%.",
  },
  {
    id: "homosalate",
    canonicalName: "Homosalate",
    categories: ["sunscreen"],
    synonyms: ["homosalate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection.",
    typicalConcentrationText: "FDA monograph maximum is 15%.",
  },
  {
    id: "octinoxate",
    canonicalName: "Octinoxate",
    categories: ["sunscreen"],
    synonyms: ["octinoxate", "ethylhexyl methoxycinnamate", "octyl methoxycinnamate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVB protection. One of the most widely used sunscreen actives globally.",
    typicalConcentrationText: "FDA monograph maximum is 7.5%.",
  },
  {
    id: "oxybenzone",
    canonicalName: "Oxybenzone",
    categories: ["sunscreen"],
    synonyms: ["oxybenzone"],
    summary:
      "An FDA-recognized chemical sunscreen active providing broad UVA/UVB protection. Has drawn environmental and some safety-signal scrutiny in recent years.",
    typicalConcentrationText: "FDA monograph maximum is 6%.",
  },
  {
    id: "ensulizole",
    canonicalName: "Ensulizole",
    categories: ["sunscreen"],
    synonyms: ["ensulizole", "phenylbenzimidazole sulfonic acid"],
    summary: "An FDA-recognized water-soluble chemical sunscreen active providing UVB protection.",
    typicalConcentrationText: "FDA monograph maximum is 4%.",
  },
  {
    id: "meradimate",
    canonicalName: "Meradimate",
    categories: ["sunscreen"],
    synonyms: ["meradimate"],
    summary: "An FDA-recognized chemical sunscreen active providing UVA2 protection, typically used alongside other actives.",
    typicalConcentrationText: "FDA monograph maximum is 5%.",
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
    ],
    summary:
      "A family of FDA OTC monograph antiperspirant actives (differing in aluminum:zirconium ratio), grouped here as one entry.",
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
      "A form of vitamin B3 widely used in cosmetic serums and moisturizers for skin tone and texture. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly formulated at 2%–10% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "vitamin-c",
    canonicalName: "Vitamin C (Ascorbic Acid)",
    categories: ["brightening-texture"],
    synonyms: ["ascorbic acid"],
    summary:
      "An antioxidant used in cosmetic serums, often for brightening. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it. Formulation and stability vary widely by product.",
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
      "A humectant that draws moisture into skin, used broadly in cosmetic serums and moisturizers. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it.",
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
      "Lipids naturally found in skin's barrier, added to cosmetic moisturizers to support barrier function. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Concentration varies by formulation; not standardized.",
  },
  {
    id: "alpha-arbutin",
    canonicalName: "Alpha Arbutin",
    categories: ["brightening-texture"],
    synonyms: ["alpha arbutin", "alpha-arbutin"],
    summary:
      "A cosmetic brightening ingredient, often paired with hyaluronic acid in serums. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly formulated at 1%–2% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "glycolic-acid",
    canonicalName: "Glycolic Acid",
    categories: ["brightening-texture"],
    synonyms: ["glycolic acid"],
    summary:
      "An alpha-hydroxy acid (AHA) exfoliant used in cosmetic peels and toners. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it, unlike the OTC monograph acne actives.",
    typicalConcentrationText: "Commonly formulated at 5%–30% depending on product type (leave-on vs. peel); not standardized.",
  },
  {
    id: "squalane",
    canonicalName: "Squalane",
    categories: ["brightening-texture", "skin-protectant"],
    synonyms: ["squalane"],
    summary:
      "A stable, plant- or lab-derived emollient oil used in cosmetic moisturizers and face oils. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it.",
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
      "A broad family of short amino-acid chains added to cosmetic serums and moisturizers, often marketed for texture and firmness. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Concentration and specific peptide compound vary widely by formulation; not standardized.",
  },
  {
    id: "bakuchiol",
    canonicalName: "Bakuchiol",
    categories: ["brightening-texture"],
    synonyms: ["bakuchiol"],
    summary:
      "A plant-derived cosmetic ingredient often marketed as a gentler alternative to retinol. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it, and it is chemically unrelated to retinol.",
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
      "A plant extract widely used in cosmetic moisturizers and serums for soothing/barrier-support marketing claims (often labeled \"cica\"). A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Concentration varies widely by formulation; not standardized.",
  },
  {
    id: "panthenol",
    canonicalName: "Panthenol",
    categories: ["brightening-texture", "skin-protectant"],
    synonyms: ["panthenol", "dexpanthenol", "provitamin b5"],
    summary:
      "A provitamin-B5 derivative used broadly in cosmetic moisturizers for hydration and soothing marketing claims. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly formulated at 1%–5% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "kojic-acid",
    canonicalName: "Kojic Acid",
    categories: ["brightening-texture"],
    synonyms: ["kojic acid"],
    summary:
      "A fungal-derived cosmetic brightening ingredient. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly formulated at 1%–4% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "mandelic-acid",
    canonicalName: "Mandelic Acid",
    categories: ["brightening-texture"],
    synonyms: ["mandelic acid"],
    summary:
      "An alpha-hydroxy acid (AHA) exfoliant, often marketed as gentler than glycolic acid due to its larger molecule size. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly formulated at 5%–10% in cosmetic products; not a standardized concentration.",
  },
  {
    id: "lactic-acid",
    canonicalName: "Lactic Acid",
    categories: ["brightening-texture"],
    synonyms: ["lactic acid"],
    summary:
      "An alpha-hydroxy acid (AHA) exfoliant with humectant properties, used in cosmetic peels, serums, and moisturizers. A cosmetic ingredient, not an OTC drug active — no OTC monograph or FDA efficacy claim applies to it.",
    typicalConcentrationText: "Commonly formulated at 5%–12% in cosmetic products; not a standardized concentration.",
  },
];

/** Returns the canonical active ids whose synonyms appear in the given free text. */
export function matchActiveIds(freeText: string): string[] {
  const lowered = freeText.toLowerCase();
  return ACTIVE_DEFINITIONS.filter((a) => a.synonyms.some((s) => lowered.includes(s))).map((a) => a.id);
}
