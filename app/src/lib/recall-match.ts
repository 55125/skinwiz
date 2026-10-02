// Matching openFDA drug-enforcement (recall) records to catalog products.
// Pure (no database), unit tested in recall-match.test.ts. Identifier
// matches are near-certain; text matches are deliberately conservative and
// flagged as such, because telling someone their product is recalled when it
// isn't is its own harm.
//
// Confidence scale:
//   1.00 ndc       openfda.product_ndc equals the product's NDC
//   0.95 ndc_text  an NDC printed in the recall's description/code info
//   0.95 upc       a UPC/EAN barcode in the recall equals a barcode-keyed product
//   0.90 upc       a drug UPC (3 + NDC) that decodes to exactly one catalog NDC
//   0.60-0.75 text same firm + every distinctive word of our product name
// Only >= EMAIL_CONFIDENCE is emailed or described as "this product is recalled".

export const EMAIL_CONFIDENCE = 0.9;

export type RecallRecord = {
  recallNumber: string;
  productDescription: string;
  codeInfo: string | null;
  recallingFirm: string | null;
  productNdcs: string[];
  brandNames: string[];
};

export type CatalogProduct = { id: string; brandName: string; manufacturer: string | null };

export type RecallMatch = { productId: string; matchType: "ndc" | "ndc_text" | "upc" | "text"; confidence: number; matchedOn: string };

// --- identifiers ----------------------------------------------------------

/** "49967-138" / "0363-0012" -> canonical 5-4 "49967-0138" / "00363-0012". */
export function normalizeProductNdc(ndc: string): string | null {
  const m = /^(\d{4,5})-(\d{3,4})(?:-\d{1,2})?$/.exec(ndc.trim());
  if (!m) return null;
  const [, lab, prod] = m;
  if (lab.length + prod.length !== 8 && lab.length + prod.length !== 9) return null;
  return `${lab.padStart(5, "0")}-${prod.padStart(4, "0")}`;
}

