// "When OTC isn't enough": per concern, how long a fair over-the-counter
// trial is and the signs that mean seeing a dermatologist promptly.
//
// DRAFT -- authored by Claude (AI) for review by the site's board-certified
// dermatologist. Shown only while FEATURES.ESCALATION_GUIDANCE is on
// (lib/feature-flags.ts), which is off in production until sign-off; the
// review copy is review/clinical-content-review.html.
//
// Writing rules: general education only, never a diagnosis. Red flags are
// phrased as "see a dermatologist / get care", not as what the condition
// is. Trial lengths for monograph OTC drugs follow their labels' "stop use
// and ask a doctor" language; the rest follow AAD public guidance and
// guidelines. `sources` lists only real documents, described rather than
// linked where the exact URL wasn't verified.

export type EscalationGuidance = {
  concernId: string;
  /** Typical length of a fair OTC trial, for "used it this long without improvement" checks. null = not a trial-based concern. */
  trialWeeks: number | null;
  fairTrial: string;
  seeDermatologistIf: string[];
  /** Same-day / emergency care signs, kept separate so they read as more urgent. */
  urgent: string[];
  sources: string[];
};

const SRC_AAD_ACNE_GUIDELINE =
  "Reynolds RV, et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol. 2024;90(5):1006.e1-1006.e30";
const SRC_AAD_ACNE_PUBLIC = "AAD public guidance: acne treatment takes time (aad.org)";
const SRC_ACNE_CFR = "21 CFR 333.350 (topical acne drug products: labeling)";
const SRC_AAD_MELANOMA = "AAD public guidance: what to look for — the ABCDEs of melanoma (aad.org)";
const SRC_AAD_SUNBURN = "AAD public guidance on treating sunburn (aad.org)";
const SRC_ANTIFUNGAL_CFR = "21 CFR 333.250 (topical antifungal drug products: labeling — 2 weeks jock itch, 4 weeks athlete's foot / ringworm)";
const SRC_AAD_TINEA = "AAD public guidance on athlete's foot, jock itch and ringworm (aad.org)";
const SRC_DANDRUFF_CFR = "21 CFR 358.750 (dandruff / seborrheic dermatitis / psoriasis drug products: labeling)";
const SRC_AAD_DANDRUFF = "AAD public guidance on dandruff (aad.org)";
const SRC_ANALGESIC_LABEL = "OTC hydrocortisone Drug Facts (21 CFR part 348 external analgesics, tentative final monograph): stop use if symptoms persist more than 7 days";
const SRC_PROTECTANT_CFR = "21 CFR 347.50 (skin protectant drug products: labeling — ask a doctor if symptoms last more than 7 days)";
const SRC_AAD_ECZEMA = "AAD public guidance on atopic dermatitis / eczema (aad.org)";
const SRC_AAD_ECZEMA_GUIDELINE =
  "Sidbury R, et al. Guidelines of care for the management of atopic dermatitis in adults with topical therapies. J Am Acad Dermatol. 2023;89(1):e1-e20";
const SRC_AAD_HYPERHIDROSIS = "AAD public guidance on hyperhidrosis (aad.org)";
const SRC_MINOXIDIL_LABEL =
  "FDA-approved OTC minoxidil Drug Facts (Rogaine and generics): do not use if hair loss is sudden or patchy; stop use and ask a doctor if no regrowth after 4 months (men's 5%, women's 5% foam) or 4 to 6 months (women's 2%)";
const SRC_AAD_HAIR_LOSS = "AAD public guidance: hair loss diagnosis and treatment (aad.org)";
const SRC_IHHS = "International Hyperhidrosis Society patient guidance (sweathelp.org)";
const SRC_AAD_MELASMA = "AAD public guidance on melasma and dark spots (aad.org)";
const SRC_AAD_SJS = "AAD public guidance on serious drug reactions (Stevens-Johnson syndrome / TEN warning signs)";

// Shown with every concern: the signs that mean emergency care, not a
// dermatology appointment.
export const UNIVERSAL_URGENT: string[] = [
  "Trouble breathing, or swelling of the lips, tongue, face or throat: call 911.",
  "A rash with fever plus blistering, peeling or sores in the mouth or eyes, especially after starting a new medicine: get emergency care.",
];

