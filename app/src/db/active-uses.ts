// What each tracked active is used for, in plain words: the problems a
// shopper would look it up for. Shown as "Used for: ..." next to the active's
// summary on product and ingredient pages, because the summaries say what an
// active is (and its regulatory status) but often not what it's for.
//
// Kept apart from ACTIVE_DEFINITIONS so regulatory edits to the summaries and
// these plain-language uses don't collide. Every active must have an entry
// (active-uses.test.ts).
//
// Wording rules, same as the summaries:
// - Drug actives: the uses their FDA monograph or approved label allows,
//   with "temporary relief" where the label says it.
// - Cosmetic ingredients: "the look of ..." (appearance, not treatment), and
//   no cure, treat or prevent claims.
// - "Used for" describes how products use an ingredient, not a verdict on how
//   well it works; evidence grades stay with the dermatologist review.
// Not yet reviewed by a dermatologist, like the summaries.

const UVB = "Sun protection against UVB rays, the main cause of sunburn.";
const UVB_SHORT_UVA = "Sun protection against UVB and shorter UVA rays.";
const BROAD = "Broad-spectrum sun protection against both UVB (burning) and UVA (aging) rays.";
const UVA = "Sun protection against UVA rays, which drive tanning and sun-related skin aging.";
const LONG_UVA = "Sun protection against long UVA (UVA1) rays, the band most sunscreens cover least well.";
const FUNGAL = "Athlete's foot, jock itch and ringworm.";
const ANALGESIC = "Temporary relief of itch and minor skin pain from insect bites, minor burns, sunburn, scrapes and minor skin irritation.";
const CHAPPED = "Protecting and relieving chafed, chapped or cracked skin, and dry skin generally.";
const OOZING = "Drying the oozing and weeping of poison ivy, oak and sumac.";
const ANTISEPTIC = "Helping prevent infection in minor cuts, scrapes and burns.";
const ANTIPERSPIRANT = "Reducing underarm sweat and wetness.";
const VITAMIN_C = "The look of dullness, dark spots and uneven tone; antioxidant care worn alongside sunscreen.";
const RETINOID = "The look of fine lines, rough texture and uneven tone, and clogged pores.";
const RETINYL_ESTER = "The same goals as retinol (the look of fine lines, texture and tone), in a much milder form.";
const SPOTS = "The look of dark spots, acne marks and uneven skin tone.";
const PHA = "Gentle exfoliation for dullness, rough texture and uneven tone, often chosen for sensitive skin.";
const BHA_COSMETIC = "The look of clogged pores, blackheads and rough texture.";

