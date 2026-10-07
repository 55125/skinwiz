// The patch-test series clinicians read from, item by item, mapped to the
// allergen and family ids in contact-allergens.ts. Used by the clinician
// sheet (/for-clinicians/patch-test), the patient import page and the
// "pick from a series" option on /avoid.
//
// Some series allergens never appear on a cosmetic label (rubber
// accelerators, epoxy, textile dyes). They are listed here as NOT_ON_LABELS
// entries: a patient still sees them on their sheet and import page, as
// information, but they can't go on an avoid list that only checks labels.

import { ALLERGEN_SECTIONS, PATCH_TEST_FAMILY, allergenMembers, getAllergen, getAllergenGroup, labelNames, type AllergenSectionId } from "./contact-allergens";

export type NotOnLabel = { id: string; name: string; foundIn: string };

export const NOT_ON_LABELS: NotOnLabel[] = [
  { id: "carba-mix", name: "Carba mix (rubber accelerators)", foundIn: "Rubber gloves, elastic waistbands, shoes, makeup sponges and other rubber goods." },
  { id: "thiuram-mix", name: "Thiuram mix (rubber accelerators)", foundIn: "Rubber gloves (the most common source), elastic, shoes, condoms and some pesticides." },
  { id: "mercapto-mix", name: "Mercapto mix (rubber accelerators)", foundIn: "Rubber shoes and insoles, gloves, elastic, rubber handles and swim gear." },
  { id: "mbt", name: "Mercaptobenzothiazole (MBT)", foundIn: "Rubber shoes, gloves, elastic and some adhesives and antifreeze." },
  { id: "black-rubber-mix", name: "Black rubber mix (IPPD)", foundIn: "Black rubber: tires, hoses, handles, boots, gym equipment and headphones." },
  { id: "dialkyl-thioureas", name: "Mixed dialkyl thioureas", foundIn: "Neoprene: wetsuits, knee and wrist braces, mouse pads, shoe insoles." },
  { id: "epoxy-resin", name: "Epoxy resin", foundIn: "Two-part glues, paints, floor coatings and some electronics; mainly an occupational allergen." },
  { id: "ptbp-formaldehyde-resin", name: "p-tert-Butylphenol formaldehyde resin", foundIn: "Leather and shoe adhesives, watch straps, prosthetics and some nail and wig glues." },
  { id: "disperse-blue-106", name: "Disperse blue 106 (textile dye)", foundIn: "Dark synthetic clothing (polyester, acetate, nylon) in blue, black, brown and green." },
  // Id kept from before the rename: it is in IMPORT_CODES and printed links.
  { id: "disperse-dye-mix", name: "Disperse blue 106/124 mix (textile dyes)", foundIn: "Dark synthetic clothing and linings, including swimwear and leggings." },
  { id: "diphenylguanidine", name: "1,3-Diphenylguanidine (rubber accelerator)", foundIn: "Rubber and synthetic-rubber gloves, including many nitrile and neoprene gloves, and some shoes." },
  { id: "disperse-orange-3", name: "Disperse orange 3 (textile dye)", foundIn: "Synthetic clothing dyes; cross-reacts with PPD, so check hair dyes too." },
  { id: "disperse-yellow-3", name: "Disperse yellow 3 (textile dye)", foundIn: "Synthetic clothing dyes in yellows, oranges, browns and greens." },
];

const NOT_ON_LABEL_BY_ID = new Map(NOT_ON_LABELS.map((n) => [n.id, n]));

export function getNotOnLabel(id: string): NotOnLabel | undefined {
  return NOT_ON_LABEL_BY_ID.get(id);
}

export type SeriesItem = {
  // As printed on the series sheet.
  name: string;
  // Allergen or family ids a positive means avoiding. Empty when the item is
  // `notOnLabel`.
  ids: string[];
  notOnLabel?: string;
  // Panel position, for series read by number.
  pos?: number;
};

export type SeriesGroup = { title: string; items: SeriesItem[] };

export type PatchTestSeries = { id: string; name: string; short: string; description: string; groups: SeriesGroup[] };

const item = (name: string, ...ids: string[]): SeriesItem => ({ name, ids });
const offLabel = (name: string, id: string): SeriesItem => ({ name, ids: [], notOnLabel: id });

