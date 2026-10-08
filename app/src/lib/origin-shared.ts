// Where a product's brand comes from: the region tag on product cards and
// the "Brand from" filter (?from=kr) on concern, browse and search pages.
// The catalog has no country field (openFDA, DailyMed and Open Beauty Facts
// rows don't carry one), so this is a curated brand list: the brand's home
// country, not where a given bottle was filled. A US-labelled La Roche-Posay
// sunscreen is still a French brand. Unlisted brands have no origin and drop
// out of every region filter; they are never guessed from a "Co., Ltd." in
// the labeler name.
//
// Regions are the markets Americans actually shop abroad for skincare from:
// K-beauty, J-beauty, European pharmacy brands (EU, UK and Switzerland),
// Australian sunscreens and Canadian brands (The Ordinary).

export const ORIGIN_PARAM = "from";

export type OriginId = "kr" | "jp" | "eu" | "au" | "ca";

export type Origin = {
  id: OriginId;
  /** Filter chip: "Korea". */
  place: string;
  /** Product card tag: "K-beauty". */
  tag: string;
  /** Running text: "Korean brands". */
  label: string;
};

export const ORIGINS: Origin[] = [
  { id: "kr", place: "Korea", tag: "K-beauty", label: "Korean" },
  { id: "jp", place: "Japan", tag: "J-beauty", label: "Japanese" },
  { id: "eu", place: "Europe", tag: "European", label: "European" },
  { id: "au", place: "Australia", tag: "Australian", label: "Australian" },
  { id: "ca", place: "Canada", tag: "Canadian", label: "Canadian" },
];

export function parseOrigin(value: string | null | undefined): OriginId | undefined {
  return ORIGINS.find((o) => o.id === value)?.id;
}

export function getOrigin(id: OriginId): Origin {
  return ORIGINS.find((o) => o.id === id)!;
}

// Brand names, normalized (see normalize below). Matched as whole words
// anywhere in the brand, so "Round Lab | SEORIN" and "La Roche-Posay" hit.
// "=name" matches only the whole brand: short or everyday words ("Simple",
// "Hera", "AHC") that would otherwise catch unrelated names.
const BRANDS: Record<OriginId, string[]> = {
  kr: [
    "cosrx", "round lab", "seorin", "skin1004", "craver", "torriden", "isntree", "some by mi", "perennebell",
    "dr jart", "have be", "too cool for school", "tonymoly", "aekyung", "amorepacific", "laneige", "innisfree",
    "sulwhasoo", "etude", "missha", "able c c", "lg h h", "lg household", "jungsaemmool", "nature republic",
    "skinfood", "mediheal", "d alba", "celimax", "vt cosmetics", "pyunkang yul", "jumiso", "beplain", "peripera",
    "rom nd", "manyo", "ma nyo", "mizon", "clio", "biodance", "atomy", "hanscos", "cellinbio", "kgc", "konad",
    "thank you farmer", "tirtir", "anua", "beauty of joseon", "purito", "klairs", "banila co", "holika holika",
    "neogen", "heimish", "iunik", "axis y", "benton", "mixsoon", "abib", "goodal", "numbuzin", "haruharu",
    "aestura", "illiyoon", "centellian24", "dr ceuracle", "the saem", "a pieu", "acwell", "dr althea", "wellage",
    "papa recipe", "isoi", "rovectin", "medipeel", "skin79", "cosnori", "dewytree", "medicube", "3ce", "nanda",
    "stylenanda", "wizcoz", "isa knox", "belif", "the face shop", "thefaceshop", "sd biotech", "snp", "naturecell",
    "dr jucre", "sd biotechnologies", "fmg co", "=ahc", "=hera", "=primera", "=mamonde", "=cnp",
  ],
  jp: [
    "shiseido", "anessa", "cle de peau", "biore", "curel", "hada labo", "rohto", "skin aqua", "melano cc",
    "dhc", "kose", "sekkisei", "canmake", "fancl", "kanebo", "sk ii", "muji", "minon", "shu uemura", "naturie",
    "hatomugi", "kikumasamune", "ipsa", "senka", "tsubaki", "cezanne", "decorte", "=allie",
  ],
  eu: [
    "la roche posay", "vichy", "garnier", "l oreal paris", "l oreal norge", "lancome", "sicos et cie",
    "cosmetique active", "bioderma", "avene", "pierre fabre", "a derma", "ducray", "klorane", "uriage", "nuxe",
    "caudalie", "embryolisse", "filorga", "noreva", "topicrem", "sesderma", "heliocare", "isdin", "bella aurora",
    "weleda", "dr hauschka", "sebamed", "elemis", "medik8", "pixi", "no7", "boots", "altruist", "piz buin",
    "ultrasun", "kiko milano", "collistar", "rilastil", "bionike", "payot", "darphin", "biotherm", "clarins",
    "sisley", "chanel", "l occitane", "laboratoires m l", "yves rocher", "garancia", "typology", "byphasse",
    "mustela", "nivea", "eucerin", "balea", "isana", "rossmann", "ziaja", "lavera", "babaria", "deliplus",
    "mercadona", "cien", "mixa", "sanex", "guinot", "janssen cosmetics", "la prairie", "omorovicza",
    "the body shop", "rimmel", "the inkey list", "byoma", "burberry", "dior", "guerlain", "dolce gabbana",
    "istituto elvetico sanders", "temmentec", "dr greve", "decleor", "esthederm", "=simple", "=svr", "=l oreal",
  ],
  au: [
    "bondi sands", "naked sundays", "naked sunday", "bali body", "ethical zinc", "uv natural", "ultra violette",
    "sukin", "we are feel good", "cancer council", "invisible zinc", "aesop", "go to skin", "alpha h",
    "frank body", "eco tan",
  ],
  ca: [
    "the ordinary", "deciem", "niod", "hylamide", "attitude", "9055 7588 quebec", "druide", "consonant",
    "live clean", "green beaver", "marcelle", "lise watier", "annabelle", "life brand", "derma sciences canada",
    "province apothecary",
  ],
};

export function normalizeBrand(name: string): string {
  return ` ${name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

const MATCHERS: { id: OriginId; whole: Set<string>; words: string[] }[] = ORIGINS.map(({ id }) => ({
  id,
  whole: new Set(BRANDS[id].filter((b) => b.startsWith("=")).map((b) => normalizeBrand(b.slice(1)))),
  words: BRANDS[id].filter((b) => !b.startsWith("=")).map(normalizeBrand),
}));

/** The origin of a brand name (as productBrand() returns it), or null when it isn't a listed brand. */
export function brandOrigin(brand: string | null | undefined): OriginId | null {
  if (!brand) return null;
  const n = normalizeBrand(brand);
  for (const m of MATCHERS) if (m.whole.has(n) || m.words.some((w) => n.includes(w))) return m.id;
  return null;
}

/**
 * A product's origin: its brand's, else a listed brand its name starts with
 * ("Biore UV Aqua Rich" from a labeler, Kao USA, that also sells Jergens).
 */
export function productNameOrigin(brand: string | null | undefined, productName: string): OriginId | null {
  const fromBrand = brandOrigin(brand);
  if (fromBrand) return fromBrand;
  const n = normalizeBrand(productName);
  for (const m of MATCHERS) if (m.words.some((w) => n.startsWith(w))) return m.id;
  return null;
}
