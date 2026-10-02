// US topical corticosteroid potency classes (I = superpotent ... VII = least
// potent), applied to the Rx catalog at seed time (seed.ts) and listed in the
// dermatologist's review copy (rx-review.ts).
//
// Source table: the seven-class US system from the vasoconstrictor assay
// (Stoughton-Cornell), as tabulated in
//   Ference JD, Last AR. Choosing topical corticosteroids.
//   Am Fam Physician. 2009;79(2):135-140, Table 1 ("Topical corticosteroid
//   potency"),
// cross-checked against the National Psoriasis Foundation's public "Topical
// steroids potency chart". Potency belongs to molecule + strength + VEHICLE,
// so a rule names all three; the same molecule in another vehicle is a
// different rule or none.
//
// Drafted by Claude, not yet reviewed. Rules marked `unsure` are ones where
// published tables disagree, or the product postdates the 2009 table; the
// review doc lists them first. Anything no rule matches stays null
// ("unclassified") -- including listings whose filed strength is evidently a
// units error (a clobetasol spray filed as 5%): never a guess.
//
// Combination products (clotrimazole + betamethasone, nystatin +
// triamcinolone, calcipotriene + betamethasone, pramoxine + hydrocortisone)
// take the class of their steroid component in that vehicle. That's a
// simplification (the other ingredient and the vehicle base can change
// penetration) and is flagged in the review doc.

export type PotencyClass = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const POTENCY_LABEL: Record<PotencyClass, string> = {
  1: "Class I (superpotent)",
  2: "Class II (high potency)",
  3: "Class III (medium-high potency)",
  4: "Class IV (medium potency)",
  5: "Class V (medium-low potency)",
  6: "Class VI (low potency)",
  7: "Class VII (least potent)",
};

export const ROMAN: Record<PotencyClass, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII" };

// Base vehicle from an FDA dosage form ("AEROSOL, FOAM" -> foam,
// "OINTMENT, AUGMENTED" -> ointment + augmented).
export type Vehicle = "cream" | "ointment" | "lotion" | "gel" | "solution" | "foam" | "spray" | "shampoo" | "oil" | "tape" | "paste" | "other";

export function vehicleOf(dosageForm: string | null | undefined): { vehicle: Vehicle; augmented: boolean } {
  const f = (dosageForm ?? "").toUpperCase();
  const augmented = f.includes("AUGMENTED");
  const pick = (): Vehicle => {
    if (f.includes("FOAM")) return "foam";
    if (f.includes("SPRAY")) return "spray";
    if (f.includes("SHAMPOO")) return "shampoo";
    if (f.startsWith("OINTMENT")) return "ointment";
    if (f.startsWith("CREAM") || f.startsWith("EMULSION")) return "cream";
    if (f.startsWith("LOTION")) return "lotion";
    if (f.startsWith("GEL") || f.startsWith("JELLY")) return "gel";
    if (f.startsWith("SOLUTION") || f.startsWith("LIQUID")) return "solution";
    if (f.startsWith("OIL")) return "oil";
    if (f.startsWith("TAPE")) return "tape";
    if (f.startsWith("PASTE")) return "paste";
    return "other";
  };
  return { vehicle: pick(), augmented };
}

export type PotencyRule = {
  steroid: string; // upper-case FDA ingredient name, salt included
  pct: number | "any"; // label strength in percent ("any" = hydrocortisone-type ranges handled by min/max)
  minPct?: number;
  maxPct?: number;
  vehicles: Vehicle[] | "any";
  augmented?: boolean; // augmented betamethasone dipropionate only
  cls: PotencyClass;
  unsure?: string; // why a reviewer should look twice
};

const ALL: Vehicle[] = ["cream", "ointment", "lotion", "gel", "solution", "foam", "spray", "shampoo", "oil"];

