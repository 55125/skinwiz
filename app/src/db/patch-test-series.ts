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
  { id: "disperse-dye-mix", name: "Disperse dye mix (textile dyes)", foundIn: "Dark synthetic clothing and linings, including swimwear and leggings." },
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
// Position 9 is the negative control, left out.
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
  item("Quinoline mix", "clioquinol"),
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

// Allergens of the NACDG screening series and ACDS Core Allergen Series that
// a clinician is likely to read positive, grouped like contact-allergens.ts.
// Not a verbatim copy of either series (they change every cycle); anything
// missing is in the search.
const CORE_GROUPS: { section: AllergenSectionId | "off-label"; items: SeriesItem[] }[] = [
  {
    section: "fragrance",
    items: [
      item("Fragrance mix I", "fragrance-mix-1"),
      item("Fragrance mix II", "fragrance-mix-2"),
      item("Myroxylon pereirae (balsam of Peru)", "balsam-of-peru"),
      item("Cinnamal", "cinnamal"),
      item("Hydroxyisohexyl 3-cyclohexene carboxaldehyde (HICC)", "hicc"),
      item("Linalool hydroperoxides", "linalool"),
      item("Limonene hydroperoxides", "limonene"),
      item("Benzyl alcohol", "benzyl-alcohol"),
      item("Benzyl salicylate", "benzyl-salicylate"),
      item("Jasmine absolute", "jasmine"),
      item("Ylang-ylang oil", "ylang-ylang"),
      item("Sandalwood oil", "sandalwood"),
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
    ],
  },
  {
    section: "preservative",
    items: [
      item("Methylisothiazolinone", "methylisothiazolinone"),
      item("Methylchloroisothiazolinone/methylisothiazolinone", "mci-mi"),
      item("Methyldibromo glutaronitrile", "mdbgn"),
      item("Iodopropynyl butylcarbamate", "iodopropynyl-butylcarbamate"),
      item("Paraben mix", "parabens"),
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
      item("Lauryl glucoside", "lauryl-glucoside"),
      item("Sorbitan sesquioleate", "sorbitan-sesquioleate"),
    ],
  },
  {
    section: "emollient",
    items: [item("Lanolin alcohol (wool alcohols)", "lanolin"), item("Amerchol L-101", "lanolin"), item("Propylene glycol", "propylene-glycol")],
  },
  {
    section: "uv-filter",
    items: [item("Benzophenone-3 (oxybenzone)", "oxybenzone"), item("Benzophenone-4", "benzophenone-4"), item("Octocrylene", "octocrylene")],
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
    ],
  },
  {
    section: "antioxidant",
    items: [item("DL-alpha-tocopherol", "tocopherol"), item("Sodium metabisulfite", "sulfites")],
  },
  {
    section: "hair",
    items: [
      item("p-Phenylenediamine", "ppd"),
      item("Toluene-2,5-diamine", "ptd"),
      item("Glyceryl thioglycolate", "thioglycolates"),
      item("Ammonium persulfate", "persulfates"),
    ],
  },
  {
    section: "medicament",
    items: [
      item("Neomycin sulfate", "neomycin"),
      item("Bacitracin", "bacitracin"),
      item("Benzocaine", "benzocaine"),
      item("Dibucaine", "dibucaine"),
      item("Lidocaine", "lidocaine"),
      item("Tixocortol-21-pivalate", "corticosteroid-class-a"),
      item("Budesonide", "corticosteroid-class-b"),
      item("Hydrocortisone-17-butyrate", "corticosteroid-class-d"),
      item("Clobetasol-17-propionate", "corticosteroid-class-d"),
      item("Ethylenediamine dihydrochloride", "ethylenediamine"),
      item("Chlorhexidine digluconate", "chlorhexidine"),
    ],
  },
  {
    section: "metal",
    items: [item("Nickel sulfate", "nickel"), item("Cobalt chloride", "cobalt"), item("Potassium dichromate", "chromium"), item("Gold sodium thiosulfate", "gold")],
  },
  {
    section: "acrylate",
    items: [
      item("2-Hydroxyethyl methacrylate (HEMA)", "acrylates"),
      item("Methyl methacrylate", "acrylates"),
      item("Ethyl acrylate", "acrylates"),
      item("Ethyl cyanoacrylate", "acrylates"),
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
      offLabel("Disperse dye mix", "disperse-dye-mix"),
      offLabel("Disperse blue 106", "disperse-blue-106"),
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
    id: "core",
    name: "NACDG / ACDS core series",
    short: "Core series",
    description: "The screening allergens of the North American and ACDS core series, grouped by type. Anything else is in the search.",
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