// T.R.U.E. Test (SmartPractice), 35 allergens on three panels in panel order.
// Position 9 is the negative control, left out. Source: FDA package insert,
// T.R.U.E. TEST, PI rev. 08/2017 (DailyMed setid
// 2f082b68-dc74-418a-9e6f-b3c285b41d44;
// https://www.fda.gov/files/vaccines,%20blood%20&%20biologics/published/Package-Insert---T.R.U.E.-TEST.pdf).
// Quinoline mix is clioquinol and chlorquinaldol in equal parts; caine mix
// is benzocaine, dibucaine and tetracaine.
const TRUE_TEST_ITEMS: SeriesItem[] = [
  item("Nickel sulfate", "nickel"),
  item("Wool alcohols", "lanolin"),
  item("Neomycin sulfate", "neomycin"),
  item("Potassium dichromate", "chromium"),
  item("Caine mix", "benzocaine", "dibucaine", "tetracaine"),
  item("Fragrance mix", "fragrance-mix-1"),
  item("Colophony", "colophonium"),
  item("Paraben mix", "parabens"),
  item("Myroxylon pereirae (balsam of Peru)", "balsam-of-peru"),
  item("Ethylenediamine dihydrochloride", "ethylenediamine"),
  item("Cobalt dichloride", "cobalt"),
  offLabel("p-tert-Butylphenol formaldehyde resin", "ptbp-formaldehyde-resin"),
  offLabel("Epoxy resin", "epoxy-resin"),
  offLabel("Carba mix", "carba-mix"),
  offLabel("Black rubber mix", "black-rubber-mix"),
  item("Methylchloroisothiazolinone/methylisothiazolinone", "mci-mi"),
  item("Quaternium-15", "quaternium-15"),
  item("Methyldibromo glutaronitrile", "mdbgn"),
  item("p-Phenylenediamine", "ppd"),
  item("Formaldehyde", "formaldehyde"),
  offLabel("Mercapto mix", "mercapto-mix"),
  item("Thimerosal", "thimerosal"),
  offLabel("Thiuram mix", "thiuram-mix"),
  item("Diazolidinyl urea", "diazolidinyl-urea"),
  item("Quinoline mix", "clioquinol", "chlorquinaldol"),
  item("Tixocortol-21-pivalate", "corticosteroid-class-a"),
  item("Gold sodium thiosulfate", "gold"),
  item("Imidazolidinyl urea", "imidazolidinyl-urea"),
  item("Budesonide", "corticosteroid-class-b"),
  item("Hydrocortisone-17-butyrate", "corticosteroid-class-d"),
  offLabel("Mercaptobenzothiazole", "mbt"),
  item("Bacitracin", "bacitracin"),
  item("Parthenolide", "compositae"),
  offLabel("Disperse blue 106", "disperse-blue-106"),
  item("2-Bromo-2-nitropropane-1,3-diol (bronopol)", "bronopol"),
];

// Positions skip 9, the negative control.
const TRUE_TEST_NUMBERED = TRUE_TEST_ITEMS.map((it, i) => ({ ...it, pos: i < 8 ? i + 1 : i + 2 }));

