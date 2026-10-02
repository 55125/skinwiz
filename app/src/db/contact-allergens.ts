// Clinically relevant contact allergens in personal-care and OTC products,
// with the names they actually go by on an ingredient label. Built from a
// literature-based working reference (NACDG/ACDS series, Fonacier et al.
// AAAAI practice parameter 2015, Goossens & Aerts 2022, Sukakul & Svedman
// 2025, Levin et al. 2026 and others -- cited per section below). It is a
// screening aid, not a registry: the CAMP database alone tracks ~191
// allergens, and a patch-tested patient's own list beats any generic one.
//
// Why a separate module from ingredient-flags.ts: those checks are a handful
// of "free-from" claims stored per product as the ones that HOLD. There are
// ~100 allergens here, and a product contains only a few of them, so a
// product stores the allergens it CONTAINS (products.allergenHits) and
// "free of X" is the absence of X. Same "null = couldn't check" rule.
//
// Matching. Label names rarely match patch-test names (HICC is "Lyral",
// MCI/MI is "Kathon CG", oakmoss is "Evernia prunastri"), so each allergen
// carries every label synonym we know. Terms are matched as whole words on
// a normalized name (case, accents, hyphens, slashes and parentheses
// folded; "1,3-diol" -> "13 diol"), so "eugenol" doesn't fire on
// isoeugenol. A leading/trailing "*" drops that side's word boundary
// ("*paraben" catches methylparaben). `unless` lists longer names that
// contain a term but are a different ingredient (amyl cinnamal vs cinnamal);
// they are blanked out before that allergen's terms are tested.

export type AllergenSectionId =
  | "fragrance"
  | "formaldehyde"
  | "preservative"
  | "surfactant"
  | "emollient"
  | "uv-filter"
  | "botanical"
  | "antioxidant"
  | "hair"
  | "medicament"
  | "metal"
  | "acrylate";

export type AllergenSection = {
  id: AllergenSectionId;
  title: string;
  intro: string;
  sources: string;
};

export type ContactAllergen = {
  id: string;
  name: string;
  section: AllergenSectionId;
  // Lowercase label names to match, the INCI name first.
  terms: string[];
  // Other names worth knowing (trade and patch-test names) that don't
  // appear on labels or are too ambiguous to match; shown and searchable.
  aka?: string[];
  unless?: string[];
  note?: string;
  // Low current relevance; still matchable, sorted last.
  rare?: boolean;
};

export type AllergenGroup = {
  id: string;
  name: string;
  members: string[];
  note: string;
};

export const ALLERGEN_SECTIONS: AllergenSection[] = [
  {
    id: "fragrance",
    title: "Fragrances",
    intro:
      "The most common cause of cosmetic contact allergy. A label that says only “fragrance,” “parfum,” “aroma” or “flavor” can contain any of these, so a product with an undisclosed fragrance is marked “may contain” for each one.",
    sources:
      "Fonacier et al., AAAAI Practice Parameter, 2015; Botvid et al., Contact Dermatitis, 2024; Sánchez-Pujol et al., Contact Dermatitis, 2021; Nguyen & Yiannias, Clin Rev Allergy Immunol, 2019; Smale et al., JAAD, 2026; Faraz et al., Curr Allergy Asthma Rep, 2024.",
  },
  {
    id: "formaldehyde",
    title: "Formaldehyde and formaldehyde releasers",
    intro:
      "About 1 in 6 stay-on and 1 in 4 rinse-off products contain a formaldehyde releaser. If you react to formaldehyde, avoid the whole group. Release strength runs quaternium-15 > diazolidinyl urea > DMDM hydantoin > imidazolidinyl urea > bronopol.",
    sources:
      "Goossens & Aerts, Contact Dermatitis, 2022; Yang et al., JAMA Dermatology, 2023; Stewart et al., Int J Toxicol, 2023; Fonacier et al., 2015.",
  },
  {
    id: "preservative",
    title: "Other preservatives and antiseptics",
    intro: "Preservatives that don't release formaldehyde. Methylisothiazolinone in particular has risen sharply, mostly from rinse-off products and wet wipes.",
    sources:
      "Fonacier et al., 2015; Nguyen & Yiannias, 2019; Milam et al., Cosmetic Dermatology, 2022; Sukakul & Svedman, Curr Allergy Asthma Rep, 2025.",
  },
  {
    id: "surfactant",
    title: "Surfactants and emulsifiers",
    intro: "Cleansing and emulsifying agents. The alkyl glucosides cross-react with each other.",
    sources: "Sukakul & Svedman, 2025; Milam et al., 2022; De Marco et al., Contact Dermatitis, 2023.",
  },
  {
    id: "emollient",
    title: "Emollients, humectants and vehicles",
    intro: "Base ingredients of creams and ointments. Both matter more on broken or eczematous skin.",
    sources: "Kemicha et al., Contact Dermatitis, 2026; Milam et al., 2022; Raffi et al., J Perinatology, 2020.",
  },
  {
    id: "uv-filter",
    title: "UV filters",
    intro:
      "Chemical (organic) filters cause contact and photocontact allergy; the mineral filters titanium dioxide and zinc oxide rarely do. Found in sunscreens, day creams and tinted cosmetics.",
    sources: "Sukakul & Svedman, 2025; Levin et al., Contact Dermatitis, 2026; Smale et al., JAAD, 2026.",
  },
  {
    id: "botanical",
    title: "Botanicals and essential oils",
    intro: "Plant extracts and essential oils. “Natural” is no protection: about 94% of natural personal-care products carry at least one contact allergen.",
    sources: "Milam et al., 2022; Fonacier et al., 2015; Sukakul & Svedman, 2025; Faraz et al., 2024.",
  },
  {
    id: "antioxidant",
    title: "Antioxidants and vitamins",
    intro: "Added to protect the formula or as a skin benefit.",
    sources: "Levin et al., 2026; Sukakul & Svedman, 2025.",
  },
  {
    id: "hair",
    title: "Hair dyes and hair-care chemicals",
    intro: "Permanent dyes, bleaches and perms.",
    sources: "Sukakul & Svedman, 2025; Warshaw et al., JAAD, 2021.",
  },
  {
    id: "medicament",
    title: "Medicines in OTC products",
    intro: "Antibiotics, corticosteroids, anesthetics and antihistamines in first-aid, anti-itch, hemorrhoid and sunburn products.",
    sources: "Choi et al., Can Fam Physician, 2021; Gilissen & Goossens, Contact Dermatitis, 2016; Nguyen & Yiannias, 2019.",
  },
  {
    id: "metal",
    title: "Metals and pigments",
    intro: "Rarely named on a label: they reach skin as pigments, impurities or from applicators and packaging, so a product without them listed is not proof they're absent.",
    sources: "Faraz et al., 2024; Scheinman et al., Nature Reviews Disease Primers, 2021.",
  },
  {
    id: "acrylate",
    title: "Acrylates and polymers",
    intro: "Thickeners and film formers in skincare, and the bonding chemistry of nail products and adhesives.",
    sources: "Levin et al., Contact Dermatitis, 2026.",
  },
];

