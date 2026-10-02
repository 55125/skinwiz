// Starting points for the clinician handout builder. A template fills in
// step roles, default directions and "stop and call" rules; the clinician
// picks the actual products (the "search" hint pre-fills the picker), edits
// every word, and owns what's printed. Nothing here is shown to a patient
// unless a clinician chose it and issued the handout.
//
// DRAFTED BY CLAUDE (AI), NOT YET REVIEWED: every template, default sig and
// rule is listed in review/rx-handouts-review.html for the dermatologist's
// approve / edit / cut. reviewed=false templates show a "draft" marker in
// the builder. Sources are mainstream guidelines and FDA labeling, cited per
// template; directions defer to the product label wherever a label exists.
//
// Isotretinoin never appears here and can't be added (informational only).

import type { HandoutSlot } from "@/lib/handout-types";

export type TemplateStep = {
  label: string;
  slot: HandoutSlot;
  kind: "otc" | "rx";
  search: string; // pre-fills the product picker
  directions: string;
};

export type HandoutTemplate = {
  id: string;
  name: string;
  title: string; // default handout title (the patient sees it)
  summary: string;
  steps: TemplateStep[];
  stopRules: string[];
  notes: string;
  sources: string[];
  reviewed: boolean;
};

// Appended to every template's rules (and offered on a blank handout).
export const UNIVERSAL_STOP_RULES = [
  "Hives, swelling of the lips, tongue or face, or trouble breathing: call 911.",
  "A rash that spreads fast, blisters, or comes with fever: get seen the same day.",
];
export const UNIVERSAL_STOP_SOURCES = ["General allergic-reaction / emergency-care guidance (AAD patient education on drug reactions)"];

const SPF_AM: TemplateStep = {
  label: "Sunscreen",
  slot: "am",
  kind: "otc",
  search: "SPF 30",
  directions: "Every morning as the last step: broad-spectrum SPF 30 or higher. Reapply every 2 hours outdoors and after sweating or swimming.",
};
const GENTLE_CLEANSER = (slot: HandoutSlot): TemplateStep => ({
  label: "Gentle cleanser",
  slot,
  kind: "otc",
  search: "gentle cleanser",
  directions: "Wash with lukewarm water and your fingertips, rinse, and pat dry. No scrubs or washcloths.",
});
const MOISTURIZER = (slot: HandoutSlot): TemplateStep => ({
  label: "Moisturizer",
  slot,
  kind: "otc",
  search: "moisturizer",
  directions: "A fragrance-free, non-comedogenic moisturizer after treatment steps. Use more if your skin feels dry or tight.",
});

