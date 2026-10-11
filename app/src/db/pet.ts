// Pet mode constants: concerns, regulatory status labels and the
// species-toxicity list. Pure data, no DB, so client components and tests
// can import it. Rows live in pet_products (db/schema.ts), never in
// products, so nothing here reaches a human listing.

export type Species = "dog" | "cat" | "horse" | "pet";
export type PetSpeciesFilter = "dog" | "cat";

// Ids match tools/catalog_pipeline/pet_parse.py PET_CONCERN_RULES, which
// assigns them from each label's actives and indications.
export const PET_CONCERNS: { id: string; name: string; description: string }[] = [
  { id: "pet-itch-allergies", name: "Itch and allergies", description: "Scratching, licking and allergic skin flare-ups." },
  { id: "pet-hot-spots", name: "Hot spots", description: "Red, moist, irritated patches that spread fast." },
  { id: "pet-yeast", name: "Yeast and fungal skin", description: "Greasy, smelly or itchy skin from yeast (Malassezia) and ringworm." },
  { id: "pet-bacterial", name: "Bacterial skin infection", description: "Pimples, crusts and pyoderma; antiseptic washes and wipes." },
  { id: "pet-seborrhea", name: "Seborrhea and dandruff", description: "Flaky, scaly or oily skin and coat." },
  { id: "pet-ear-infections", name: "Ear infections and ear care", description: "Ear cleaners and medicated ear drops." },
  { id: "pet-fleas-ticks", name: "Fleas and ticks", description: "Spot-ons, sprays, shampoos and collars that kill or repel fleas, ticks and mites." },
  { id: "pet-dry-skin", name: "Dry skin", description: "Moisturizing shampoos, balms and conditioners." },
];

export function petConcern(id: string) {
  return PET_CONCERNS.find((c) => c.id === id);
}

export type RegulatoryStatus = "fda_approved" | "fda_conditional" | "unapproved" | "epa_registered" | "brand_listing";

// Shown on pet product pages instead of the human monograph range badges:
// there is no animal OTC monograph, so "below / in / above range" would mean
// nothing here.
export const REGULATORY_STATUS: Record<RegulatoryStatus, { label: string; detail: string }> = {
  fda_approved: {
    label: "FDA-approved animal drug",
    detail: "FDA's Center for Veterinary Medicine approved this drug as safe and effective for the uses on its label (NADA or ANADA).",
  },
  fda_conditional: {
    label: "Conditionally approved by FDA",
    detail: "FDA found it safe and that effectiveness is reasonably expected; full effectiveness data is still being collected.",
  },
  unapproved: {
    label: "Marketed without FDA approval",
    detail: "Sold as an animal drug without FDA approval. FDA has not evaluated whether it is safe or effective.",
  },
  epa_registered: {
    label: "EPA-registered pesticide",
    detail: "Flea and tick products that kill or repel pests are registered by the EPA. The label is the law: follow it exactly, including species and weight limits.",
  },
  brand_listing: {
    label: "Brand's own listing",
    detail: "Ingredients as the brand publishes them. Grooming products need no FDA or EPA review, and claims on them are the brand's own.",
  },
};

export function regulatoryStatus(s: string): { label: string; detail: string } {
  return REGULATORY_STATUS[s as RegulatoryStatus] ?? REGULATORY_STATUS.brand_listing;
}

const SPECIES_LABEL: Record<string, string> = { dog: "Dogs", cat: "Cats", horse: "Horses", pet: "Pets (no species named)" };

export function speciesLabel(species: string[]): string {
  return species.map((s) => SPECIES_LABEL[s] ?? s).join(", ");
}

/**
 * Whether a product shows in the Dogs or Cats view: its label covers that
 * species ("pet" labels name none, so they show in both). A dog-only
 * product is hidden from the Cats view and vice versa, and so is anything
 * whose label says not for cats.
 */
export function forSpecies(species: string[], want: PetSpeciesFilter, notForCats = false): boolean {
  if (want === "cat" && notForCats) return false;
  return species.includes(want) || species.includes("pet");
}

// ---------------------------------------------------------------------------
// Species toxicity. NEEDS VETERINARY REVIEW: drafted from the sources in the
// "Pet mode: data sources and v1 scope" plan (MSD Veterinary Manual, ASPCA
// and ASPCA Pro, cats.com) and not yet checked by a veterinarian. Thresholds
// and wording must be reviewed before pet mode leaves its feature flag
// (lib/feature-flags.ts FEATURE_PET_MODE). To add before launch, per the
// plan: phenols and coal tar in cats, benzocaine in cats, pyrethrin and DEET
// guidance.
// ---------------------------------------------------------------------------

export type ToxicityRule = {
  id: string;
  name: string;
  // Matched, case-insensitive, against the active and inactive ingredient text.
  pattern: RegExp;
  toxicFor: ("dog" | "cat")[];
  risk: string;
  // Only when the product's own label doesn't cover that species (a dog
  // permethrin spot-on, not a cat product with a low-dose pyrethrin).
  onlyWhenNotLabeledFor?: boolean;
  // Only at or above this percent, when the strength is known; an unknown
  // strength still flags (couldn't check is never "clear").
  minPct?: number;
  source: { label: string; url: string };
};

const MSD_OILS = { label: "MSD Veterinary Manual", url: "https://www.msdvetmanual.com/toxicology/toxicoses-from-household-hazards/toxicoses-from-essential-oils-in-animals" };
const ASPCA_PRO = { label: "ASPCA Pro", url: "https://www.aspcapro.org/resource/topical-creams-and-pets-dangerous-combination" };
const ASPCA = { label: "ASPCA", url: "https://www.aspca.org/news/what-pet-toxins-are-hiding-your-diaper-bag" };