export const POTENCY_RULES: PotencyRule[] = [
  // Class I -- superpotent
  { steroid: "CLOBETASOL PROPIONATE", pct: 0.05, vehicles: ALL, cls: 1 },
  { steroid: "CLOBETASOL PROPIONATE", pct: 0.025, vehicles: ["cream"], cls: 1, unsure: "Impoyz 0.025% cream (2017) postdates the AFP table; class assumed from clobetasol." },
  { steroid: "HALOBETASOL PROPIONATE", pct: 0.05, vehicles: ["cream", "ointment", "lotion", "foam"], cls: 1 },
  { steroid: "BETAMETHASONE DIPROPIONATE", pct: 0.05, vehicles: ["ointment", "gel", "lotion"], augmented: true, cls: 1 },
  { steroid: "DIFLORASONE DIACETATE", pct: 0.05, vehicles: ["ointment"], cls: 1 },
  { steroid: "FLUOCINONIDE", pct: 0.1, vehicles: ["cream"], cls: 1 },
  // Flurandrenolide tape is 4 mcg/cm2 (no percent); matched by vehicle.
  { steroid: "FLURANDRENOLIDE", pct: "any", vehicles: ["tape"], cls: 1 },
  // Class II -- high potency
  { steroid: "BETAMETHASONE DIPROPIONATE", pct: 0.05, vehicles: ["cream"], augmented: true, cls: 2 },
  { steroid: "BETAMETHASONE DIPROPIONATE", pct: 0.05, vehicles: ["ointment"], cls: 2 },
  { steroid: "AMCINONIDE", pct: 0.1, vehicles: ["ointment"], cls: 2 },
  { steroid: "DESOXIMETASONE", pct: 0.25, vehicles: ["cream", "ointment"], cls: 2 },
  { steroid: "DESOXIMETASONE", pct: 0.25, vehicles: ["spray"], cls: 2, unsure: "Topicort spray 0.25% (2013) is not in the AFP table; some charts list it as class I." },
  { steroid: "DESOXIMETASONE", pct: 0.05, vehicles: ["gel"], cls: 2 },
  { steroid: "DIFLORASONE DIACETATE", pct: 0.05, vehicles: ["cream"], cls: 2, unsure: "Charts list diflorasone cream as II or III depending on the base (Psorcon E vs Florone)." },
  { steroid: "FLUOCINONIDE", pct: 0.05, vehicles: ["cream", "gel", "ointment", "solution"], cls: 2 },
  { steroid: "HALCINONIDE", pct: 0.1, vehicles: ["cream", "ointment", "solution"], cls: 2 },
  { steroid: "MOMETASONE FUROATE", pct: 0.1, vehicles: ["ointment"], cls: 2 },
  { steroid: "TRIAMCINOLONE ACETONIDE", pct: 0.5, vehicles: ["ointment"], cls: 2, unsure: "Some charts put triamcinolone 0.5% ointment in class III with the cream." },
  // Class III -- medium-high
  { steroid: "AMCINONIDE", pct: 0.1, vehicles: ["cream", "lotion"], cls: 3 },
  { steroid: "BETAMETHASONE DIPROPIONATE", pct: 0.05, vehicles: ["cream"], cls: 3 },
  { steroid: "BETAMETHASONE VALERATE", pct: 0.1, vehicles: ["ointment"], cls: 3 },
  { steroid: "BETAMETHASONE VALERATE", pct: 0.12, vehicles: ["foam"], cls: 3, unsure: "Luxiq foam 0.12% is listed as class III in some charts and IV in others." },
  { steroid: "DESOXIMETASONE", pct: 0.05, vehicles: ["cream"], cls: 3 },
  { steroid: "DESOXIMETASONE", pct: 0.05, vehicles: ["ointment"], cls: 3, unsure: "Desoximetasone 0.05% ointment (2013) is not in the AFP table." },
  { steroid: "FLUTICASONE PROPIONATE", pct: 0.005, vehicles: ["ointment"], cls: 3 },
  { steroid: "TRIAMCINOLONE ACETONIDE", pct: 0.5, vehicles: ["cream"], cls: 3 },
  // Class IV -- medium
  { steroid: "FLUOCINOLONE ACETONIDE", pct: 0.025, vehicles: ["ointment"], cls: 4 },
  { steroid: "FLURANDRENOLIDE", pct: 0.05, vehicles: ["ointment"], cls: 4 },
  { steroid: "HYDROCORTISONE VALERATE", pct: 0.2, vehicles: ["ointment"], cls: 4 },
  { steroid: "MOMETASONE FUROATE", pct: 0.1, vehicles: ["cream", "lotion", "solution"], cls: 4 },
  { steroid: "TRIAMCINOLONE ACETONIDE", pct: 0.1, vehicles: ["cream"], cls: 4 },
  { steroid: "TRIAMCINOLONE ACETONIDE", pct: 0.1, vehicles: ["ointment"], cls: 4, unsure: "Triamcinolone 0.1% ointment is class III in some charts." },
  { steroid: "TRIAMCINOLONE ACETONIDE", pct: 0.05, vehicles: ["ointment"], cls: 4, unsure: "Triamcinolone 0.05% ointment (Trianex) isn't in the AFP table; placed between 0.1% and 0.025% ointment." },
  { steroid: "CLOCORTOLONE PIVALATE", pct: 0.1, vehicles: ["cream"], cls: 4 },
  // Class V -- medium-low
  { steroid: "BETAMETHASONE DIPROPIONATE", pct: 0.05, vehicles: ["lotion"], cls: 5 },
  { steroid: "BETAMETHASONE VALERATE", pct: 0.1, vehicles: ["cream"], cls: 5 },
  { steroid: "FLUOCINOLONE ACETONIDE", pct: 0.025, vehicles: ["cream"], cls: 5 },
  { steroid: "FLURANDRENOLIDE", pct: 0.05, vehicles: ["cream", "lotion"], cls: 5 },
  { steroid: "FLUTICASONE PROPIONATE", pct: 0.05, vehicles: ["cream"], cls: 5 },
  { steroid: "FLUTICASONE PROPIONATE", pct: 0.05, vehicles: ["lotion"], cls: 5, unsure: "Cutivate lotion 0.05% is listed as V or VI depending on the chart." },
  { steroid: "HYDROCORTISONE BUTYRATE", pct: 0.1, vehicles: ["cream", "lotion", "solution"], cls: 5 },
  { steroid: "HYDROCORTISONE BUTYRATE", pct: 0.1, vehicles: ["ointment"], cls: 5, unsure: "Locoid ointment is class IV in some charts." },
  { steroid: "HYDROCORTISONE VALERATE", pct: 0.2, vehicles: ["cream"], cls: 5 },
  { steroid: "PREDNICARBATE", pct: 0.1, vehicles: ["cream", "ointment"], cls: 5 },
  { steroid: "TRIAMCINOLONE ACETONIDE", pct: 0.1, vehicles: ["lotion"], cls: 5 },
  { steroid: "TRIAMCINOLONE ACETONIDE", pct: 0.025, vehicles: ["ointment"], cls: 5 },
  { steroid: "DESONIDE", pct: 0.05, vehicles: ["ointment"], cls: 5, unsure: "Desonide ointment is class V in some charts and VI in others." },
  // Class VI -- low
  { steroid: "ALCLOMETASONE DIPROPIONATE", pct: 0.05, vehicles: ["cream", "ointment"], cls: 6 },
  { steroid: "BETAMETHASONE VALERATE", pct: 0.1, vehicles: ["lotion"], cls: 6 },
  { steroid: "DESONIDE", pct: 0.05, vehicles: ["cream", "lotion", "gel", "foam"], cls: 6 },
  { steroid: "FLUOCINOLONE ACETONIDE", pct: 0.01, vehicles: ["cream", "solution", "oil"], cls: 6 },
  { steroid: "FLUOCINOLONE ACETONIDE", pct: 0.011, vehicles: ["oil"], cls: 6, unsure: "Filed as 0.011% (0.11 mg/mL); treated as the 0.01% body/scalp oil." },
  { steroid: "TRIAMCINOLONE ACETONIDE", pct: 0.025, vehicles: ["cream", "lotion"], cls: 6 },
  // Class VII -- least potent: hydrocortisone and hydrocortisone acetate at
  // the usual 0.5-2.5% strengths, any vehicle.
  { steroid: "HYDROCORTISONE", pct: "any", minPct: 0.5, maxPct: 2.5, vehicles: "any", cls: 7 },
  { steroid: "HYDROCORTISONE ACETATE", pct: "any", minPct: 0.5, maxPct: 2.5, vehicles: "any", cls: 7 },
  { steroid: "DEXAMETHASONE", pct: "any", maxPct: 0.1, vehicles: "any", cls: 7 },
];