const OXIDIZES =
  "Allergenic mainly once oxidized: hydroperoxides form as a product ages and is exposed to air. The fresh compound is a weak sensitizer, but it is near-universal on labels.";
const HIDDEN_IN_UNSCENTED = "Used for purposes other than scent, so it can appear in products sold as “unscented” or “fragrance-free.”";

export const CONTACT_ALLERGENS: ContactAllergen[] = [
  // --- 1. Fragrances ---
  {
    id: "fragrance",
    name: "Fragrance (undisclosed blend)",
    section: "fragrance",
    terms: ["fragrance", "parfum", "perfume", "aroma", "flavor", "flavour"],
    unless: ["fragrance free", "parfum free", "perfume free", "no fragrance", "without fragrance"],
    note: "A catch-all that can hide any of the fragrance allergens on this page. Fragrance-mix patch-test positives are usually told to avoid it entirely.",
  },
  {
    id: "amyl-cinnamal",
    name: "Amyl cinnamal",
    section: "fragrance",
    terms: ["amyl cinnamal", "amylcinnamal", "amyl cinnamic aldehyde", "amylcinnamaldehyde", "amyl cinnamaldehyde"],
    aka: ["α-amylcinnamaldehyde"],
  },
  {
    id: "cinnamal",
    name: "Cinnamal",
    section: "fragrance",
    terms: ["cinnamal", "cinnamaldehyde", "cinnamic aldehyde"],
    unless: ["amyl cinnamal", "hexyl cinnamal", "amyl cinnamaldehyde", "hexyl cinnamaldehyde", "amyl cinnamic aldehyde", "hexyl cinnamic aldehyde"],
  },
  {
    id: "cinnamyl-alcohol",
    name: "Cinnamyl alcohol",
    section: "fragrance",
    terms: ["cinnamyl alcohol", "cinnamic alcohol"],
    unless: ["amyl cinnamyl alcohol"],
  },
  { id: "eugenol", name: "Eugenol", section: "fragrance", terms: ["eugenol"], note: "Also a component of balsam of Peru and clove oil." },
  { id: "isoeugenol", name: "Isoeugenol", section: "fragrance", terms: ["isoeugenol"] },
  { id: "geraniol", name: "Geraniol", section: "fragrance", terms: ["geraniol"] },
  { id: "hydroxycitronellal", name: "Hydroxycitronellal", section: "fragrance", terms: ["hydroxycitronellal"] },
  {
    id: "oakmoss",
    name: "Oakmoss (Evernia prunastri)",
    section: "fragrance",
    terms: ["evernia prunastri", "oakmoss", "oak moss"],
    note: "A lichen extract; its main allergens are atranol and chloroatranol (see lichen extracts).",
  },
  { id: "citral", name: "Citral", section: "fragrance", terms: ["citral"] },
  { id: "citronellol", name: "Citronellol", section: "fragrance", terms: ["citronellol"] },
  { id: "coumarin", name: "Coumarin", section: "fragrance", terms: ["coumarin"] },
  { id: "farnesol", name: "Farnesol", section: "fragrance", terms: ["farnesol"] },
  {
    id: "hexyl-cinnamal",
    name: "Hexyl cinnamal",
    section: "fragrance",
    terms: ["hexyl cinnamal", "hexylcinnamal", "hexyl cinnamic aldehyde", "hexylcinnamaldehyde", "hexyl cinnamaldehyde"],
    aka: ["α-hexylcinnamaldehyde"],
  },
  {
    id: "hicc",
    name: "Hydroxyisohexyl 3-cyclohexene carboxaldehyde (HICC)",
    section: "fragrance",
    terms: ["hydroxyisohexyl 3-cyclohexene carboxaldehyde", "hydroxyisohexyl cyclohexene carboxaldehyde", "lyral", "hicc"],
    note: "Banned in EU cosmetics since 2021 but still found in products sold elsewhere.",
  },
  {
    id: "balsam-of-peru",
    name: "Balsam of Peru (Myroxylon pereirae)",
    section: "fragrance",
    terms: ["myroxylon pereirae", "balsam of peru", "balsam peru", "peru balsam", "myroxylon balsamum"],
    note: `A fragrance and flavor marker made of many fragrance chemicals: cinnamic acid, cinnamyl cinnamate, benzyl benzoate, benzoic acid, eugenol and vanillin. ${HIDDEN_IN_UNSCENTED}`,
  },
  { id: "limonene", name: "Limonene", section: "fragrance", terms: ["limonene", "d-limonene", "dipentene"], note: OXIDIZES },
  { id: "linalool", name: "Linalool", section: "fragrance", terms: ["linalool"], unless: ["ethyl linalool"], note: OXIDIZES },
  { id: "benzyl-alcohol", name: "Benzyl alcohol", section: "fragrance", terms: ["benzyl alcohol"], note: `Also used as a preservative and solvent. ${HIDDEN_IN_UNSCENTED}` },
  { id: "benzyl-benzoate", name: "Benzyl benzoate", section: "fragrance", terms: ["benzyl benzoate"] },
  { id: "benzyl-salicylate", name: "Benzyl salicylate", section: "fragrance", terms: ["benzyl salicylate"] },
  { id: "benzaldehyde", name: "Benzaldehyde", section: "fragrance", terms: ["benzaldehyde"], note: HIDDEN_IN_UNSCENTED },
  {
    id: "bisabolol",
    name: "Bisabolol",
    section: "fragrance",
    terms: ["bisabolol"],
    aka: ["α-bisabolol"],
    note: `A chamomile-derived soothing agent. ${HIDDEN_IN_UNSCENTED}`,
  },
  { id: "carvone", name: "Carvone", section: "fragrance", terms: ["carvone"] },
  { id: "ylang-ylang", name: "Ylang-ylang oil", section: "fragrance", terms: ["ylang", "cananga odorata"] },
  { id: "narcissus", name: "Narcissus oil", section: "fragrance", terms: ["narcissus"] },
  { id: "sandalwood", name: "Sandalwood oil", section: "fragrance", terms: ["sandalwood", "santalum"], unless: ["red sandalwood"] },
  {
    id: "lemongrass",
    name: "Lemongrass oil",
    section: "fragrance",
    terms: ["lemongrass", "cymbopogon citratus", "cymbopogon flexuosus", "cymbopogon schoenanthus"],
  },

  // --- 2. Formaldehyde and releasers ---
  {
    id: "formaldehyde",
    name: "Formaldehyde",
    section: "formaldehyde",
    terms: ["formaldehyde", "formalin", "methanal", "methylene oxide", "methylene glycol", "formic aldehyde", "oxomethane"],
    unless: ["melamine formaldehyde", "tosylamide formaldehyde", "toluene sulfonamide formaldehyde", "toluenesulfonamide formaldehyde"],
    note: "“Methylene glycol” is formaldehyde dissolved in water, the form used in keratin hair-smoothing treatments.",
  },
  {
    id: "quaternium-15",
    name: "Quaternium-15",
    section: "formaldehyde",
    terms: ["quaternium-15", "dowicil", "methenamine 3-chloroallylochloride", "chloroallyl methenamine chloride"],
    note: "The strongest formaldehyde releaser.",
  },
  { id: "diazolidinyl-urea", name: "Diazolidinyl urea", section: "formaldehyde", terms: ["diazolidinyl urea", "germall ii"] },
  { id: "imidazolidinyl-urea", name: "Imidazolidinyl urea", section: "formaldehyde", terms: ["imidazolidinyl urea", "germall 115"] },
  {
    id: "dmdm-hydantoin",
    name: "DMDM hydantoin",
    section: "formaldehyde",
    terms: ["dmdm hydantoin", "dimethylol dimethyl hydantoin", "dmdmh", "1,3-bis(hydroxymethyl)-5,5-dimethylhydantoin"],
  },
  {
    id: "bronopol",
    name: "Bronopol (2-bromo-2-nitropropane-1,3-diol)",
    section: "formaldehyde",
    terms: ["bronopol", "2-bromo-2-nitropropane-1,3-diol", "2-bromo-2-nitropropane"],
  },
  {
    id: "bronidox",
    name: "Bronidox (5-bromo-5-nitro-1,3-dioxane)",
    section: "formaldehyde",
    terms: ["bronidox", "5-bromo-5-nitro-1,3-dioxane", "5-bromo-5-nitro"],
  },
  { id: "sodium-hydroxymethylglycinate", name: "Sodium hydroxymethylglycinate", section: "formaldehyde", terms: ["hydroxymethylglycinate"] },
  { id: "benzylhemiformal", name: "Benzylhemiformal", section: "formaldehyde", terms: ["benzylhemiformal", "benzyl hemiformal"] },
  {
    id: "hydroxyethyl-triazine",
    name: "Hexahydro-1,3,5-tris(2-hydroxyethyl)triazine",
    section: "formaldehyde",
    terms: ["hydroxyethyl triazine", "hydroxyethyl hexahydro-s-triazine"],
    aka: ["Grotan BK"],
  },
  {
    id: "melamine-formaldehyde",
    name: "Melamine formaldehyde resin",
    section: "formaldehyde",
    terms: ["melamine formaldehyde", "melamine/formaldehyde"],
    aka: ["ethyleneurea melamine formaldehyde mix"],
  },
  {
    id: "tosylamide-formaldehyde-resin",
    name: "Tosylamide/formaldehyde resin",
    section: "formaldehyde",
    terms: ["tosylamide formaldehyde", "tosylamide/formaldehyde", "toluene sulfonamide formaldehyde", "toluenesulfonamide formaldehyde"],
    note: "Common in nail polish; reactions often show up on the eyelids, face and neck rather than the fingers.",
  },

  // --- 3. Other preservatives ---
  {
    id: "mci-mi",
    name: "Methylchloroisothiazolinone/methylisothiazolinone (MCI/MI)",
    section: "preservative",
    terms: ["methylchloroisothiazolinone", "kathon"],
    aka: ["MCI/MI", "Kathon CG"],
    note: "Always contains MI as well, so it is flagged under both.",
  },
  {
    id: "methylisothiazolinone",
    name: "Methylisothiazolinone (MI)",
    section: "preservative",
    terms: ["methylisothiazolinone", "kathon"],
    aka: ["MI", "MIT"],
    note: "Rising prevalence, especially from rinse-off products and wet wipes.",
  },
  {
    id: "mdbgn",
    name: "Methyldibromo glutaronitrile (MDBGN)",
    section: "preservative",
    terms: ["methyldibromo glutaronitrile", "methyldibromoglutaronitrile", "dicyanobutane", "euxyl k 400", "mdbgn"],
    aka: ["1,2-dibromo-2,4-dicyanobutane"],
  },
  { id: "iodopropynyl-butylcarbamate", name: "Iodopropynyl butylcarbamate (IPBC)", section: "preservative", terms: ["iodopropynyl butylcarbamate", "ipbc"] },
  {
    id: "parabens",
    name: "Parabens",
    section: "preservative",
    terms: ["*paraben*", "hydroxybenzoic acid ester", "*hydroxybenzoate"],
    aka: ["p-hydroxybenzoic acid esters"],
    note: "A rare cause of allergy on intact skin despite the reputation; more relevant on damaged skin.",
  },
  { id: "phenoxyethanol", name: "Phenoxyethanol", section: "preservative", terms: ["phenoxyethanol"], note: "A rare sensitizer, but in a very large share of products." },
  { id: "sodium-benzoate", name: "Sodium benzoate / benzoic acid", section: "preservative", terms: ["sodium benzoate", "benzoic acid"] },
  {
    id: "thimerosal",
    name: "Thimerosal",
    section: "preservative",
    terms: ["thimerosal", "thiomersal", "merthiolate"],
    note: "A mercury compound, largely dropped from screening series for low current relevance.",
    rare: true,
  },
  { id: "chloroxylenol", name: "Chloroxylenol (PCMX)", section: "preservative", terms: ["chloroxylenol", "pcmx", "para-chloro-meta-xylenol", "p-chloro-m-xylenol"] },
  {
    id: "chlorocresol",
    name: "Chlorocresol",
    section: "preservative",
    terms: ["chlorocresol", "p-chloro-m-cresol", "4-chloro-3-cresol", "4-chloro-3-methylphenol"],
  },
  { id: "chlorhexidine", name: "Chlorhexidine", section: "preservative", terms: ["chlorhexidine"], note: "An antiseptic, also in first-aid washes and mouthwash; can cause immediate-type reactions as well." },

  // --- 4. Surfactants and emulsifiers ---
  {
    id: "cocamidopropyl-betaine",
    name: "Cocamidopropyl betaine (CAPB)",
    section: "surfactant",
    terms: ["cocamidopropyl betaine", "capb", "coco betaine", "coco-betaine"],
    note: "The real sensitizers are often manufacturing residues, amidoamine and dimethylaminopropylamine, which aren't listed.",
  },
  { id: "decyl-glucoside", name: "Decyl glucoside", section: "surfactant", terms: ["decyl glucoside"] },
  { id: "lauryl-glucoside", name: "Lauryl glucoside", section: "surfactant", terms: ["lauryl glucoside"] },
  { id: "coco-glucoside", name: "Coco glucoside", section: "surfactant", terms: ["coco glucoside", "coco-glucoside"] },
  {
    id: "other-alkyl-glucosides",
    name: "Other alkyl glucosides",
    section: "surfactant",
    terms: ["capryl glucoside", "caprylyl glucoside", "cetearyl glucoside", "arachidyl glucoside", "myristyl glucoside", "octyl glucoside", "undecyl glucoside"],
    note: "Same chemical family as decyl, lauryl and coco glucoside, which cross-react.",
  },
  {
    id: "sorbitan-sesquioleate",
    name: "Sorbitan sesquioleate / sorbitan oleate",
    section: "surfactant",
    terms: ["sorbitan sesquioleate", "sorbitan oleate"],
    aka: ["SSO"],
    note: "Also the emulsifier in patch-test fragrance preparations.",
  },
  { id: "oleamidopropyl-dimethylamine", name: "Oleamidopropyl dimethylamine", section: "surfactant", terms: ["oleamidopropyl dimethylamine"] },
  {
    id: "laureth-sulfates",
    name: "Laureth and pareth sulfates",
    section: "surfactant",
    terms: ["laureth sulfate", "pareth sulfate", "laureth-2 sulfate", "laureth-3 sulfate"],
  },
  {
    id: "cetearyl-alcohol",
    name: "Cetearyl (cetostearyl) alcohol",
    section: "surfactant",
    terms: ["cetearyl alcohol", "cetostearyl alcohol", "cetyl stearyl alcohol", "cetyl alcohol", "stearyl alcohol"],
    note: "A mix of cetyl and stearyl alcohol, so both are flagged too.",
  },

  // --- 5. Emollients ---
  {
    id: "lanolin",
    name: "Lanolin (wool alcohols)",
    section: "emollient",
    terms: ["*lanolin*", "lanolate", "laneth", "wool alcohol", "wool alcohols", "wool wax", "wool fat", "adeps lanae", "amerchol"],
    aka: ["Amerchol L-101"],
  },
  {
    id: "propylene-glycol",
    name: "Propylene glycol",
    section: "emollient",
    terms: ["propylene glycol", "1,2-propanediol"],
    aka: ["PG"],
    note: "A weak allergen on intact skin, more relevant on a damaged barrier. Propylene glycol esters are flagged too.",
  },

  // --- 6. UV filters ---
  { id: "octocrylene", name: "Octocrylene", section: "uv-filter", terms: ["octocrylene"] },
  {
    id: "oxybenzone",
    name: "Oxybenzone (benzophenone-3)",
    section: "uv-filter",
    terms: ["oxybenzone", "benzophenone-3", "bp-3"],
    note: "A well-documented photoallergen.",
  },
  { id: "benzophenone-4", name: "Sulisobenzone (benzophenone-4)", section: "uv-filter", terms: ["benzophenone-4", "sulisobenzone", "bp-4"], note: "An emerging allergen." },
  {
    id: "octinoxate",
    name: "Octinoxate (ethylhexyl methoxycinnamate)",
    section: "uv-filter",
    terms: ["octinoxate", "ethylhexyl methoxycinnamate", "octyl methoxycinnamate"],
  },
  {
    id: "salicylate-filters",
    name: "Octisalate and homosalate",
    section: "uv-filter",
    terms: ["octisalate", "ethylhexyl salicylate", "octyl salicylate", "homosalate"],
  },
  { id: "avobenzone", name: "Avobenzone", section: "uv-filter", terms: ["avobenzone", "butyl methoxydibenzoylmethane"] },
  {
    id: "paba",
    name: "PABA (p-aminobenzoic acid)",
    section: "uv-filter",
    terms: ["paba", "aminobenzoic acid", "padimate"],
    note: "PABA esters such as padimate O are flagged too.",
  },
  {
    id: "bemotrizinol",
    name: "Bemotrizinol (Tinosorb S)",
    section: "uv-filter",
    terms: ["bis-ethylhexyloxyphenol methoxyphenyl triazine", "bemotrizinol", "tinosorb s"],
  },
  {
    id: "bisoctrizole",
    name: "Bisoctrizole (Tinosorb M)",
    section: "uv-filter",
    terms: ["methylene bis-benzotriazolyl tetramethylbutylphenol", "bisoctrizole", "tinosorb m"],
    note: "Its formulation contains decyl glucoside, which may be the true culprit.",
  },
  {
    id: "ecamsule",
    name: "Ecamsule (Mexoryl SX)",
    section: "uv-filter",
    terms: ["ecamsule", "terephthalylidene dicamphor sulfonic acid", "mexoryl sx"],
    rare: true,
  },
  { id: "drometrizole-trisiloxane", name: "Drometrizole trisiloxane (Mexoryl XL)", section: "uv-filter", terms: ["drometrizole trisiloxane", "mexoryl xl"], rare: true },
  { id: "oleoyl-tyrosine", name: "Oleoyl tyrosine", section: "uv-filter", terms: ["oleoyl tyrosine"], note: "In tan-enhancing products." },
  {
    id: "mineral-uv-filters",
    name: "Titanium dioxide / zinc oxide",
    section: "uv-filter",
    terms: ["titanium dioxide", "zinc oxide", "ci 77891", "ci 77947"],
    note: "Mineral filters are rarely allergenic; listed for completeness.",
    rare: true,
  },

  // --- 7. Botanicals ---
  {
    id: "compositae",
    name: "Compositae (daisy family) extracts",
    section: "botanical",
    terms: [
      "chamomile", "chamomilla", "matricaria", "anthemis nobilis", "chamaemelum", "arnica", "feverfew", "chrysanthemum parthenium", "tanacetum", "calendula",
      "achillea millefolium", "yarrow", "artemisia", "mugwort", "taraxacum", "dandelion", "sesquiterpene lactone",
    ],
    aka: ["Asteraceae", "sesquiterpene lactone mix"],
    note: "The patch-test marker is sesquiterpene lactone mix. Bisabolol, though chamomile-derived, is listed separately.",
  },
  { id: "propolis", name: "Propolis", section: "botanical", terms: ["propolis", "bee glue"] },
  { id: "tea-tree-oil", name: "Tea tree oil", section: "botanical", terms: ["melaleuca alternifolia", "tea tree"], note: OXIDIZES },
  {
    id: "lichen",
    name: "Lichen extracts",
    section: "botanical",
    terms: ["usnea", "usnic acid", "atranol", "chloroatranol", "evernia furfuracea", "treemoss", "tree moss", "lichen"],
    note: "Includes treemoss; oakmoss is listed under fragrances.",
  },
  {
    id: "henna",
    name: "Henna (Lawsonia inermis)",
    section: "botanical",
    terms: ["henna", "lawsonia inermis", "lawsone"],
    note: "Pure henna is a rare allergen. “Black henna” usually contains PPD, a potent sensitizer.",
  },
  { id: "lavender-oil", name: "Lavender oil", section: "botanical", terms: ["lavandula", "lavender", "lavandin"] },
  { id: "jasmine", name: "Jasmine", section: "botanical", terms: ["jasminum", "jasmine"] },
  { id: "peppermint-oil", name: "Peppermint oil", section: "botanical", terms: ["mentha piperita", "peppermint"] },
  {
    id: "bergamot",
    name: "Bergamot oil",
    section: "botanical",
    terms: ["bergamot", "citrus bergamia", "citrus aurantium bergamia", "bergapten", "5-methoxypsoralen"],
    unless: ["bergamot mint"],
    note: "Phototoxic as well as allergenic: its furanocoumarins cause a sunburn-like reaction and dark streaks after sun exposure.",
  },
  // T.R.U.E. Test and NACDG screening allergen. Sources: Fonacier et al.,
  // AAAAI Practice Parameter, 2015; DeKoven et al., NACDG patch-test results
  // 2019-2020, Dermatitis, 2023.
  {
    id: "colophonium",
    name: "Colophonium (rosin)",
    section: "botanical",
    terms: ["colophonium", "colophony", "rosin", "*rosinate", "abietic acid", "abietyl alcohol", "hydroabietyl alcohol", "methyl abietate"],
    aka: ["Colophony", "Abietic acid", "Glyceryl rosinate"],
    note: "Pine resin. In mascara, eyeliner, lip products, depilatory wax, nail products and adhesives (bandages, lash glue). Modified rosins such as glyceryl rosinate are flagged too, since they can still cross-react.",
  },

  // --- 8. Antioxidants ---
  {
    id: "tocopherol",
    name: "Vitamin E (tocopherol)",
    section: "antioxidant",
    terms: ["*tocopher*", "vitamin e"],
    note: "The most common inactive-ingredient allergen in best-selling sunscreens.",
  },
  {
    id: "sulfites",
    name: "Sulfites (sodium metabisulfite)",
    section: "antioxidant",
    terms: ["*metabisulfite", "*bisulfite", "sodium sulfite", "potassium sulfite", "sulfites"],
    note: "An “Allergen of the Year” nominee; how often a positive patch test explains a rash is still debated.",
  },

  // --- 9. Hair dyes ---
  {
    id: "ppd",
    name: "p-Phenylenediamine (PPD)",
    section: "hair",
    terms: ["p-phenylenediamine", "para-phenylenediamine", "paraphenylenediamine", "1,4-phenylenediamine", "1,4-diaminobenzene", "ppd"],
    note: "Also in “black henna” temporary tattoos. Cross-reacts with toluene-2,5-diamine. PPD derivatives such as 2-methoxymethyl-p-phenylenediamine are flagged too, since many PPD-allergic people react to them.",
  },
  {
    id: "ptd",
    name: "Toluene-2,5-diamine (PTD)",
    section: "hair",
    terms: ["toluene-2,5-diamine", "p-toluenediamine", "para-toluenediamine", "ptd"],
    note: "Cross-reacts with PPD; often marketed as the PPD-free alternative.",
  },
  { id: "aminophenols", name: "Aminophenols", section: "hair", terms: ["aminophenol"], aka: ["o-aminophenol", "m-aminophenol", "p-aminophenol"] },
  { id: "persulfates", name: "Persulfates", section: "hair", terms: ["persulfate"], note: "Bleach boosters; can also cause hives and asthma." },
  { id: "thioglycolates", name: "Thioglycolates", section: "hair", terms: ["thioglycolate", "thioglycolic acid"], note: "Perm and depilatory chemicals." },

  // --- 10. Medicaments ---
  {
    id: "neomycin",
    name: "Neomycin",
    section: "medicament",
    terms: ["neomycin", "framycetin", "paromomycin"],
    note: "Cross-reacts with framycetin, paromomycin and other aminoglycosides, which are flagged too.",
  },
  { id: "bacitracin", name: "Bacitracin", section: "medicament", terms: ["bacitracin"] },
  { id: "polymyxin-b", name: "Polymyxin B", section: "medicament", terms: ["polymyxin"] },
  { id: "mupirocin", name: "Mupirocin", section: "medicament", terms: ["mupirocin"] },
  { id: "clioquinol", name: "Clioquinol", section: "medicament", terms: ["clioquinol", "iodochlorhydroxyquin"] },
  {
    id: "corticosteroid-class-a",
    name: "Corticosteroids, class A (hydrocortisone type)",
    section: "medicament",
    terms: ["hydrocortisone", "tixocortol", "prednisolone", "methylprednisolone", "prednisone", "cortisone"],
    unless: [
      "hydrocortisone 17-butyrate", "hydrocortisone butyrate", "hydrocortisone valerate", "hydrocortisone probutate", "hydrocortisone buteprate",
      "methylprednisolone aceponate", "prednicarbate",
    ],
    aka: ["tixocortol-21-pivalate (patch-test marker)"],
    note: "Includes OTC hydrocortisone and hydrocortisone acetate. Corticosteroid allergy is class-based; cross-reactions between classes occur, so ask your dermatologist which classes to avoid.",
  },
  {
    id: "corticosteroid-class-b",
    name: "Corticosteroids, class B (acetonide type)",
    section: "medicament",
    terms: ["budesonide", "triamcinolone", "fluocinolone acetonide", "fluocinonide", "desonide", "amcinonide", "halcinonide"],
    aka: ["budesonide (patch-test marker)"],
    note: "Budesonide also cross-reacts with some class D steroids.",
  },
  {
    id: "corticosteroid-class-c",
    name: "Corticosteroids, class C (non-esterified)",
    section: "medicament",
    terms: ["betamethasone", "dexamethasone", "desoximetasone"],
    unless: ["betamethasone valerate", "betamethasone dipropionate", "betamethasone 17-valerate", "dexamethasone valerate"],
  },
  {
    id: "corticosteroid-class-d",
    name: "Corticosteroids, class D (ester type)",
    section: "medicament",
    terms: [
      "hydrocortisone 17-butyrate", "hydrocortisone butyrate", "hydrocortisone valerate", "hydrocortisone probutate", "clobetasol", "clobetasone",
      "betamethasone valerate", "betamethasone dipropionate", "mometasone", "fluticasone", "methylprednisolone aceponate", "prednicarbate",
    ],
    aka: ["hydrocortisone-17-butyrate (patch-test marker)", "clobetasol-17-propionate (patch-test marker)"],
  },
  {
    id: "benzocaine",
    name: "Benzocaine",
    section: "medicament",
    terms: ["benzocaine", "ethyl aminobenzoate", "ethyl 4-aminobenzoate"],
    note: "In anti-itch, sunburn, teething and hemorrhoid products.",
  },
  { id: "lidocaine", name: "Lidocaine", section: "medicament", terms: ["lidocaine", "lignocaine"] },
  { id: "pramoxine", name: "Pramoxine", section: "medicament", terms: ["pramoxine", "pramocaine"] },
  { id: "dyclonine", name: "Dyclonine", section: "medicament", terms: ["dyclonine"] },
  // Dibucaine and tetracaine make up the T.R.U.E. Test caine mix with
  // benzocaine. Source: Fonacier et al., AAAAI Practice Parameter, 2015.
  {
    id: "dibucaine",
    name: "Dibucaine",
    section: "medicament",
    terms: ["dibucaine", "cinchocaine"],
    note: "An amide anesthetic in OTC hemorrhoid and sunburn ointments.",
  },
  {
    id: "tetracaine",
    name: "Tetracaine",
    section: "medicament",
    terms: ["tetracaine", "amethocaine"],
    note: "An ester anesthetic in numbing creams and gels; can cross-react with benzocaine.",
  },
  // T.R.U.E. Test and NACDG screening allergen. Sources: Fonacier et al.,
  // 2015; DeKoven et al., NACDG 2019-2020, Dermatitis, 2023.
  {
    id: "ethylenediamine",
    name: "Ethylenediamine",
    section: "medicament",
    terms: ["ethylenediamine", "ethylene diamine"],
    unless: ["ethylenediamine tetraacetic", "ethylene diamine tetraacetic", "ethylenediamine disuccinate", "ethylenediamine tetramethylene"],
    aka: ["Ethylenediamine dihydrochloride"],
    note: "A stabilizer in some prescription creams. Can cross-react with the antihistamines hydroxyzine and cetirizine and with aminophylline. The chelators EDTA and EDDS on cosmetic labels are not flagged.",
    rare: true,
  },
  {
    id: "diphenhydramine",
    name: "Diphenhydramine",
    section: "medicament",
    terms: ["diphenhydramine"],
    note: "A topical antihistamine that can cause the itchy rash it is used to treat.",
  },

  // --- 11. Metals ---
  { id: "nickel", name: "Nickel", section: "metal", terms: ["nickel"], note: "The most common contact allergen overall, mostly from jewelry and metal applicators." },
  { id: "cobalt", name: "Cobalt", section: "metal", terms: ["cobalt"], note: "Often co-occurs with nickel allergy; also used as a pigment." },
  {
    id: "chromium",
    name: "Chromium",
    section: "metal",
    terms: ["chromium", "dichromate", "chromate", "ci 77288", "ci 77289"],
    note: "Less common in personal care. Chromium oxide green pigments (CI 77288/77289) are flagged too.",
  },
  // T.R.U.E. Test and NACDG screening allergen (gold sodium thiosulfate).
  // Sources: Fonacier et al., 2015; DeKoven et al., NACDG 2019-2020, 2023.
  {
    id: "gold",
    name: "Gold",
    section: "metal",
    terms: ["gold", "colloidal gold", "ci 77480"],
    aka: ["Gold sodium thiosulfate"],
    note: "A frequent positive patch test that is often not clinically relevant; reactions mostly come from jewelry and dental work. Gold flakes and colloidal gold turn up in some luxury skincare.",
  },

  // --- 12. Acrylates ---
  {
    id: "acrylates",
    name: "Acrylates and methacrylates",
    section: "acrylate",
    terms: ["*acrylat*", "carbomer", "hema", "acrylic acid"],
    note: "Thickeners such as acrylates copolymer and carbomer are in ~79% of best-selling sunscreens; monomers such as HEMA, methyl methacrylate and ethyl cyanoacrylate in nail products and adhesives are the strong sensitizers.",
  },
];

