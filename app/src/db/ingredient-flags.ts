// "Clean ingredient" and skin-type flags, computed directly from a
// product's full ingredient list -- not from a brand's own marketing claims
// (a "Free From" badge can be outdated or wrong; the published INCI list is
// the actual source of truth), and not a certification or an overall
// "green" score, which would be an editorial judgment this file deliberately
// avoids making. Each check is a plain substring-absence test: present = the
// claim doesn't hold; absent = it does.
//
// Not exhaustive, and not a substitute for reading the full ingredient list
// yourself if you have a known allergy. The contact-allergen checks that
// used to live here moved to db/contact-allergens.ts.

export type FreeFromCheck = {
  id: string;
  label: string; // "Fragrance-free"
  category: "clean" | "skin";
  avoidSubstrings: string[]; // lowercase; presence of ANY of these means the claim does NOT hold
  // For terms a substring can't express (plain "alcohol" INCI vs. cetyl
  // alcohol). Tested against each single ingredient name, lowercase.
  avoidPatterns?: RegExp[];
  // How to word a conflict ("Contains {avoidName}"); defaults to the label minus "-free".
  avoidName?: string;
  // One line on what the check looks for, shown on the checker and product pages.
  explain?: string;
};

export const FREE_FROM_CHECKS: FreeFromCheck[] = [
  // Overlaps both categories -- fragrance is the single most common contact
  // allergen (NACDG/ACDS data) and the most commonly avoided "clean beauty" ingredient.
  { id: "fragrance-free", label: "Fragrance-free", category: "clean", avoidSubstrings: ["fragrance", "parfum", "perfume"] },
  { id: "paraben-free", label: "Paraben-free", category: "clean", avoidSubstrings: ["paraben"] },
  {
    id: "phthalate-free",
    label: "Phthalate-free",
    category: "clean",
    avoidName: "phthalates or fragrance",
    explain:
      "Flags any listed phthalate (diethyl phthalate, dibutyl phthalate and the rest), and also fragrance or parfum: phthalates are mostly used as fragrance solvents, and a label can list the whole fragrance blend as one word, so a fragranced product can't be shown phthalate-free from its ingredient list.",
    // Bare "phthalate" covers every ester; the abbreviations only as a whole
    // ingredient name, since "dep" would hit far too much as a substring.
    avoidSubstrings: ["phthalate", "fragrance", "parfum", "perfume"],
    avoidPatterns: [/^(dep|dbp|dehp|dmp|bbp|dinp|didp)$/],
  },
  {
    id: "sulfate-free",
    label: "Sulfate-free",
    category: "clean",
    // Specifically the harsh-surfactant sulfate family, NOT a generic
    // "sulfate" substring -- that would false-positive-flag products
    // containing e.g. zinc sulfate or magnesium sulfate, which are
    // unrelated skin-protectant ingredients, not the surfactants this claim
    // is actually about.
    avoidSubstrings: ["sodium lauryl sulfate", "sodium laureth sulfate", "ammonium lauryl sulfate", "ammonium laureth sulfate"],
  },
  {
    id: "silicone-free",
    label: "Silicone-free",
    category: "clean",
    avoidSubstrings: ["dimethicone", "cyclomethicone", "cyclopentasiloxane", "phenyl trimethicone", "amodimethicone"],
  },
  { id: "mineral-oil-free", label: "Mineral oil-free", category: "clean", avoidSubstrings: ["mineral oil", "petrolatum", "paraffinum liquidum"] },
  { id: "dye-free", label: "Dye-free", category: "clean", avoidSubstrings: ["fd&c", "d&c "] },
  { id: "peg-free", label: "PEG-free", category: "clean", avoidSubstrings: ["peg-", "peg/", "polyethylene glycol"] },

  // Contact allergens live in db/contact-allergens.ts: ~100 of them with
  // label synonyms, stored per product as hits rather than free-from flags.
  // The old contact-allergen check ids here map to them via
  // LEGACY_ALLERGEN_IDS.

  // Skin-type / lifestyle filters. Same mechanism, but these encode
  // widely-repeated community and clinical rules of thumb rather than
  // allergen data -- treat them as a screening aid, not a guarantee.
  {
    id: "fungal-acne-safe",
    label: "Fungal-acne-safe",
    category: "skin",
    avoidName: "fungal-acne triggers",
    explain:
      "Malassezia yeast (behind fungal acne / pityrosporum folliculitis) feeds on fatty acids and their esters, polysorbates, most plant oils and butters, and fermented ingredients. Flags any of those; medium-chain caprylic/capric triglyceride, squalane and fatty alcohols are not flagged.",
    avoidSubstrings: [
      // polysorbates and sorbitan esters
      "polysorbate", "sorbitan",
      // fatty-acid esters and salts (C12-C24 chains)
      "laurate", "myristate", "palmitate", "stearate", "oleate", "isostearate", "linoleate", "linolenate", "behenate", "arachidate", "erucate",
      // free fatty acids
      "lauric acid", "myristic acid", "palmitic acid", "stearic acid", "oleic acid", "linoleic acid", "linolenic acid", "behenic acid",
      // plant oils and butters
      "olea europaea", "olive oil", "cocos nucifera", "coconut oil", "helianthus annuus", "sunflower", "simmondsia", "jojoba", "argania", "argan",
      "prunus amygdalus", "almond oil", "persea gratissima", "avocado", "butyrospermum", "shea", "theobroma", "cocoa", "ricinus", "castor",
      "vitis vinifera", "grape seed", "rosa canina", "rosehip", "sesamum", "sesame", "glycine soja", "soybean", "brassica campestris", "canola",
      "carthamus", "safflower", "linum usitatissimum", "flax", "oenothera", "evening primrose", "borago", "borage", "cannabis sativa", "hemp seed",
      "macadamia", "arachis", "peanut", "zea mays", "corn oil", "elaeis guineensis", "palm oil", "palm kernel", "camellia oleifera", "camellia japonica", "camellia sinensis seed", "meadowfoam", "limnanthes",
      // fermented / cultured ingredients
      "ferment", "lactobacillus", "saccharomyces", "galactomyces", "bifida",
      // animal fats
      "tallow", "lanolin",
    ],
  },
  {
    id: "alcohol-free",
    label: "Alcohol-free",
    category: "skin",
    avoidName: "drying alcohol",
    explain: "Flags ethanol-type alcohols (alcohol, alcohol denat., SD alcohol, isopropyl alcohol). Fatty alcohols such as cetyl or stearyl alcohol are emollients and are not flagged.",
    // "ethanol" as a bare substring would flag phenoxyethanol and ethanolamines
    avoidSubstrings: ["alcohol denat", "sd alcohol", "denatured alcohol", "isopropyl alcohol"],
    avoidPatterns: [/^alcohol(\s*\(.*\))?$/, /(^|[^a-z])(eth|meth)anol(?!amine)/],
  },
  {
    id: "essential-oil-free",
    label: "Essential oil-free",
    category: "skin",
    avoidName: "essential oils",
    explain: "Flags common essential oils, citrus-derived ingredients and named aromatic constituents, a frequent irritant and sensitiser on reactive skin.",
    avoidSubstrings: [
      "essential oil", "lavandula", "lavender", "mentha", "peppermint", "spearmint", "menthol", "camphor", "eucalyptus", "melaleuca", "tea tree",
      "citrus aurantium", "citrus limon", "citrus paradisi", "citrus grandis", "citrus sinensis", "citrus reticulata", "citrus medica", "bergamot", "orange peel oil",
      "rosmarinus", "rosemary leaf oil", "cymbopogon", "lemongrass", "pelargonium", "rosa damascena flower oil", "jasminum", "ylang", "cananga", "santalum", "sandalwood",
      "cinnamomum", "clove", "eugenia caryophyllus", "thymus", "thyme", "salvia sclarea", "cedarwood",
    ],
  },
  {
    id: "reef-safe",
    label: "Reef-safer",
    category: "skin",
    avoidName: "reef-harming UV filters",
    explain: "Free of oxybenzone and octinoxate, the two UV filters banned in Hawaii and Key West over coral-bleaching concerns. Other filters are not evaluated.",
    avoidSubstrings: ["oxybenzone", "benzophenone-3", "octinoxate", "ethylhexyl methoxycinnamate", "octyl methoxycinnamate"],
  },
  {
    id: "animal-derived-free",
    label: "No animal-derived ingredients",
    category: "skin",
    avoidName: "animal-derived ingredients",
    explain: "Flags ingredients commonly sourced from animals (beeswax, honey, lanolin, carmine, collagen, gelatin, keratin, tallow, silk, guanine, milk proteins). An ingredient list can't show cruelty-free testing or a vegan certification, and some listed items have plant-based versions.",
    avoidSubstrings: [
      "beeswax", "cera alba", "honey", "propolis", "royal jelly", "lanolin", "carmine", "cochineal", "collagen", "gelatin", "keratin", "elastin",
      "tallow", "silk", "sericin", "guanine", "pearl", "snail", "placenta", "casein", "lactoferrin", "whey", "milk protein", "goat milk", "donkey milk", "shellac",
    ],
  },
];