export const HANDOUT_TEMPLATES: HandoutTemplate[] = [
  {
    id: "acne-starter",
    name: "Acne starter (mild to moderate)",
    title: "Your acne plan",
    summary: "Cleanser, benzoyl peroxide, a topical retinoid at night, moisturizer and sunscreen.",
    steps: [
      { ...GENTLE_CLEANSER("am"), label: "Benzoyl peroxide wash", search: "benzoyl peroxide wash", directions: "Lather onto damp skin, leave on for 1 to 2 minutes, then rinse. It can bleach towels and pillowcases." },
      MOISTURIZER("am"),
      SPF_AM,
      GENTLE_CLEANSER("pm"),
      {
        label: "Topical retinoid",
        slot: "pm",
        kind: "rx",
        search: "tretinoin",
        directions:
          "At night, a pea-sized amount for the whole face (not just spots) on dry skin. Start every other night for 2 weeks, then nightly as tolerated. Keep away from the corners of the eyes, nose and mouth.",
      },
      MOISTURIZER("pm"),
    ],
    stopRules: [
      "Redness, burning or peeling that is severe, or doesn't settle after a few days off the retinoid.",
      "You become pregnant or are planning a pregnancy (stop the retinoid and let us know).",
      "Painful, deep bumps or new scarring.",
      "No improvement after 12 weeks of using the plan every day.",
    ],
    notes: "Expect dryness and some breakouts in the first 4 to 6 weeks; most people see real improvement at 8 to 12 weeks. Use the plan every day, even when your skin looks better.",
    sources: [
      "Reynolds RV et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol 2024;90(5):1006.e1-30 (AAD)",
      "FDA labels: tretinoin cream/gel (dosage and administration; pregnancy); benzoyl peroxide 21 CFR 333.350 directions",
    ],
    reviewed: false,
  },
  {
    id: "rosacea",
    name: "Rosacea (papulopustular / redness)",
    title: "Your rosacea plan",
    summary: "Gentle care, a prescription anti-inflammatory, moisturizer and mineral sunscreen; trigger tips.",
    steps: [
      GENTLE_CLEANSER("am"),
      {
        label: "Rosacea treatment",
        slot: "am",
        kind: "rx",
        search: "ivermectin",
        directions: "Once a day, a thin layer over the cheeks, nose, chin and forehead, avoiding the eyes and lips. Follow the label for how often.",
      },
      MOISTURIZER("am"),
      { ...SPF_AM, search: "zinc oxide SPF 30", directions: "Every morning: a mineral (zinc oxide or titanium dioxide) broad-spectrum SPF 30 or higher. Reapply every 2 hours outdoors." },
      GENTLE_CLEANSER("pm"),
      MOISTURIZER("pm"),
    ],
    stopRules: [
      "Eye symptoms: gritty, burning, painful or red eyes, or any change in vision (call us promptly).",
      "Burning, stinging or redness that gets worse with the treatment instead of better.",
      "No improvement after 8 to 12 weeks of daily use.",
    ],
    notes: "Notice what sets off your flushing (heat, sun, hot drinks, alcohol, spicy food, stress) and keep a short list for your next visit. Skip alcohol-based toners, scrubs and menthol.",
    sources: [
      "Thiboutot D et al. Standard management options for rosacea: the 2019 update by the National Rosacea Society Expert Committee. J Am Acad Dermatol 2020;82(6):1501-10",
      "FDA labels: ivermectin 1% cream, metronidazole 0.75%/1% gel and cream, azelaic acid 15% gel (dosage and administration)",
    ],
    reviewed: false,
  },
  {
    id: "eczema",
    name: "Eczema flare + maintenance",
    title: "Your eczema plan",
    summary: "A short steroid course for flares, then daily moisturizing and a non-steroidal for maintenance.",
    steps: [
      {
        label: "Flare treatment (body)",
        slot: "both",
        kind: "rx",
        search: "triamcinolone ointment",
        directions:
          "Twice a day to red, itchy patches on the body only (not the face, groin or armpits) until smooth, for up to 2 weeks at a time. Then stop and use the maintenance steps.",
      },
      {
        label: "Face, folds and maintenance",
        slot: "both",
        kind: "rx",
        search: "tacrolimus",
        directions: "Twice a day to eczema on the face, eyelids, neck or skin folds, and to areas that tend to flare. A brief warm or burning feeling in the first days is common.",
      },
      {
        label: "Moisturizer (every day)",
        slot: "both",
        kind: "otc",
        search: "eczema cream",
        directions: "At least twice a day and within 3 minutes of bathing, on damp skin, all over. Thick fragrance-free creams or ointments work best.",
      },
      { ...GENTLE_CLEANSER("pm"), label: "Gentle body wash", search: "fragrance free body wash", directions: "Short lukewarm bath or shower (5 to 10 minutes), fragrance-free cleanser only where needed, pat dry, then moisturize." },
    ],
    stopRules: [
      "Signs of infection: yellow crusts, pus, spreading redness, fever, or painful clusters of punched-out sores (call the same day).",
      "Thinning skin, stretch marks or easy bruising where the steroid is used.",
      "No improvement after 2 weeks of the flare treatment, or flares that keep coming back quickly.",
      "Sleep is disrupted by itch most nights.",
    ],
    notes: "Use the flare treatment only on active patches and only for the time we discussed. Keep moisturizing every day even when your skin is clear: that's what keeps flares away.",
    sources: [
      "Sidbury R et al. Guidelines of care for the management of atopic dermatitis in adults with topical therapies. J Am Acad Dermatol 2023;89(1):e1-e20 (AAD)",
      "FDA labels: triamcinolone acetonide ointment, tacrolimus ointment, pimecrolimus cream (dosage and administration; warnings)",
      "AAD patient guidance on eczema bathing and moisturizing ('soak and seal')",
    ],
    reviewed: false,
  },
  {
    id: "post-procedure",
    name: "Post-procedure care (peel, laser, resurfacing)",
    title: "Your aftercare plan",
    summary: "Gentle cleansing, a healing ointment, strict sun protection, actives on hold.",
    steps: [
      { ...GENTLE_CLEANSER("both"), directions: "Twice a day, very gently with lukewarm water and a fragrance-free cleanser. Pat dry; don't rub or pick." },
      {
        label: "Healing ointment",
        slot: "both",
        kind: "otc",
        search: "petrolatum ointment",
        directions: "A thin layer on treated skin after cleansing and whenever it feels dry, until the skin has healed.",
      },
      { ...SPF_AM, search: "zinc oxide SPF 30", directions: "Once the skin has closed over: mineral broad-spectrum SPF 30 or higher every morning, and avoid direct sun for at least 4 weeks." },
    ],
    stopRules: [
      "Increasing pain, warmth, swelling, pus or spreading redness, or a fever (possible infection).",
      "Blisters, crusted sores or tingling, especially if you get cold sores.",
      "Bleeding that doesn't stop with 15 minutes of firm pressure.",
      "Dark or light patches that appear as the skin heals.",
    ],
    notes: "Hold retinoids, acids, scrubs and other active products until we tell you to restart them. Don't pick or peel flaking skin.",
    sources: [
      "AAD patient guidance on caring for skin after laser treatment and chemical peels",
      "General wound-care principles (moist occlusive healing with petrolatum)",
    ],
    reviewed: false,
  },
  {
    id: "melasma",
    name: "Melasma",
    title: "Your melasma plan",
    summary: "Daily tinted mineral sunscreen plus a prescription lightener on the dark patches at night.",
    steps: [
      GENTLE_CLEANSER("am"),
      {
        ...SPF_AM,
        label: "Tinted mineral sunscreen",
        search: "tinted SPF",
        directions:
          "Every morning, a tinted (iron oxide) mineral sunscreen SPF 30 or higher, all over the face. Reapply every 2 hours outdoors. Visible light and heat darken melasma too, so a hat helps.",
      },
      GENTLE_CLEANSER("pm"),
      {
        label: "Lightening treatment",
        slot: "pm",
        kind: "rx",
        search: "hydroquinone",
        directions: "At night, a thin layer on the dark patches only, for the length of time we discussed. Do not use it continuously for months without a check-in.",
      },
      MOISTURIZER("pm"),
    ],
    stopRules: [
      "Redness, burning or a rash where you apply the lightening cream.",
      "Patches that turn darker, grey or blue-black (stop the cream and call us).",
      "You become pregnant or are breastfeeding.",
    ],
    notes: "Melasma improves slowly (months) and comes back with sun exposure, so the sunscreen matters as much as the cream. Avoid waxing or harsh treatments on the patches.",
    sources: [
      "Rajaratnam R et al. Interventions for melasma. Cochrane Database Syst Rev 2010;(7):CD003583",
      "FDA labels: fluocinolone/hydroquinone/tretinoin cream (Tri-Luma: limited to 8 weeks); hydroquinone 4% (unapproved drug labeling, warnings on ochronosis)",
      "Visible-light / iron-oxide tinted sunscreen evidence (Castanedo-Cazares JP et al. Photodermatol Photoimmunol Photomed 2014)",
    ],
    reviewed: false,
  },
  {
    id: "seb-derm",
    name: "Seborrheic dermatitis",
    title: "Your seborrheic dermatitis plan",
    summary: "Medicated shampoo for scalp, beard and face, with an antifungal cream and a short steroid for flares.",
    steps: [
      {
        label: "Medicated shampoo",
        slot: "as-directed",
        kind: "rx",
        search: "ketoconazole shampoo",
        directions:
          "2 to 3 times a week: lather into the scalp (and beard, eyebrows or other flaky areas), leave on 5 minutes, rinse. Once it's clear, once a week to keep it away.",
      },
      {
        label: "Antifungal cream (face)",
        slot: "pm",
        kind: "rx",
        search: "ketoconazole cream",
        directions: "Once or twice a day, a thin layer on flaky, red areas of the face (sides of the nose, eyebrows, behind the ears).",
      },
      {
        label: "Flare cream (short course)",
        slot: "as-directed",
        kind: "rx",
        search: "hydrocortisone 2.5",
        directions: "For a flare only: twice a day on red, itchy areas for up to 1 week, then stop.",
      },
      MOISTURIZER("am"),
    ],
    stopRules: [
      "No improvement after 4 weeks of regular use.",
      "Hair loss, a spreading rash, or rash on the eyelids that affects your eyes.",
      "Thinning skin or new redness where the flare cream is used.",
    ],
    notes: "This tends to come and go, often worse in winter and with stress. The shampoo keeps it quiet: keep a maintenance wash going even when it's clear.",
    sources: [
      "Clark GW, Pope SM, Jaboori KA. Diagnosis and treatment of seborrheic dermatitis. Am Fam Physician 2015;91(3):185-90",
      "FDA labels: ketoconazole 2% shampoo and cream; hydrocortisone 2.5% (dosage and administration)",
    ],
    reviewed: false,
  },
];

export function getTemplate(id: string | null | undefined): HandoutTemplate | undefined {
  return HANDOUT_TEMPLATES.find((t) => t.id === id);
}