// ACDS Core Allergen Series, 2017 update: 80 allergens, 8 panels of 10, in
// tray order (Schalock et al., Dermatitis 2017;28(2):141-143; numbering as
// in the Chemotechnique American Core Series before the 2020 update, from
// the vendor's listing archived March 2020).
const ACDS_2017_ITEMS: SeriesItem[] = [
  { ...item("Nickel sulfate", "nickel"), pos: 1 },
  { ...item("Amerchol L-101 (lanolin)", "lanolin"), pos: 2 },
  { ...item("Neomycin sulfate", "neomycin"), pos: 3 },
  { ...item("Potassium dichromate", "chromium"), pos: 4 },
  { ...item("DMDM hydantoin", "dmdm-hydantoin"), pos: 5 },
  { ...item("Fragrance mix I", "fragrance-mix-1"), pos: 6 },
  { ...item("Colophonium", "colophonium"), pos: 7 },
  { ...item("Paraben mix", "parabens"), pos: 8 },
  { ...item("Methylisothiazolinone", "methylisothiazolinone"), pos: 9 },
  { ...item("Myroxylon pereirae (balsam of Peru)", "balsam-of-peru"), pos: 10 },
  { ...item("Ethylenediamine dihydrochloride", "ethylenediamine"), pos: 11 },
  { ...item("Cobalt chloride", "cobalt"), pos: 12 },
  { ...offLabel("p-tert-Butylphenol formaldehyde resin", "ptbp-formaldehyde-resin"), pos: 13 },
  { ...offLabel("Epoxy resin, bisphenol A", "epoxy-resin"), pos: 14 },
  { ...offLabel("Carba mix", "carba-mix"), pos: 15 },
  { ...offLabel("Black rubber mix", "black-rubber-mix"), pos: 16 },
  { ...item("Methylchloroisothiazolinone/methylisothiazolinone", "mci-mi"), pos: 17 },
  { ...item("Quaternium-15", "quaternium-15"), pos: 18 },
  { ...item("Methyldibromo glutaronitrile", "mdbgn"), pos: 19 },
  { ...item("p-Phenylenediamine (PPD)", "ppd"), pos: 20 },
  { ...item("Formaldehyde", "formaldehyde"), pos: 21 },
  { ...offLabel("Mercapto mix", "mercapto-mix"), pos: 22 },
  { ...item("2-Bromo-2-nitropropane-1,3-diol (bronopol)", "bronopol"), pos: 23 },
  { ...offLabel("Thiuram mix", "thiuram-mix"), pos: 24 },
  { ...item("Diazolidinyl urea", "diazolidinyl-urea"), pos: 25 },
  { ...item("Benzocaine", "benzocaine"), pos: 26 },
  { ...item("Tixocortol-21-pivalate", "corticosteroid-class-a"), pos: 27 },
  { ...item("Gold sodium thiosulfate", "gold"), pos: 28 },
  { ...item("Imidazolidinyl urea", "imidazolidinyl-urea"), pos: 29 },
  { ...item("Budesonide", "corticosteroid-class-b"), pos: 30 },
  { ...item("Hydrocortisone-17-butyrate", "corticosteroid-class-d"), pos: 31 },
  { ...offLabel("Mercaptobenzothiazole (MBT)", "mbt"), pos: 32 },
  { ...item("Bacitracin", "bacitracin"), pos: 33 },
  { ...item("Fragrance mix II", "fragrance-mix-2"), pos: 34 },
  { ...offLabel("Disperse blue 106/124 mix", "disperse-dye-mix"), pos: 35 },
  { ...item("Lidocaine", "lidocaine"), pos: 36 },
  { ...item("Propylene glycol", "propylene-glycol"), pos: 37 },
  { ...item("Iodopropynyl butylcarbamate", "iodopropynyl-butylcarbamate"), pos: 38 },
  { ...item("Polymyxin B sulfate", "polymyxin-b"), pos: 39 },
  { ...item("Cocamidopropyl betaine", "cocamidopropyl-betaine"), pos: 40 },
  { ...offLabel("Mixed dialkyl thioureas", "dialkyl-thioureas"), pos: 41 },
  { ...item("Dimethylaminopropylamine (DMAPA)", "cocamidopropyl-betaine"), pos: 42 },
  { ...item("2-Hydroxyethyl methacrylate (HEMA)", "acrylates"), pos: 43 },
  { ...item("Oleamidopropyl dimethylamine", "oleamidopropyl-dimethylamine"), pos: 44 },
  { ...item("Decyl glucoside", "decyl-glucoside"), pos: 45 },
  { ...item("Methyl methacrylate", "acrylates"), pos: 46 },
  { ...item("Lavender absolute", "lavender-oil"), pos: 47 },
  { ...item("Cinnamal", "cinnamal"), pos: 48 },
  { ...item("Tocopherol", "tocopherol"), pos: 49 },
  { ...item("Ethyl acrylate", "acrylates"), pos: 50 },
  { ...item("Tea tree oil, oxidized", "tea-tree-oil"), pos: 51 },
  { ...item("Chlorhexidine digluconate", "chlorhexidine"), pos: 52 },
  { ...item("Propolis", "propolis"), pos: 53 },
  { ...item("Chloroxylenol (PCMX)", "chloroxylenol"), pos: 54 },
  { ...item("Benzophenone-3 (oxybenzone)", "oxybenzone"), pos: 55 },
  { ...item("Tosylamide formaldehyde resin", "tosylamide-formaldehyde-resin"), pos: 56 },
  { ...item("Sesquiterpene lactone mix", "compositae"), pos: 57 },
  { ...item("Cocamide DEA", "cocamide-dea"), pos: 58 },
  { ...item("p-Chloro-m-cresol (chlorocresol)", "chlorocresol"), pos: 59 },
  { ...item("Benzalkonium chloride", "benzalkonium-chloride"), pos: 60 },
  { ...item("Benzophenone-4", "benzophenone-4"), pos: 61 },
  { ...item("Sodium benzoate", "sodium-benzoate"), pos: 62 },
  { ...item("Sorbic acid", "sorbic-acid"), pos: 63 },
  { ...item("Ylang-ylang oil", "ylang-ylang"), pos: 64 },
  { ...item("Compositae mix II", "compositae"), pos: 65 },
  { ...item("Ethyleneurea melamine formaldehyde", "melamine-formaldehyde"), pos: 66 },
  { ...item("Sorbitan sesquioleate", "sorbitan-sesquioleate"), pos: 67 },
  { ...offLabel("1,3-Diphenylguanidine", "diphenylguanidine"), pos: 68 },
  { ...item("Cetearyl alcohol", "cetearyl-alcohol"), pos: 69 },
  { ...item("Ethylhexylglycerin", "ethylhexylglycerin"), pos: 70 },
  { ...item("Triamcinolone acetonide", "corticosteroid-class-b"), pos: 71 },
  { ...item("Clobetasol-17-propionate", "corticosteroid-class-d"), pos: 72 },
  { ...item("Amidoamine", "cocamidopropyl-betaine"), pos: 73 },
  { ...item("Ethyl cyanoacrylate", "acrylates"), pos: 74 },
  { ...item("Phenoxyethanol", "phenoxyethanol"), pos: 75 },
  { ...offLabel("Disperse orange 3", "disperse-orange-3"), pos: 76 },
  { ...item("Benzoic acid", "sodium-benzoate"), pos: 77 },
  { ...item("BHT (butylated hydroxytoluene)", "bht"), pos: 78 },
  { ...item("Ethylhexyl methoxycinnamate (octinoxate)", "octinoxate"), pos: 79 },
  { ...item("Benzyl alcohol", "benzyl-alcohol"), pos: 80 },
];

