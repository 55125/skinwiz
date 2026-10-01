// Usage guidance: where each active goes in an AM/PM regimen, how it is
// generally applied, and in what order formulation types are layered.
//
// DRAFT -- authored by Claude (AI) for review by the site's board-certified
// dermatologist. Every entry ships with `reviewed: false`, and items with
// `reviewed: false` must never be shown publicly. The dermatologist flips
// each entry to `true` only after reading and, where needed, correcting it.
//
// How this was written:
// - FDA OTC drug actives mirror the DIRECTIONS / WARNINGS language of their
//   OTC monograph labeling sections (acne 21 CFR 333.350; sunscreen 21 CFR
//   201.327; antifungal 21 CFR 333.250; dandruff/seborrheic dermatitis/
//   psoriasis 21 CFR 358.750; skin protectant 21 CFR 347.50; antiperspirant
//   21 CFR 350.50; external analgesics incl. hydrocortisone, pramoxine and
//   diphenhydramine under the 21 CFR part 348 tentative final monograph).
//   Actives marketed under an approved application rather than a monograph
//   (adapalene 0.1%, terbinafine, butenafine, vaginal tioconazole) defer to
//   their Drug Facts label. Where exact wording was uncertain, the text says
//   "follow the product's label directions" instead of inventing specifics.
// - Cosmetic ingredients (niacinamide, vitamin C, retinol, etc.) get
//   mainstream, conservative application practice only, with no efficacy or
//   treatment claims; no FDA monograph applies to them.
// - `sources` lists only real, checkable documents or public guidance; no
//   URLs or study names are invented.
//
// General educational information, not medical advice, and not
// personalized. Nothing here diagnoses a condition or recommends a
// prescription product.

export type Slot = "am" | "pm" | "both";
export type StepType =
  | "cleanser"
  | "toner"
  | "serum"
  | "gel"
  | "spot"
  | "lotion"
  | "cream"
  | "ointment"
  | "sunscreen"
  | "scalp"
  | "body-powder"
  | "antiperspirant";

export type ActiveGuidance = {
  activeId: string;
  defaultSlot: Slot;
  slotReason: string;
  howToUse: string[];
  frequency: string;
  startSlowly?: string;
  cautions: string[];
  waitBeforeNext?: string;
  sources: string[];
  reviewed: boolean;
};

export type FormulationGuidance = {
  stepType: StepType;
  label: string;
  order: number;
  howToApply: string[];
  layering: string;
  reviewed: boolean;
};

// --- Shared source strings ---------------------------------------------------
const SRC_ACNE = "21 CFR 333.350 (topical acne drug products: labeling, including directions)";
const SRC_SUNSCREEN = "FDA OTC sunscreen labeling / 21 CFR 201.327 (directions and sun protection measures)";
const SRC_ANTIFUNGAL = "21 CFR 333.250 (topical antifungal drug products: labeling, including directions)";
const SRC_DANDRUFF = "21 CFR 358.750 (dandruff, seborrheic dermatitis and psoriasis drug products: labeling)";
const SRC_PROTECTANT = "21 CFR 347.50 (skin protectant drug products: labeling)";
const SRC_ANALGESIC = "21 CFR part 348 (external analgesic drug products; tentative final monograph): follow the product's label";
const SRC_ANTIPERSPIRANT = "21 CFR 350.50 (antiperspirant drug products: labeling)";
const SRC_COSMETIC = "General dermatology practice; no FDA monograph applies (cosmetic ingredient)";
const SRC_AHA_GUIDANCE =
  "FDA guidance for industry: labeling for topically applied cosmetic products containing alpha hydroxy acids (sunburn alert)";
const SRC_AAD_SUNSCREEN = "AAD public guidance on how to apply sunscreen";
const SRC_AAD_ACNE = "AAD public guidance on acne treatment and skin care";
const SRC_AAD_RETINOIDS = "AAD public guidance on retinoids";

// --- Helpers for families with shared monograph directions ------------------
function sunscreen(activeId: string, extraCautions: string[] = [], extraHowTo: string[] = []): ActiveGuidance {
  return {
    activeId,
    defaultSlot: "am",
    slotReason: "Sunscreen protects during daylight hours, so it is the last step of a morning routine.",
    howToUse: [
      "Apply liberally 15 minutes before sun exposure.",
      "Reapply at least every 2 hours.",
      "Reapply after 40 or 80 minutes of swimming or sweating, as stated on the label, and immediately after towel drying.",
      ...extraHowTo,
    ],
    frequency: "Every day you will be outdoors or near windows; reapply as the label directs.",
    cautions: [
      "For external use only. Keep out of eyes; rinse with water to remove.",
      "Do not use on damaged or broken skin.",
      "Stop use and ask a doctor if a rash occurs.",
      "For children under 6 months, ask a doctor.",
      ...extraCautions,
    ],
    sources: [SRC_SUNSCREEN, SRC_AAD_SUNSCREEN],
    reviewed: false,
  };
}