export const ESCALATION_GUIDANCE: EscalationGuidance[] = [
  {
    concernId: "acne",
    trialWeeks: 12,
    fairTrial:
      "Give one routine about 12 weeks before judging it — for example, adapalene 0.1% nightly and/or a benzoyl peroxide wash or gel (2.5–5%), used consistently. Improvement often starts around 6–8 weeks, and the first few weeks can bring dryness or a few new breakouts.",
    seeDermatologistIf: [
      "Deep, painful lumps or cysts under the skin.",
      "Acne that leaves scars or pitted marks.",
      "No real improvement after about 12 weeks of consistent OTC treatment.",
      "Acne that starts suddenly in adulthood, especially with irregular periods or new hair growth on the face or body.",
      "Breakouts that began after starting a new medicine or supplement.",
      "Acne that's affecting your mood or how you go about your day.",
    ],
    urgent: [],
    sources: [SRC_AAD_ACNE_GUIDELINE, SRC_AAD_ACNE_PUBLIC, SRC_ACNE_CFR],
  },
  {
    concernId: "sun-protection",
    trialWeeks: null,
    fairTrial:
      "Sunscreen prevents rather than treats, so there's no trial period. What's worth a professional look is a spot that's new or changing, or a reaction to sun that's out of proportion.",
    seeDermatologistIf: [
      "A mole or spot that's new, changing in size, shape or color, irregular, or looks different from your others.",
      "A spot or sore that bleeds, itches or crusts and doesn't heal within a few weeks.",
      "A rough, scaly patch on sun-exposed skin that keeps coming back.",
      "A rash or burn after only brief sun exposure, especially after starting a new medicine.",
    ],
    urgent: ["A sunburn with blistering over a large area, or with fever, chills, headache, confusion or feeling faint: get care the same day."],
    sources: [SRC_AAD_MELANOMA, SRC_AAD_SUNBURN],
  },
  {
    concernId: "antifungal",
    trialWeeks: 4,
    fairTrial:
      "Use the product every day as the label directs: about 2 weeks for jock itch and 4 weeks for athlete's foot or ringworm. Keep going for the full course even once it looks better. If it hasn't improved by then, the label itself says to stop and ask a doctor.",
    seeDermatologistIf: [
      "No improvement after 2 weeks (jock itch) or 4 weeks (athlete's foot, ringworm).",
      "Thick, discolored or crumbling nails — creams don't reach the nail.",
      "A ring-shaped or scaly patch on the scalp, or hair loss with scaling, especially in a child; these usually need prescription treatment.",
      "A rash that comes back soon after each course, or keeps spreading.",
      "Diabetes, poor circulation or a weakened immune system with a foot infection.",
    ],
    urgent: ["Spreading redness, warmth, swelling, pus or fever, especially from a crack between the toes: get care promptly."],
    sources: [SRC_ANTIFUNGAL_CFR, SRC_AAD_TINEA],
  },
  {
    concernId: "dandruff-seb-derm",
    trialWeeks: 4,
    fairTrial:
      "Use a medicated shampoo (zinc pyrithione, selenium sulfide, ketoconazole, salicylic acid or coal tar) as directed, often 2–3 times a week, for several weeks. Rotating between two actives can help. The label says to see a doctor if it doesn't improve with regular use.",
    seeDermatologistIf: [
      "No improvement after about 4 weeks of regular use, or it gets worse.",
      "Thick, well-defined plaques or silvery scale, or scaling beyond the hairline or on the elbows and knees.",
      "Hair loss, or patches of the scalp that are tender, crusted or have pus bumps.",
      "A red, scaly rash spreading across the face, chest or body.",
    ],
    urgent: [],
    sources: [SRC_DANDRUFF_CFR, SRC_AAD_DANDRUFF],
  },
  {
    concernId: "itch-relief",
    trialWeeks: 1,
    fairTrial:
      "OTC hydrocortisone and other anti-itch labels are for short-term use: stop and ask a doctor if itching lasts more than 7 days, or clears and comes back within a few days.",
    seeDermatologistIf: [
      "Itching that lasts more than a week, or keeps coming back.",
      "Itching all over without a visible rash.",
      "Itch that wakes you at night or disrupts your day.",
      "A poison ivy-type rash covering a large area, or on the face, eyes or genitals.",
      "Scratched areas that become crusted, oozing or more painful (possible infection).",
    ],
    urgent: ["Hives with swelling of the lips, tongue or throat, or trouble breathing: call 911."],
    sources: [SRC_ANALGESIC_LABEL, SRC_AAD_ECZEMA],
  },
  {
    concernId: "dry-skin-eczema",
    trialWeeks: 2,
    fairTrial:
      "Skin protectant labels say to ask a doctor if symptoms last more than 7 days. For eczema-prone skin, give a gentle, fragrance-free routine with a thick moisturizer at least twice a day a couple of weeks; if flares still aren't controlled, prescription treatment usually helps.",
    seeDermatologistIf: [
      "Flares that aren't controlled after a couple of weeks of consistent moisturizing and gentle care.",
      "Eczema that disrupts sleep, work or school.",
      "Thickened, cracked or bleeding skin that isn't healing.",
      "Yellow crusts, oozing or pus (possible infection).",
    ],
    urgent: ["Sudden clusters of painful, punched-out blisters or sores on eczema, especially with fever: get care the same day."],
    sources: [SRC_PROTECTANT_CFR, SRC_AAD_ECZEMA, SRC_AAD_ECZEMA_GUIDELINE],
  },
  {
    concernId: "excessive-sweating",
    trialWeeks: 4,
    fairTrial:
      "Try a clinical-strength antiperspirant applied to dry skin at bedtime, nightly at first, for a few weeks. If sweating still interferes with daily life, there are effective prescription and in-office treatments.",
    seeDermatologistIf: [
      "Sweating that still interferes with work, school or daily life after a few weeks of clinical-strength antiperspirant.",
      "Sweating that started suddenly in adulthood, affects only one side, or is all over the body rather than in specific areas.",
      "Night sweats that soak clothes or sheets, especially with fever or unexplained weight loss (see your doctor promptly).",
    ],
    urgent: ["Sweating with chest pain, shortness of breath, or feeling lightheaded: call 911."],
    sources: [SRC_AAD_HYPERHIDROSIS, SRC_IHHS],
  },
  {
    concernId: "hair-loss",
    trialWeeks: 16,
    fairTrial:
      "Minoxidil labels say to expect results after 2 to 4 months of use as directed, and to ask a doctor if there is no regrowth after about 4 months. It works only while you keep using it. Some extra shedding in the first weeks is common.",
    seeDermatologistIf: [
      "No regrowth after about 4 months of consistent use as the label directs.",
      "Hair loss that is sudden, patchy, or falling out in clumps.",
      "Hair loss with a red, scaly, itchy, painful or scarred scalp.",
      "Hair loss with no family history of it, or that started after an illness, a new medicine, pregnancy or a big change in weight.",
      "Thinning in children or teenagers.",
    ],
    urgent: ["Chest pain, a racing heartbeat, fainting, or sudden swelling of the hands or feet while using minoxidil: stop it and get care right away."],
    sources: [SRC_MINOXIDIL_LABEL, SRC_AAD_HAIR_LOSS],
  },
  {
    concernId: "brightening-texture",
    trialWeeks: 12,
    fairTrial:
      "Brightening ingredients work slowly: expect 8–12 weeks of daily use, together with daily broad-spectrum sunscreen (without sun protection, dark spots tend to come back).",
    seeDermatologistIf: [
      "A dark spot that's new, changing, irregular in shape or color, or looks different from your others.",
      "Patches that are losing color, or spreading.",
      "Rough, scaly or bleeding spots that don't heal.",
      "Dark patches on the face that keep worsening despite sunscreen and 12 weeks of consistent care.",
    ],
    urgent: [],
    sources: [SRC_AAD_MELASMA, SRC_AAD_MELANOMA],
  },
];

export function escalationFor(concernId: string): EscalationGuidance | undefined {
  return ESCALATION_GUIDANCE.find((g) => g.concernId === concernId);
}

export const ESCALATION_URGENT_SOURCES = [SRC_AAD_SJS];
