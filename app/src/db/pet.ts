// Pet mode constants: concerns, regulatory status labels and the
// species-toxicity list. Pure data, no DB, so client components and tests
// can import it. Rows live in pet_products (db/schema.ts), never in
// products, so nothing here reaches a human listing.

export type Species = "dog" | "cat" | "horse" | "pet";
export type PetSpeciesFilter = "dog" | "cat";

// Ids match tools/catalog_pipeline/pet_parse.py PET_CONCERN_RULES (assigned
// from each label's actives and indications) plus its GROOMING fallback.
export const PET_CONCERNS: { id: string; name: string; description: string }[] = [
  { id: "pet-itch-allergies", name: "Itch and allergies", description: "Scratching, licking and allergic skin flare-ups." },
  { id: "pet-hot-spots", name: "Hot spots", description: "Red, moist, irritated patches that spread fast." },
  { id: "pet-yeast", name: "Yeast and fungal skin", description: "Greasy, smelly or itchy skin from yeast (Malassezia) and ringworm." },
  { id: "pet-bacterial", name: "Bacterial skin infection", description: "Pimples, crusts and pyoderma; antiseptic washes and wipes." },
  { id: "pet-seborrhea", name: "Seborrhea and dandruff", description: "Flaky, scaly or oily skin and coat." },
  { id: "pet-ear-infections", name: "Ear infections and ear care", description: "Ear cleaners and medicated ear drops." },
  { id: "pet-fleas-ticks", name: "Fleas and ticks", description: "Spot-ons, sprays, shampoos and collars that kill or repel fleas, ticks and mites." },
  { id: "pet-dry-skin", name: "Dry skin", description: "Moisturizing shampoos, balms and conditioners." },
  // Brand-site products with no treatment claim (pet_parse.py GROOMING).
  { id: "pet-grooming", name: "Grooming", description: "Everyday shampoos, conditioners, wipes and deodorizing sprays." },
];

export function petConcern(id: string) {
  return PET_CONCERNS.find((c) => c.id === id);
}

export type RegulatoryStatus = "fda_approved" | "fda_conditional" | "unapproved" | "epa_registered" | "brand_listing" | "other_source";

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
  other_source: {
    label: "Ingredients from another source",
    detail: "The brand's own page doesn't list ingredients, so this list was copied from another published page for the same product, often a retailer's. Check the package before relying on it.",
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
// Species toxicity, checked by consensus (2026-10-12): three independent
// reviews, each limited to one family of sources, and a rule is here only
// where at least two families say the ingredient is dangerous for that
// species. The families are
//   vet references: MSD/Merck Veterinary Manual and peer-reviewed papers
//   poison control: ASPCA Animal Poison Control and Pet Poison Helpline
//   regulators & vet schools: FDA, EPA/NPIC, Cornell, Tufts and VCA
// `agreement` counts the families that support the rule's weakest species,
// and `sources` cites one page each. Where a family says the ingredient is
// fine as labelled (pyrethrins in cat products, lidocaine and salicylic
// acid in vet products), the rule only fires for a species the product
// isn't labelled for (onlyWhenNotLabeledFor). Thresholds appear only where
// the sources give them. Left out for lack of agreement: etofenprox,
// natural pyrethrins, hydrocortisone, benzoyl peroxide, lime sulfur,
// tretinoin, topical ivermectin, camphor, menthol, neem; hydrogen peroxide
// and nicotine are oral risks outside skin care. Several poison-control
// toxicologists also write MSD and VCA pages, so the families overlap.
// STILL NEEDS VETERINARY REVIEW before pet mode leaves its feature flag
// (lib/feature-flags.ts FEATURE_PET_MODE).
// ---------------------------------------------------------------------------

type Source = { label: string; url: string };

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
  agreement: 2 | 3; // source families (of 3) that support it
  sources: Source[];
};

