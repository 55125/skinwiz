// Shapes shared by the handout builder (client), the API, the stored
// version JSON and the patient view. Pure types/constants, no imports, so
// client components and tests can use them freely.
//
// A version's content holds the regimen and nothing about the patient:
// there is deliberately no field for a name, date of birth or MRN.

export type HandoutSlot = "am" | "pm" | "both" | "as-directed";
export const HANDOUT_SLOTS: HandoutSlot[] = ["am", "pm", "both", "as-directed"];

export const SLOT_LABEL: Record<HandoutSlot, string> = {
  am: "Morning",
  pm: "Night",
  both: "Morning and night",
  "as-directed": "As directed",
};

export type HandoutStep = {
  key: string; // stable within a handout ("s1", "s2"...), used for patient step state
  slot: HandoutSlot;
  label: string; // the step's role, as the clinician names it: "Cleanser", "Topical retinoid"
  // A catalog product, or null for a generic step ("any fragrance-free
  // moisturizer"). kind says which catalog: "rx" rows are prescriptions.
  productId: string | null;
  kind: "otc" | "rx" | "generic";
  // Snapshot of the product's display name when the version was written, so
  // a later catalog change can't alter what the patient was handed.
  productName: string | null;
  directions: string; // the clinician's sig (prefilled from the label, editable)
};

export type HandoutContent = {
  steps: HandoutStep[];
  stopRules: string[]; // "Stop and call us if..."
  notes: string; // free text to the patient; never patient details
  // Optional patch-test avoid list riding along (lib/avoid-import.ts code).
  avoidCode: string | null;
};

export const MAX_STEPS = 16;
export const MAX_STOP_RULES = 10;
export const MAX_NOTES = 600;
export const MAX_DIRECTIONS = 400;
export const MAX_LABEL = 60;
export const MAX_TITLE = 80;
export const MAX_RULE = 200;
