// "Clean ingredient" and "common contact-allergen" flags, computed directly
// from a product's full ingredient list -- not from a brand's own marketing
// claims (a "Free From" badge can be outdated or wrong; the published INCI
// list is the actual source of truth), and not a certification or an
// overall "green" score, which would be an editorial judgment this file
// deliberately avoids making. Each check is a plain substring-absence test:
// present = the claim doesn't hold; absent = it does. Two categories,
// because they serve two different real users (a "clean beauty" shopper
// avoiding parabens/sulfates for preference reasons vs. someone specifically
// avoiding their own contact-dermatitis triggers), but the ingredients
// overlap (fragrance is both, for instance) and the mechanism is identical.
//
// This is v1, not exhaustive, and not a substitute for reading the full
// ingredient list yourself if you have a known allergy -- see needsReview
// note below. A board-certified dermatologist reviewing/extending this list
// (especially the contact-allergen half) would be genuinely valuable; this
// wasn't built by one.

export type FreeFromCheck = {
  id: string;
  label: string; // "Fragrance-free"
  category: "clean" | "contact-allergen";
  avoidSubstrings: string[]; // lowercase; presence of ANY of these means the claim does NOT hold
};

export const FREE_FROM_CHECKS: FreeFromCheck[] = [
  // Overlaps both categories -- fragrance is the single most common contact
  // allergen (NACDG/ACDS data) and the most commonly avoided "clean beauty" ingredient.
  { id: "fragrance-free", label: "Fragrance-free", category: "clean", avoidSubstrings: ["fragrance", "parfum", "perfume"] },
  { id: "paraben-free", label: "Paraben-free", category: "clean", avoidSubstrings: ["paraben"] },
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
  { id: "peg-free", label: "PEG-free", category: "clean", avoidSubstrings: ["peg-", "polyethylene glycol"] },

  // Contact-allergen-avoidance half -- common, well-documented allergens per
  // NACDG/ACDS core allergen series. Not exhaustive -- a starting list, not
  // a clinical tool. The four below (formaldehyde, oxybenzone, iodopropynyl
  // butylcarbamate, named fragrance allergens) were added 2026-09-29 after
  // cross-checking against the Contact Dermatitis Institute's public
  // allergen database (contactdermatitisinstitute.com/database.php, a
  // physician-contributed reference used for patient education) -- every
  // substring below corresponds to a named entry there, not a guess.
  { id: "lanolin-free", label: "Lanolin-free", category: "contact-allergen", avoidSubstrings: ["lanolin", "wool wax", "wool alcohol"] },
  { id: "formaldehyde-free", label: "Formaldehyde-free", category: "contact-allergen", avoidSubstrings: ["formaldehyde"] },
  {
    id: "oxybenzone-free",
    label: "Oxybenzone-free",
    category: "contact-allergen",
    // A well-documented photoallergen -- also one of our tracked FDA
    // sunscreen actives (app/src/db/actives.ts), tracked separately here
    // since "is this active present" and "should this be avoided" are
    // different questions.
    avoidSubstrings: ["oxybenzone", "benzophenone-3"],
  },
  { id: "iodopropynyl-butylcarbamate-free", label: "Iodopropynyl butylcarbamate-free", category: "contact-allergen", avoidSubstrings: ["iodopropynyl butylcarbamate"] },
  {
    id: "named-fragrance-allergen-free",
    label: "Named fragrance allergen-free",
    category: "contact-allergen",
    // Individually-named fragrance chemicals a product can list on its own
    // ingredient panel instead of the generic "fragrance"/"parfum" -- the
    // existing fragrance-free check (top of this file) only catches the
    // generic terms, so a product listing these by name would otherwise
    // pass it. Limonene/linalool specifically: the allergen is technically
    // their oxidized (hydroperoxide) form, not the pristine molecule, but
    // an ingredient list only ever declares the parent name, so that's the
    // practical signal to check -- same convention the EU's mandatory
    // fragrance-allergen labeling list uses.
    avoidSubstrings: [
      "cinnamal", "cinnamyl alcohol", "hydroxycitronellal", "eugenol", "isoeugenol", "geraniol",
      "coumarin", "farnesol", "citral", "citronellol", "limonene", "linalool", "oakmoss", "evernia prunastri",
    ],
  },
  {
    id: "formaldehyde-releaser-free",
    label: "Formaldehyde-releaser-free",
    category: "contact-allergen",
    avoidSubstrings: ["dmdm hydantoin", "quaternium-15", "imidazolidinyl urea", "diazolidinyl urea", "bronopol"],
  },
  {
    id: "mi-mci-free",
    label: "Methylisothiazolinone-free",
    category: "contact-allergen",
    avoidSubstrings: ["methylisothiazolinone", "methylchloroisothiazolinone"],
  },
  { id: "cocamidopropyl-betaine-free", label: "Cocamidopropyl betaine-free", category: "contact-allergen", avoidSubstrings: ["cocamidopropyl betaine"] },
  { id: "balsam-of-peru-free", label: "Balsam of Peru-free", category: "contact-allergen", avoidSubstrings: ["myroxylon pereirae", "balsam of peru", "balsam peru"] },
  { id: "propylene-glycol-free", label: "Propylene glycol-free", category: "contact-allergen", avoidSubstrings: ["propylene glycol"] },
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
  const lowered = fullIngredientText.toLowerCase();
  return FREE_FROM_CHECKS.filter((check) => !check.avoidSubstrings.some((s) => lowered.includes(s))).map((c) => c.id);
}

/** The free-from checks an ingredient name would fail (e.g. "Methylparaben" -> paraben-free). */
export function checksFailedByIngredient(names: string[]): FreeFromCheck[] {
  const lowered = names.map((n) => n.toLowerCase());
  return FREE_FROM_CHECKS.filter((c) => c.avoidSubstrings.some((s) => lowered.some((n) => n.includes(s))));
}