// Cross-reacting families and patch-test mixes, selectable as one unit.
export const ALLERGEN_GROUPS: AllergenGroup[] = [
  {
    id: "formaldehyde-and-releasers",
    name: "Formaldehyde and all releasers",
    members: CONTACT_ALLERGENS.filter((a) => a.section === "formaldehyde").map((a) => a.id),
    note: "If you react to formaldehyde, avoid the whole group: every releaser frees formaldehyde into the product.",
  },
  {
    id: "formaldehyde-releasers",
    name: "Formaldehyde releasers",
    members: CONTACT_ALLERGENS.filter((a) => a.section === "formaldehyde" && a.id !== "formaldehyde").map((a) => a.id),
    note: "The preservatives that release formaldehyde, without formaldehyde itself.",
  },
  {
    id: "isothiazolinones",
    name: "Isothiazolinones (MI, MCI/MI)",
    members: ["methylisothiazolinone", "mci-mi"],
    note: "MCI/MI always contains MI.",
  },
  {
    id: "fragrance-mix-1",
    name: "Fragrance mix I",
    members: ["amyl-cinnamal", "cinnamal", "cinnamyl-alcohol", "eugenol", "isoeugenol", "geraniol", "hydroxycitronellal", "oakmoss"],
    note: "The eight fragrance chemicals in the Fragrance mix I patch test.",
  },
  {
    id: "fragrance-mix-2",
    name: "Fragrance mix II",
    members: ["citral", "citronellol", "coumarin", "farnesol", "hexyl-cinnamal", "hicc"],
    note: "The six fragrance chemicals in the Fragrance mix II patch test.",
  },
  {
    id: "named-fragrance-allergens",
    name: "Fragrance allergens (all)",
    members: CONTACT_ALLERGENS.filter((a) => a.section === "fragrance").map((a) => a.id),
    note: "Every fragrance allergen on this list, plus undisclosed fragrance.",
  },
  {
    id: "glucosides",
    name: "Alkyl glucosides",
    members: ["decyl-glucoside", "lauryl-glucoside", "coco-glucoside", "other-alkyl-glucosides"],
    note: "Mild surfactants common in “gentle” and baby cleansers, and in Tinosorb M; they cross-react.",
  },
  {
    id: "ppd-type-dyes",
    name: "PPD-type hair dyes",
    members: ["ppd", "ptd", "aminophenols"],
    note: "PPD and PTD cross-react; aminophenols are frequent co-reactors.",
  },
  {
    id: "chemical-uv-filters",
    name: "Chemical UV filters (all)",
    members: CONTACT_ALLERGENS.filter((a) => a.section === "uv-filter" && a.id !== "mineral-uv-filters").map((a) => a.id),
    note: "Every organic filter on this list; leaves mineral-only (titanium dioxide, zinc oxide) sunscreens.",
  },
  {
    id: "corticosteroids",
    name: "Topical corticosteroids (all)",
    members: ["corticosteroid-class-a", "corticosteroid-class-b", "corticosteroid-class-c", "corticosteroid-class-d"],
    note: "All four structural classes.",
  },
];