// North American 80 Comprehensive Series (NAC-80), the NACDG screening
// series: 80 allergens, 8 panels of 10, numbered as on the Chemotechnique
// NAC-80 tray (article order, petrolatum then aqueous).
const NAC_80_ITEMS: SeriesItem[] = [
  { ...item("Amerchol L-101 (lanolin)", "lanolin"), pos: 1 },
  { ...item("Ammonium persulfate", "persulfates"), pos: 2 },
  { ...item("Myroxylon pereirae (balsam of Peru)", "balsam-of-peru"), pos: 3 },
  { ...item("Benzisothiazolinone", "benzisothiazolinone"), pos: 4 },
  { ...item("Benzocaine", "benzocaine"), pos: 5 },
  { ...item("Benzyl alcohol", "benzyl-alcohol"), pos: 6 },
  { ...item("Benzyl salicylate", "benzyl-salicylate"), pos: 7 },
  { ...item("2-Bromo-2-nitropropane-1,3-diol (bronopol)", "bronopol"), pos: 8 },
  { ...offLabel("p-tert-Butylphenol formaldehyde resin", "ptbp-formaldehyde-resin"), pos: 9 },
  { ...item("Bacitracin", "bacitracin"), pos: 10 },
  { ...item("Budesonide", "corticosteroid-class-b"), pos: 11 },
  { ...item("Quaternium-15", "quaternium-15"), pos: 12 },
  { ...item("Chloroxylenol (PCMX)", "chloroxylenol"), pos: 13 },
  { ...item("Cinnamal", "cinnamal"), pos: 14 },
  { ...item("Cobalt chloride", "cobalt"), pos: 15 },
  { ...item("Cocamide DEA", "cocamide-dea"), pos: 16 },
  { ...item("Colophonium", "colophonium"), pos: 17 },
  { ...item("Clobetasol-17-propionate", "corticosteroid-class-d"), pos: 18 },
  { ...item("Toluene-2,5-diamine sulfate (PTD)", "ptd"), pos: 19 },
  { ...offLabel("1,3-Diphenylguanidine", "diphenylguanidine"), pos: 20 },
  { ...item("Diazolidinyl urea", "diazolidinyl-urea"), pos: 21 },
  { ...item("DMDM hydantoin", "dmdm-hydantoin"), pos: 22 },
  { ...item("Methyldibromo glutaronitrile", "mdbgn"), pos: 23 },
  { ...item("Decyl glucoside", "decyl-glucoside"), pos: 24 },
  { ...offLabel("Epoxy resin, bisphenol A", "epoxy-resin"), pos: 25 },
  { ...item("Ethyl acrylate", "acrylates"), pos: 26 },
  { ...item("Ethylenediamine dihydrochloride", "ethylenediamine"), pos: 27 },
  { ...item("2-Hydroxyethyl methacrylate (HEMA)", "acrylates"), pos: 28 },
  { ...item("Benzophenone-4", "benzophenone-4"), pos: 29 },
  { ...item("Hydroperoxides of linalool", "linalool"), pos: 30 },
  { ...item("Hydroperoxides of limonene", "limonene"), pos: 31 },
  { ...item("Imidazolidinyl urea", "imidazolidinyl-urea"), pos: 32 },
  { ...offLabel("N-Isopropyl-N'-phenyl-p-phenylenediamine (IPPD)", "black-rubber-mix"), pos: 33 },
  { ...item("Iodopropynyl butylcarbamate", "iodopropynyl-butylcarbamate"), pos: 34 },
  { ...item("Lidocaine", "lidocaine"), pos: 35 },
  { ...item("Hydroxyisohexyl 3-cyclohexene carboxaldehyde (HICC)", "hicc"), pos: 36 },
  { ...item("Lauryl polyglucose", "lauryl-glucoside"), pos: 37 },
  { ...offLabel("Mercaptobenzothiazole (MBT)", "mbt"), pos: 38 },
  { ...item("Methyl methacrylate", "acrylates"), pos: 39 },
  { ...offLabel("Thiuram mix", "thiuram-mix"), pos: 40 },
  { ...item("Paraben mix", "parabens"), pos: 41 },
  { ...offLabel("Black rubber mix", "black-rubber-mix"), pos: 42 },
  { ...offLabel("Mercapto mix", "mercapto-mix"), pos: 43 },
  { ...offLabel("Carba mix", "carba-mix"), pos: 44 },
  { ...item("Fragrance mix I", "fragrance-mix-1"), pos: 45 },
  { ...item("Sesquiterpene lactone mix", "compositae"), pos: 46 },
  { ...item("Caine mix III", "benzocaine", "dibucaine", "tetracaine"), pos: 47 },
  { ...offLabel("Mixed dialkyl thioureas", "dialkyl-thioureas"), pos: 48 },
  { ...item("Fragrance mix II", "fragrance-mix-2"), pos: 49 },
  { ...item("Compositae mix II", "compositae"), pos: 50 },
  { ...offLabel("Textile dye mix II", "disperse-dye-mix"), pos: 51 },
  { ...item("Neomycin sulfate", "neomycin"), pos: 52 },
  { ...item("Nickel sulfate", "nickel"), pos: 53 },
  { ...item("Octylisothiazolinone", "octylisothiazolinone"), pos: 54 },
  { ...item("p-Phenylenediamine (PPD)", "ppd"), pos: 55 },
  { ...item("Potassium dichromate", "chromium"), pos: 56 },
  { ...item("Propyl gallate", "gallates"), pos: 57 },
  { ...item("Propolis", "propolis"), pos: 58 },
  { ...item("Polymyxin B sulfate", "polymyxin-b"), pos: 59 },
  { ...item("Pramoxine hydrochloride", "pramoxine"), pos: 60 },
  { ...item("Sodium benzoate", "sodium-benzoate"), pos: 61 },
  { ...item("Sorbitan oleate", "sorbitan-sesquioleate"), pos: 62 },
  { ...item("Sorbitan sesquioleate", "sorbitan-sesquioleate"), pos: 63 },
  { ...item("Sodium metabisulfite", "sulfites"), pos: 64 },
  { ...item("Tosylamide formaldehyde resin", "tosylamide-formaldehyde-resin"), pos: 65 },
  { ...item("Tixocortol-21-pivalate", "corticosteroid-class-a"), pos: 66 },
  { ...item("Tea tree oil, oxidized", "tea-tree-oil"), pos: 67 },
  { ...item("Tocopherol", "tocopherol"), pos: 68 },
  { ...item("Lanolin alcohol", "lanolin"), pos: 69 },
  { ...item("Ylang-ylang oil", "ylang-ylang"), pos: 70 },
  { ...item("Amidoamine", "cocamidopropyl-betaine"), pos: 71 },
  { ...item("Benzalkonium chloride", "benzalkonium-chloride"), pos: 72 },
  { ...item("Chlorhexidine digluconate", "chlorhexidine"), pos: 73 },
  { ...item("Methylchloroisothiazolinone/methylisothiazolinone", "mci-mi"), pos: 74 },
  { ...item("Cocamidopropyl betaine", "cocamidopropyl-betaine"), pos: 75 },
  { ...item("Dimethylaminopropylamine (DMAPA)", "cocamidopropyl-betaine"), pos: 76 },
  { ...item("Formaldehyde", "formaldehyde"), pos: 77 },
  { ...item("Methylisothiazolinone", "methylisothiazolinone"), pos: 78 },
  { ...item("Oleamidopropyl dimethylamine", "oleamidopropyl-dimethylamine"), pos: 79 },
  { ...item("Propylene glycol", "propylene-glycol"), pos: 80 },
];