const MSD_OILS: Source = { label: "MSD Veterinary Manual", url: "https://www.merckvetmanual.com/toxicology/toxicoses-from-household-hazards/toxicoses-from-essential-oils-in-animals" };
const MSD_TOPICAL: Source = { label: "MSD Veterinary Manual", url: "https://www.merckvetmanual.com/toxicology/toxicosis-from-human-topical-agents/toxicosis-in-animals-from-human-topical-agents" };
const MSD_ECTO: Source = { label: "MSD Veterinary Manual", url: "https://www.merckvetmanual.com/pharmacology/ectoparasiticides/ectoparasiticides-used-in-small-animals" };
const PPH_OILS_CATS: Source = { label: "Pet Poison Helpline", url: "https://www.petpoisonhelpline.com/uncategorized/essential-oils-cats/" };
const ASPCA_CREAMS: Source = { label: "ASPCA Pro", url: "https://www.aspcapro.org/resource/topical-creams-and-pets-dangerous-combination" };
const ASPCA_ANESTHETICS: Source = { label: "ASPCA Animal Poison Control", url: "https://www.aspcapro.org/sites/default/files/toxbrief_0900.pdf" };
const VCA_OILS_CATS: Source = { label: "VCA Animal Hospitals", url: "https://vcahospitals.com/know-your-pet/essential-oil-and-liquid-potpourri-poisoning-in-cats" };
const CORNELL: Source = { label: "Cornell University Hospital for Animals", url: "https://www.vet.cornell.edu/hospitals/pharmacy/consumer-clinical-care-guidelines-animals/small-animal-toxins" };