// The common, high-yield picks offered as one-click filters.
export const FEATURED_ALLERGEN_IDS = [
  "formaldehyde-and-releasers",
  "isothiazolinones",
  "fragrance-mix-1",
  "fragrance-mix-2",
  "named-fragrance-allergens",
  "balsam-of-peru",
  "cocamidopropyl-betaine",
  "glucosides",
  "lanolin",
  "propylene-glycol",
  "tocopherol",
  "chemical-uv-filters",
  "compositae",
  "acrylates",
];

// Ids of the former contact-allergen free-from checks (ingredient-flags.ts),
// still in avoid-list cookies and links, mapped to what replaced them.
export const LEGACY_ALLERGEN_IDS: Record<string, string> = {
  "lanolin-free": "lanolin",
  "formaldehyde-free": "formaldehyde-and-releasers",
  "oxybenzone-free": "oxybenzone",
  "iodopropynyl-butylcarbamate-free": "iodopropynyl-butylcarbamate",
  "named-fragrance-allergen-free": "named-fragrance-allergens",
  "formaldehyde-releaser-free": "formaldehyde-releasers",
  "mi-mci-free": "isothiazolinones",
  "cocamidopropyl-betaine-free": "cocamidopropyl-betaine",
  "balsam-of-peru-free": "balsam-of-peru",
  "propylene-glycol-free": "propylene-glycol",
};