const PANELS_80 = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// ACDS Core Allergen Series 2020 in tray order: 90 allergens, 9 panels of 10
// (Schalock et al., Dermatitis 2020;31(5):279-282, Table 1; numbering as in
// the Chemotechnique American Core Series AC-1000, where #66 is ethyleneurea
// melamine formaldehyde). Same allergens as the "core" grouping below, but
// numbered as they sit in the chambers, for reading by position.
const ACDS_2020_ITEMS: SeriesItem[] = [
  { ...item("Nickel sulfate", "nickel"), pos: 1 },
  { ...item("Amerchol L-101 (lanolin)", "lanolin"), pos: 2 },
  { ...item("Neomycin sulfate", "neomycin"), pos: 3 },
  { ...item("Potassium dichromate", "chromium"), pos: 4 },
  { ...item("DMDM hydantoin", "dmdm-hydantoin"), pos: 5 },
  { ...item("Fragrance mix I", "fragrance-mix-1"), pos: 6 },
  { ...item("Colophonium", "colophonium"), pos: 7 },
  { ...item("Paraben mix", "parabens"), pos: 8 },
  { ...item("Methylisothiazolinone", "methylisothiazolinone"), pos: 9 },
  { ...item("Myroxylon pereirae (balsam of Peru)", "balsam-of-peru"), pos: 10 },
  { ...item("Ethylenediamine dihydrochloride", "ethylenediamine"), pos: 11 },
  { ...item("Cobalt chloride", "cobalt"), pos: 12 },
  { ...offLabel("p-tert-Butylphenol formaldehyde resin", "ptbp-formaldehyde-resin"), pos: 13 },
  { ...offLabel("Epoxy resin, bisphenol A", "epoxy-resin"), pos: 14 },
  { ...offLabel("Carba mix", "carba-mix"), pos: 15 },
  { ...offLabel("Black rubber mix", "black-rubber-mix"), pos: 16 },
  { ...item("Methylchloroisothiazolinone/methylisothiazolinone", "mci-mi"), pos: 17 },
  { ...item("Quaternium-15", "quaternium-15"), pos: 18 },
  { ...item("Hydroperoxides of linalool", "linalool"), pos: 19 },
  { ...item("p-Phenylenediamine (PPD)", "ppd"), pos: 20 },
  { ...item("Formaldehyde", "formaldehyde"), pos: 21 },
  { ...offLabel("Mercapto mix", "mercapto-mix"), pos: 22 },
  { ...item("2-Bromo-2-nitropropane-1,3-diol (bronopol)", "bronopol"), pos: 23 },
  { ...offLabel("Thiuram mix", "thiuram-mix"), pos: 24 },
  { ...item("Diazolidinyl urea", "diazolidinyl-urea"), pos: 25 },
  { ...item("Benzocaine", "benzocaine"), pos: 26 },
  { ...item("Tixocortol-21-pivalate", "corticosteroid-class-a"), pos: 27 },
  { ...item("Gold sodium thiosulfate", "gold"), pos: 28 },
  { ...item("Imidazolidinyl urea", "imidazolidinyl-urea"), pos: 29 },
  { ...item("Budesonide", "corticosteroid-class-b"), pos: 30 },
  { ...item("Hydrocortisone-17-butyrate", "corticosteroid-class-d"), pos: 31 },
  { ...offLabel("Mercaptobenzothiazole (MBT)", "mbt"), pos: 32 },
  { ...item("Bacitracin", "bacitracin"), pos: 33 },
  { ...item("Fragrance mix II", "fragrance-mix-2"), pos: 34 },
  { ...offLabel("Disperse blue 106/124 mix", "disperse-dye-mix"), pos: 35 },
  { ...item("Lidocaine", "lidocaine"), pos: 36 },
  { ...item("Propylene glycol", "propylene-glycol"), pos: 37 },
  { ...item("Iodopropynyl butylcarbamate", "iodopropynyl-butylcarbamate"), pos: 38 },
  { ...item("Polymyxin B sulfate", "polymyxin-b"), pos: 39 },
  { ...item("Cocamidopropyl betaine", "cocamidopropyl-betaine"), pos: 40 },
  { ...offLabel("Mixed dialkyl thioureas", "dialkyl-thioureas"), pos: 41 },
  { ...item("Dimethylaminopropylamine (DMAPA)", "cocamidopropyl-betaine"), pos: 42 },
  { ...item("2-Hydroxyethyl methacrylate (HEMA)", "acrylates"), pos: 43 },
  { ...item("Oleamidopropyl dimethylamine", "oleamidopropyl-dimethylamine"), pos: 44 },
  { ...item("Decyl glucoside", "decyl-glucoside"), pos: 45 },
  { ...item("Methyl methacrylate", "acrylates"), pos: 46 },
  { ...item("Lavender absolute", "lavender-oil"), pos: 47 },
  { ...item("Cinnamal", "cinnamal"), pos: 48 },
  { ...item("Tocopherol", "tocopherol"), pos: 49 },
  { ...item("Ethyl acrylate", "acrylates"), pos: 50 },
  { ...item("Tea tree oil, oxidized", "tea-tree-oil"), pos: 51 },
  { ...item("Chlorhexidine digluconate", "chlorhexidine"), pos: 52 },
  { ...item("Propolis", "propolis"), pos: 53 },
  { ...item("Chloroxylenol (PCMX)", "chloroxylenol"), pos: 54 },
  { ...item("Benzophenone-3 (oxybenzone)", "oxybenzone"), pos: 55 },
  { ...item("Tosylamide formaldehyde resin", "tosylamide-formaldehyde-resin"), pos: 56 },
  { ...item("Sesquiterpene lactone mix", "compositae"), pos: 57 },
  { ...item("Cocamide DEA", "cocamide-dea"), pos: 58 },
  { ...item("Hydroperoxides of limonene", "limonene"), pos: 59 },
  { ...item("Benzalkonium chloride", "benzalkonium-chloride"), pos: 60 },
  { ...item("Benzophenone-4", "benzophenone-4"), pos: 61 },
  { ...item("Sodium benzoate", "sodium-benzoate"), pos: 62 },
  { ...item("Sorbic acid", "sorbic-acid"), pos: 63 },
  { ...item("Ylang-ylang oil", "ylang-ylang"), pos: 64 },
  { ...item("Compositae mix II", "compositae"), pos: 65 },
  { ...item("Ethyleneurea melamine formaldehyde", "melamine-formaldehyde"), pos: 66 },
  { ...item("Sorbitan sesquioleate", "sorbitan-sesquioleate"), pos: 67 },
  { ...offLabel("1,3-Diphenylguanidine", "diphenylguanidine"), pos: 68 },
  { ...item("Hydroxyisohexyl 3-cyclohexene carboxaldehyde (HICC)", "hicc"), pos: 69 },
  { ...item("Ethylhexylglycerin", "ethylhexylglycerin"), pos: 70 },
  { ...item("Triamcinolone acetonide", "corticosteroid-class-b"), pos: 71 },
  { ...item("Clobetasol-17-propionate", "corticosteroid-class-d"), pos: 72 },
  { ...item("Amidoamine", "cocamidopropyl-betaine"), pos: 73 },
  { ...item("Ethyl cyanoacrylate", "acrylates"), pos: 74 },
  { ...item("Phenoxyethanol", "phenoxyethanol"), pos: 75 },
  { ...offLabel("Disperse orange 3", "disperse-orange-3"), pos: 76 },
  { ...item("Benzoic acid", "sodium-benzoate"), pos: 77 },
  { ...item("BHT (butylated hydroxytoluene)", "bht"), pos: 78 },
  { ...item("Ethylhexyl methoxycinnamate (octinoxate)", "octinoxate"), pos: 79 },
  { ...item("Benzyl alcohol", "benzyl-alcohol"), pos: 80 },
  { ...item("Cetearyl alcohol", "cetearyl-alcohol"), pos: 81 },
  { ...item("Carmine", "carmine"), pos: 82 },
  { ...item("Benzyl salicylate", "benzyl-salicylate"), pos: 83 },
  { ...offLabel("Disperse yellow 3", "disperse-yellow-3"), pos: 84 },
  { ...item("Jasmine absolute", "jasmine"), pos: 85 },
  { ...item("Peppermint oil", "peppermint-oil"), pos: 86 },
  { ...item("Pramoxine hydrochloride", "pramoxine"), pos: 87 },
  { ...item("Shellac", "shellac"), pos: 88 },
  { ...item("Lauryl polyglucose", "lauryl-glucoside"), pos: 89 },
  { ...item("p-Chloro-m-cresol (chlorocresol)", "chlorocresol"), pos: 90 },
];
const ACDS_PANELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