export const PET_TOXICITY: ToxicityRule[] = [
  {
    id: "permethrin-pyrethroids",
    name: "Permethrin and other pyrethroids",
    pattern: /\b(permethrin|cypermethrin|cyphenothrin|deltamethrin|d-?phenothrin|phenothrin|lambda-?cyhalothrin)\b/i,
    toxicFor: ["cat"],
    onlyWhenNotLabeledFor: true,
    risk: "Tremors and seizures in cats, even from grooming or sleeping next to a recently treated dog.",
    source: { label: "cats.com", url: "https://cats.com/permethrin-toxicosis-in-cats" },
  },
  {
    id: "essential-oils",
    name: "Tea tree (melaleuca) and other essential oils",
    pattern: /\b(tea tree|melaleuca|cajuput|pennyroyal|eucalyptus oil|peppermint oil|cinnamon (?:bark |leaf )?oil|clove (?:bud |leaf )?oil|pine oil|ylang[- ]ylang|d-?limonene|citrus oil)\b/i,
    toxicFor: ["cat", "dog"],
    risk: "Liver injury, weakness and seizures; cats are most sensitive, and the risk rises with concentration.",
    source: MSD_OILS,
  },
  {
    id: "methyl-salicylate",
    name: "Wintergreen and birch oil (methyl salicylate)",
    pattern: /\b(methyl salicylate|wintergreen|sweet birch|birch (?:bark |leaf )?oil|betula lenta)\b/i,
    toxicFor: ["cat"],
    risk: "Aspirin-like poisoning: cats can't clear salicylates.",
    source: MSD_OILS,
  },
  {
    id: "minoxidil",
    name: "Minoxidil",
    pattern: /\bminoxidil\b/i,
    toxicFor: ["cat", "dog"],
    risk: "Dangerously low blood pressure and heart arrhythmia; a lick of a human hair-regrowth product can kill a cat.",
    source: ASPCA_PRO,
  },
  {
    id: "fluorouracil",
    name: "5-Fluorouracil",
    pattern: /\b(fluorouracil|5-?fu)\b/i,
    toxicFor: ["cat", "dog"],
    risk: "Seizures and bone marrow suppression, often fatal.",
    source: ASPCA_PRO,
  },
  {
    id: "calcipotriene",
    name: "Calcipotriene",
    pattern: /\b(calcipotriene|calcipotriol)\b/i,
    toxicFor: ["cat", "dog"],
    risk: "High blood calcium and kidney damage.",
    source: ASPCA_PRO,
  },
  {
    id: "diclofenac",
    name: "Diclofenac",
    pattern: /\bdiclofenac\b/i,
    toxicFor: ["cat", "dog"],
    risk: "Stomach ulcers and kidney injury; cats more than dogs.",
    source: ASPCA_PRO,
  },
  {
    id: "zinc-oxide",
    name: "Zinc oxide (concentrated)",
    pattern: /\bzinc oxide\b/i,
    toxicFor: ["dog"],
    // Threshold is a placeholder for the vet: diaper creams run 10-40%.
    minPct: 10,
    risk: "Vomiting, and bloody vomit from concentrated creams if licked or eaten.",
    source: ASPCA,
  },
  {
    id: "xylitol",
    name: "Xylitol",
    pattern: /\bxylitol\b/i,
    toxicFor: ["dog"],
    risk: "Low blood sugar and liver failure in dogs.",
    source: ASPCA,
  },
];

export type PetWarning = { rule: ToxicityRule; species: ("dog" | "cat")[] };

/**
 * Toxicity warnings for one pet product: every rule its ingredients hit,
 * with the species it's dangerous for. `strengths` maps a lower-case active
 * name to its percent, for minPct rules.
 */
export function petWarnings(p: {
  species: string[];
  activeIngredientText: string | null;
  inactiveIngredientText: string | null;
  actives: { name: string; pct: number | null }[];
}): PetWarning[] {
  const text = `${p.activeIngredientText ?? ""} ; ${p.inactiveIngredientText ?? ""} ; ${p.actives.map((a) => a.name).join(" ; ")}`;
  const out: PetWarning[] = [];
  for (const rule of PET_TOXICITY) {
    if (!rule.pattern.test(text)) continue;
    if (rule.minPct != null) {
      const pcts = p.actives.filter((a) => rule.pattern.test(a.name)).map((a) => a.pct);
      // Below the threshold at a known strength: no flag. Listed only among
      // the inactives (no strength given): no flag either, since inactives
      // are used at low levels -- a vet reviewer may want this stricter.
      if (pcts.length > 0 && pcts.every((v) => v != null && v < rule.minPct!)) continue;
      if (pcts.length === 0 && !rule.pattern.test(p.activeIngredientText ?? "")) continue;
    }
    const species = rule.toxicFor.filter((s) => !(rule.onlyWhenNotLabeledFor && p.species.includes(s)));
    if (species.length) out.push({ rule, species });
  }
  return out;
}

/**
 * The cat flag every dog product carries: "danger" when the label says not
 * for cats or a dog-only product holds a cat-toxic ingredient (a permethrin
 * spot-on), "dog_only" when the label simply doesn't cover cats, null when
 * it does.
 */
export function catCaution(p: Parameters<typeof petWarnings>[0] & { notForCats: boolean }): "danger" | "dog_only" | null {
  if (p.notForCats) return "danger";
  if (p.species.includes("cat") || p.species.includes("pet")) return null;
  if (petWarnings(p).some((w) => w.species.includes("cat"))) return "danger";
  return p.species.includes("dog") ? "dog_only" : null;
}