function monographAntifungal(activeId: string, extraCautions: string[] = []): ActiveGuidance {
  return {
    activeId,
    defaultSlot: "both",
    slotReason: "Monograph directions call for twice-daily use, morning and night.",
    howToUse: [
      "Clean the affected area and dry it thoroughly.",
      "Apply a thin layer over the affected area.",
      "For athlete's foot, pay special attention to the spaces between the toes; wear well-fitting, ventilated shoes and change shoes and socks at least once daily.",
      "Supervise children in the use of this product.",
    ],
    frequency:
      "Twice daily (morning and night) or as directed by a doctor; per the monograph, 4 weeks for athlete's foot and ringworm, 2 weeks for jock itch.",
    cautions: [
      "For external use only. Avoid contact with the eyes.",
      "Not effective on the scalp or nails.",
      "For children under 2 years, ask a doctor.",
      "Stop use and ask a doctor if irritation occurs or there is no improvement within the time stated on the label.",
      ...extraCautions,
    ],
    sources: [SRC_ANTIFUNGAL],
    reviewed: false,
  };
}

function antiperspirant(activeId: string): ActiveGuidance {
  return {
    activeId,
    defaultSlot: "pm",
    slotReason: "Many labels and dermatologists suggest applying to dry skin at bedtime, when sweat glands are less active.",
    howToUse: [
      "Apply to underarms only, unless the label lists other areas.",
      "Apply to clean, completely dry skin.",
      "Many people apply at bedtime and may reapply in the morning if the label allows.",
    ],
    frequency: "Once daily, or as the label directs.",
    cautions: [
      "Do not use on broken skin.",
      "Stop use if a rash or irritation occurs.",
      "Ask a doctor before use if you have kidney disease.",
      "For sprays, keep away from the face and mouth to avoid breathing it in.",
    ],
    sources: [SRC_ANTIPERSPIRANT],
    reviewed: false,
  };
}