// The ACDS Core Allergen Series 2020 Update (Schalock et al., Dermatitis,
// 2020;31(5):279-282, doi:10.1097/DER.0000000000000621; table at
// https://www.contactderm.org/UserFiles/file/American_Contact_Dermatitis_Society_Core_Allergen.2-1_v1.pdf),
// plus common NACDG screening allergens from the Chemotechnique NAC-80 tray,
// grouped like contact-allergens.ts rather than in tray order. Lanolin
// alcohol and Amerchol L-101 are separate patches on both trays but mean the
// same avoidance (lanolin), so they share one row. Anything not here is in
// the search.
const CORE_GROUPS: { section: AllergenSectionId | "off-label"; items: SeriesItem[] }[] = [
  {
    section: "fragrance",
    items: [
      item("Fragrance mix I", "fragrance-mix-1"),
      item("Fragrance mix II", "fragrance-mix-2"),
      item("Myroxylon pereirae (balsam of Peru)", "balsam-of-peru"),
      item("Cinnamal", "cinnamal"),
      item("Hydroxyisohexyl 3-cyclohexene carboxaldehyde (HICC)", "hicc"),
      item("Hydroperoxides of linalool", "linalool"),
      item("Hydroperoxides of limonene", "limonene"),
      item("Benzyl alcohol", "benzyl-alcohol"),
      item("Benzyl salicylate", "benzyl-salicylate"),
      item("Jasmine absolute", "jasmine"),
      item("Ylang-ylang oil", "ylang-ylang"),
    ],
  },
  {
    section: "formaldehyde",
    items: [
      item("Formaldehyde", "formaldehyde"),
      item("Quaternium-15", "quaternium-15"),
      item("Diazolidinyl urea", "diazolidinyl-urea"),
      item("Imidazolidinyl urea", "imidazolidinyl-urea"),
      item("DMDM hydantoin", "dmdm-hydantoin"),
      item("2-Bromo-2-nitropropane-1,3-diol (bronopol)", "bronopol"),
      item("Tosylamide formaldehyde resin", "tosylamide-formaldehyde-resin"),
      item("Ethyleneurea melamine formaldehyde mix", "melamine-formaldehyde"),
    ],
  },
  {
    section: "preservative",
    items: [
      item("Methylisothiazolinone", "methylisothiazolinone"),
      item("Methylchloroisothiazolinone/methylisothiazolinone", "mci-mi"),
      item("Methyldibromo glutaronitrile", "mdbgn"),
      item("Iodopropynyl butylcarbamate", "iodopropynyl-butylcarbamate"),
      item("Benzisothiazolinone", "benzisothiazolinone"),
      item("Octylisothiazolinone", "octylisothiazolinone"),
      item("Paraben mix", "parabens"),
      item("Phenoxyethanol", "phenoxyethanol"),
      item("Benzalkonium chloride", "benzalkonium-chloride"),
      item("Sodium benzoate", "sodium-benzoate"),
      item("Benzoic acid", "sodium-benzoate"),
      item("Sorbic acid", "sorbic-acid"),
      item("Ethylhexylglycerin", "ethylhexylglycerin"),
      item("p-Chloro-m-cresol (chlorocresol)", "chlorocresol"),
      item("Chloroxylenol (PCMX)", "chloroxylenol"),
    ],
  },
  {
    section: "surfactant",
    items: [
      item("Cocamidopropyl betaine", "cocamidopropyl-betaine"),
      item("Amidoamine", "cocamidopropyl-betaine"),
      item("Dimethylaminopropylamine (DMAPA)", "cocamidopropyl-betaine"),
      item("Oleamidopropyl dimethylamine", "oleamidopropyl-dimethylamine"),
      item("Decyl glucoside", "decyl-glucoside"),
      item("Lauryl polyglucose (glucosides)", "lauryl-glucoside"),
      item("Cocamide DEA", "cocamide-dea"),
      item("Sorbitan sesquioleate", "sorbitan-sesquioleate"),
      item("Sorbitan oleate", "sorbitan-sesquioleate"),
      item("Cetearyl alcohol", "cetearyl-alcohol"),
    ],
  },
  {
    section: "emollient",
    items: [item("Lanolin alcohol (Amerchol L-101)", "lanolin"), item("Propylene glycol", "propylene-glycol")],
  },
  {
    section: "uv-filter",
    items: [
      item("Benzophenone-3 (oxybenzone)", "oxybenzone"),
      item("Benzophenone-4", "benzophenone-4"),
      item("Ethylhexyl methoxycinnamate (octinoxate)", "octinoxate"),
    ],
  },
  {
    section: "botanical",
    items: [
      item("Compositae mix", "compositae"),
      item("Sesquiterpene lactone mix", "compositae"),
      item("Parthenolide", "compositae"),
      item("Propolis", "propolis"),
      item("Colophony", "colophonium"),
      item("Tea tree oil, oxidized", "tea-tree-oil"),
      item("Lavender absolute (Lavandula angustifolia)", "lavender-oil"),
      item("Peppermint oil (Mentha piperita)", "peppermint-oil"),
    ],
  },
  {
    section: "antioxidant",
    items: [
      item("DL-alpha-tocopherol", "tocopherol"),
      item("Sodium metabisulfite", "sulfites"),
      item("Butylated hydroxytoluene (BHT)", "bht"),
      item("Propyl gallate", "gallates"),
    ],
  },
  {
    section: "hair",
    items: [item("p-Phenylenediamine", "ppd"), item("Toluene-2,5-diamine", "ptd"), item("Ammonium persulfate", "persulfates")],
  },
  {
    section: "medicament",
    items: [
      item("Neomycin sulfate", "neomycin"),
      item("Bacitracin", "bacitracin"),
      item("Polymyxin B sulfate", "polymyxin-b"),
      item("Benzocaine", "benzocaine"),
      item("Lidocaine", "lidocaine"),
      item("Pramoxine (pramocaine)", "pramoxine"),
      item("Tixocortol-21-pivalate", "corticosteroid-class-a"),
      item("Budesonide", "corticosteroid-class-b"),
      item("Triamcinolone acetonide", "corticosteroid-class-b"),
      item("Hydrocortisone-17-butyrate", "corticosteroid-class-d"),
      item("Clobetasol-17-propionate", "corticosteroid-class-d"),
      item("Ethylenediamine dihydrochloride", "ethylenediamine"),
      item("Chlorhexidine digluconate", "chlorhexidine"),
    ],
  },
  {
    section: "metal",
    items: [
      item("Nickel sulfate", "nickel"),
      item("Cobalt chloride", "cobalt"),
      item("Potassium dichromate", "chromium"),
      item("Gold sodium thiosulfate", "gold"),
      item("Carmine (CI 75470)", "carmine"),
    ],
  },
  {
    section: "acrylate",
    items: [
      item("2-Hydroxyethyl methacrylate (HEMA)", "acrylates"),
      item("Methyl methacrylate", "acrylates"),
      item("Ethyl acrylate", "acrylates"),
      item("Ethyl cyanoacrylate", "acrylates"),
      item("Shellac", "shellac"),
    ],
  },
  {
    section: "off-label",
    items: [
      offLabel("Carba mix", "carba-mix"),
      offLabel("Thiuram mix", "thiuram-mix"),
      offLabel("Mercapto mix", "mercapto-mix"),
      offLabel("Mercaptobenzothiazole", "mbt"),
      offLabel("Mixed dialkyl thioureas", "dialkyl-thioureas"),
      offLabel("Black rubber mix", "black-rubber-mix"),
      offLabel("Epoxy resin", "epoxy-resin"),
      offLabel("p-tert-Butylphenol formaldehyde resin", "ptbp-formaldehyde-resin"),
      offLabel("1,3-Diphenylguanidine", "diphenylguanidine"),
      offLabel("Disperse blue 106/124 mix", "disperse-dye-mix"),
      offLabel("Disperse blue 106", "disperse-blue-106"),
      offLabel("Disperse orange 3", "disperse-orange-3"),
      offLabel("Disperse yellow 3", "disperse-yellow-3"),
    ],
  },
];