// Every steroid ingredient the rules know, for spotting the steroid in a
// combination product and for "unclassified" reporting.
export const STEROID_NAMES = new Set(POTENCY_RULES.map((r) => r.steroid));

export type Ingredient = { name: string; pct: number | null };

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** The steroid ingredient on a product, if any (first one listed). */
export function steroidIngredient(ingredients: Ingredient[]): Ingredient | null {
  return ingredients.find((i) => STEROID_NAMES.has(normalizeName(i.name))) ?? null;
}

function normalizeName(name: string): string {
  return name.toUpperCase().replace(/\s+USP\b/g, "").replace(/\s+/g, " ").trim();
}

export function matchPotencyRule(ingredients: Ingredient[], dosageForm: string | null | undefined): PotencyRule | null {
  const steroid = steroidIngredient(ingredients);
  if (!steroid) return null;
  const name = normalizeName(steroid.name);
  const { vehicle, augmented } = vehicleOf(dosageForm);
  for (const r of POTENCY_RULES) {
    if (r.steroid !== name) continue;
    if (r.vehicles !== "any" && !r.vehicles.includes(vehicle)) continue;
    if (!!r.augmented !== augmented && name === "BETAMETHASONE DIPROPIONATE") continue;
    if (r.pct === "any") {
      if (r.minPct !== undefined && (steroid.pct === null || steroid.pct < r.minPct - 1e-9)) continue;
      if (r.maxPct !== undefined && (steroid.pct === null || steroid.pct > r.maxPct + 1e-9)) continue;
      return r;
    }
    if (steroid.pct !== null && near(steroid.pct, r.pct)) return r;
  }
  return null;
}

/** Potency class for a product's ingredients + FDA dosage form, or null when unclassified. */
export function steroidPotencyClass(ingredients: Ingredient[], dosageForm: string | null | undefined): PotencyClass | null {
  return matchPotencyRule(ingredients, dosageForm)?.cls ?? null;
}