const ENTRIES: ActiveGuidance[] = [
  // --- Acne --------------------------------------------------------------------
  {
    activeId: "benzoyl-peroxide",
    defaultSlot: "both",
    slotReason:
      "It can be used morning or night; because it can bleach pillowcases and towels, many people prefer a wash-off form in the morning.",
    howToUse: [
      "Clean the skin thoroughly before applying.",
      "Cover the entire affected area with a thin layer.",
      "For wash-off forms, apply to wet skin, massage gently, then rinse well.",
      "If going outside, use a sunscreen after the product has dried.",
    ],
    frequency: "One to three times daily, per the label.",
    startSlowly:
      "Because excessive drying may occur, start with one application daily, then gradually increase to two or three times daily if needed. If bothersome dryness or peeling occurs, reduce to once a day or every other day.",
    cautions: [
      "Can bleach hair and dyed fabrics, including towels and pillowcases.",
      "Avoid contact with the eyes, lips and mouth.",
      "Avoid unnecessary sun exposure and use a sunscreen.",
      "Using other topical acne products at the same time may increase dryness or irritation.",
      "Do not use if you have very sensitive skin or are sensitive to benzoyl peroxide.",
    ],
    waitBeforeNext: "Allow a leave-on product to dry before applying sunscreen or other layers, as the label directs.",
    sources: [SRC_ACNE, SRC_AAD_ACNE],
    reviewed: false,
  },
  {
    activeId: "salicylic-acid",
    defaultSlot: "both",
    slotReason:
      "Cleansers can be used morning or night; many people keep leave-on salicylic acid products to the evening.",
    howToUse: [
      "Clean the skin thoroughly before applying a leave-on product.",
      "Cover the entire affected area with a thin layer.",
      "For cleansers, massage gently onto wet skin, then rinse.",
      "For scalp products, follow the shampoo directions on the label.",
    ],
    frequency: "For acne, one to three times daily per the label.",
    startSlowly:
      "Start with one application daily, then increase to two or three times daily if needed. If dryness or peeling occurs, reduce to once a day or every other day.",
    cautions: [
      "Using other topical acne products at the same time may increase dryness or irritation.",
      "Keep away from the eyes.",
      "Consider not layering it with a retinoid or other exfoliating acids in the same routine.",
    ],
    sources: [SRC_ACNE, SRC_DANDRUFF, SRC_AAD_ACNE],
    reviewed: false,
  },
  {
    activeId: "sulfur",
    defaultSlot: "both",
    slotReason: "It can be used morning or night; some people prefer evening use because of its scent.",
    howToUse: [
      "Clean the skin thoroughly before applying.",
      "Cover the entire affected area with a thin layer.",
      "For scalp products, follow the shampoo directions on the label.",
    ],
    frequency: "For acne, one to three times daily per the label.",
    startSlowly:
      "Start with one application daily, then increase if needed. If dryness or peeling occurs, reduce to once a day or every other day.",
    cautions: [
      "Using other topical acne products at the same time may increase dryness or irritation.",
      "Keep away from the eyes.",
      "Has a noticeable odor, which some people find bothersome.",
    ],
    sources: [SRC_ACNE, SRC_DANDRUFF],
    reviewed: false,
  },
  {
    activeId: "adapalene",
    defaultSlot: "pm",
    slotReason: "Retinoids are commonly applied in the evening, since they can make skin more sensitive to the sun.",
    howToUse: [
      "Clean the skin and pat it dry.",
      "Cover the entire affected area with a thin layer; a pea-sized amount covers the face.",
      "Follow with a moisturizer if dryness occurs.",
      "Use sunscreen during the day.",
    ],
    frequency: "Once a day, per the label.",
    startSlowly:
      "Many dermatologists suggest starting every other night or a few nights a week, then building up to nightly as tolerated.",
    cautions: [
      "Redness, dryness, itching or burning are more likely in the first few weeks.",
      "Avoid unnecessary sun exposure and use a sunscreen.",
      "Avoid the eyes, lips and corners of the nose and mouth.",
      "Do not apply to cuts, abrasions, eczema or sunburned skin.",
      "If pregnant, planning pregnancy or breastfeeding, follow the label and ask a doctor before use.",
      "For children under 12, ask a doctor.",
    ],
    sources: [
      "OTC adapalene 0.1% gel Drug Facts label (FDA-approved Rx-to-OTC switch, 2016)",
      SRC_AAD_RETINOIDS,
      SRC_AAD_ACNE,
    ],
    reviewed: false,
  },
  {
    activeId: "azelaic-acid",
    defaultSlot: "both",
    slotReason: "It can be used morning or night; no time-of-day restriction is widely recognized.",
    howToUse: [
      "Apply a thin layer to clean, dry skin.",
      "Follow with moisturizer, and with sunscreen in the morning.",
      "Follow the product's label directions, since cosmetic formulations vary.",
    ],
    frequency: "Follow the product's label; once or twice daily is common.",
    startSlowly: "Consider starting once daily and increasing if the skin tolerates it.",
    cautions: [
      "A mild tingling or stinging may occur, especially at first.",
      "Keep away from the eyes and mouth.",
      "Cosmetic-labeled products are not FDA OTC acne drugs.",
    ],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },

  // --- Sunscreen -----------------------------------------------------------------
  sunscreen(
    "zinc-oxide",
    ["As a skin protectant (for example, diaper-area products), follow that product's label directions instead."],
    ["Mineral formulas can leave a white cast; rub in thoroughly."],
  ),
  sunscreen("titanium-dioxide", [], ["Mineral formulas can leave a white cast; rub in thoroughly."]),
  sunscreen("avobenzone", [
    "Some people notice yellow-orange marks on light fabrics after wearing sunscreens with avobenzone.",
  ]),
  sunscreen("octisalate"),
  sunscreen("octocrylene"),
  sunscreen("homosalate"),
  sunscreen("octinoxate"),
  sunscreen("oxybenzone"),
  sunscreen("ensulizole"),
  sunscreen("meradimate"),

  // --- Antifungal ------------------------------------------------------------------
  monographAntifungal("clotrimazole"),
  monographAntifungal("miconazole-nitrate", [
    "Vaginal miconazole products have different directions; follow that product's label.",
  ]),
  monographAntifungal("tolnaftate"),
  monographAntifungal("undecylenic-acid"),
  {
    activeId: "terbinafine",
    defaultSlot: "both",
    slotReason: "Labels call for once- or twice-daily use depending on the condition.",
    howToUse: [
      "Wash the affected area and dry it thoroughly.",
      "Apply a thin layer over the affected area and surrounding skin.",
      "Wash hands after each use.",
      "For athlete's foot, wear well-fitting, ventilated shoes and change socks daily.",
    ],
    frequency:
      "Follow the product's label; treatment courses are often shorter than older antifungals and vary by condition.",
    cautions: [
      "For external use only. Avoid contact with the eyes, nose and mouth.",
      "Not for use on nails or the scalp.",
      "For children under 12, ask a doctor.",
      "Stop use and ask a doctor if irritation occurs or the condition does not improve as the label describes.",
    ],
    sources: ["Terbinafine 1% OTC Drug Facts label (FDA-approved Rx-to-OTC switch)"],
    reviewed: false,
  },
  {
    activeId: "butenafine",
    defaultSlot: "both",
    slotReason: "Labels call for once- or twice-daily use depending on the condition.",
    howToUse: [
      "Wash the affected area and dry it thoroughly.",
      "Apply a thin layer over the affected area and surrounding skin.",
      "Wash hands after each use.",
      "For athlete's foot, wear well-fitting, ventilated shoes and change socks daily.",
    ],
    frequency: "Follow the product's label; the course length depends on the condition being treated.",
    cautions: [
      "For external use only. Avoid contact with the eyes, nose and mouth.",
      "Not for use on nails or the scalp.",
      "For children under 12, ask a doctor.",
      "Stop use and ask a doctor if irritation occurs or the condition does not improve as the label describes.",
    ],
    sources: ["Butenafine 1% OTC Drug Facts label (FDA-approved Rx-to-OTC switch)"],
    reviewed: false,
  },
  {
    activeId: "tioconazole",
    defaultSlot: "pm",
    slotReason: "Single-dose vaginal products are typically labeled for use at bedtime.",
    howToUse: [
      "Follow the product's label directions exactly; this is a vaginal product, not a skin-care step.",
      "Read the enclosed leaflet before use.",
    ],
    frequency: "Typically a single dose; follow the label.",
    cautions: [
      "If this is the first time you have had vaginal yeast symptoms, ask a doctor before use.",
      "Ask a doctor if symptoms do not improve within the time stated on the label, or if you are pregnant.",
      "May weaken latex condoms and diaphragms; follow the label.",
    ],
    sources: ["Tioconazole 6.5% vaginal ointment Drug Facts label (FDA-approved OTC product)"],
    reviewed: false,
  },

  // --- Dandruff / seborrheic dermatitis ---------------------------------------------
  {
    activeId: "pyrithione-zinc",
    defaultSlot: "both",
    slotReason: "Shampoos fit wherever you wash your hair; time of day does not matter.",
    howToUse: [
      "Wet hair, massage onto the scalp and lather.",
      "Leave on briefly as the label directs, then rinse thoroughly.",
      "Repeat if the label suggests.",
    ],
    frequency: "For best results, use at least twice a week or as directed by a doctor.",
    cautions: [
      "For external use only. Avoid contact with the eyes; if contact occurs, rinse thoroughly with water.",
      "Stop use and ask a doctor if the condition worsens or does not improve with regular use.",
    ],
    sources: [SRC_DANDRUFF],
    reviewed: false,
  },
  {
    activeId: "selenium-sulfide",
    defaultSlot: "both",
    slotReason: "Shampoos fit wherever you wash your hair; time of day does not matter.",
    howToUse: [
      "Shake well if the label says to.",
      "Wet hair, massage onto the scalp, leave on as the label directs, then rinse thoroughly.",
      "Repeat if the label suggests.",
    ],
    frequency: "For best results, use at least twice a week or as directed by a doctor.",
    cautions: [
      "For external use only. Avoid contact with the eyes; if contact occurs, rinse thoroughly with water.",
      "May discolor bleached, tinted, gray or permed hair; rinse thoroughly and follow the label.",
      "Stop use and ask a doctor if the condition worsens or does not improve with regular use.",
    ],
    sources: [SRC_DANDRUFF],
    reviewed: false,
  },
  {
    activeId: "coal-tar",
    defaultSlot: "both",
    slotReason: "It can be used at any time of day, but it can increase sun sensitivity afterward.",
    howToUse: [
      "For shampoos, wet hair, massage onto the scalp, leave on as the label directs, then rinse thoroughly.",
      "For skin products, follow the product's label directions.",
    ],
    frequency: "Follow the product's label; shampoos are commonly used at least twice a week.",
    cautions: [
      "Use caution with sun exposure after applying; it may increase the tendency to sunburn.",
      "Do not use for prolonged periods without asking a doctor.",
      "Avoid contact with the eyes.",
      "Can stain fabrics, light hair and some surfaces.",
      "Ask a doctor before use if the condition covers a large area of the body.",
    ],
    sources: [SRC_DANDRUFF],
    reviewed: false,
  },

  // --- Itch relief (external analgesics) -------------------------------------------
  {
    activeId: "hydrocortisone",
    defaultSlot: "both",
    slotReason: "Labels allow use several times a day as needed.",
    howToUse: [
      "Apply a thin layer to the affected area.",
      "Wash hands after use unless the hands are being treated.",
    ],
    frequency: "Adults and children 2 years and older: not more than 3 to 4 times daily, per the label.",
    cautions: [
      "For external use only. Avoid contact with the eyes.",
      "For children under 2 years, ask a doctor.",
      "Do not use for diaper rash unless directed by a doctor.",
      "Stop use and ask a doctor if the condition worsens, or symptoms last more than 7 days or clear up and come back within a few days.",
    ],
    sources: [SRC_ANALGESIC],
    reviewed: false,
  },
  {
    activeId: "pramoxine",
    defaultSlot: "both",
    slotReason: "Labels allow use several times a day as needed.",
    howToUse: ["Apply to the affected area.", "Follow the product's label directions."],
    frequency: "Adults and children 2 years and older: not more than 3 to 4 times daily, per the label.",
    cautions: [
      "For external use only. Avoid contact with the eyes.",
      "For children under 2 years, ask a doctor.",
      "Stop use and ask a doctor if the condition worsens, or symptoms last more than 7 days or clear up and come back within a few days.",
    ],
    sources: [SRC_ANALGESIC],
    reviewed: false,
  },
  {
    activeId: "diphenhydramine",
    defaultSlot: "both",
    slotReason: "Labels allow use several times a day as needed.",
    howToUse: ["Apply to the affected area.", "Follow the product's label directions."],
    frequency: "Adults and children 2 years and older: not more than 3 to 4 times daily, per the label.",
    cautions: [
      "For external use only. Avoid contact with the eyes.",
      "Do not use on large areas of the body, or on chickenpox or measles, unless directed by a doctor.",
      "Do not use with any other product containing diphenhydramine, even one taken by mouth.",
      "For children under 2 years, ask a doctor.",
      "Stop use and ask a doctor if the condition worsens or symptoms last more than 7 days.",
    ],
    sources: [SRC_ANALGESIC],
    reviewed: false,
  },

  // --- Skin protectant ---------------------------------------------------------------
  {
    activeId: "petrolatum",
    defaultSlot: "both",
    slotReason: "It can be applied as often as needed; many people use it as the final evening layer.",
    howToUse: [
      "Apply as needed to dry or chapped areas.",
      "Use a thin layer over moisturizer to seal it in.",
      "Applying to slightly damp skin after bathing is a common approach.",
    ],
    frequency: "Apply as needed.",
    cautions: [
      "For external use only. Avoid contact with the eyes.",
      "Do not use on deep or puncture wounds, animal bites or serious burns.",
      "Stop use and ask a doctor if the condition worsens or symptoms last more than 7 days.",
      "Can feel greasy and transfer to fabrics.",
    ],
    sources: [SRC_PROTECTANT],
    reviewed: false,
  },
  {
    activeId: "colloidal-oatmeal",
    defaultSlot: "both",
    slotReason: "It can be used as often as needed, as a leave-on product or a bath soak.",
    howToUse: [
      "For leave-on products, apply as needed to the affected area.",
      "For bath soaks, follow the packet directions for water temperature and soak time, then pat dry.",
      "Apply a moisturizer after bathing.",
    ],
    frequency: "Apply as needed, or as the label directs.",
    cautions: [
      "For external use only. Avoid contact with the eyes.",
      "Oatmeal baths can make the tub slippery; take care getting in and out.",
      "Stop use and ask a doctor if the condition worsens or symptoms last more than 7 days.",
    ],
    sources: [SRC_PROTECTANT],
    reviewed: false,
  },
  {
    activeId: "dimethicone",
    defaultSlot: "both",
    slotReason: "It can be applied as often as needed and layers easily under or over other steps.",
    howToUse: ["Apply as needed to dry or chapped areas.", "Use as a moisturizing step after water-based layers."],
    frequency: "Apply as needed.",
    cautions: [
      "For external use only. Avoid contact with the eyes.",
      "Do not use on deep or puncture wounds, animal bites or serious burns.",
      "Stop use and ask a doctor if the condition worsens or symptoms last more than 7 days.",
    ],
    sources: [SRC_PROTECTANT],
    reviewed: false,
  },
  {
    activeId: "allantoin",
    defaultSlot: "both",
    slotReason: "It can be applied as often as needed.",
    howToUse: ["Apply as needed to dry or chapped areas.", "Follow the product's label directions."],
    frequency: "Apply as needed.",
    cautions: [
      "For external use only. Avoid contact with the eyes.",
      "Do not use on deep or puncture wounds, animal bites or serious burns.",
      "Stop use and ask a doctor if the condition worsens or symptoms last more than 7 days.",
    ],
    sources: [SRC_PROTECTANT],
    reviewed: false,
  },
  {
    activeId: "lanolin",
    defaultSlot: "both",
    slotReason: "It can be applied as often as needed; its rich texture suits evening use.",
    howToUse: ["Apply as needed to dry or chapped areas.", "A thin layer is usually enough."],
    frequency: "Apply as needed.",
    cautions: [
      "For external use only. Avoid contact with the eyes.",
      "Some people are sensitive to wool-derived ingredients; stop use if a rash occurs.",
      "Do not use on deep or puncture wounds, animal bites or serious burns.",
      "Stop use and ask a doctor if the condition worsens or symptoms last more than 7 days.",
    ],
    sources: [SRC_PROTECTANT],
    reviewed: false,
  },

  // --- Antiperspirant ---------------------------------------------------------------
  antiperspirant("aluminum-chlorohydrate"),
  antiperspirant("aluminum-zirconium-complex"),

  // --- Cosmetic ingredients (no FDA monograph; no efficacy claims) --------------------
  {
    activeId: "niacinamide",
    defaultSlot: "both",
    slotReason: "It is generally well tolerated and can be used morning or night.",
    howToUse: [
      "Apply a few drops or a thin layer to clean skin.",
      "Follow with moisturizer, and with sunscreen in the morning.",
    ],
    frequency: "Once or twice daily, or as the label suggests.",
    cautions: [
      "Some people notice mild redness or tingling, especially at higher concentrations.",
      "Stop use if irritation persists.",
    ],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "vitamin-c",
    defaultSlot: "am",
    slotReason: "Many dermatologists suggest it in the morning, under sunscreen, as part of daytime skin care.",
    howToUse: [
      "Apply a few drops to clean, dry skin.",
      "Follow with moisturizer and sunscreen.",
      "Store as the label directs, often tightly closed and away from light and heat.",
    ],
    frequency: "Once daily, or as the label suggests.",
    startSlowly: "Consider starting every other day if your skin tends to sting with new products.",
    cautions: [
      "Mild tingling is common with acidic formulas.",
      "Products can darken as they oxidize; follow the label on shelf life.",
      "Consider not applying it at the same time as benzoyl peroxide.",
    ],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "hyaluronic-acid",
    defaultSlot: "both",
    slotReason: "It is a hydrating step that fits morning or night.",
    howToUse: [
      "Apply to clean, slightly damp skin.",
      "Follow with a moisturizer to help hold in hydration.",
    ],
    frequency: "Once or twice daily.",
    cautions: ["Generally well tolerated; stop use if irritation occurs."],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "retinol-cosmetic",
    defaultSlot: "pm",
    slotReason: "Retinoids are commonly applied in the evening, since they can make skin more sensitive to the sun.",
    howToUse: [
      "Apply a pea-sized amount to clean, dry skin.",
      "Follow with moisturizer if dryness occurs.",
      "Use sunscreen during the day.",
    ],
    frequency: "Up to once nightly, as tolerated and as the label suggests.",
    startSlowly:
      "Many dermatologists suggest starting two or three nights a week and increasing gradually as the skin tolerates it.",
    cautions: [
      "Dryness, flaking and redness are common at first.",
      "Avoid the eyes, lips and corners of the nose and mouth.",
      "Consider alternating nights with exfoliating acids rather than layering them.",
      "Many people avoid retinoids during pregnancy or breastfeeding; ask a doctor.",
    ],
    sources: [SRC_COSMETIC, SRC_AAD_RETINOIDS],
    reviewed: false,
  },
  {
    activeId: "ceramides",
    defaultSlot: "both",
    slotReason: "Usually found in moisturizers, which fit morning and night.",
    howToUse: [
      "Apply after serums as part of the moisturizing step.",
      "Applying to slightly damp skin is a common approach.",
    ],
    frequency: "Once or twice daily.",
    cautions: ["Generally well tolerated; stop use if irritation occurs."],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "alpha-arbutin",
    defaultSlot: "both",
    slotReason: "It can be used morning or night.",
    howToUse: [
      "Apply a thin layer to clean skin.",
      "Follow with moisturizer, and with sunscreen in the morning.",
    ],
    frequency: "Once or twice daily, or as the label suggests.",
    cautions: ["Stop use if irritation occurs.", "Keep away from the eyes."],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "glycolic-acid",
    defaultSlot: "pm",
    slotReason: "Exfoliating acids are often used in the evening, and they can increase sun sensitivity.",
    howToUse: [
      "Apply to clean, dry skin.",
      "Follow with moisturizer.",
      "Use sunscreen during the day while using it and for a week afterward.",
    ],
    frequency: "Follow the label; many leave-on products are used a few times a week up to nightly.",
    startSlowly: "Consider starting two or three times a week and increasing only as the skin tolerates it.",
    cautions: [
      "Can increase sensitivity to the sun and the chance of sunburn.",
      "Stinging, redness or peeling can occur; reduce use if they do.",
      "Consider not layering it with a retinoid or other exfoliants in the same routine.",
      "Keep away from the eyes.",
    ],
    sources: [SRC_COSMETIC, SRC_AHA_GUIDANCE],
    reviewed: false,
  },
  {
    activeId: "squalane",
    defaultSlot: "both",
    slotReason: "It is a lightweight oil that fits morning or night.",
    howToUse: [
      "Press a few drops into skin after water-based layers.",
      "It can also be mixed into a moisturizer.",
    ],
    frequency: "Once or twice daily.",
    cautions: ["Generally well tolerated; stop use if irritation occurs."],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "peptides",
    defaultSlot: "both",
    slotReason: "Peptide products can be used morning or night.",
    howToUse: ["Apply to clean skin as a serum or moisturizer step.", "Follow with sunscreen in the morning."],
    frequency: "Once or twice daily, or as the label suggests.",
    cautions: ["Generally well tolerated; stop use if irritation occurs."],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "bakuchiol",
    defaultSlot: "both",
    slotReason: "It is often used morning and night; some people keep it to the evening alongside other night steps.",
    howToUse: [
      "Apply a thin layer to clean skin.",
      "Follow with moisturizer, and with sunscreen in the morning.",
    ],
    frequency: "Once or twice daily, or as the label suggests.",
    cautions: [
      "Stop use if irritation occurs.",
      "Keep away from the eyes.",
      "It is a plant extract, not a retinoid.",
    ],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "tranexamic-acid",
    defaultSlot: "both",
    slotReason: "Topical cosmetic products can be used morning or night.",
    howToUse: [
      "Apply a thin layer to clean skin.",
      "Follow with moisturizer, and with sunscreen in the morning.",
    ],
    frequency: "Once or twice daily, or as the label suggests.",
    cautions: ["Stop use if irritation occurs.", "Keep away from the eyes."],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "centella-asiatica",
    defaultSlot: "both",
    slotReason: "It is commonly used in soothing cosmetic products for morning or night.",
    howToUse: ["Apply to clean skin as a toner, serum or moisturizer step.", "Follow with sunscreen in the morning."],
    frequency: "Once or twice daily.",
    cautions: ["Plant extracts can occasionally cause sensitivity; stop use if a rash occurs."],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "panthenol",
    defaultSlot: "both",
    slotReason: "It is a moisturizing ingredient that fits morning or night.",
    howToUse: ["Apply to clean skin as a serum or moisturizer step.", "Applying to slightly damp skin is a common approach."],
    frequency: "Once or twice daily, or as needed.",
    cautions: ["Generally well tolerated; stop use if irritation occurs."],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "kojic-acid",
    defaultSlot: "both",
    slotReason: "It can be used morning or night.",
    howToUse: [
      "Apply a thin layer to clean skin.",
      "Follow with moisturizer, and with sunscreen in the morning.",
    ],
    frequency: "Follow the label; once daily is common.",
    startSlowly: "Consider starting a few times a week, since it can irritate some skin.",
    cautions: [
      "Can cause irritation or contact allergy in some people; stop use if a rash occurs.",
      "Keep away from the eyes.",
    ],
    sources: [SRC_COSMETIC],
    reviewed: false,
  },
  {
    activeId: "mandelic-acid",
    defaultSlot: "pm",
    slotReason: "Exfoliating acids are often used in the evening, and they can increase sun sensitivity.",
    howToUse: [
      "Apply to clean, dry skin.",
      "Follow with moisturizer.",
      "Use sunscreen during the day while using it and for a week afterward.",
    ],
    frequency: "Follow the label; many leave-on products are used a few times a week up to nightly.",
    startSlowly: "Consider starting two or three times a week and increasing only as the skin tolerates it.",
    cautions: [
      "Can increase sensitivity to the sun and the chance of sunburn.",
      "Stinging, redness or peeling can occur; reduce use if they do.",
      "Consider not layering it with a retinoid or other exfoliants in the same routine.",
      "Keep away from the eyes.",
    ],
    sources: [SRC_COSMETIC, SRC_AHA_GUIDANCE],
    reviewed: false,
  },
  {
    activeId: "lactic-acid",
    defaultSlot: "pm",
    slotReason: "Exfoliating acids are often used in the evening, and they can increase sun sensitivity.",
    howToUse: [
      "Apply to clean, dry skin.",
      "Follow with moisturizer.",
      "Use sunscreen during the day while using it and for a week afterward.",
    ],
    frequency: "Follow the label; many leave-on products are used a few times a week up to nightly.",
    startSlowly: "Consider starting two or three times a week and increasing only as the skin tolerates it.",
    cautions: [
      "Can increase sensitivity to the sun and the chance of sunburn.",
      "Stinging, redness or peeling can occur; reduce use if they do.",
      "Consider not layering it with a retinoid or other exfoliants in the same routine.",
      "Keep away from the eyes.",
    ],
    sources: [SRC_COSMETIC, SRC_AHA_GUIDANCE],
    reviewed: false,
  },
];

