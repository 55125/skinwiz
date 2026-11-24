// Patient-education records for the allergens on the extended trays the
// patch-test reader offers (ACDS core 2017 and 2020, NAC-80 and the
// core series) beyond the T.R.U.E. Test, which allergen-education.ts
// covers. Same shape and rules: drafts, unreviewed until a dermatologist
// reads them; CAS numbers checked against PubChem on 2026-11-24 (the two
// formaldehyde resins have no number PubChem confirms, so they list none).
import type { AllergenEducation, Cas, FoundInGroup } from "./allergen-education";

const rec = (
  id: string,
  testedAs: string[],
  cas: Cas[],
  foundIn: FoundInGroup[],
  related: { id: string; why: string }[] = [],
  tips: string[] = [],
): AllergenEducation => ({ id, testedAs, cas, foundIn, related, tips, reviewed: null });

const c = (number: string, of: string): Cas => ({ number, of });
const at = (where: string, ...items: string[]): FoundInGroup => ({ where, items });

const FRAGRANCE_FREE = "Choose products labeled fragrance-free, not unscented, and still read the ingredient list.";
const OXIDIZED =
  "It mostly causes allergy once it has reacted with air, so old, opened products are riskier. Buy small sizes, keep lids closed and don't use products past their date.";
const RUBBER_GLOVES = "Ask for accelerator-free gloves at work and at medical visits.";
const STEROID_LIST = "Your dermatologist can name the steroid classes that are safe for you; keep that list with you.";

