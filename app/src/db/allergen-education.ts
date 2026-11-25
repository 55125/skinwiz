// Patient education for each patch-test allergen: what a positive means
// day to day, where it turns up off the ingredient label, what it's often
// found with, and a few practical tips. One record per allergen, read by
// the allergen page, the patch-test handout and the QR landing page, so all
// three say the same thing.
//
// The ingredient-label side (label names, "free of" matching, families)
// stays in contact-allergens.ts. This module is only the patient-facing
// prose and the identifiers a clinician or lab uses (CAS numbers, the
// patch-test preparation's own name).
//
// Every record starts unreviewed. `reviewed` is set only after a
// dermatologist has read it; the printed handout shows only reviewed
// records (or says plainly that a section is unreviewed), and the allergen
// page labels unreviewed ones.
//
// CAS numbers were checked against PubChem's synonym lists on 2026-11-24
// and must pass the CAS check digit (allergen-education.test.ts). Mixtures
// (fragrance mix, caine mix, rubber mixes) have no single CAS and list none;
// their members carry their own.
//
// Written from standard patient-education material: DermNet patient
// information on each allergen, ACDS/CAMP patient resources, Fonacier et
// al., AAAAI Practice Parameter 2015, and the allergen notes already in
// contact-allergens.ts.

import { EXTENDED_EDUCATION } from "./allergen-education-extended";
import { SEARCH_EDUCATION } from "./allergen-education-search";

export type Cas = { number: string; of: string };

export type FoundInGroup = { where: string; items: string[] };

export type AllergenEducation = {
  // An allergen, family or not-on-label id (contact-allergens.ts /
  // patch-test-series.ts NOT_ON_LABELS).
  id: string;
  // The patch-test preparation, as series sheets and results print it.
  testedAs: string[];
  cas: Cas[];
  // Where a person meets it, grouped. For label allergens this is the
  // product types; for metals, rubber and dyes it is mostly not products.
  foundIn: FoundInGroup[];
  // Allergens often positive alongside this one, or that cross-react with it,
  // which aren't already one family in contact-allergens.ts.
  related: { id: string; why: string }[];
  tips: string[];
  reviewed: { by: string; on: string } | null;
};

export { allergyIntro, allergyIntroMany } from "./allergen-education-intro";

const unreviewed = null;