/** NDCs printed in free text. Only trusted where the text says "NDC". */
export function extractNdcs(text: string): string[] {
  if (!/\bNDC/i.test(text)) return [];
  const out = new Set<string>();
  // Full package codes (4-4-2, 5-3-2, 5-4-1) are distinctive enough anywhere in an NDC-mentioning text.
  for (const m of text.matchAll(/(?<![\d-])(\d{4,5})-(\d{3,4})-(\d{1,2})(?![\d-])/g)) {
    if (m[1].length + m[2].length + m[3].length !== 10) continue;
    const n = normalizeProductNdc(`${m[1]}-${m[2]}`);
    if (n) out.add(n);
  }
  // Product-only codes and 11-digit undashed codes only right after "NDC".
  for (const m of text.matchAll(/NDC[#:\s.]*(?:No\.?|Number)?[#:\s]*(\d{4,5})-(\d{3,4})(?![\d-])/gi)) {
    const n = normalizeProductNdc(`${m[1]}-${m[2]}`);
    if (n) out.add(n);
  }
  for (const m of text.matchAll(/NDC[#:\s.]*(?:No\.?|Number)?[#:\s]*(\d{11})(?!\d)/gi)) {
    out.add(`${m[1].slice(0, 5)}-${m[1].slice(5, 9)}`);
  }
  return [...out];
}

/** Barcodes (UPC-A / EAN-13), digits only, 12-digit form when it's a UPC. */
export function normalizeBarcode(raw: string): string | null {
  const d = raw.replace(/[\s-]/g, "");
  if (!/^\d{12,13}$/.test(d)) return null;
  return d.length === 13 && d.startsWith("0") ? d.slice(1) : d;
}

export function extractBarcodes(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(?:UPC|EAN|barcode)[^0-9]{0,12}((?:\d[ -]?){11,13}\d?)/gi)) {
    const b = normalizeBarcode(m[1].trim());
    if (b) out.add(b);
  }
  for (const m of text.matchAll(/(?<![\d-])(\d{12,13})(?![\d-])/g)) {
    const b = normalizeBarcode(m[1]);
    if (b) out.add(b);
  }
  return [...out];
}

/** A drug UPC-A is "3" + the 10-digit NDC + check digit; the NDC split is ambiguous, so return each reading. */
export function ndcCandidatesFromUpc(upc12: string): string[] {
  if (upc12.length !== 12 || !upc12.startsWith("3")) return [];
  const ten = upc12.slice(1, 11);
  return [
    `${ten.slice(0, 4)}-${ten.slice(4, 8)}`, // 4-4-2
    `${ten.slice(0, 5)}-${ten.slice(5, 8)}`, // 5-3-2
    `${ten.slice(0, 5)}-${ten.slice(5, 9)}`, // 5-4-1
  ].map((n) => normalizeProductNdc(n)!);
}

// --- text -----------------------------------------------------------------

const FIRM_NOISE = new Set(
  "inc incorporated llc l l c co corp corporation company ltd limited lp plc the usa us america products product group holdings intl international gmbh sa srl ag bv pvt private".split(" "),
);

export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function firmKey(firm: string): string[] {
  return [...new Set(tokens(firm).filter((t) => !FIRM_NOISE.has(t)))].sort();
}

export function sameFirm(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const ka = firmKey(a);
  const kb = firmKey(b);
  if (!ka.length || !kb.length) return false;
  if (ka.join(" ") === kb.join(" ")) return true;
  const [small, big] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
  return small.length >= 2 && small.every((t) => big.includes(t));
}

// Words that say what kind of product it is, not which one -- they can't
// distinguish two products from the same firm.
const GENERIC = new Set(
  (
    "a an and the of for with by in on to plus new original daily " +
    "acne treatment treatments medication medicated cream creme gel lotion cleanser cleansing wash face facial body " +
    "spf broad spectrum sunscreen sun block sunblock skin care oil free maximum max strength extra regular formula " +
    "moisturizer moisturizing moisturiser spot serum kit set pads pad foam foaming bar soap stick spray mist ointment solution topical " +
    "benzoyl peroxide salicylic acid zinc oxide titanium dioxide adapalene sulfur hydrocortisone avobenzone octocrylene homosalate octisalate " +
    "fl oz ml g mg tube bottle jar pack count ct size travel unscented fragrance"
  ).split(" "),
);

// Product forms: if our name says which, the recall must say the same one.
const FORMS = new Set(
  "cream creme lotion gel cleanser wash serum spray stick ointment foam pads oil balm mist powder soap bar shampoo toner mask".split(" "),
);

export function distinctiveTokens(name: string): string[] {
  return [...new Set(tokens(name).filter((t) => !GENERIC.has(t) && !/^\d+$/.test(t)))];
}

// The product-naming part of a recall description: before the distributor /
// manufacturer address boilerplate, so a state code like "AZ" in an address
// can't satisfy a product called "Effaclar AZ".
export function namePart(description: string): string {
  const cut = description.search(/\b(distributed|dist\.|manufactured|mfd\.?|mfg\.?|made (in|for|by)|marketed by|packaged (by|for)|upc|ndc)\b/i);
  return cut > 0 ? description.slice(0, cut) : description;
}

// --- index + match --------------------------------------------------------

export type CatalogIndex = {
  byNdc: Map<string, string[]>;
  byBarcode: Map<string, string[]>;
  byFirm: Map<string, CatalogProduct[]>;
};

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => m.set(k, [...(m.get(k) ?? []), v]);

export function buildCatalogIndex(products: CatalogProduct[]): CatalogIndex {
  const idx: CatalogIndex = { byNdc: new Map(), byBarcode: new Map(), byFirm: new Map() };
  for (const p of products) {
    const ndc = normalizeProductNdc(p.id);
    if (ndc) push(idx.byNdc, ndc, p.id);
    const bc = normalizeBarcode(p.id);
    if (bc) push(idx.byBarcode, bc, p.id);
    if (p.manufacturer) {
      const key = firmKey(p.manufacturer).join(" ");
      if (key) push(idx.byFirm, key, p);
    }
  }
  return idx;
}

function firmCandidates(idx: CatalogIndex, firm: string): CatalogProduct[] {
  const key = firmKey(firm);
  if (!key.length) return [];
  const exact = idx.byFirm.get(key.join(" "));
  if (exact) return exact;
  // Rare: subset-equal firm names ("Johnson & Johnson Consumer" vs "Johnson & Johnson").
  if (key.length < 2) return [];
  const out: CatalogProduct[] = [];
  for (const [k, ps] of idx.byFirm) if (sameFirm(k, key.join(" "))) out.push(...ps);
  return out;
}

export function matchRecall(r: RecallRecord, idx: CatalogIndex): RecallMatch[] {
  const found = new Map<string, RecallMatch>();
  const add = (m: RecallMatch) => {
    const prev = found.get(m.productId);
    if (!prev || prev.confidence < m.confidence) found.set(m.productId, m);
  };

  for (const raw of r.productNdcs) {
    const n = normalizeProductNdc(raw);
    for (const id of (n && idx.byNdc.get(n)) || []) add({ productId: id, matchType: "ndc", confidence: 1, matchedOn: `openfda.product_ndc ${raw}` });
  }
  const text = `${r.productDescription}\n${r.codeInfo ?? ""}`;
  for (const n of extractNdcs(text)) {
    for (const id of idx.byNdc.get(n) ?? []) add({ productId: id, matchType: "ndc_text", confidence: 0.95, matchedOn: `NDC ${n} in recall text` });
  }
  for (const bc of extractBarcodes(text)) {
    for (const id of idx.byBarcode.get(bc) ?? []) add({ productId: id, matchType: "upc", confidence: 0.95, matchedOn: `barcode ${bc} in recall text` });
    const hits = ndcCandidatesFromUpc(bc).flatMap((n) => (idx.byNdc.get(n) ?? []).map((id) => ({ id, n })));
    const distinct = [...new Set(hits.map((h) => h.n))];
    if (distinct.length === 1) {
      for (const h of hits) add({ productId: h.id, matchType: "upc", confidence: 0.9, matchedOn: `UPC ${bc} encodes NDC ${h.n}` });
    }
  }
  if (found.size) return [...found.values()];

  // Text fallback, only when no identifier matched anything.
  if (!r.recallingFirm) return [];
  // If the recall names its own NDCs and none is ours, our NDC-keyed products
  // are different products (often a sibling shade or SPF from the same firm).
  const recallHasNdc = r.productNdcs.length > 0 || extractNdcs(text).length > 0;
  const name = namePart(r.productDescription);
  const recallWords = new Set(tokens(`${name} ${r.brandNames.join(" ")}`));
  const scored: { p: CatalogProduct; n: number; exactBrand: boolean }[] = [];
  for (const p of firmCandidates(idx, r.recallingFirm)) {
    if (recallHasNdc && normalizeProductNdc(p.id)) continue;
    const words = distinctiveTokens(p.brandName);
    if (words.length < 2 || !words.every((w) => recallWords.has(w))) continue;
    // Same line, different form ("Ultra Repair Face Lotion" vs the recalled
    // "Ultra Repair Cream"; the Effaclar Duo cleanser vs the Duo treatment).
    const forms = tokens(p.brandName).filter((t) => FORMS.has(t));
    if (forms.length && !forms.some((f) => recallWords.has(f))) continue;
    const exactBrand = r.brandNames.some((b) => tokens(b).join(" ") === tokens(p.brandName).join(" "));
    scored.push({ p, n: words.length, exactBrand });
  }
  if (!scored.length) return [];
  const best = Math.max(...scored.map((s) => s.n));
  const top = scored.filter((s) => s.n === best);
  // Several same-firm products fit equally well: the recall text can't tell
  // them apart, so claim none of them.
  if (top.length > 3) return [];
  return top.map((s) => ({
    productId: s.p.id,
    matchType: "text" as const,
    confidence: s.exactBrand ? 0.75 : top.length === 1 ? 0.7 : 0.6,
    matchedOn: `firm "${r.recallingFirm}" + name words: ${distinctiveTokens(s.p.brandName).join(", ")}`,
  }));
}

// --- presentation helpers ---------------------------------------------------

/** FDA's own definitions of the recall classes. */
export function classMeaning(classification: string | null): string | null {
  switch (classification) {
    case "Class I":
      return "the most serious type: a reasonable chance the product could cause serious health problems";
    case "Class II":
      return "the product may cause temporary or medically reversible health problems; serious harm is unlikely";
    case "Class III":
      return "the product is unlikely to cause health problems but breaks FDA labeling or manufacturing rules";
    default:
      return null;
  }
}

export function fdaRecallUrl(eventId: string | null): string {
  return eventId
    ? `https://www.accessdata.fda.gov/scripts/ires/index.cfm?Event=${encodeURIComponent(eventId)}`
    : "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts";
}

/** openFDA dates are YYYYMMDD. */
export function fdaDate(d: string | undefined | null): string | null {
  return d && /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null;
}