export const EXTENDED_EDUCATION: AllergenEducation[] = [
  // --- Formaldehyde releasers and resins ---
  rec(
    "dmdm-hydantoin",
    ["DMDM hydantoin"],
    [c("6440-58-0", "DMDM hydantoin")],
    [at("Personal care", "Shampoos, conditioners and body washes", "Hair gels and styling products", "Some lotions and makeup")],
    [{ id: "formaldehyde", why: "It releases formaldehyde, so a formaldehyde allergy means avoiding it too." }],
    ["Check shampoo and conditioner first; rinse-off hair products are its most common use."],
  ),
  rec(
    "tosylamide-formaldehyde-resin",
    ["Tosylamide formaldehyde resin"],
    [],
    [at("Personal care", "Nail polish and nail hardeners")],
    [],
    [
      "A rash from nail polish often shows up on the eyelids, face and neck, not the fingers, because wet nails touch them.",
      "Look for polishes labeled free of this resin, often sold as \"5-free\" or more. Check the full list.",
    ],
  ),
  rec(
    "melamine-formaldehyde",
    ["Ethyleneurea melamine formaldehyde"],
    [],
    [
      at("Clothing and bedding", "Wrinkle-free, permanent-press and stain-resistant finishes"),
      at("Around the house", "Melamine dishes and laminate surfaces, rarely"),
    ],
    [{ id: "formaldehyde", why: "Fabric finishes release formaldehyde, and people often react to both." }],
    ["Wash new clothes and bedding before use, and choose untreated cotton or linen next to the skin."],
  ),

  // --- Isothiazolinones and other preservatives ---
  rec(
    "methylisothiazolinone",
    ["Methylisothiazolinone (MI)"],
    [c("2682-20-4", "methylisothiazolinone")],
    [
      at("Personal care", "Shampoos, conditioners, body washes and liquid hand soap", "Wet wipes, including baby wipes", "Some hair dyes, sunscreens and makeup removers"),
      at("Around the house", "Dish soap, laundry detergent, fabric softener and cleaning sprays", "Water-based wall paints, glues and slime kits"),
    ],
    [{ id: "mci-mi", why: "MCI/MI contains MI, so avoid both." }],
    [
      "Check household products as well as personal care: detergents and cleaners often use it.",
      "Fresh wall paint can give off enough to cause a rash; air out freshly painted rooms or choose paints without it.",
    ],
  ),
  rec(
    "benzisothiazolinone",
    ["Benzisothiazolinone (BIT)"],
    [c("2634-33-5", "benzisothiazolinone")],
    [
      at("Around the house", "Dish soap, laundry detergent and cleaning sprays", "Water-based paints, glues and slime kits"),
      at("Personal care", "Some liquid soaps and wipes, less often"),
    ],
    [],
    ["Read household product labels and safety data sheets; BIT is more common there than in cosmetics."],
  ),
  rec(
    "octylisothiazolinone",
    ["Octylisothiazolinone (OIT)"],
    [c("26530-20-1", "octylisothiazolinone")],
    [
      at("Leather", "Leather furniture, car seats, shoes and gloves"),
      at("Around the house and at work", "Paints, wood treatments and some cleaning products"),
    ],
    [{ id: "methylisothiazolinone", why: "Some people allergic to MI react to it too." }],
    ["A rash where skin rests on a leather sofa, car seat or watch strap can be OIT; cover the leather or choose fabric."],
  ),
  rec(
    "iodopropynyl-butylcarbamate",
    ["Iodopropynyl butylcarbamate (IPBC)"],
    [c("55406-53-6", "iodopropynyl butylcarbamate")],
    [
      at("Personal care", "Lotions, makeup, baby wipes and shampoos"),
      at("Around the house", "Wood stains, paints and some cleaners"),
    ],
  ),
  rec(
    "chloroxylenol",
    ["Chloroxylenol (PCMX)"],
    [c("88-04-0", "chloroxylenol")],
    [at("Personal care and first aid", "Antibacterial soaps and hand washes", "Antiseptic liquids and wound washes", "Some creams and ear drops")],
  ),
  rec(
    "chlorocresol",
    ["p-Chloro-m-cresol (chlorocresol)"],
    [c("59-50-7", "chlorocresol")],
    [at("Medicine", "Some prescription steroid creams and other medicated creams"), at("Work", "Cutting fluids, glues and some disinfectants")],
    [{ id: "chloroxylenol", why: "A closely related antiseptic; some people react to both." }],
    ["Ask your pharmacist to check the inactive ingredients of prescription creams."],
  ),
  rec(
    "chlorhexidine",
    ["Chlorhexidine digluconate"],
    [c("18472-51-0", "chlorhexidine digluconate")],
    [
      at("Medicine and first aid", "Surgical scrubs and skin cleansers before procedures", "Antiseptic wipes, wound washes and some catheters", "Prescription mouthwash"),
      at("Personal care", "Some deodorants, eye and contact lens products"),
    ],
    [],
    ["Tell every doctor, dentist and hospital. Chlorhexidine can also cause sudden allergic reactions, so it should be on your medical record."],
  ),
  rec(
    "benzalkonium-chloride",
    ["Benzalkonium chloride"],
    [c("8001-54-5", "benzalkonium chloride")],
    [
      at("Medicine", "Eye drops, nasal sprays and first-aid antiseptics"),
      at("Personal care", "Hair conditioners and alcohol-free hand sanitizers"),
      at("Around the house", "Disinfecting wipes and cleaning sprays"),
    ],
    [],
    ["Ask for preservative-free eye drops."],
  ),
  rec(
    "phenoxyethanol",
    ["Phenoxyethanol"],
    [c("122-99-6", "phenoxyethanol")],
    [at("Personal care", "Lotions, serums, sunscreens, makeup and baby wipes", "Many products sold as paraben-free")],
    [],
    ["True allergy is rare. Phenoxyethanol is in so many products that it's worth confirming with your dermatologist that it explains your rash."],
  ),
  rec(
    "ethylhexylglycerin",
    ["Ethylhexylglycerin"],
    [c("70445-33-9", "ethylhexylglycerin")],
    [at("Personal care", "Deodorants, lotions, sunscreens and makeup", "Products labeled preservative-free or paraben-free")],
    [],
    ["\"Preservative-free\" products often still contain it, so check the list."],
  ),
  rec(
    "sodium-benzoate",
    ["Sodium benzoate", "Benzoic acid"],
    [c("532-32-1", "sodium benzoate"), c("65-85-0", "benzoic acid")],
    [at("Personal care", "Lotions, cleansers and toothpaste"), at("Food and drink", "Soft drinks, pickles, sauces and other preserved foods")],
    [{ id: "balsam-of-peru", why: "Balsam of Peru contains benzoic acid; some people react to both." }],
  ),
  rec(
    "sorbic-acid",
    ["Sorbic acid"],
    [c("110-44-1", "sorbic acid")],
    [at("Personal care", "Creams, lotions and makeup, often as potassium sorbate"), at("Food", "Cheese, baked goods, wine and dried fruit")],
    [],
    ["Polysorbates are unrelated and are fine."],
  ),

  // --- Fragrance ---
  rec(
    "fragrance-mix-2",
    ["Fragrance mix II"],
    [],
    [
      at("Personal care", "Anything with fragrance, parfum or aroma on the label", "Perfume, deodorant, lotion, shampoo and makeup"),
      at("Around the house", "Laundry detergent, fabric softener, air fresheners and cleaners"),
    ],
    [{ id: "fragrance-mix-1", why: "Many people positive to one fragrance mix also react to the other." }],
    [FRAGRANCE_FREE],
  ),
  rec(
    "hicc",
    ["Hydroxyisohexyl 3-cyclohexene carboxaldehyde (HICC)", "Lyral"],
    [c("31906-04-4", "HICC")],
    [at("Personal care", "Deodorants, perfumes and fragranced lotions, especially older stock or products sold outside the EU")],
    [{ id: "fragrance-mix-2", why: "HICC is one of the chemicals in fragrance mix II." }],
    [FRAGRANCE_FREE],
  ),
  rec(
    "cinnamal",
    ["Cinnamal"],
    [c("104-55-2", "cinnamaldehyde")],
    [
      at("Personal care", "Fragranced products, toothpaste and mouthwash"),
      at("Food and drink", "Cinnamon, cinnamon gum and candy, cola and some flavored drinks, for some people"),
    ],
    [
      { id: "fragrance-mix-1", why: "Cinnamal is one of the chemicals in fragrance mix I." },
      { id: "balsam-of-peru", why: "Balsam of Peru contains related cinnamon chemicals." },
    ],
    ["Rash or sore lips from cinnamon gum or toothpaste is a common sign; try unflavored or mint versions."],
  ),
  rec(
    "linalool",
    ["Hydroperoxides of linalool"],
    [c("78-70-6", "linalool")],
    [
      at("Personal care", "Most fragranced products: perfume, lotion, shampoo, deodorant", "Lavender and many other essential oils"),
      at("Around the house", "Cleaners, laundry products and air fresheners"),
    ],
    [{ id: "limonene", why: "Also allergenic once oxidized; people often react to both." }],
    [OXIDIZED, FRAGRANCE_FREE],
  ),
  rec(
    "limonene",
    ["Hydroperoxides of limonene"],
    [c("5989-27-5", "d-limonene")],
    [
      at("Personal care", "Fragranced products, especially citrus scents", "Citrus essential oils"),
      at("Around the house", "Citrus cleaners, degreasers and dish soap"),
    ],
    [{ id: "linalool", why: "Also allergenic once oxidized; people often react to both." }],
    [OXIDIZED, "Wear gloves when peeling citrus or using citrus cleaners."],
  ),
  rec(
    "benzyl-alcohol",
    ["Benzyl alcohol"],
    [c("100-51-6", "benzyl alcohol")],
    [at("Personal care", "Fragranced products and some unscented ones, where it's a preservative or solvent"), at("Medicine", "Some injectable medicines and creams")],
    [{ id: "balsam-of-peru", why: "Part of balsam of Peru; people often react to both." }],
  ),
  rec(
    "benzyl-salicylate",
    ["Benzyl salicylate"],
    [c("118-58-1", "benzyl salicylate")],
    [at("Personal care", "Perfumes, fragranced lotions and sunscreens, where it can also absorb UV")],
    [],
    [FRAGRANCE_FREE],
  ),
  rec(
    "ylang-ylang",
    ["Ylang-ylang oil"],
    [c("8006-81-3", "ylang-ylang oil")],
    [at("Personal care", "Perfumes, natural and aromatherapy products, hair oils")],
    [],
    ["Essential oils can sit inside \"fragrance\" without being named. Choose fragrance-free and avoid aromatherapy oils."],
  ),
  rec(
    "jasmine",
    ["Jasmine absolute"],
    [c("8022-96-6", "jasmine absolute")],
    [at("Personal care", "Perfumes and floral-scented products"), at("Food and drink", "Jasmine tea, for some people")],
    [],
    ["Essential oils can sit inside \"fragrance\" without being named. Choose fragrance-free."],
  ),
  rec(
    "lavender-oil",
    ["Lavender absolute"],
    [c("8000-28-0", "lavender oil")],
    [at("Personal care", "Lavender soaps, lotions, bath products and aromatherapy oils", "Many \"natural\" and sleep products"), at("Around the house", "Diffusers, sachets and scented laundry products")],
    [{ id: "linalool", why: "Lavender is rich in linalool, which becomes allergenic once oxidized." }],
    ["Avoid diffusing it at home; airborne oil can cause a rash on the face and eyelids."],
  ),
  rec(
    "peppermint-oil",
    ["Peppermint oil"],
    [c("8006-90-4", "peppermint oil")],
    [at("Personal care", "Toothpaste, mouthwash and lip balm", "Cooling foot creams, shampoos and muscle rubs"), at("Food", "Mint gum, candy and tea, for some people")],
    [],
    ["Rash or sore lips from toothpaste or lip balm is a common sign; try unflavored versions."],
  ),
  rec(
    "tea-tree-oil",
    ["Tea tree oil, oxidized"],
    [c("68647-73-4", "tea tree oil")],
    [at("Personal care", "Acne washes, spot treatments and shampoos", "Natural and antifungal products, and pure tea tree oil")],
    [],
    [OXIDIZED],
  ),
  rec(
    "propolis",
    ["Propolis"],
    [c("9009-62-5", "propolis")],
    [
      at("Personal care", "Natural lip balms, creams and toothpaste"),
      at("Food and supplements", "Propolis supplements, throat sprays and some honey products"),
    ],
    [{ id: "balsam-of-peru", why: "Shares several chemicals with balsam of Peru and colophony." }],
    ["Check \"natural\" and beekeeping products; beeswax itself can also carry traces."],
  ),

  // --- Surfactants and emulsifiers ---
  rec(
    "cocamidopropyl-betaine",
    ["Cocamidopropyl betaine", "Dimethylaminopropylamine (DMAPA)", "Amidoamine"],
    [c("61789-40-0", "cocamidopropyl betaine"), c("109-55-7", "dimethylaminopropylamine")],
    [at("Personal care", "Shampoos, body washes, facial cleansers and liquid soaps"), at("Around the house", "Dish soap and some cleaners")],
    [{ id: "oleamidopropyl-dimethylamine", why: "Made the same way, with the same residues." }],
    ["A rash on the eyelids, face or neck after washing your hair can be from shampoo."],
  ),
  rec(
    "oleamidopropyl-dimethylamine",
    ["Oleamidopropyl dimethylamine"],
    [c("109-28-4", "oleamidopropyl dimethylamine")],
    [at("Personal care", "Hair conditioners, body lotions and some baby products")],
    [{ id: "cocamidopropyl-betaine", why: "Made the same way, with the same residues." }],
  ),
  rec(
    "cocamide-dea",
    ["Cocamide DEA"],
    [c("68603-42-9", "cocamide DEA")],
    [at("Personal care", "Shampoos and liquid hand soap"), at("Around the house and at work", "Dish soap, industrial hand cleaners and cutting fluids")],
  ),
  rec(
    "decyl-glucoside",
    ["Decyl glucoside"],
    [c("68515-73-1", "decyl glucoside")],
    [at("Personal care", "Gentle cleansers, baby washes and shampoos", "Sunscreens, where it's often hidden in UV-filter blends")],
    [{ id: "lauryl-glucoside", why: "Glucosides cross-react, so avoid the whole group." }],
    ["Sulfate-free and \"natural\" cleansers often use glucosides."],
  ),
  rec(
    "lauryl-glucoside",
    ["Lauryl polyglucose"],
    [c("110615-47-9", "lauryl glucoside")],
    [at("Personal care", "Gentle cleansers, baby washes and shampoos", "Sunscreens")],
    [{ id: "decyl-glucoside", why: "Glucosides cross-react, so avoid the whole group." }],
    ["Sulfate-free and \"natural\" cleansers often use glucosides."],
  ),
  rec(
    "sorbitan-sesquioleate",
    ["Sorbitan sesquioleate", "Sorbitan oleate"],
    [c("8007-43-0", "sorbitan sesquioleate"), c("1338-43-8", "sorbitan oleate")],
    [at("Personal care", "Creams, lotions and makeup"), at("Medicine", "Some medicated creams and ointments")],
  ),
  rec(
    "cetearyl-alcohol",
    ["Cetearyl alcohol"],
    [c("67762-27-0", "cetearyl alcohol")],
    [at("Personal care", "Creams, lotions, conditioners and sunscreens"), at("Medicine", "Many prescription creams, including steroid creams")],
    [],
    ["It's a thick, waxy alcohol, not a drying one. Ointments usually don't contain it, so ask whether an ointment version of your medicine is available."],
  ),
  rec(
    "propylene-glycol",
    ["Propylene glycol"],
    [c("57-55-6", "propylene glycol")],
    [
      at("Personal care", "Lotions, deodorants, hair products and cleansers"),
      at("Medicine", "Many prescription creams, gels and liquid medicines"),
      at("Food", "Some packaged foods and flavorings"),
    ],
    [],
    ["Ask your pharmacist to check the inactive ingredients of creams; some generic and brand versions differ."],
  ),

  // --- Medicines ---
  rec(
    "lidocaine",
    ["Lidocaine"],
    [c("137-58-6", "lidocaine")],
    [at("Medicine", "Numbing creams, patches and sprays", "Dental and minor-surgery injections", "Hemorrhoid and sunburn products")],
    [],
    ["Tell your dentist and doctors. Other amide numbing medicines may cross-react, so ask which ones are safe for you."],
  ),
  rec(
    "pramoxine",
    ["Pramoxine hydrochloride"],
    [c("637-58-1", "pramoxine hydrochloride")],
    [at("Medicine", "Anti-itch lotions and creams", "Hemorrhoid creams and wipes")],
  ),
  rec(
    "polymyxin-b",
    ["Polymyxin B sulfate"],
    [c("1405-20-5", "polymyxin B sulfate")],
    [at("Medicine", "Triple antibiotic ointment", "Antibiotic eye and ear drops")],
    [
      { id: "neomycin", why: "Often in the same first-aid ointments." },
      { id: "bacitracin", why: "Often in the same first-aid ointments." },
    ],
    ["Use plain petroleum jelly on cuts and wounds instead of antibiotic ointment."],
  ),
  rec(
    "corticosteroid-class-d1",
    ["Clobetasol-17-propionate"],
    [c("25122-46-7", "clobetasol propionate")],
    [at("Medicine", "Clobetasol, betamethasone valerate or dipropionate, and mometasone creams and ointments", "Some steroid nasal sprays and inhalers")],
    [],
    [STEROID_LIST],
  ),

  // --- Sunscreens and antioxidants ---
  rec(
    "oxybenzone",
    ["Benzophenone-3 (oxybenzone)"],
    [c("131-57-7", "oxybenzone")],
    [at("Personal care", "Chemical sunscreens, including in moisturizers and makeup with SPF", "Some nail polish and hair sprays, to protect color")],
    [{ id: "benzophenone-4", why: "A related sunscreen filter." }],
    ["The rash can appear only on sun-exposed skin. Mineral sunscreens with zinc oxide or titanium dioxide are a common alternative."],
  ),
  rec(
    "benzophenone-4",
    ["Benzophenone-4"],
    [c("4065-45-6", "sulisobenzone")],
    [at("Personal care", "Sunscreens, shampoos and hair products that protect color", "Some clear soaps and skin products")],
    [{ id: "oxybenzone", why: "A related sunscreen filter." }],
  ),
  rec(
    "octinoxate",
    ["Ethylhexyl methoxycinnamate (octinoxate)"],
    [c("5466-77-3", "octinoxate")],
    [at("Personal care", "Chemical sunscreens, and moisturizers, foundations and lip balms with SPF")],
    [],
    ["Mineral sunscreens with zinc oxide or titanium dioxide are a common alternative."],
  ),
  rec(
    "tocopherol",
    ["Tocopherol", "DL-alpha-tocopherol"],
    [c("10191-41-0", "DL-alpha-tocopherol")],
    [at("Personal care", "Sunscreens, moisturizers, lip balms and deodorants", "Vitamin E oil and scar products")],
    [],
    ["Tocopheryl acetate and other vitamin E forms are flagged too. Vitamin E in food and supplements is fine for most people."],
  ),
  rec(
    "bht",
    ["Butylated hydroxytoluene (BHT)"],
    [c("128-37-0", "butylated hydroxytoluene")],
    [at("Personal care", "Lipsticks, creams, sunscreens and makeup"), at("Food", "Some cereals, snacks and oils")],
  ),
  rec(
    "gallates",
    ["Propyl gallate"],
    [c("121-79-9", "propyl gallate")],
    [at("Personal care", "Lipsticks, lip balms and oil-based creams"), at("Food", "Oils, margarine, snacks and chewing gum (E310 to E312)")],
    [],
    ["Sore or peeling lips from lipstick is a common sign."],
  ),
  rec(
    "sulfites",
    ["Sodium metabisulfite"],
    [c("7681-57-4", "sodium metabisulfite")],
    [
      at("Personal care", "Hair dyes and some creams"),
      at("Medicine", "Some injectable medicines, local anesthetics and creams"),
      at("Food and drink", "Wine, dried fruit and some processed foods"),
    ],
    [],
    ["Ask your dermatologist whether this result explains your rash; its relevance is often unclear."],
  ),

  // --- Hair ---
  rec(
    "ptd",
    ["Toluene-2,5-diamine sulfate (PTD)"],
    [c("615-50-9", "toluene-2,5-diamine sulfate")],
    [at("Hair", "Permanent hair dyes, often sold as PPD-free", "Eyebrow and eyelash tints")],
    [{ id: "ppd", why: "PTD and PPD often cross-react." }],
    ["Tell your hair stylist. \"PPD-free\" dyes usually use PTD instead, so they aren't a safe swap."],
  ),
  rec(
    "persulfates",
    ["Ammonium persulfate"],
    [c("7727-54-0", "ammonium persulfate")],
    [at("Hair", "Hair bleach and lighteners, and the boosters used with them"), at("Work", "Hair salons")],
    [],
    ["It can also cause hives and asthma. Stylists should wear gloves and mix bleach in a ventilated area."],
  ),

  // --- Nails and resins ---
  rec(
    "acrylate-monomers",
    ["2-Hydroxyethyl methacrylate (HEMA)", "Methyl methacrylate", "Ethyl cyanoacrylate"],
    [c("868-77-9", "2-hydroxyethyl methacrylate"), c("80-62-6", "methyl methacrylate"), c("7085-85-0", "ethyl cyanoacrylate")],
    [
      at("Nails and lashes", "Gel, dip and acrylic nails, and nail glue", "Lash and wig glue"),
      at("Medical and dental", "Dental fillings and dentures", "Bone cement, some medical adhesives, glucose sensors and insulin pumps"),
    ],
    [],
    [
      "Stop gel and acrylic nails. Once you're allergic it lasts, and it can affect dental and surgical treatment later.",
      "Tell your dentist, surgeon and diabetes team before treatment.",
    ],
  ),
  rec(
    "shellac",
    ["Shellac"],
    [c("9000-59-3", "shellac")],
    [at("Personal care", "Mascara, eyeliner, hairspray and nail polish"), at("Food and medicine", "Glazed candy, fruit coatings and coated tablets")],
  ),
  rec(
    "carmine",
    ["Carmine"],
    [c("1390-65-4", "carmine")],
    [at("Personal care", "Red and pink lipstick, blush and eye shadow"), at("Food and drink", "Red foods and drinks (listed as carmine, cochineal or E120)")],
    [],
    ["It can also cause sudden allergic reactions when eaten; tell your doctor if you've had swelling or hives after red foods."],
  ),

  // --- Not on cosmetic labels: rubber and textile dyes ---
  rec(
    "dialkyl-thioureas",
    ["Mixed dialkyl thioureas"],
    [c("105-55-5", "diethylthiourea"), c("109-46-6", "dibutylthiourea")],
    [at("Neoprene", "Wetsuits, swim and dive gear", "Knee, wrist and back braces", "Mouse pads, laptop sleeves and shoe insoles")],
    [],
    ["Look for neoprene-free braces and gear, or wear a fabric layer between neoprene and skin."],
  ),
  rec(
    "diphenylguanidine",
    ["1,3-Diphenylguanidine"],
    [c("102-06-7", "1,3-diphenylguanidine")],
    [at("Rubber goods", "Many nitrile, neoprene and rubber gloves", "Some shoes and elastic")],
    [{ id: "carba-mix", why: "Another rubber accelerator; people often react to both." }],
    [RUBBER_GLOVES],
  ),
  rec(
    "disperse-dye-mix",
    ["Disperse blue 106/124 mix"],
    [c("12223-01-7", "disperse blue 106"), c("61951-51-7", "disperse blue 124")],
    [at("Clothing", "Dark polyester, acetate and nylon clothing in blue, black, brown and green", "Linings, leggings, swimwear and sheer tights")],
    [{ id: "disperse-blue-106", why: "One of the two dyes in the mix." }],
    ["Choose cotton, linen, silk or wool, and light colors next to the skin.", "Wash new dark synthetic clothes several times before wearing them."],
  ),
  rec(
    "disperse-orange-3",
    ["Disperse orange 3"],
    [c("730-40-5", "disperse orange 3")],
    [at("Clothing", "Synthetic clothing in oranges, browns and reds")],
    [{ id: "ppd", why: "Often cross-reacts with PPD, so check hair dyes too." }],
    ["Choose natural fibers and light colors next to the skin."],
  ),
  rec(
    "disperse-yellow-3",
    ["Disperse yellow 3"],
    [c("2832-40-8", "disperse yellow 3")],
    [at("Clothing", "Synthetic clothing in yellows, oranges, browns and greens")],
    [],
    ["Choose natural fibers and light colors next to the skin."],
  ),
];
