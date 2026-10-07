// Which ingredient slugs count as a retinoid, shared by the regimen/shelf
// cautions (routine-conflicts.ts) and the "Fine lines & aging" match score
// (profile-shared.ts). Pure: safe in client components.
//
// Potent retinoids work at a fraction of a percent, so they sit far down a
// cosmetic list (retinol is often 20th) and still count wherever they appear.
// Retinyl esters are much weaker and often a trace antioxidant, so they only
// count near the top of a list, like other ingredients.
export const POTENT_RETINOIDS = [
  "retinol-cosmetic",
  "retinal",
  "retinal-all-trans",
  "hydroxypinacolone-retinoate",
  "retinyl-retinoate",
  "adapalene",
  "tretinoin",
  "tazarotene",
  "trifarotene",
];

export const RETINYL_ESTERS = ["retinyl-acetate", "retinyl-propionate", "retinyl-palmitate", "retinyl-linoleate"];

export const RETINOIDS = [...POTENT_RETINOIDS, ...RETINYL_ESTERS];

const POTENT = new Set(POTENT_RETINOIDS);

/** True when this ingredient counts regardless of its position on the list. */
export function countsAtAnyPosition(ingredientId: string): boolean {
  return POTENT.has(ingredientId);
}
