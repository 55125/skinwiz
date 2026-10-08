// The brand a shopper knows, read from the start of a product's name. FDA
// listings carry the labeler ("Kenvue Brands LLC", "The Procter & Gamble
// Manufacturing Company") rather than the brand on the box (Neutrogena,
// First Aid Beauty), so cards showed the parent company. Pure; the brand
// list is assembled in product-brand.ts.

// Well-known skincare, sun and drugstore brands, in the casing printed on
// the box. Catalog brands (brand-sourced and community listings) are added
// to these at runtime.
export const KNOWN_BRANDS = [
  "Aquaphor", "Australian Gold", "Aveeno", "Axis-Y", "Babo Botanicals", "Banana Boat", "Bare Republic", "bareMinerals",
  "Beauty of Joseon", "Benadryl", "Benton", "Biore", "Bioré", "Black Girl Sunscreen", "Bliss", "Blue Lizard", "Bobbi Brown",
  "Burt's Bees", "Caladryl", "CeraVe", "Cetaphil", "Clean & Clear", "Clearasil", "Clinique", "Colorescience", "COOLA",
  "Coppertone", "Cortizone-10", "Cortizone 10", "COSRX", "Covergirl", "Curel", "Desenex", "Dermalogica", "Differin", "Dior",
  "Dove", "Dr. Jart+", "Drunk Elephant", "e.l.f.", "EltaMD", "Estée Lauder", "Estee Lauder", "Eucerin", "Fenty Beauty",
  "First Aid Beauty", "Free & Clear", "Garnier", "Glow Recipe", "Gold Bond", "Hawaiian Tropic", "Head & Shoulders",
  "Hero Cosmetics", "Innisfree", "ISDIN", "IT Cosmetics", "Jergens", "Kiehl's", "Kinship", "La Roche-Posay", "Lamisil",
  "Lancôme", "Lancome", "Laneige", "Lotrimin", "Lubriderm", "L'Oréal Paris", "L'Oreal Paris", "Mario Badescu", "Maybelline",
  "Medicube", "Mighty Patch", "Murad", "Naturium", "Neutrogena", "Nivea", "Nizoral", "NYX", "Olay", "Oxy", "PanOxyl",
  "Paula's Choice", "PCA Skin", "Peace Out", "Peter Thomas Roth", "Philosophy", "Physicians Formula", "Proactiv", "Purito",
  "Revlon", "Round Lab", "Sarna", "Selsun Blue", "Shiseido", "Skin1004", "SkinCeuticals", "SkinMedica", "Some By Mi",
  "StriVectin", "Stridex", "Sun Bum", "Supergoop!", "Supergoop", "Tatcha", "The Inkey List", "The Ordinary", "Thinkbaby",
  "Tinactin", "Torriden", "Vanicream", "Vaseline", "Vichy",
];

/** Letters and digits only, lowercased, accents and "&"/"and" folded. */
export function brandKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

export type BrandEntry = { name: string; key: string };

export function brandEntries(names: string[]): BrandEntry[] {
  const byKey = new Map<string, string>();
  for (const name of names) {
    const key = brandKey(name);
    if (key.length >= 3 && !byKey.has(key)) byKey.set(key, name);
  }
  // Longest first, so "Clean & Clear" wins over a shorter brand it starts with.
  return [...byKey.entries()].map(([key, name]) => ({ key, name })).sort((a, b) => b.key.length - a.key.length);
}

/**
 * The brand that starts this product name, or null. The match must end at a
 * word boundary in the original name ("Oxy Clinical" is Oxy; "Oxygen
 * Mask" isn't), and a brand that is only part of a word never counts.
 */
export function brandFromName(productName: string, brands: BrandEntry[]): string | null {
  const nameKey = brandKey(productName);
  for (const b of brands) {
    if (!nameKey.startsWith(b.key)) continue;
    // Walk the original name until the brand's letters are used up, then
    // require the next character to end the word.
    let seen = 0;
    let i = 0;
    for (; i < productName.length && seen < b.key.length; i++) {
      const c = brandKey(productName[i] === "&" ? "&" : productName[i]);
      seen += c.length;
    }
    const next = productName[i];
    if (seen === b.key.length && (next === undefined || !/[A-Za-z0-9]/.test(next))) return b.name;
  }
  return null;
}