export const PET_TOXICITY: ToxicityRule[] = [
  {
    id: "permethrin-pyrethroids",
    name: "Permethrin and other pyrethroids",
    pattern: /\b(permethrin|cypermethrin|cyphenothrin|deltamethrin|d-?phenothrin|phenothrin|lambda-?cyhalothrin)\b/i,
    toxicFor: ["cat"],
    onlyWhenNotLabeledFor: true,
    risk: "Tremors and seizures in cats. Dog spot-ons hold 45-65% permethrin; cats are poisoned even by grooming or sleeping next to a treated dog.",
    agreement: 3,
    sources: [
      MSD_ECTO,
      { label: "ASPCA Animal Poison Control", url: "https://www.aspcapro.org/sites/default/files/d-veccs_april00_0.pdf" },
      { label: "National Pesticide Information Center", url: "https://npic.orst.edu/factsheets/PermGen.html" },
    ],
  },
  {
    id: "essential-oils",
    name: "Tea tree (melaleuca), pennyroyal, cinnamon or pine oil",
    pattern: /\b(tea tree|melaleuca|pennyroyal|cinnamon (?:bark |leaf )?oil|cassia oil|pine oil)\b/i,
    toxicFor: ["cat", "dog"],
    risk: "Weakness, tremors, low body temperature and liver injury, from skin contact or licking. Cats are most sensitive, and concentrated oil is the main danger.",
    agreement: 3,
    sources: [MSD_OILS, { label: "Pet Poison Helpline", url: "https://www.petpoisonhelpline.com/poison/tea-tree-oil/" }, CORNELL],
  },
  {
    id: "essential-oils-cats",
    name: "Eucalyptus, peppermint, clove, ylang-ylang or citrus oil (d-limonene)",
    pattern: /\b(eucalyptus oil|peppermint oil|clove (?:bud |leaf )?oil|ylang[- ]ylang|d-?limonene|citrus oil|orange (?:peel )?oil|lemon oil|bergamot oil)\b/i,
    toxicFor: ["cat"],
    risk: "Drooling, wobbliness, tremors and breathing trouble in cats, which can't break these oils down.",
    agreement: 2,
    sources: [PPH_OILS_CATS, VCA_OILS_CATS],
  },
  {
    id: "methyl-salicylate",
    name: "Wintergreen and birch oil (methyl salicylate)",
    pattern: /\b(methyl salicylate|wintergreen|sweet birch|birch (?:bark |leaf )?oil|betula lenta)\b/i,
    toxicFor: ["cat", "dog"],
    risk: "Aspirin-like poisoning (oil of wintergreen is 98% methyl salicylate); cats can't clear salicylates.",
    agreement: 3,
    sources: [MSD_OILS, PPH_OILS_CATS, VCA_OILS_CATS],
  },
  {
    id: "minoxidil",
    name: "Minoxidil",
    pattern: /\bminoxidil\b/i,
    toxicFor: ["cat", "dog"],
    risk: "Dangerously low blood pressure and heart failure; a lick of a human hair-regrowth product can kill a cat.",
    agreement: 2,
    sources: [MSD_TOPICAL, { label: "Pet Poison Helpline", url: "https://www.petpoisonhelpline.com/uncategorized/warning-minoxidil/" }],
  },
  {
    id: "fluorouracil",
    name: "5-Fluorouracil",
    pattern: /\b(fluorouracil|5-?fu)\b/i,
    toxicFor: ["cat", "dog"],
    risk: "Seizures and bone marrow failure, often fatal; doses as small as 5 mg/kg have killed dogs.",
    agreement: 3,
    sources: [
      MSD_TOPICAL,
      { label: "Pet Poison Helpline", url: "https://www.petpoisonhelpline.com/poison/5-fluorouracil/" },
      { label: "FDA", url: "https://www.fda.gov/animal-veterinary/cvm-updates/cvm-drug-safety-communication-fluorouracil-products-used-peoples-skin-can-cause-serious-reactions" },
    ],
  },
  {
    id: "calcipotriene",
    name: "Calcipotriene",
    pattern: /\b(calcipotriene|calcipotriol)\b/i,
    toxicFor: ["cat", "dog"],
    risk: "Dangerously high blood calcium and kidney failure, from licking a small amount of psoriasis cream.",
    agreement: 2,
    sources: [{ label: "Pet Poison Helpline", url: "https://www.petpoisonhelpline.com/poison/calcipotriene/" }, { label: "VCA Animal Hospitals", url: "https://vcahospitals.com/know-your-pet/vitamin-d-poisoning-in-cats" }],
  },
  {
    id: "topical-nsaids",
    name: "Diclofenac and flurbiprofen (topical pain relievers)",
    pattern: /\b(diclofenac|flurbiprofen)\b/i,
    toxicFor: ["cat"],
    risk: "Kidney failure and liver injury in cats, even from licking an owner's skin after it was applied.",
    agreement: 3,
    sources: [
      MSD_TOPICAL,
      ASPCA_CREAMS,
      { label: "FDA", url: "https://www.fda.gov/animal-veterinary/animal-health-literacy/fda-consumer-advice-pet-exposure-prescription-topical-pain-medications-containing-flurbiprofen" },
    ],
  },
  {
    id: "zinc-oxide",
    name: "Zinc oxide (concentrated)",
    pattern: /\bzinc oxide\b/i,
    toxicFor: ["dog", "cat"],
    // Placeholder for the vet: no source gives a threshold. MSD notes
    // ointments run 10-40%, and a one-time lick mostly upsets the stomach.
    minPct: 10,
    risk: "Vomiting from a one-time lick of a concentrated cream; repeated licking can cause zinc poisoning.",
    agreement: 2,
    sources: [{ label: "ASPCA Pro", url: "https://www.aspcapro.org/resource/sunscreen-and-zinc-oxide-ingestion-pets" }, { label: "VCA Animal Hospitals", url: "https://vcahospitals.com/know-your-pet/zinc-poisoning-toxicity-in-pets" }],
  },
  {
    id: "xylitol",
    name: "Xylitol",
    pattern: /\bxylitol\b/i,
    toxicFor: ["dog"],
    risk: "Low blood sugar and liver failure in dogs if swallowed (above about 0.1 g per kg).",
    agreement: 3,
    sources: [
      { label: "MSD Veterinary Manual", url: "https://www.merckvetmanual.com/toxicology/food-hazards/xylitol-toxicosis-in-dogs" },
      { label: "Pet Poison Helpline", url: "https://www.petpoisonhelpline.com/poison/xylitol/" },
      { label: "FDA", url: "https://www.fda.gov/consumers/consumer-updates/paws-xylitol-its-dangerous-dogs" },
    ],
  },
  {
    id: "phenols-coal-tar",
    name: "Phenol and coal tar",
    pattern: /\b(phenol|cresol|coal tar)\b/i,
    toxicFor: ["cat"],
    risk: "Cats can't clear phenols: liver and kidney damage and collapse.",
    agreement: 3,
    sources: [
      { label: "MSD Veterinary Manual", url: "https://www.merckvetmanual.com/pharmacology/antiseptics-and-disinfectants/phenols-and-related-compounds-as-antiseptics-and-disinfectants-for-use-with-animals" },
      PPH_OILS_CATS,
      { label: "VCA Animal Hospitals", url: "https://vcahospitals.com/know-your-pet/coal-tar-and-coal-tar-combinations-topical" },
    ],
  },
  {
    id: "local-anesthetics",
    name: "Benzocaine and lidocaine",
    pattern: /\b(benzocaine|lidocaine)\b/i,
    toxicFor: ["cat", "dog"],
    // VCA lists lidocaine as fine in vet products used as labelled.
    onlyWhenNotLabeledFor: true,
    risk: "Benzocaine can destroy the blood's ability to carry oxygen (methemoglobinemia), especially in cats; licked lidocaine causes vomiting, tremors and heart effects.",
    agreement: 2,
    sources: [{ label: "Davis et al., JAVMA (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/8214904/" }, ASPCA_ANESTHETICS],
  },
  {
    id: "deet",
    name: "DEET (insect repellent)",
    pattern: /\b(deet|diethyltoluamide|diethyl-m-toluamide)\b/i,
    toxicFor: ["cat", "dog"],
    // The sources are about human repellents; Bravecto's FDA-approved
    // spot-ons list DEET as a solvent, evaluated at the labelled dose.
    onlyWhenNotLabeledFor: true,
    risk: "Tremors, seizures and vomiting; human repellents aren't for pets.",
    agreement: 3,
    sources: [
      MSD_ECTO,
      { label: "ASPCA Pro", url: "https://www.aspcapro.org/resource/dont-deet-dog" },
      { label: "National Pesticide Information Center", url: "http://npic.orst.edu/factsheets/archive/DEETtech.html" },
    ],
  },
  {
    id: "salicylic-acid",
    name: "Salicylic acid",
    pattern: /\bsalicylic acid\b/i,
    toxicFor: ["cat", "dog"],
    // VCA lists vet salicylic acid products as fine when used as labelled.
    onlyWhenNotLabeledFor: true,
    risk: "Salicylate (aspirin-like) poisoning if licked off; cats are far more sensitive. Human acne products hold 1-5%.",
    agreement: 2,
    sources: [MSD_TOPICAL, { label: "Pet Poison Helpline", url: "https://www.petpoisonhelpline.com/uncategorized/cats-and-aspirin/" }],
  },
  {
    id: "selenium-sulfide",
    name: "Selenium sulfide",
    pattern: /\bselenium (?:di)?sulfide\b/i,
    toxicFor: ["cat"],
    onlyWhenNotLabeledFor: true,
    risk: "Not for cats: a dog and human dandruff ingredient that is irritating and toxic to cats.",
    agreement: 2,
    sources: [
      { label: "Carlotti, WSAVA (VIN)", url: "https://www.vin.com/apputil/content/defaultadv1.aspx?id=3852175&pid=11181" },
      { label: "VCA Animal Hospitals", url: "https://vcahospitals.com/know-your-pet/selenium-sulfide-topical" },
    ],
  },
  {
    id: "amitraz",
    name: "Amitraz",
    pattern: /\bamitraz\b/i,
    toxicFor: ["cat"],
    risk: "Sedation, slow heart rate and low blood sugar; never use on cats. Small, young and diabetic dogs are also at risk.",
    agreement: 3,
    sources: [
      { label: "MSD Veterinary Manual", url: "https://www.merckvetmanual.com/toxicology/insecticide-and-acaricide-organic-toxicity/triazapentadiene-amitraz-toxicosis-in-animals" },
      { label: "Pet Poison Helpline", url: "https://www.petpoisonhelpline.com/poison/amitraz/" },
      { label: "VCA Animal Hospitals", url: "https://vcahospitals.com/know-your-pet/amitraz" },
    ],
  },
  {
    id: "organophosphates",
    name: "Organophosphate insecticides",
    pattern: /\b(tetrachlorvinphos|chlorpyrifos|diazinon|malathion|phosmet|dichlorvos|coumaphos|propetamphos)\b/i,
    toxicFor: ["cat"],
    onlyWhenNotLabeledFor: true,
    risk: "Cats are especially sensitive: drooling, tremors, breathing trouble.",
    agreement: 2,
    sources: [
      { label: "MSD Veterinary Manual", url: "https://www.merckvetmanual.com/toxicology/insecticide-and-acaricide-organic-toxicity/organophosphate-toxicosis-in-animals" },
      { label: "Pet Poison Helpline", url: "https://www.petpoisonhelpline.com/poison/organophosphate/" },
    ],
  },
  {
    id: "alpha-lipoic-acid",
    name: "Alpha-lipoic acid",
    pattern: /\b(alpha[- ]lipoic|thioctic) acid\b/i,
    toxicFor: ["cat", "dog"],
    risk: "Low blood sugar, seizures and liver injury if swallowed; cats are about ten times more sensitive than people.",
    agreement: 2,
    sources: [{ label: "Pet Poison Helpline", url: "https://www.petpoisonhelpline.com/uncategorized/warning-alpha-lipoic-acid-ala/" }, CORNELL],
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
    // A "pet" label names no species, so it counts as labelled for both.
    const labeledFor = (s: string) => p.species.includes(s) || p.species.includes("pet");
    const species = rule.toxicFor.filter((s) => !(rule.onlyWhenNotLabeledFor && labeledFor(s)));
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