export const ACTIVE_GUIDANCE: Record<string, ActiveGuidance> = Object.fromEntries(
  ENTRIES.map((g) => [g.activeId, g]),
);

export const FORMULATION_GUIDANCE: Record<StepType, FormulationGuidance> = {
  cleanser: {
    stepType: "cleanser",
    label: "Cleanser",
    order: 10,
    howToApply: [
      "Wet the skin with lukewarm water.",
      "Massage a small amount gently over the skin, then rinse well.",
      "Pat dry with a clean towel.",
    ],
    layering: "Always first, so the steps that follow go onto clean skin.",
    reviewed: false,
  },
  toner: {
    stepType: "toner",
    label: "Toner",
    order: 20,
    howToApply: [
      "Apply a small amount with clean hands or a cotton pad.",
      "Pat or sweep gently over the face, avoiding the eyes.",
    ],
    layering: "After cleansing and before serums and moisturizers.",
    reviewed: false,
  },
  serum: {
    stepType: "serum",
    label: "Serum",
    order: 30,
    howToApply: [
      "Use a few drops, as the label suggests.",
      "Press or smooth gently over the face.",
      "If using more than one serum, apply the thinnest first.",
    ],
    layering: "After toner and before gels, spot treatments and moisturizers.",
    reviewed: false,
  },
  gel: {
    stepType: "gel",
    label: "Gel",
    order: 40,
    howToApply: [
      "Apply a thin layer to clean, dry skin.",
      "A pea-sized amount usually covers the face for leave-on treatment gels.",
      "Let it absorb before the next step.",
    ],
    layering: "After serums and before spot treatments and moisturizers.",
    reviewed: false,
  },
  spot: {
    stepType: "spot",
    label: "Spot treatment",
    order: 45,
    howToApply: [
      "Dab a small amount only on the intended spot.",
      "Let it dry before applying anything over it.",
    ],
    layering: "After serums and gels, before moisturizer.",
    reviewed: false,
  },
  lotion: {
    stepType: "lotion",
    label: "Lotion",
    order: 50,
    howToApply: [
      "Smooth a thin, even layer over the face or body.",
      "Applying to slightly damp skin is a common approach.",
    ],
    layering: "After treatment steps; lighter than a cream, so it goes on first if using both.",
    reviewed: false,
  },
  cream: {
    stepType: "cream",
    label: "Cream",
    order: 60,
    howToApply: [
      "Warm a small amount between the fingertips.",
      "Smooth gently over the skin until absorbed.",
    ],
    layering: "After lotions and treatment steps, before ointments and sunscreen.",
    reviewed: false,
  },
  ointment: {
    stepType: "ointment",
    label: "Ointment",
    order: 80,
    howToApply: [
      "Use a thin layer; a little goes a long way.",
      "Applying over moisturizer helps seal it in.",
    ],
    layering: "The heaviest layer, so it goes last at night and before sunscreen in the morning, if used then.",
    reviewed: false,
  },
  sunscreen: {
    stepType: "sunscreen",
    label: "Sunscreen",
    order: 90,
    howToApply: [
      "Apply liberally 15 minutes before sun exposure.",
      "Many dermatologists suggest about a nickel-sized amount for the face and about one ounce for the body.",
      "Reapply at least every 2 hours, and after swimming or sweating as the label directs.",
    ],
    layering: "Always the last step of a morning routine.",
    reviewed: false,
  },
  scalp: {
    stepType: "scalp",
    label: "Scalp treatment",
    order: 100,
    howToApply: [
      "Apply to wet hair and massage into the scalp.",
      "Leave on for the time the label directs, then rinse thoroughly.",
    ],
    layering: "A scalp step outside the face sequence; it can be done whenever you wash your hair.",
    reviewed: false,
  },
  "body-powder": {
    stepType: "body-powder",
    label: "Body powder",
    order: 110,
    howToApply: [
      "Apply to clean, completely dry skin.",
      "Shake or sprinkle a small amount, keeping it away from the face to avoid breathing it in.",
    ],
    layering: "A body step outside the face sequence; apply after bathing and drying.",
    reviewed: false,
  },
  antiperspirant: {
    stepType: "antiperspirant",
    label: "Antiperspirant",
    order: 120,
    howToApply: [
      "Apply to clean, completely dry underarms.",
      "Many labels suggest bedtime application.",
    ],
    layering: "A body step outside the face sequence; it does not interact with the face routine.",
    reviewed: false,
  },
};