export const PATCH_TEST_SERIES: PatchTestSeries[] = [
  {
    id: "true-test",
    name: "T.R.U.E. Test",
    short: "T.R.U.E. Test",
    description: "35 allergens on three panels, in panel order (position 9 is the negative control).",
    groups: [
      { title: "Panel 1", items: TRUE_TEST_NUMBERED.slice(0, 11) },
      { title: "Panel 2", items: TRUE_TEST_NUMBERED.slice(11, 23) },
      { title: "Panel 3", items: TRUE_TEST_NUMBERED.slice(23) },
    ],
  },
  {
    id: "acds-2020",
    name: "ACDS Core Series (2020), tray order",
    short: "ACDS core 2020 (90)",
    description: "The 90 ACDS core allergens in tray order: 9 panels of 10, numbered 1 to 90.",
    groups: ACDS_PANELS.map((p, i) => ({ title: `Panel ${p}`, items: ACDS_2020_ITEMS.slice(i * 10, i * 10 + 10) })),
  },
  {
    id: "acds-2017",
    name: "ACDS Core Series (2017), 80 allergens, tray order",
    short: "ACDS core 2017 (80)",
    description: "The 80-allergen ACDS core series in use before the 2020 update: 8 panels of 10, numbered 1 to 80.",
    groups: PANELS_80.map((p, i) => ({ title: `Panel ${p}`, items: ACDS_2017_ITEMS.slice(i * 10, i * 10 + 10) })),
  },
  {
    id: "nac-80",
    name: "North American 80 Comprehensive Series (NAC-80), tray order",
    short: "NAC-80",
    description: "The NACDG's 80-allergen screening series as numbered on the NAC-80 tray: 8 panels of 10.",
    groups: PANELS_80.map((p, i) => ({ title: `Panel ${p}`, items: NAC_80_ITEMS.slice(i * 10, i * 10 + 10) })),
  },
  {
    id: "core",
    name: "ACDS Core Series (2020) and common NACDG allergens",
    short: "Core series",
    description: "ACDS Core Series (2020) and common NACDG allergens, grouped by type — confirm against your tray. Anything else is in the search.",
    groups: CORE_GROUPS.map((g) => ({
      title: g.section === "off-label" ? "Rubber, resins and textile dyes" : ALLERGEN_SECTIONS.find((s) => s.id === g.section)!.title,
      items: g.items,
    })),
  },
];