const BY_ID = new Map(CONTACT_ALLERGENS.map((a) => [a.id, a]));
const GROUP_BY_ID = new Map(ALLERGEN_GROUPS.map((g) => [g.id, g]));

export function getAllergen(id: string): ContactAllergen | undefined {
  return BY_ID.get(id);
}

export function getAllergenGroup(id: string): AllergenGroup | undefined {
  return GROUP_BY_ID.get(id);
}

export function getAllergenSection(id: AllergenSectionId): AllergenSection {
  return ALLERGEN_SECTIONS.find((s) => s.id === id)!;
}

/** An allergen or group id (legacy ids resolved), or undefined. */
export function resolveAllergenId(id: string): string | undefined {
  const mapped = LEGACY_ALLERGEN_IDS[id] ?? id;
  return BY_ID.has(mapped) || GROUP_BY_ID.has(mapped) ? mapped : undefined;
}

export function allergenLabel(id: string): string | undefined {
  return BY_ID.get(id)?.name ?? GROUP_BY_ID.get(id)?.name;
}

/** The allergen ids an allergen or group id stands for. */
export function allergenMembers(id: string): string[] {
  const group = GROUP_BY_ID.get(id);
  if (group) return group.members;
  return BY_ID.has(id) ? [id] : [];
}

/** Groups an allergen belongs to (excluding the catch-all fragrance group). */
export function groupsContaining(allergenId: string): AllergenGroup[] {
  return ALLERGEN_GROUPS.filter((g) => g.members.includes(allergenId) && g.id !== "named-fragrance-allergens");
}