// T.R.U.E. Test allergens. The extended trays' are in allergen-education-extended.ts.
export const ALLERGEN_EDUCATION: AllergenEducation[] = [
  // --- Metals ---
  {
    id: "nickel",
    testedAs: ["Nickel sulfate", "Nickel sulfate hexahydrate"],
    cas: [
      { number: "10101-97-0", of: "nickel sulfate hexahydrate" },
      { number: "7440-02-0", of: "nickel metal" },
    ],
    foundIn: [
      { where: "Jewelry and clothing", items: ["Earrings, necklaces and watch backs", "Belt buckles, jeans buttons, zippers, snaps and bra hooks", "Eyeglass frames"] },
      { where: "Around the house", items: ["Keys, coins and scissors", "Tools, door handles and kitchen utensils", "Phones, laptops and game controllers with metal parts"] },
      { where: "Personal care", items: ["Eyelash curlers, tweezers, razors and hair clips", "Some eye shadows and mineral makeup, as a trace"] },
      { where: "Medical and dental", items: ["Some orthodontic wires and dental work", "Some implants; tell your doctors and dentist"] },
    ],
    related: [{ id: "cobalt", why: "Often found in the same metal items, so many people react to both." }],
    tips: [
      "Choose jewelry labeled nickel-free, or made of titanium, surgical-grade stainless steel, platinum, or 18 karat yellow gold. White gold can contain nickel.",
      "A nickel spot test kit (dimethylglyoxime) shows whether a metal item releases nickel.",
      "Cover jeans buttons and belt buckles with clear nail polish or a fabric patch.",
    ],
    reviewed: unreviewed,
  },
  {
    id: "cobalt",
    testedAs: ["Cobalt chloride", "Cobalt dichloride", "Cobalt chloride hexahydrate"],
    cas: [
      { number: "7791-13-1", of: "cobalt chloride hexahydrate" },
      { number: "7440-48-4", of: "cobalt metal" },
    ],
    foundIn: [
      { where: "Jewelry and clothing", items: ["Costume jewelry and hair ornaments", "Buckles, buttons, hooks, pins, rivets, snaps and zippers", "Leather goods such as shoes, gloves and watch straps"] },
      { where: "Around the house and at work", items: ["Keys, magnets, metal tools and utensils", "Blue paints, enamels, spray paints, pottery glazes and wood stains", "Printing inks, cement and bricks"] },
      { where: "Personal care", items: ["Eye shadow and other blue or green makeup, as a pigment or trace"] },
      { where: "Medical, dental and diet", items: ["Joint replacements, dental implants and dentures", "Vitamin B12 supplements, which contain cobalt"] },
    ],
    related: [{ id: "nickel", why: "Cobalt is often mixed into the same metal items, so many people react to both." }],
    tips: [
      "Wear sterling silver, gold or other precious-metal jewelry rather than costume jewelry.",
      "A cobalt spot test kit shows whether a metal item releases cobalt.",
      "Tell your doctors and dentist before any implant or dental work, and ask before starting B12 supplements.",
    ],
    reviewed: unreviewed,
  },
  {
    id: "chromium",
    testedAs: ["Potassium dichromate"],
    cas: [{ number: "7778-50-9", of: "potassium dichromate" }],
    foundIn: [
      { where: "Leather", items: ["Chrome-tanned leather: shoes, boots, gloves, belts, watch straps and furniture"] },
      { where: "Work and hobbies", items: ["Wet cement and concrete", "Anti-rust paints, primers and some wood preservatives", "Chrome plating, welding and metalwork"] },
      { where: "Personal care", items: ["Green makeup pigments (chromium oxide greens)"] },
    ],
    related: [],
    tips: [
      "Choose vegetable-tanned or chrome-free leather, or wear socks and liners between leather and skin.",
      "Wear waterproof gloves when working with cement, and wash skin promptly if it touches wet cement.",
    ],
    reviewed: unreviewed,
  },
  {
    id: "gold",
    testedAs: ["Gold sodium thiosulfate"],
    cas: [{ number: "7440-57-5", of: "gold metal" }],
    foundIn: [
      { where: "Jewelry", items: ["Gold earrings, rings and necklaces, especially pierced earrings"] },
      { where: "Medical and dental", items: ["Gold crowns, fillings and some stents"] },
      { where: "Personal care", items: ["Luxury skincare with gold flakes or colloidal gold"] },
    ],
    related: [],
    tips: ["A positive gold test often doesn't explain a rash. Ask your dermatologist whether it matters for you before giving up gold jewelry."],
    reviewed: unreviewed,
  },

  // --- Preservatives and formaldehyde releasers ---
  {
    id: "formaldehyde",
    testedAs: ["Formaldehyde"],
    cas: [{ number: "50-00-0", of: "formaldehyde" }],
    foundIn: [
      { where: "Personal care", items: ["Shampoos, body washes and liquid soaps preserved with formaldehyde releasers", "Nail hardeners", "Keratin hair-smoothing treatments (listed as methylene glycol)"] },
      { where: "Around the house", items: ["Wrinkle-free and permanent-press clothing and bedding", "Some glues, paints, cleaners and pressed-wood furniture"] },
      { where: "Work", items: ["Embalming, labs, healthcare disinfectants and metalworking fluids"] },
    ],
    related: [
      { id: "quaternium-15", why: "Releases formaldehyde; avoid it too." },
      { id: "diazolidinyl-urea", why: "Releases formaldehyde; avoid it too." },
      { id: "imidazolidinyl-urea", why: "Releases formaldehyde; avoid it too." },
      { id: "bronopol", why: "Releases formaldehyde; avoid it too." },
    ],
    tips: [
      "Avoid the whole group of formaldehyde releasers, not only formaldehyde itself.",
      "Wash new clothes and bedding before wearing them, and avoid wrinkle-free finishes.",
    ],
    reviewed: unreviewed,
  },
  {
    id: "quaternium-15",
    testedAs: ["Quaternium-15"],
    cas: [{ number: "4080-31-3", of: "quaternium-15" }],
    foundIn: [
      { where: "Personal care", items: ["Shampoos, conditioners and body washes", "Lotions, creams and makeup, especially older formulas"] },
      { where: "Around the house", items: ["Some cleaners, polishes and latex paints"] },
    ],
    related: [{ id: "formaldehyde", why: "It releases formaldehyde, so a formaldehyde allergy means avoiding it too." }],
    tips: ["Check rinse-off products as carefully as creams; shampoo is a common source."],
    reviewed: unreviewed,
  },
  {
    id: "diazolidinyl-urea",
    testedAs: ["Diazolidinyl urea"],
    cas: [{ number: "78491-02-8", of: "diazolidinyl urea" }],
    foundIn: [{ where: "Personal care", items: ["Lotions, creams, sunscreens and makeup", "Shampoos, conditioners and baby wipes"] }],
    related: [
      { id: "formaldehyde", why: "It releases formaldehyde." },
      { id: "imidazolidinyl-urea", why: "A closely related preservative; people often react to both." },
    ],
    tips: ["Look for the name Germall II as well."],
    reviewed: unreviewed,
  },
  {
    id: "imidazolidinyl-urea",
    testedAs: ["Imidazolidinyl urea"],
    cas: [{ number: "39236-46-9", of: "imidazolidinyl urea" }],
    foundIn: [{ where: "Personal care", items: ["Lotions, creams, deodorants and makeup", "Shampoos and conditioners"] }],
    related: [
      { id: "formaldehyde", why: "It releases formaldehyde." },
      { id: "diazolidinyl-urea", why: "A closely related preservative; people often react to both." },
    ],
    tips: ["Look for the name Germall 115 as well."],
    reviewed: unreviewed,
  },
  {
    id: "bronopol",
    testedAs: ["2-Bromo-2-nitropropane-1,3-diol (bronopol)"],
    cas: [{ number: "52-51-7", of: "bronopol" }],
    foundIn: [
      { where: "Personal care", items: ["Shampoos, body washes and some creams"] },
      { where: "Around the house and at work", items: ["Some cleaners, cooling fluids and industrial water treatments"] },
    ],
    related: [{ id: "formaldehyde", why: "It can release formaldehyde." }],
    tips: [],
    reviewed: unreviewed,
  },
  {
    id: "mci-mi",
    testedAs: ["Methylchloroisothiazolinone/methylisothiazolinone (MCI/MI)"],
    cas: [
      { number: "26172-55-4", of: "methylchloroisothiazolinone" },
      { number: "2682-20-4", of: "methylisothiazolinone" },
    ],
    foundIn: [
      { where: "Personal care", items: ["Shampoos, conditioners, body washes and liquid hand soap", "Wet wipes, including baby wipes", "Some hair dyes and styling products"] },
      { where: "Around the house", items: ["Dish soap, laundry detergent, fabric softener and household cleaners", "Water-based wall paints, glues and air fresheners"] },
    ],
    related: [{ id: "methylisothiazolinone", why: "MCI/MI always contains MI, so avoid methylisothiazolinone on its own too." }],
    tips: [
      "Check household products as well as personal care: detergents and cleaners often use it.",
      "Fresh wall paint can give off enough to cause a rash; air out freshly painted rooms or choose paints without it.",
    ],
    reviewed: unreviewed,
  },
  {
    id: "mdbgn",
    testedAs: ["Methyldibromo glutaronitrile"],
    cas: [{ number: "35691-65-7", of: "methyldibromo glutaronitrile" }],
    foundIn: [
      { where: "Personal care", items: ["Older lotions, creams and wipes; banned in EU cosmetics since 2008"] },
      { where: "Around the house and at work", items: ["Some paints, glues, cleaners and metalworking fluids"] },
    ],
    related: [],
    tips: ["Look for Euxyl K 400, a preservative blend that contains it."],
    reviewed: unreviewed,
  },
  {
    id: "parabens",
    testedAs: ["Paraben mix"],
    cas: [],
    foundIn: [
      { where: "Personal care", items: ["Creams, lotions, makeup and sunscreens", "Prescription and over-the-counter creams"] },
      { where: "Food and medicine", items: ["Some packaged foods and liquid medicines"] },
    ],
    related: [],
    tips: ["Paraben allergy is uncommon and mostly affects broken or eczema skin. Products on healthy skin may be fine; ask your dermatologist."],
    reviewed: unreviewed,
  },
  {
    id: "thimerosal",
    testedAs: ["Thimerosal"],
    cas: [{ number: "54-64-8", of: "thimerosal" }],
    foundIn: [
      { where: "Medicine", items: ["Some older eye drops, contact lens solutions, ear drops and antiseptics", "Some multi-dose vaccines"] },
    ],
    related: [],
    tips: ["A positive test is often not relevant today. Ask your dermatologist before declining a vaccine because of it."],
    reviewed: unreviewed,
  },

  // --- Fragrance and botanicals ---
  {
    id: "fragrance-mix-1",
    testedAs: ["Fragrance mix I"],
    cas: [],
    foundIn: [
      { where: "Personal care", items: ["Anything with fragrance, parfum or aroma on the label", "Perfume, aftershave, deodorant, lotion, shampoo and makeup", "Unscented products that use a masking fragrance"] },
      { where: "Around the house", items: ["Laundry detergent, fabric softener and dryer sheets", "Air fresheners, candles and cleaning products"] },
      { where: "Food and other", items: ["Cinnamon, cloves and other spices, and flavored toothpaste and gum, for some people"] },
    ],
    related: [{ id: "balsam-of-peru", why: "Shares several of the same fragrance chemicals; people often react to both." }],
    tips: [
      "Choose products labeled fragrance-free, not unscented, and still read the ingredient list.",
      "Essential oils and plant extracts can contain the same chemicals.",
    ],
    reviewed: unreviewed,
  },
  {
    id: "balsam-of-peru",
    testedAs: ["Myroxylon pereirae (balsam of Peru)"],
    cas: [{ number: "8007-00-9", of: "balsam of Peru" }],
    foundIn: [
      { where: "Personal care", items: ["Fragranced products, including some sold as unscented", "Lip balms, hemorrhoid ointments and some diaper creams"] },
      { where: "Food and drink", items: ["Cinnamon, cloves, vanilla, citrus peel, tomatoes, chocolate, cola and flavored drinks, for some people"] },
    ],
    related: [{ id: "fragrance-mix-1", why: "Shares several of the same fragrance chemicals." }],
    tips: ["If the rash keeps coming back after strict skin avoidance, ask about a low-balsam diet."],
    reviewed: unreviewed,
  },
  {
    id: "colophonium",
    testedAs: ["Colophony", "Colophonium"],
    cas: [{ number: "8050-09-7", of: "rosin (colophony)" }],
    foundIn: [
      { where: "Personal care", items: ["Mascara, eyeliner, lipstick and lip balm", "Hair-removal wax, nail polish and lash glue"] },
      { where: "Around the house and hobbies", items: ["Adhesive bandages, medical tape and sticky labels", "Rosin for violin bows and sports grips", "Solder flux, varnishes, printing inks and some paper"] },
    ],
    related: [],
    tips: ["Ask for acrylic or silicone medical tape and bandages."],
    reviewed: unreviewed,
  },
  {
    id: "compositae",
    testedAs: ["Parthenolide", "Sesquiterpene lactone mix", "Compositae mix"],
    cas: [{ number: "20554-84-1", of: "parthenolide" }],
    foundIn: [
      { where: "Personal care", items: ["Chamomile, arnica, calendula and feverfew extracts in creams and shampoos", "Herbal and natural products"] },
      { where: "Garden and outdoors", items: ["Chrysanthemums, daisies, sunflowers, dandelions and ragweed", "Lettuce, endive and artichoke when handled"] },
      { where: "Food and drink", items: ["Chamomile and echinacea teas, for some people"] },
    ],
    related: [],
    tips: [
      "Wear gloves when gardening, and watch for rash on the face and neck after time outdoors; airborne plant particles can cause it.",
    ],
    reviewed: unreviewed,
  },

  // --- Emollients ---
  {
    id: "lanolin",
    testedAs: ["Wool alcohols", "Amerchol L-101"],
    cas: [{ number: "8027-33-6", of: "lanolin alcohols (wool alcohols)" }],
    foundIn: [
      { where: "Personal care", items: ["Moisturizers, lip balms, nipple creams and diaper creams", "Makeup and hair products"] },
      { where: "Medicine", items: ["Ointments and medicated creams, including some prescription creams"] },
    ],
    related: [],
    tips: ["Wool clothing is usually fine; the allergy is to lanolin in products, not to the fiber."],
    reviewed: unreviewed,
  },

  // --- Hair dye ---
  {
    id: "ppd",
    testedAs: ["p-Phenylenediamine (PPD)"],
    cas: [{ number: "106-50-3", of: "p-phenylenediamine" }],
    foundIn: [
      { where: "Hair", items: ["Permanent and most semi-permanent hair dyes, especially dark shades", "Eyebrow and eyelash tints", "Beard dyes"] },
      { where: "Other", items: ["Black henna temporary tattoos", "Dark dyed clothing, leather and furs", "Printing inks and some rubber"] },
    ],
    related: [
      { id: "benzocaine", why: "A related \"para\" compound that can cross-react." },
      { id: "disperse-orange-3", why: "A textile dye that often cross-reacts with PPD." },
    ],
    tips: [
      "Tell your hair stylist. PPD-free dyes may still contain toluene-2,5-diamine, which often cross-reacts.",
      "Avoid black henna tattoos; true henna is reddish brown, never black.",
    ],
    reviewed: unreviewed,
  },

  // --- Medicines ---
  {
    id: "neomycin",
    testedAs: ["Neomycin sulfate"],
    cas: [{ number: "1405-10-3", of: "neomycin sulfate" }],
    foundIn: [
      { where: "Medicine", items: ["Triple antibiotic ointment and first-aid creams", "Some ear and eye drops", "Some prescription combination creams"] },
    ],
    related: [{ id: "bacitracin", why: "Often in the same first-aid ointments, and people often react to both." }],
    tips: [
      "Use plain petroleum jelly on cuts and wounds instead of antibiotic ointment.",
      "Tell every doctor: related antibiotics (gentamicin, tobramycin) can cross-react.",
    ],
    reviewed: unreviewed,
  },
  {
    id: "bacitracin",
    testedAs: ["Bacitracin"],
    cas: [{ number: "1405-87-4", of: "bacitracin" }],
    foundIn: [{ where: "Medicine", items: ["Antibiotic and triple antibiotic ointments", "Some eye ointments and wound dressings"] }],
    related: [{ id: "neomycin", why: "Often in the same first-aid ointments." }],
    tips: ["Use plain petroleum jelly on cuts and after procedures instead."],
    reviewed: unreviewed,
  },
  {
    id: "benzocaine",
    testedAs: ["Caine mix", "Benzocaine"],
    cas: [{ number: "94-09-7", of: "benzocaine" }],
    foundIn: [
      { where: "Medicine", items: ["Anti-itch, sunburn and insect-bite sprays and creams", "Teething gels, sore-throat lozenges and sprays", "Hemorrhoid creams and some delay condoms"] },
    ],
    related: [
      { id: "tetracaine", why: "Another ester numbing medicine; they cross-react." },
      { id: "ppd", why: "A related \"para\" compound that can cross-react." },
    ],
    tips: ["Tell your dentist and doctors. Lidocaine is usually a safe numbing alternative, but confirm with them."],
    reviewed: unreviewed,
  },
  {
    id: "dibucaine",
    testedAs: ["Caine mix", "Dibucaine"],
    cas: [{ number: "85-79-0", of: "dibucaine" }],
    foundIn: [{ where: "Medicine", items: ["Hemorrhoid and sunburn ointments"] }],
    related: [],
    tips: ["Dibucaine is an amide numbing medicine, like lidocaine. Tell your dentist and doctors, and ask whether lidocaine is safe for you."],
    reviewed: unreviewed,
  },
  {
    id: "tetracaine",
    testedAs: ["Caine mix", "Tetracaine"],
    cas: [{ number: "94-24-6", of: "tetracaine" }],
    foundIn: [{ where: "Medicine", items: ["Numbing creams and gels before procedures, tattoos or laser", "Numbing eye drops"] }],
    related: [{ id: "benzocaine", why: "Another ester numbing medicine; they cross-react." }],
    tips: ["Tell your dentist and doctors about any numbing-medicine allergy."],
    reviewed: unreviewed,
  },
  {
    id: "ethylenediamine",
    testedAs: ["Ethylenediamine dihydrochloride"],
    cas: [{ number: "333-18-6", of: "ethylenediamine dihydrochloride" }],
    foundIn: [
      { where: "Medicine", items: ["Some prescription creams (as a stabilizer)", "Aminophylline, an asthma medicine", "Antihistamines hydroxyzine and cetirizine, which can cross-react"] },
      { where: "Work", items: ["Epoxy hardeners, rubber chemicals and some floor waxes"] },
    ],
    related: [],
    tips: ["Tell your doctors and pharmacist before starting a new antihistamine or asthma medicine."],
    reviewed: unreviewed,
  },
  {
    id: "clioquinol",
    testedAs: ["Quinoline mix", "Clioquinol"],
    cas: [{ number: "130-26-7", of: "clioquinol" }],
    foundIn: [{ where: "Medicine", items: ["Antifungal and antibacterial creams, often combined with a steroid, mostly sold outside the US"] }],
    related: [{ id: "chlorquinaldol", why: "Tested together in the quinoline mix." }],
    tips: ["Check creams bought abroad or online."],
    reviewed: unreviewed,
  },
  {
    id: "chlorquinaldol",
    testedAs: ["Quinoline mix", "Chlorquinaldol"],
    cas: [{ number: "72-80-0", of: "chlorquinaldol" }],
    foundIn: [{ where: "Medicine", items: ["Antiseptic creams combined with a steroid, mostly sold outside the US"] }],
    related: [{ id: "clioquinol", why: "Tested together in the quinoline mix." }],
    tips: ["Check creams bought abroad or online."],
    reviewed: unreviewed,
  },
  {
    id: "corticosteroid-class-a",
    testedAs: ["Tixocortol-21-pivalate"],
    cas: [
      { number: "55560-96-8", of: "tixocortol pivalate" },
      { number: "50-23-7", of: "hydrocortisone" },
    ],
    foundIn: [
      { where: "Medicine", items: ["Over-the-counter hydrocortisone creams", "Prednisolone eye drops", "Prednisone, prednisolone and methylprednisolone tablets and injections, which rarely cause a widespread rash in very sensitive people"] },
    ],
    related: [{ id: "corticosteroid-class-d2", why: "Hydrocortisone butyrate-type steroids often cross-react." }],
    tips: [
      "A rash that gets worse with a steroid cream can be a sign of this allergy.",
      "Your dermatologist can name the steroid classes that are safe for you; keep that list with you.",
    ],
    reviewed: unreviewed,
  },
  {
    id: "corticosteroid-class-b",
    testedAs: ["Budesonide"],
    cas: [{ number: "51333-22-3", of: "budesonide" }],
    foundIn: [
      { where: "Medicine", items: ["Budesonide inhalers and nasal sprays", "Triamcinolone, fluocinolone, fluocinonide and desonide creams", "Triamcinolone (Kenalog) injections"] },
    ],
    related: [{ id: "corticosteroid-class-d2", why: "Budesonide also cross-reacts with hydrocortisone butyrate-type steroids." }],
    tips: ["Your dermatologist can name the steroid classes that are safe for you; keep that list with you."],
    reviewed: unreviewed,
  },
  {
    id: "corticosteroid-class-d2",
    testedAs: ["Hydrocortisone-17-butyrate"],
    cas: [{ number: "13609-67-1", of: "hydrocortisone 17-butyrate" }],
    foundIn: [{ where: "Medicine", items: ["Hydrocortisone butyrate, valerate and probutate creams and lotions"] }],
    related: [
      { id: "corticosteroid-class-a", why: "Often cross-reacts with hydrocortisone-type steroids." },
      { id: "corticosteroid-class-b", why: "Often cross-reacts with budesonide." },
    ],
    tips: ["Your dermatologist can name the steroid classes that are safe for you; keep that list with you."],
    reviewed: unreviewed,
  },

  // --- Not on cosmetic labels: rubber, resins, dyes ---
  {
    id: "carba-mix",
    testedAs: ["Carba mix"],
    cas: [],
    foundIn: [
      { where: "Rubber goods", items: ["Rubber and some nitrile gloves", "Elastic in waistbands and underwear", "Shoes, makeup sponges, balloons and rubber toys"] },
    ],
    related: [{ id: "thiuram-mix", why: "Related rubber chemicals; people often react to both." }],
    tips: ["Ask for accelerator-free gloves at work and at medical visits."],
    reviewed: unreviewed,
  },
  {
    id: "thiuram-mix",
    testedAs: ["Thiuram mix"],
    cas: [],
    foundIn: [
      { where: "Rubber goods", items: ["Rubber gloves, the most common source", "Elastic, shoes, condoms and diaphragms"] },
      { where: "Other", items: ["Some fungicides and pesticides", "Disulfiram (Antabuse), a medicine"] },
    ],
    related: [{ id: "carba-mix", why: "Related rubber chemicals." }],
    tips: ["Ask for accelerator-free gloves at work and at medical visits."],
    reviewed: unreviewed,
  },
  {
    id: "mercapto-mix",
    testedAs: ["Mercapto mix"],
    cas: [],
    foundIn: [{ where: "Rubber goods", items: ["Rubber shoes and insoles", "Gloves, elastic, rubber handles and swim gear"] }],
    related: [{ id: "mbt", why: "MBT is in the mercapto mix; people usually react to both." }],
    tips: ["Choose shoes with leather or fabric insoles, or wear thick socks."],
    reviewed: unreviewed,
  },
  {
    id: "mbt",
    testedAs: ["Mercaptobenzothiazole (MBT)"],
    cas: [{ number: "149-30-4", of: "2-mercaptobenzothiazole" }],
    foundIn: [
      { where: "Rubber goods", items: ["Rubber shoes and insoles, gloves and elastic"] },
      { where: "Other", items: ["Some adhesives, antifreeze and cutting oils"] },
    ],
    related: [{ id: "mercapto-mix", why: "MBT is part of the mercapto mix." }],
    tips: ["Choose shoes with leather or fabric insoles, or wear thick socks."],
    reviewed: unreviewed,
  },
  {
    id: "black-rubber-mix",
    testedAs: ["Black rubber mix (IPPD)"],
    cas: [{ number: "101-72-4", of: "N-isopropyl-N'-phenyl-p-phenylenediamine (IPPD)" }],
    foundIn: [{ where: "Black rubber", items: ["Tires, hoses, handles and grips", "Boots, gym equipment, headphones and diving masks"] }],
    related: [{ id: "ppd", why: "A related \"para\" compound; some people react to both." }],
    tips: ["Wear cotton gloves under work gloves when handling black rubber."],
    reviewed: unreviewed,
  },
  {
    id: "epoxy-resin",
    testedAs: ["Epoxy resin"],
    cas: [{ number: "1675-54-3", of: "bisphenol A diglycidyl ether" }],
    foundIn: [
      { where: "Work and hobbies", items: ["Two-part glues and craft resins", "Floor coatings, paints and boat or car repair", "Electronics manufacturing"] },
    ],
    related: [],
    tips: ["Once the resin has fully hardened it rarely causes problems; the risk is while mixing and before it sets.", "Use nitrile gloves and change them often; epoxy can pass through thin gloves."],
    reviewed: unreviewed,
  },
  {
    id: "ptbp-formaldehyde-resin",
    testedAs: ["p-tert-Butylphenol formaldehyde resin"],
    cas: [{ number: "25085-50-1", of: "4-tert-butylphenol formaldehyde resin" }],
    foundIn: [{ where: "Adhesives", items: ["Leather and shoe glues", "Watch straps, belts and handbags", "Some nail, wig and prosthetic glues"] }],
    related: [],
    tips: ["Choose stitched rather than glued shoes, or add an insole."],
    reviewed: unreviewed,
  },
  {
    id: "disperse-blue-106",
    testedAs: ["Disperse blue 106"],
    cas: [{ number: "12223-01-7", of: "disperse blue 106" }],
    foundIn: [{ where: "Clothing", items: ["Dark polyester, acetate and nylon clothing in blue, black, brown and green", "Linings, leggings, swimwear and dark sheer tights"] }],
    related: [{ id: "disperse-dye-mix", why: "Disperse blue 106 is one of the two dyes in the disperse blue mix, so a positive to either usually means avoiding both." }],
    tips: ["Choose cotton, linen, silk or wool, and light colors next to the skin.", "Wash new dark synthetic clothes several times before wearing them."],
    reviewed: unreviewed,
  },
];

const ALL = [...ALLERGEN_EDUCATION, ...EXTENDED_EDUCATION, ...SEARCH_EDUCATION];
const BY_ID = new Map(ALL.map((e) => [e.id, e]));

/** Every record: T.R.U.E. Test, the extended trays, and search-only allergens. */
export function allEducation(): AllergenEducation[] {
  return ALL;
}

export function educationFor(id: string): AllergenEducation | undefined {
  return BY_ID.get(id);
}

/** True when the number passes the CAS registry check digit. */
export function validCas(cas: string): boolean {
  const m = /^(\d{2,7})-(\d{2})-(\d)$/.exec(cas);
  if (!m) return false;
  const digits = (m[1] + m[2]).split("").reverse();
  const sum = digits.reduce((s, d, i) => s + Number(d) * (i + 1), 0);
  return sum % 10 === Number(m[3]);
}

/** Every CAS number we hold, with the allergen it belongs to, for search. */
export function casIndex(): { number: string; id: string }[] {
  return ALL.flatMap((e) => e.cas.map((c) => ({ number: c.number, id: e.id })));
}