export function getFreeFromCheck(id: string): FreeFromCheck | undefined {
  return FREE_FROM_CHECKS.find((c) => c.id === id);
}

// A short ingredient string ("Salicylic Acid 2%") is an active-ingredient
// line, not a full formula -- checking it for absence of "paraben" would
// always pass, since actives are never parabens, producing a false
// "paraben-free" claim for a product we simply never saw the full formula
// for. This length floor is a blunt but safe proxy for "this looks like an
// actual multi-ingredient INCI list, not just a Drug Facts active line."
const MIN_FULL_INGREDIENT_TEXT_LENGTH = 60;

/**
 * Returns the ids of every free-from claim that holds, or null if the given
 * text isn't substantial enough to be a real full ingredient list -- null
 * means "not assessed," never treated as "assumed clean" by the UI.
 */
export function computeFreeFromFlags(fullIngredientText: string | null | undefined): string[] | null {
  if (!fullIngredientText || fullIngredientText.trim().length < MIN_FULL_INGREDIENT_TEXT_LENGTH) return null;
  // Pattern checks need individual names, so the list is split for those only.
  const lowered = fullIngredientText.toLowerCase();
  const names = lowered.split(/[,;\n]/).map((n) => n.trim()).filter(Boolean);
  return FREE_FROM_CHECKS.filter(
    (check) => !check.avoidSubstrings.some((s) => lowered.includes(s)) && !failsByPattern(check, names),
  ).map((c) => c.id);
}

function failsByPattern(check: FreeFromCheck, loweredNames: string[]): boolean {
  return !!check.avoidPatterns?.some((re) => loweredNames.some((n) => re.test(n)));
}

/** True if a single ingredient name (any case) trips this check. */
export function ingredientFailsCheck(check: FreeFromCheck, name: string): boolean {
  const n = name.toLowerCase().trim();
  return check.avoidSubstrings.some((s) => n.includes(s)) || failsByPattern(check, [n]);
}

/** The free-from checks an ingredient name would fail (e.g. "Methylparaben" -> paraben-free). */
export function checksFailedByIngredient(names: string[]): FreeFromCheck[] {
  return FREE_FROM_CHECKS.filter((c) => names.some((n) => ingredientFailsCheck(c, n)));
}