// An undisclosed "fragrance"/"parfum" can be hiding any fragrance allergen.
export function concealableByFragrance(allergenId: string): boolean {
  return allergenId !== "fragrance" && BY_ID.get(allergenId)?.section === "fragrance";
}

// A positive to one of these usually means avoiding the whole family:
// offered next to it on results sheets and series checklists, ticked by
// default only where that's the standard advice.
export const PATCH_TEST_FAMILY: Record<string, { id: string; byDefault: boolean }> = {
  formaldehyde: { id: "formaldehyde-and-releasers", byDefault: true },
  ppd: { id: "ppd-type-dyes", byDefault: true },
  ptd: { id: "ppd-type-dyes", byDefault: true },
  "decyl-glucoside": { id: "glucosides", byDefault: false },
  "lauryl-glucoside": { id: "glucosides", byDefault: false },
  "coco-glucoside": { id: "glucosides", byDefault: false },
  methylisothiazolinone: { id: "isothiazolinones", byDefault: false },
  "mci-mi": { id: "isothiazolinones", byDefault: false },
};

// --- Matching ---

/** Lowercase, accent-free, with separators folded to single spaces and "1,3-" digit commas joined. */
export function normalizeForAllergens(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/α/g, "alpha ")
    .replace(/sulph/g, "sulf")
    .replace(/(\d),(?=\d)/g, "$1")
    .replace(/[\s\-‐-―_()[\]{}/\\+]+/g, " ")
    .trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termPattern(term: string): string {
  const open = term.startsWith("*");
  const close = term.endsWith("*");
  const core = normalizeForAllergens(term.replace(/^\*|\*$/g, ""));
  return `${open ? "" : "(?<![a-z0-9])"}${escapeRe(core)}${close ? "" : "(?![a-z0-9])"}`;
}