export const ACTIVE_USES: Record<string, string> = {
  // --- Acne ---
  "benzoyl-peroxide": "Acne: clearing pimples and blemishes and helping prevent new ones.",
  "salicylic-acid": "Acne blemishes, blackheads and whiteheads; flaking, scaling and itch from dandruff and seborrheic dermatitis.",
  sulfur: "Acne blemishes; flaking and itch from dandruff and seborrheic dermatitis.",
  adapalene: "Acne: pimples, blackheads and whiteheads, and helping prevent new breakouts.",
  "azelaic-acid": "Acne bumps (prescription strengths also treat rosacea); in cosmetic products, the look of redness, dark marks and uneven tone.",
  resorcinol: "Acne blemishes, always combined with sulfur.",

  // --- Sunscreen ---
  "zinc-oxide": "Broad-spectrum sun protection (UVA and UVB); protecting irritated skin, such as diaper rash and minor skin irritation.",
  "titanium-dioxide": "Sun protection, mainly against UVB (burning) rays; usually paired with zinc oxide or other filters for broad-spectrum coverage.",
  avobenzone: "Sun protection against UVA rays, which drive tanning and sun-related skin aging; the main UVA filter in most US broad-spectrum sunscreens.",
  octisalate: UVB,
  octocrylene: `${UVB.slice(0, -1)}, and keeping other filters (like avobenzone) stable in sunlight.`,
  homosalate: UVB,
  octinoxate: UVB,
  oxybenzone: "Sun protection against UVB and some UVA rays.",
  ensulizole: UVB,
  meradimate: "Sun protection against shorter UVA (UVA2) rays, alongside other filters.",
  sulisobenzone: UVB_SHORT_UVA,
  dioxybenzone: UVB_SHORT_UVA,
  cinoxate: UVB,
  "padimate-o": UVB,
  "aminobenzoic-acid": UVB,
  "trolamine-salicylate": UVB,
  bemotrizinol: BROAD,
  bisoctrizole: BROAD,
  ecamsule: UVA,
  "drometrizole-trisiloxane": BROAD,
  "diethylamino-hydroxybenzoyl-hexyl-benzoate": LONG_UVA,
  "ethylhexyl-triazone": UVB,
  iscotrizinol: UVB_SHORT_UVA,
  amiloxate: UVB,
  enzacamene: UVB,
  "polysilicone-15": UVB,
  "bisdisulizole-disodium": UVA,
  "methoxypropylamino-cyclohexenylidene-ethoxyethylcyanoacetate": LONG_UVA,
  "phenylene-bis-diphenyltriazine": BROAD,
  "butyloctyl-salicylate": "Raising a sunscreen's SPF and helping other UV filters dissolve; not a sunscreen on its own.",
  "ethyl-methoxycinnamate": "Absorbing UVB rays in some imported and cosmetic sun-care products.",

  // --- Antifungal ---
  clotrimazole: FUNGAL,
  "miconazole-nitrate": "Athlete's foot, jock itch and ringworm; vaginal yeast infections.",
  tolnaftate: FUNGAL,
  terbinafine: FUNGAL,
  butenafine: FUNGAL,
  "undecylenic-acid": FUNGAL,
  tioconazole: "Vaginal yeast infections.",
  "tea-tree-oil": "Products aimed at mild acne and athlete's foot.",
  "hexamidine-diisethionate": "Keeping skin and products free of germs, in products for blemish-prone or irritated skin.",

  // --- Dandruff & seborrheic dermatitis ---
  "pyrithione-zinc": "Dandruff and seborrheic dermatitis: flaking, scaling and itch of the scalp.",
  "selenium-sulfide": "Dandruff and seborrheic dermatitis: flaking, scaling and itch of the scalp.",
  "coal-tar": "Dandruff, seborrheic dermatitis and psoriasis: scaling, flaking and itch.",
  ketoconazole: "Dandruff (the 1% OTC shampoo); prescription strengths treat seborrheic dermatitis and fungal skin infections.",

  // --- Itch relief ---
  hydrocortisone: "Temporary relief of itch and inflammation from eczema, insect bites, poison ivy, rashes and minor skin irritation.",
  pramoxine: ANALGESIC,
  diphenhydramine: "Temporary relief of itch from insect bites, poison ivy and minor skin irritation.",
  menthol: "Temporary relief of itch and minor pain, with a cooling feel.",
  camphor: "Temporary relief of itch and minor pain, often alongside menthol.",
  lidocaine: ANALGESIC,
  benzocaine: ANALGESIC,
  phenol: ANALGESIC,
  capsaicin: "Temporary relief of minor muscle and joint pain.",

  // --- Skin protectants ---
  petrolatum: "Dry, chapped or cracked skin and lips; protecting minor cuts, scrapes and burns.",
  "colloidal-oatmeal": "Temporary relief of itch and irritation from eczema, rashes, poison ivy and insect bites; dry skin.",
  dimethicone: CHAPPED,
  allantoin: CHAPPED,
  lanolin: "Dry, chapped or cracked skin and lips.",
  "zinc-acetate": `${OOZING.slice(0, -1)}, usually alongside an itch reliever.`,
  calamine: `${OOZING.slice(0, -1)}; soothing itch from minor skin irritation.`,
  kaolin: `${OOZING.slice(0, -1)}; in masks, absorbing excess oil.`,
  glycerin: "Dry skin: draws water into the skin's outer layer and holds it there; protecting chapped skin.",
  "mineral-oil": "Dry, chapped skin, by sealing moisture in.",
  "topical-starch": "Diaper rash, chafing and minor skin irritation.",
  urea: "Very dry, rough or thickened skin, such as cracked heels and rough, bumpy patches.",
  "aluminum-hydroxide": "Diaper rash and minor skin irritation.",
  "sodium-bicarbonate": "Itch from poison ivy, insect bites and minor irritation, in soaks and baths.",
  "benzalkonium-chloride": ANTISEPTIC,
  "benzethonium-chloride": ANTISEPTIC,
  "povidone-iodine": ANTISEPTIC,
  betaine: "Dry skin: helps hold water in the skin.",
  "sturgeon-extract": "Marketed for the look of dull or less-firm skin.",
  "asiatic-acid": "The look of redness and irritation, and supporting a weakened skin barrier.",

  // --- Antiperspirant ---
  "aluminum-chlorohydrate": ANTIPERSPIRANT,
  "aluminum-zirconium-complex": ANTIPERSPIRANT,
  "magnesium-hydroxide": "Underarm odor; it doesn't reduce sweating.",

  // --- Hair loss ---
  minoxidil: "Regrowing hair and slowing hereditary thinning on the top of the scalp.",

  // --- Brightening & texture (cosmetic) ---
  niacinamide: "The look of uneven tone, dark spots, enlarged pores and oiliness; supporting the skin barrier.",
  "vitamin-c": VITAMIN_C,
  "hyaluronic-acid": "Dry or dehydrated skin: holds water in the skin's surface so it looks and feels smoother.",
  "retinol-cosmetic": RETINOID,
  ceramides: "Dry or easily irritated skin, by supporting the skin barrier; common in moisturizers made for eczema-prone skin.",
  "alpha-arbutin": SPOTS,
  "glycolic-acid": "The look of rough texture, dullness, fine lines and dark spots or acne marks, by exfoliating dead skin.",
  squalane: "Dry skin: softens and seals in moisture without feeling heavy.",
  peptides: "The look of fine lines and loss of firmness.",
  bakuchiol: "The look of fine lines and uneven tone, as a gentler alternative to retinol.",
  "tranexamic-acid": "The look of stubborn dark patches and uneven tone, including melasma-type discoloration.",
  "centella-asiatica": "The look of redness and irritation, and supporting a weakened skin barrier.",
  panthenol: "Dry or irritated skin: hydrating and soothing.",
  "kojic-acid": SPOTS,
  "mandelic-acid": "The look of acne marks, uneven tone and rough texture; a gentler exfoliant often chosen for sensitive or acne-prone skin.",
  "lactic-acid": "Rough, dry skin, dullness and uneven tone, by exfoliating while helping hold moisture.",
  hydroquinone: "Lightening dark patches such as melasma and dark marks left after acne or inflammation (prescription-only in the US).",
  retinal: RETINOID,
  "hydroxypinacolone-retinoate": RETINOID,
  "retinyl-retinoate": RETINOID,
  gluconolactone: PHA,
  "lactobionic-acid": PHA,
  "capryloyl-salicylic-acid": BHA_COSMETIC,
  "betaine-salicylate": BHA_COSMETIC,
  "retinyl-palmitate": "Mostly antioxidant care; at best a very mild retinoid for the look of fine lines and texture.",
  "retinyl-acetate": RETINYL_ESTER,
  "retinyl-propionate": RETINYL_ESTER,
  "retinyl-linoleate": RETINYL_ESTER,
  "ascorbyl-glucoside": VITAMIN_C,
  "3-o-ethyl-ascorbic-acid": VITAMIN_C,
  "magnesium-ascorbyl-phosphate": VITAMIN_C,
  "sodium-ascorbyl-phosphate": `${VITAMIN_C.slice(0, -1)}; also used in products for acne-prone skin.`,
  "tetrahexyldecyl-ascorbate": VITAMIN_C,
  arbutin: SPOTS,
  adenosine: "The look of wrinkles and fine lines.",
  "malic-acid": "Mild exfoliation for dullness and rough texture; often there just to adjust a product's pH.",
  estriol: "Thinning, dry skin after menopause; a hormone to discuss with a doctor before using.",
  "panax-ginseng": "Antioxidant care marketed for dullness and signs of aging.",
};

export function activeUse(id: string): string | undefined {
  return ACTIVE_USES[id];
}