export function seriesItems(series: PatchTestSeries): SeriesItem[] {
  return series.groups.flatMap((g) => g.items);
}

/** The family a positive to this item is usually extended to, if any. */
export function itemFamily(it: SeriesItem): { id: string; byDefault: boolean } | undefined {
  for (const id of it.ids) if (PATCH_TEST_FAMILY[id]) return PATCH_TEST_FAMILY[id];
  return undefined;
}

/** Display name for an allergen, family or not-on-label id. */
export function importItemName(id: string): string | undefined {
  return getAllergen(id)?.name ?? getAllergenGroup(id)?.name ?? NOT_ON_LABEL_BY_ID.get(id)?.name;
}

/**
 * The names to look for on a label: an allergen's label synonyms (minus its
 * own name), or all of a family's member allergens.
 */
export function watchForNames(id: string, max = 6): string[] {
  const allergen = getAllergen(id);
  if (allergen) {
    const own = allergen.name.toLowerCase();
    const names = labelNames(allergen).filter((t) => !own.includes(t) && t.length > 2);
    return names.slice(0, max);
  }
  // A family is avoided whole, so every member is listed.
  if (getAllergenGroup(id)) return allergenMembers(id).map((m) => getAllergen(m)!.name);
  return [];
}

// Allergens a label can list but that people mostly meet elsewhere. Shown
// next to the label names on the patient's sheet and import page, so a
// positive nickel test doesn't read as "check your moisturizer" alone.
const MAINLY_OFF_LABEL: Record<string, string> = {
  nickel:
    "Mostly from metal, not product labels: jewelry, belt buckles, jeans buttons, eyeglass frames, keys and metal tools like eyelash curlers.",
};

export function mainlyOffLabel(id: string): string | undefined {
  return MAINLY_OFF_LABEL[id];
}
