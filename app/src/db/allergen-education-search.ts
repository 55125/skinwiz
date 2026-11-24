// Patient-education records for the allergens a clinician can pick only
// through the reader's "Search all allergens" (on no tray we list): the
// individual fragrance chemicals and essential oils, the rarer
// formaldehyde releasers, UV filters, and a few medicines and hair
// chemicals. Same shape and rules as allergen-education.ts: drafts,
// unreviewed until a dermatologist reads them; CAS numbers checked
// against PubChem on 2026-11-24.
//
// Families (formaldehyde releasers, glucosides, steroid classes...) have
// no record of their own: a family's handout section is built from its
// members' records.
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
const OIL_HIDDEN = "Essential oils can sit inside \"fragrance\" without being named, so choose fragrance-free and avoid aromatherapy and \"natural\" scented products.";
const OXIDIZED =
  "It mostly causes allergy once it has reacted with air, so old, opened products are riskier. Buy small sizes, keep lids closed and don't use products past their date.";
const FRAGRANCED = at("Personal care", "Perfume, deodorant, lotion, shampoo and makeup with fragrance", "Anything listing fragrance or parfum, which can hide it");
const HOUSEHOLD = at("Around the house", "Laundry products, air fresheners, candles and cleaners");
const FM1 = { id: "fragrance-mix-1", why: "It is one of the chemicals in fragrance mix I." };
const FM2 = { id: "fragrance-mix-2", why: "It is one of the chemicals in fragrance mix II." };
const BOP = { id: "balsam-of-peru", why: "Shares chemicals with balsam of Peru; people often react to both." };
const RELEASER = { id: "formaldehyde", why: "It releases formaldehyde, so a formaldehyde allergy means avoiding it too." };
const RELEASER_PRODUCTS = at("Around the house and at work", "Metalworking fluids, cleaners, paints and other industrial products");
const MINERAL = "Mineral sunscreens with zinc oxide or titanium dioxide are a common alternative.";
const STEROID_LIST = "Your dermatologist can name the steroid classes that are safe for you; keep that list with you.";