const MATCHERS = CONTACT_ALLERGENS.map((a) => ({
  id: a.id,
  re: new RegExp(a.terms.map(termPattern).join("|")),
  unless: a.unless?.length ? new RegExp(a.unless.map(termPattern).join("|"), "g") : null,
}));

function matchNormalized(text: string): string[] {
  return MATCHERS.filter((m) => m.re.test(m.unless ? text.replace(m.unless, " ") : text)).map((m) => m.id);
}

/** Allergen ids named by one ingredient ("Parfum (Fragrance)" -> ["fragrance"]). */
export function allergensInIngredient(name: string): string[] {
  return matchNormalized(normalizeForAllergens(name));
}

// Same floor as computeFreeFromFlags: shorter text is an active-ingredient
// line, not a formula, and absence in it means nothing.
const MIN_FULL_INGREDIENT_TEXT_LENGTH = 60;

/**
 * Allergen ids present anywhere in a full ingredient list, or null when the
 * text isn't a full list (unknown, never "free of everything"). Matched on
 * the whole text rather than split names, so chemical names with commas
 * ("2-bromo-2-nitropropane-1,3-diol") survive.
 */
export function computeAllergenHits(fullIngredientText: string | null | undefined): string[] | null {
  if (!fullIngredientText || fullIngredientText.trim().length < MIN_FULL_INGREDIENT_TEXT_LENGTH) return null;
  // Commas survive normalization, so a term can't run across two ingredients.
  const text = normalizeForAllergens(fullIngredientText.replace(/[;\n]/g, ","));
  return matchNormalized(text);
}

