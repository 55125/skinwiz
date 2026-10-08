// Clinical text of /guide/prescription-retinoids, kept as data so the page
// and the dermatologist's review copy (db/clinical-review.ts, Part D) read
// the same words. General skincare around a prescription only: no dosing,
// never advice to start, stop or change one. Drafted with AI assistance;
// physician review in progress.
export type GuidePoint = { lead: string; text: string };

export const RX_RETINOID_GUIDE = {
  title: "Using a prescription retinoid?",
  intro:
    "Tretinoin (Retin-A and others), prescription-strength adapalene, tazarotene or trifarotene. The everyday products around it make a real difference to how well you tolerate it.",
  disclaimerTitle: "Your prescriber's directions come first.",
  disclaimer:
    "This page is general information about the skincare around a prescription, not instructions for the medicine itself. We never tell you how much to use, how often, or whether to start or stop. Ask your prescriber before changing how you use it.",
  pairsWell: [
    { lead: "A gentle, non-medicated cleanser.", text: "Fragrance-free, without scrubbing beads or acids." },
    {
      lead: "A fragrance-free moisturizer.",
      text: "Dryness and peeling are the most common side effects, and moisturizing helps. Ask your prescriber whether to apply it before or after the retinoid.",
    },
    {
      lead: "Broad-spectrum sunscreen, SPF 30 or higher, every morning.",
      text: "Retinoids make skin more sensitive to the sun, and their labels say to limit sun exposure and use sun protection.",
    },
  ] as GuidePoint[],
  spaceOut: [
    {
      lead: "Exfoliating acids",
      text: "(glycolic, lactic, mandelic, salicylic). Together with a retinoid they add up to more dryness and irritation. Many people keep them to different nights, or skip them while getting used to the retinoid.",
    },
    {
      lead: "Benzoyl peroxide with tretinoin.",
      text: "Benzoyl peroxide can break down tretinoin, so the two are usually used at different times of day unless your prescription is made to be combined.",
    },
    {
      lead: "Another retinoid on top,",
      text: "such as an over-the-counter retinol serum or adapalene gel. Doubling up adds irritation without being part of the plan.",
    },
    { lead: "Scrubs, cleansing brushes, astringent or alcohol toners,", text: "and waxing on treated skin, which can lift fragile skin." },
  ] as GuidePoint[],
  firstWeeks: [
    "Dryness, redness, flaking and stinging are common at first and usually ease as skin adjusts. For acne, breakouts can look a little worse before they get better, and real improvement usually takes 8 to 12 weeks of steady use.",
    "Call your prescriber if irritation is severe or doesn't settle, if you have swelling or blistering, or if you are pregnant, planning a pregnancy or breastfeeding.",
  ],
  sources: [
    "Reynolds RV et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol 2024;90(5):1006.e1-30 (AAD)",
    "FDA prescribing information: tretinoin cream and gel (sun sensitivity, irritation, use with other topical products); tazarotene (pregnancy)",
    "American Academy of Dermatology, acne patient education (aad.org/public/diseases/acne)",
  ],
};