export const SEARCH_EDUCATION: AllergenEducation[] = [
  // --- Fragrance ---
  rec(
    "fragrance",
    ["Fragrance mix I", "Fragrance mix II", "Balsam of Peru (screening markers)"],
    [],
    [FRAGRANCED, HOUSEHOLD, at("Other", "Flavored toothpaste, lip balm and gum", "Some \"unscented\" products, which can use a masking fragrance")],
    [FM1, FM2, BOP],
    [FRAGRANCE_FREE, "Essential oils and plant extracts can contain the same chemicals.", "Ask others at home to use fragrance-free products too; you can react to what touches you from their skin, hair or pillow."],
  ),
  rec("amyl-cinnamal", ["Amyl cinnamal"], [c("122-40-7", "amyl cinnamal")], [FRAGRANCED, HOUSEHOLD], [FM1], [FRAGRANCE_FREE]),
  rec(
    "cinnamyl-alcohol",
    ["Cinnamyl alcohol"],
    [c("104-54-1", "cinnamyl alcohol")],
    [FRAGRANCED, at("Food", "Cinnamon and some flavorings, for some people")],
    [FM1, { id: "cinnamal", why: "The skin turns it into cinnamal, so people often react to both." }],
    [FRAGRANCE_FREE],
  ),
  rec(
    "eugenol",
    ["Eugenol"],
    [c("97-53-0", "eugenol")],
    [FRAGRANCED, at("Dental and food", "Dental cements and temporary fillings (clove oil)", "Cloves, cinnamon, allspice and basil, for some people")],
    [FM1, { id: "clove", why: "Clove oil is mostly eugenol." }],
    ["Tell your dentist: clove-based dental cements contain eugenol.", FRAGRANCE_FREE],
  ),
  rec(
    "isoeugenol",
    ["Isoeugenol"],
    [c("97-54-1", "isoeugenol")],
    [FRAGRANCED, at("Food", "Smoked foods and some flavorings, for some people")],
    [FM1, { id: "eugenol", why: "A close relative; some people react to both." }],
    [FRAGRANCE_FREE],
  ),
  rec(
    "geraniol",
    ["Geraniol"],
    [c("106-24-1", "geraniol")],
    [FRAGRANCED, at("Essential oils", "Rose, geranium, citronella, lemongrass and palmarosa oils"), at("Other", "Citronella insect repellents")],
    [FM1, { id: "citral", why: "Found in many of the same oils." }],
    [FRAGRANCE_FREE, "Check natural insect repellents; citronella oil is rich in geraniol."],
  ),
  rec("hydroxycitronellal", ["Hydroxycitronellal"], [c("107-75-5", "hydroxycitronellal")], [FRAGRANCED, HOUSEHOLD], [FM1], [FRAGRANCE_FREE]),
  rec(
    "oakmoss",
    ["Evernia prunastri (oakmoss absolute)"],
    [c("9000-50-4", "oakmoss")],
    [at("Personal care", "Perfumes and aftershaves, especially woody, mossy and chypre scents")],
    [FM1, { id: "lichen", why: "Treemoss and other lichen extracts share its allergens; people often react to both." }],
    ["Men's fragrances and aftershaves are a common source.", FRAGRANCE_FREE],
  ),
  rec(
    "citral",
    ["Citral"],
    [c("5392-40-5", "citral")],
    [FRAGRANCED, at("Essential oils and food", "Lemongrass, lemon and verbena oils", "Lemon-flavored foods and drinks, for some people")],
    [FM2, { id: "lemongrass", why: "Lemongrass oil is mostly citral." }],
    [FRAGRANCE_FREE],
  ),
  rec(
    "citronellol",
    ["Citronellol"],
    [c("106-22-9", "citronellol")],
    [FRAGRANCED, at("Essential oils", "Rose, geranium and citronella oils")],
    [FM2],
    [FRAGRANCE_FREE],
  ),
  rec(
    "coumarin",
    ["Coumarin"],
    [c("91-64-5", "coumarin")],
    [FRAGRANCED, at("Food", "Cassia cinnamon, tonka bean and sweet woodruff, for some people")],
    [FM2],
    [FRAGRANCE_FREE],
  ),
  rec("farnesol", ["Farnesol"], [c("4602-84-0", "farnesol")], [FRAGRANCED, at("Personal care", "Deodorants, where it also fights odor")], [FM2], [FRAGRANCE_FREE, "Check deodorants: farnesol is used there even in some lightly scented ones."]),
  rec("hexyl-cinnamal", ["Hexyl cinnamal"], [c("101-86-0", "hexyl cinnamal")], [FRAGRANCED, HOUSEHOLD], [FM2], [FRAGRANCE_FREE]),
  rec(
    "tolu-balsam",
    ["Myroxylon balsamum (tolu balsam)"],
    [c("9000-64-0", "balsam tolu")],
    [at("Personal care and medicine", "Fragrances and some lip products", "Cough syrups and lozenges, and benzoin tincture")],
    [BOP],
    ["Ask your pharmacist to check cough syrups and lozenges."],
  ),
  rec(
    "benzoin",
    ["Benzoin", "Styrax"],
    [c("9000-05-9", "benzoin resin")],
    [at("Medicine", "Benzoin tincture used under bandages and wound strips to help them stick", "Some inhalants and cough remedies"), at("Personal care", "Incense and fragrances, as a fixative")],
    [BOP],
    ["Ask that benzoin tincture not be used under your dressings, tape or stitches strips."],
  ),
  rec(
    "cinnamon",
    ["Cinnamon bark oil"],
    [c("8015-91-6", "cinnamon bark oil")],
    [at("Personal care", "Lip plumpers, flavored lip balm and toothpaste", "Fragrances"), at("Food", "Cinnamon gum, candy and baked goods, for some people")],
    [{ id: "cinnamal", why: "Cinnamon is a main natural source of cinnamal." }, BOP],
    ["Sore or swollen lips from lip plumpers or cinnamon gum is a common sign."],
  ),
  rec(
    "clove",
    ["Clove oil"],
    [c("8000-34-8", "clove oil")],
    [at("Personal care", "Fragrances and some toothpastes"), at("Dental and food", "Dental cements and toothache remedies", "Cloves and spiced foods, for some people")],
    [{ id: "eugenol", why: "Clove oil is mostly eugenol." }, BOP],
    ["Tell your dentist: clove-based dental cements and toothache gels contain it."],
  ),
  rec(
    "benzyl-benzoate",
    ["Benzyl benzoate"],
    [c("120-51-4", "benzyl benzoate")],
    [FRAGRANCED, at("Medicine", "Some scabies and lice lotions, and some injectable medicines")],
    [BOP],
  ),
  rec(
    "benzaldehyde",
    ["Benzaldehyde"],
    [c("100-52-7", "benzaldehyde")],
    [FRAGRANCED, at("Food", "Almond and cherry flavorings")],
    [],
    ["It can appear in unscented products, where it's used for other purposes, so check the list."],
  ),
  rec(
    "bisabolol",
    ["Bisabolol"],
    [c("515-69-5", "bisabolol")],
    [at("Personal care", "Soothing creams, baby products, sunscreens and after-sun products, including unscented ones")],
    [{ id: "compositae", why: "It comes from chamomile, a daisy-family plant." }],
    ["Products sold as calming or for sensitive skin often contain it."],
  ),
  rec(
    "carvone",
    ["Carvone"],
    [c("99-49-0", "carvone")],
    [at("Personal care", "Spearmint toothpaste, mouthwash and gum"), at("Food", "Spearmint, caraway and dill, for some people")],
    [],
    ["Sore lips or mouth from mint toothpaste is a common sign; try an unflavored one."],
  ),
  rec("narcissus", ["Narcissus absolute"], [c("68917-12-4", "narcissus absolute")], [at("Personal care", "Perfumes and floral fragrances"), at("Garden", "Handling daffodil and narcissus bulbs and stems")], [], [OIL_HIDDEN, "Wear gloves when handling daffodils and bulbs."]),
  rec("sandalwood", ["Sandalwood oil"], [c("8006-87-9", "sandalwood oil")], [at("Personal care", "Perfumes, aftershaves and aromatherapy oils", "Incense and some soaps")], [], [OIL_HIDDEN]),
  rec(
    "lemongrass",
    ["Lemongrass oil"],
    [c("8007-02-1", "lemongrass oil")],
    [at("Personal care", "Natural soaps, lotions and aromatherapy oils"), at("Other", "Natural insect repellents, and lemongrass in food and tea, for some people")],
    [{ id: "citral", why: "Lemongrass oil is mostly citral." }],
    [OIL_HIDDEN],
  ),
  rec("rose-oil", ["Rose oil"], [c("8007-01-0", "rose oil")], [at("Personal care", "Rose-scented perfumes, lotions and face waters", "Natural and aromatherapy products")], [{ id: "geraniol", why: "Rose oil is rich in geraniol and citronellol." }], [OXIDIZED, OIL_HIDDEN]),
  rec("geranium-oil", ["Geranium oil"], [c("8000-46-2", "geranium oil")], [at("Personal care", "Natural soaps, lotions and aromatherapy oils", "Natural insect repellents")], [{ id: "geraniol", why: "Geranium oil is rich in geraniol and citronellol." }], [OXIDIZED, OIL_HIDDEN]),
  rec(
    "bergamot",
    ["Bergamot oil"],
    [c("8007-75-8", "bergamot oil")],
    [at("Personal care", "Perfumes, colognes and citrus-scented products"), at("Food and drink", "Earl Grey tea")],
    [],
    ["It also makes skin burn and darken in the sun, in streaks where it was applied. Don't wear it before going outside."],
  ),

  // --- Botanicals ---
  rec(
    "turpentine",
    ["Turpentine (oil of turpentine)"],
    [c("8006-64-2", "turpentine")],
    [at("Work and hobbies", "Paint thinners, oil paints and varnishes", "Furniture and shoe polish"), at("Medicine", "Some muscle rubs and chest rubs")],
    [{ id: "colophonium", why: "Both come from pine resin." }],
    ["Use odorless mineral spirits or water-based paints, and wear gloves."],
  ),
  rec(
    "lichen",
    ["Lichen acid mix", "Treemoss (Evernia furfuracea)"],
    [c("125-46-2", "usnic acid"), c("526-37-4", "atranol"), c("57074-21-2", "chloroatranol")],
    [at("Personal care", "Perfumes and aftershaves with mossy notes", "Natural deodorants with usnic acid"), at("Outdoors", "Lichens on trees, rocks and firewood")],
    [{ id: "oakmoss", why: "Oakmoss is a lichen and shares its allergens." }],
    ["Wear gloves when handling firewood, and wash after forest work or hiking."],
  ),
  rec(
    "henna",
    ["Henna (Lawsonia inermis)"],
    [c("83-72-7", "lawsone")],
    [at("Hair and skin", "Henna hair dyes", "Henna body art")],
    [{ id: "ppd", why: "\"Black henna\" contains PPD, a much stronger allergen." }],
    ["True henna is reddish brown. Anything sold as black henna contains other dyes; avoid it."],
  ),

  // --- Rarer formaldehyde releasers ---
  rec("bronidox", ["5-Bromo-5-nitro-1,3-dioxane (Bronidox)"], [c("30007-47-7", "bronidox")], [at("Personal care", "Shampoos, body washes and rinse-off products"), RELEASER_PRODUCTS], [RELEASER, { id: "bronopol", why: "A closely related preservative." }]),
  rec(
    "sodium-hydroxymethylglycinate",
    ["Sodium hydroxymethylglycinate"],
    [c("70161-44-3", "sodium hydroxymethylglycinate")],
    [at("Personal care", "Shampoos, body washes, baby wipes and some \"natural\" products")],
    [RELEASER],
    ["It's often in products marketed as natural or gentle, so check the list."],
  ),
  rec("benzylhemiformal", ["Benzylhemiformal"], [c("14548-60-8", "benzylhemiformal")], [RELEASER_PRODUCTS, at("Personal care", "Some liquid soaps, rarely")], [RELEASER]),
  rec("methenamine", ["Methenamine (hexamethylenetetramine)"], [c("100-97-0", "methenamine")], [at("Medicine", "Some antiperspirant treatments for sweaty hands and feet", "A urinary antiseptic tablet"), at("Work", "Rubber, resin and plastics manufacturing")], [RELEASER]),
  rec("mdm-hydantoin", ["MDM hydantoin"], [c("116-25-6", "MDM hydantoin")], [at("Personal care", "Shampoos and conditioners, usually alongside DMDM hydantoin")], [RELEASER, { id: "dmdm-hydantoin", why: "Used together; avoid both." }]),
  rec("dimethyl-oxazolidine", ["4,4-Dimethyloxazolidine"], [c("51200-87-4", "4,4-dimethyloxazolidine")], [RELEASER_PRODUCTS, at("Personal care", "Some shampoos, rarely")], [RELEASER]),
  rec("ethylbicyclooxazolidine", ["7-Ethylbicyclooxazolidine"], [c("7747-35-5", "7-ethylbicyclooxazolidine")], [RELEASER_PRODUCTS, at("Personal care", "Some hair and skin products, rarely")], [RELEASER]),
  rec("polyoxymethylene-urea", ["Polyoxymethylene urea"], [], [at("Personal care", "Some creams and products, rarely")], [RELEASER]),
  rec("tris-nitro", ["Tris(hydroxymethyl)nitromethane"], [c("126-11-4", "tris(hydroxymethyl)nitromethane")], [at("Work", "Metalworking and cutting fluids")], [RELEASER]),
  rec(
    "hydroxyethyl-triazine",
    ["Hexahydro-1,3,5-tris(2-hydroxyethyl)triazine (Grotan BK)"],
    [c("4719-04-4", "hexahydro-1,3,5-tris(2-hydroxyethyl)triazine")],
    [at("Work", "Metalworking and cutting fluids", "Some industrial cleaners and fuels")],
    [RELEASER],
    ["Wear gloves and sleeves with metalworking fluids, and wash skin promptly."],
  ),

  // --- Surfactants ---
  rec(
    "coco-glucoside",
    ["Coco glucoside"],
    [c("141464-42-8", "coco glucoside")],
    [at("Personal care", "Gentle cleansers, baby washes and shampoos", "Sulfate-free and \"natural\" products")],
    [{ id: "decyl-glucoside", why: "Glucosides cross-react, so avoid the whole group." }],
  ),
  rec(
    "other-alkyl-glucosides",
    ["Alkyl glucosides"],
    [],
    [at("Personal care", "Cleansers, creams and sunscreens (caprylyl, cetearyl, arachidyl and myristyl glucoside)")],
    [{ id: "decyl-glucoside", why: "Glucosides cross-react, so avoid the whole group." }],
  ),
  rec(
    "laureth-sulfates",
    ["Sodium laureth sulfate"],
    [c("9004-82-4", "sodium laureth sulfate")],
    [at("Personal care", "Shampoos, body washes and liquid hand soap"), at("Around the house", "Dish soap and cleaners")],
    [],
    ["It's more often irritating than allergenic. Ask your dermatologist which it is for you."],
  ),

  // --- UV filters ---
  rec(
    "octocrylene",
    ["Octocrylene"],
    [c("6197-30-4", "octocrylene")],
    [at("Personal care", "Chemical sunscreens, and moisturizers and makeup with SPF")],
    [{ id: "oxybenzone", why: "Some people react to both." }],
    ["If you've reacted to ketoprofen gel, tell your dermatologist; it often goes with octocrylene allergy.", MINERAL],
  ),
  rec("salicylate-filters", ["Ethylhexyl salicylate (octisalate)", "Homosalate"], [c("118-60-5", "octisalate"), c("118-56-9", "homosalate")], [at("Personal care", "Chemical sunscreens and products with SPF")], [], [MINERAL]),
  rec("avobenzone", ["Butyl methoxydibenzoylmethane (avobenzone)"], [c("70356-09-1", "avobenzone")], [at("Personal care", "Most chemical sunscreens labeled broad spectrum")], [], [MINERAL]),
  rec(
    "paba",
    ["PABA (p-aminobenzoic acid)"],
    [c("150-13-0", "4-aminobenzoic acid")],
    [at("Personal care", "Older sunscreens and some lip balms (as padimate O)"), at("Supplements", "Some B-vitamin supplements")],
    [{ id: "benzocaine", why: "A related \"para\" compound that can cross-react." }, { id: "ppd", why: "A related \"para\" compound that can cross-react." }],
    [MINERAL],
  ),
  rec("bemotrizinol", ["Bis-ethylhexyloxyphenol methoxyphenyl triazine (Tinosorb S)"], [c("187393-00-6", "bemotrizinol")], [at("Personal care", "European and Asian sunscreens")], [], [MINERAL]),
  rec(
    "bisoctrizole",
    ["Methylene bis-benzotriazolyl tetramethylbutylphenol (Tinosorb M)"],
    [c("103597-45-1", "bisoctrizole")],
    [at("Personal care", "European and Asian sunscreens")],
    [{ id: "decyl-glucoside", why: "Its sunscreen blend contains decyl glucoside, which is often the real cause." }],
    [MINERAL],
  ),
  rec("ecamsule", ["Terephthalylidene dicamphor sulfonic acid (Mexoryl SX)"], [c("92761-26-7", "ecamsule")], [at("Personal care", "Some sunscreens and SPF moisturizers")], [], [MINERAL]),
  rec("drometrizole-trisiloxane", ["Drometrizole trisiloxane (Mexoryl XL)"], [c("155633-54-8", "drometrizole trisiloxane")], [at("Personal care", "Some European sunscreens")], [], [MINERAL]),
  rec(
    "other-uv-filters",
    ["Ensulizole", "Meradimate", "Cinoxate", "Dioxybenzone"],
    [c("27503-81-7", "ensulizole")],
    [at("Personal care", "Chemical sunscreens and products with SPF")],
    [],
    [MINERAL],
  ),
  rec("oleoyl-tyrosine", ["Oleoyl tyrosine"], [c("147732-57-8", "oleoyl tyrosine")], [at("Personal care", "Tan accelerators and some self-tanners")]),
  rec(
    "mineral-uv-filters",
    ["Titanium dioxide", "Zinc oxide"],
    [c("13463-67-7", "titanium dioxide"), c("1314-13-2", "zinc oxide")],
    [at("Personal care", "Mineral sunscreens, makeup, diaper creams and toothpaste")],
    [],
    ["True allergy to these is very rare. Ask your dermatologist to confirm before giving up mineral sunscreen."],
  ),

  // --- Hair ---
  rec(
    "aminophenols",
    ["p-Aminophenol", "m-Aminophenol"],
    [c("123-30-8", "4-aminophenol"), c("591-27-5", "3-aminophenol")],
    [at("Hair", "Permanent hair dyes, especially red and brown shades")],
    [{ id: "ppd", why: "Often used together in hair dye, and some people react to both." }],
    ["Tell your hair stylist, and ask for a patch test before any new dye."],
  ),
  rec(
    "thioglycolates",
    ["Ammonium thioglycolate", "Glyceryl thioglycolate"],
    [c("5421-46-5", "ammonium thioglycolate"), c("68-11-1", "thioglycolic acid")],
    [at("Hair", "Permanent waves and hair straighteners"), at("Personal care", "Hair-removal creams")],
    [],
    ["Stylists: wear gloves when perming; glyceryl thioglycolate can pass through some gloves."],
  ),

  // --- Medicines ---
  rec("mupirocin", ["Mupirocin"], [c("12650-69-0", "mupirocin")], [at("Medicine", "Prescription antibiotic ointment and nasal ointment")], [], ["Tell your doctors; ask about another antibiotic if you need one."]),
  rec(
    "corticosteroid-class-c",
    ["Betamethasone", "Dexamethasone"],
    [c("378-44-9", "betamethasone"), c("50-02-2", "dexamethasone")],
    [at("Medicine", "Desoximetasone creams", "Dexamethasone eye drops, tablets and injections", "Betamethasone tablets and injections")],
    [{ id: "corticosteroid-class-d1", why: "Often cross-reacts with clobetasol-type steroids." }],
    [STEROID_LIST],
  ),
  rec(
    "other-ester-caines",
    ["Procaine", "Butamben"],
    [c("59-46-1", "procaine"), c("94-25-7", "butamben")],
    [at("Medicine", "Some dental and injected numbing medicines (procaine, chloroprocaine)", "Some sunburn and numbing sprays (butamben)")],
    [{ id: "benzocaine", why: "Ester numbing medicines cross-react." }],
    ["Tell your dentist and doctors. Lidocaine is usually a safe alternative, but confirm with them."],
  ),
  rec("dyclonine", ["Dyclonine"], [c("586-60-7", "dyclonine")], [at("Medicine", "Sore-throat lozenges and sprays")], [], ["Tell your dentist and doctors about any numbing-medicine allergy."]),
  rec(
    "diphenhydramine",
    ["Diphenhydramine"],
    [c("58-73-1", "diphenhydramine")],
    [at("Medicine", "Anti-itch creams, gels and sprays (such as topical Benadryl)")],
    [],
    ["The cream form causes the allergy; tell your doctor before taking it by mouth too."],
  ),

  // --- Acrylates ---
  rec(
    "acrylate-polymers",
    ["Acrylates copolymer", "Carbomer"],
    [c("9003-01-4", "carbomer (polyacrylic acid)")],
    [at("Personal care", "Sunscreens, gels, creams and hair styling products, as thickeners and film formers")],
    [{ id: "acrylate-monomers", why: "These are made from acrylates but rarely cause allergy once fully polymerized." }],
    ["Most people allergic to raw acrylates can use these. Avoid them only if your dermatologist says to."],
  ),
];