export type AllergenFinding = { level: "contains" | "may-contain"; allergenIds: string[] };

/**
 * Whether a product with these hits contains the allergen or group `id`:
 * "contains" when a member is listed, "may-contain" when a fragrance allergen
 * could be inside an undisclosed fragrance, null when neither.
 */
export function allergenFinding(hits: string[], id: string): AllergenFinding | null {
  const members = allergenMembers(id);
  const present = members.filter((m) => hits.includes(m));
  if (present.length > 0) return { level: "contains", allergenIds: present };
  if (hits.includes("fragrance")) {
    const hidden = members.filter(concealableByFragrance);
    if (hidden.length > 0) return { level: "may-contain", allergenIds: hidden };
  }
  return null;
}

/** Every allergen id whose presence rules a product out of "free of `id`" (incl. undisclosed fragrance). */
export function allergenBlockers(id: string): string[] {
  const members = allergenMembers(id);
  return members.some(concealableByFragrance) ? [...new Set([...members, "fragrance"])] : members;
}

/** The label names an allergen is matched on, for display ("*paraben*" -> "paraben"). */
export function labelNames(a: ContactAllergen): string[] {
  return [...new Set(a.terms.map((t) => t.replace(/\*/g, "")))];
}

// Every name an allergen goes by, normalized once, so searching a patch-test
// sheet's wording ("Kathon CG", "Lyral", "wool alcohols") finds the entry.
const SEARCH_INDEX = CONTACT_ALLERGENS.map((a) => ({
  allergen: a,
  haystack: normalizeForAllergens([a.name, ...labelNames(a), ...(a.aka ?? [])].join(" | ")),
}));

/** Allergens any of whose names contain the query (2+ characters), in list order. */
export function searchAllergens(query: string): ContactAllergen[] {
  const q = normalizeForAllergens(query);
  return q.length >= 2 ? SEARCH_INDEX.filter((e) => e.haystack.includes(q)).map((e) => e.allergen) : [];
}

// --- Patch-test results ---

// Series names that aren't label names, mapped to what they stand for.
// Checked before label matching so "Fragrance mix I" isn't read as an
// undisclosed fragrance.
const PATCH_TEST_NAMES: [string, string][] = [
  ["fragrance mix ii", "fragrance-mix-2"],
  ["fragrance mix 2", "fragrance-mix-2"],
  ["fragrance mix i", "fragrance-mix-1"],
  ["fragrance mix 1", "fragrance-mix-1"],
  ["fragrance mix", "fragrance-mix-1"],
  ["paraben mix", "parabens"],
  ["caine mix", "benzocaine"],
  ["compositae mix", "compositae"],
  ["formaldehyde releaser", "formaldehyde-releasers"],
  ["amidoamine", "cocamidopropyl-betaine"],
  ["dimethylaminopropylamine", "cocamidopropyl-betaine"],
  ["dmapa", "cocamidopropyl-betaine"],
  ["mci mi", "mci-mi"],
  ["mci", "mci-mi"],
  ["mit", "methylisothiazolinone"],
  ["mi", "methylisothiazolinone"],
  ["sso", "sorbitan-sesquioleate"],
  ["pg", "propylene-glycol"],
  ["grotan bk", "hydroxyethyl-triazine"],
  ["sesquiterpene lactone mix", "compositae"],
].map(([name, id]) => [normalizeForAllergens(name), id]);

// Concentrations, vehicles and readings that follow an allergen on a
// results sheet: "Methylisothiazolinone 0.2% aq ++ (relevant)".
const RESULT_NOISE =
  /\b(\d+([.,]\d+)?\s*%|\d+([.,]\d+)?\s*(mg|µg|ug)(\s*\/\s*cm2?)?|pet|petrolatum|aq|water|eth|ethanol|acetone|ac|day\s*\d|d\s*\d|reading|positive|pos|relevant|relevance|current|past|possible|probable|definite|doubtful|irritant|ir|allergic|reaction|result|weak|strong|extreme)\b|[+?()[\]:#*]+|\b\d+\.(?=\s)/gi;
const NEGATIVE = /\b(neg|negative|nr|not reactive|no reaction)\b|(^|\s)[-–]\s*$|(^|\s)0\s*$/i;

export type PatchTestLine = { line: string; ids: string[]; negative: boolean };

/**
 * Reads a pasted patch-test results sheet, one allergen per line (or comma-
 * separated), into allergen/group ids. Lines read as negative are flagged so
 * the caller can leave them unticked.
 */
export function parsePatchTestResults(text: string): PatchTestLine[] {
  const lines = text
    .split(/\r?\n|;|,(?!\d)/)
    .map((l) => l.trim())
    .filter((l) => /[a-z]{2}/i.test(l));
  return lines.slice(0, 120).map((line) => {
    const negative = NEGATIVE.test(line);
    const cleaned = normalizeForAllergens(line.replace(NEGATIVE, " ").replace(RESULT_NOISE, " "));
    const exact = PATCH_TEST_NAMES.find(([name]) => cleaned === name);
    const named = exact ?? PATCH_TEST_NAMES.find(([name]) => name.length > 3 && new RegExp(`(^| )${escapeRe(name)}( |$)`).test(cleaned));
    if (named) return { line, ids: [named[1]], negative };
    const group = ALLERGEN_GROUPS.find((g) => normalizeForAllergens(g.name) === cleaned);
    if (group) return { line, ids: [group.id], negative };
    // An exact aka ("Kathon CG", "Amerchol L-101") before word matching.
    const aka = CONTACT_ALLERGENS.find((a) => [a.name, ...(a.aka ?? [])].some((n) => normalizeForAllergens(n) === cleaned));
    if (aka) return { line, ids: [aka.id], negative };
    return { line, ids: cleaned ? allergensInIngredient(cleaned) : [], negative };
  });
}
