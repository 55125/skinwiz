// Reads a search box entry as a product identifier, when it is one (pure;
// lib/queries.ts lookupProductsByCode runs the lookup). Someone pasting a
// barcode off a box or an NDC off a drug label wants that product, not a
// keyword search over ingredient text.
//
// Recognized:
//   UPC-A, EAN-13, EAN-8, GTIN-14   with a valid check digit; every length
//                                   of the same code compares equal (they
//                                   are all one GTIN zero-padded to 14)
//   UPC-A without its check digit   11 digits
//   Kroger productId                13 digits: the GTIN without its check
//                                   digit, zero-padded (lib/prices/kroger.ts)
//   NDC                             product (49967-138) or package
//                                   (49967-138-01), with or without hyphens,
//                                   10-digit or 11-digit (5-4-2 billing) form
//   Drug UPC                        "3" + the 10-digit NDC + check digit
//   DailyMed SPL set id             a UUID
// An optional "upc", "ean", "gtin", "ndc", "barcode" or "#" prefix is ignored.

export type ProductCode = {
  /** Every zero-padded spelling (8/12/13/14 digits) of each GTIN the entry could be. */
  barcodes: string[];
  /** Product NDCs as catalog ids spell them ("49967-138", "0023-1230"). */
  productNdcs: string[];
  /** 13-digit Kroger productIds, matched against stored Kroger product pages. */
  krogerIds: string[];
  /** Lowercase DailyMed set id. */
  setId: string | null;
};

const PREFIX = /^(?:upc|ean|gtin|ndc|barcode|bar code|#)\s*[:#]?\s*/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GS1 check digit for a code body (everything but the check digit). */
export function gtinCheckDigit(body: string): number {
  const sum = body
    .split("")
    .reverse()
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

export function validGtin(code: string): boolean {
  return /^\d{8}$|^\d{12,14}$/.test(code) && gtinCheckDigit(code.slice(0, -1)) === Number(code.slice(-1));
}

/** The UPC/EAN in a brand-direct id like "aquaphor-072140633776", when it is one (valid check digit). */
export function brandSiteBarcode(id: string): string | null {
  const m = /^[a-z]+-(\d{12,13})$/.exec(id);
  return m && validGtin(m[1]) ? m[1].padStart(13, "0") : null;
}

/** The 8/12/13/14-digit spellings of one GTIN, as stored barcodes and ids may use any of them. */
export function gtinSpellings(code: string): string[] {
  const core = code.replace(/^0+/, "");
  if (!core) return [];
  return [8, 12, 13, 14].filter((n) => core.length <= n).map((n) => core.padStart(n, "0"));
}

// Product NDCs a 10-digit package NDC could be (4-4-2, 5-3-2, 5-4-1).
function ndcsFromTen(d: string): string[] {
  return [`${d.slice(0, 4)}-${d.slice(4, 8)}`, `${d.slice(0, 5)}-${d.slice(5, 8)}`, `${d.slice(0, 5)}-${d.slice(5, 9)}`];
}

// Product NDCs an 11-digit (5-4-2, zero-padded) package NDC could be.
function ndcsFromEleven(d: string): string[] {
  const [labeler, product, pkg] = [d.slice(0, 5), d.slice(5, 9), d.slice(9)];
  const out: string[] = [];
  if (labeler.startsWith("0")) out.push(`${labeler.slice(1)}-${product}`); // 4-4-2
  if (product.startsWith("0")) out.push(`${labeler}-${product.slice(1)}`); // 5-3-2
  if (pkg.startsWith("0")) out.push(`${labeler}-${product}`); // 5-4-1
  return out;
}

// A hyphenated NDC: labeler-product, optionally -package, in 10- or
// 11-digit spelling ("50718-0032-1", "50718-0032-01", "00023-1230-01").
function ndcsFromHyphenated(s: string): string[] | null {
  const m = /^(\d{4,5})-(\d{3,4})(?:-(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const labelers = [m[1], ...(m[1].length === 5 && m[1].startsWith("0") ? [m[1].slice(1)] : [])];
  const products = [m[2], ...(m[2].length === 4 && m[2].startsWith("0") ? [m[2].slice(1)] : [])];
  // A 10-digit NDC's labeler and product segments total 8 or 9 digits
  // (4-4, 5-3, 5-4).
  return labelers.flatMap((l) => products.filter((p) => l.length + p.length >= 8 && !(l.length === 4 && p.length === 3)).map((p) => `${l}-${p}`));
}

const uniq = (xs: string[]) => [...new Set(xs)];

export function parseProductCode(raw: string): ProductCode | null {
  const s = raw.trim().replace(PREFIX, "").trim();
  if (UUID.test(s)) return { barcodes: [], productNdcs: [], krogerIds: [], setId: s.toLowerCase() };
  if (!/^[\d\s-]+$/.test(s)) return null;

  const d = s.replace(/\D/g, "");
  const gtins: string[] = [];
  const ndcs: string[] = [];
  const kroger: string[] = [];

  const hyphenated = ndcsFromHyphenated(s.replace(/\s+/g, ""));
  if (hyphenated) ndcs.push(...hyphenated);
  else {
    if (validGtin(d)) gtins.push(d);
    if (d.length === 10) ndcs.push(...ndcsFromTen(d));
    if (d.length === 11) {
      ndcs.push(...ndcsFromEleven(d));
      gtins.push(d + gtinCheckDigit(d)); // UPC-A typed without its check digit
    }
    // Kroger productIds all start with "0". A valid EAN-13 is taken as one
    // only when it starts "00", where both readings are plausible.
    if (d.length === 13 && d.startsWith("0")) {
      kroger.push(d);
      if (!validGtin(d) || d.startsWith("00")) gtins.push(d + gtinCheckDigit(d));
    }
  }

  // A drug UPC is "3" + the 10-digit NDC: the box's barcode finds the
  // product by NDC even when no barcode is stored for it.
  for (const g of gtins) {
    const upc = g.replace(/^0+/, "").padStart(12, "0");
    if (upc.length === 12 && upc.startsWith("3")) ndcs.push(...ndcsFromTen(upc.slice(1, 11)));
    if (validGtin(g)) {
      const body = g.slice(0, -1).replace(/^0+/, "");
      if (body && body.length <= 13) kroger.push(body.padStart(13, "0"));
    }
  }

  const code = {
    barcodes: uniq(gtins.flatMap(gtinSpellings)),
    productNdcs: uniq(ndcs),
    krogerIds: uniq(kroger),
    setId: null,
  };
  return code.barcodes.length || code.productNdcs.length ? code : null;
}
