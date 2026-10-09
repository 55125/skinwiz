// "Check at <store>" links for products with no price, affiliate link or
// manual link yet: a plain search on each retailer's own site, so no product
// page is a dead end. Each goes through outboundLink, so it earns through
// Sovrn's Redirect API once SOVRN_SITE_API_KEY is set and is a plain link
// (labelled as such) until then. Pure apart from reading env.
import { outboundLink, type OutboundLink } from "./prices/redirect";
import { validGtin } from "./product-codes";

// `upc`: the store's own search finds an item by its UPC, so a product with
// a known barcode gets an exact search instead of a name search that can
// list a dozen lookalikes. CVS's search doesn't match UPCs, so it keeps the name.
export const RETAILER_SEARCHES: { name: string; upc: boolean; url: (q: string) => string }[] = [
  { name: "Target", upc: true, url: (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}` },
  { name: "Walmart", upc: true, url: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}` },
  { name: "CVS", upc: false, url: (q) => `https://www.cvs.com/search?searchTerm=${encodeURIComponent(q)}` },
];

/**
 * The barcode as US stores index it: a UPC-A (12 digits) when the code is
 * one, whatever length it was stored at; an EAN-13 otherwise. Null for
 * anything that isn't a valid retail GTIN, an EAN-8 or a 14-digit case code.
 */
export function storeUpc(barcode: string | null | undefined): string | null {
  const d = barcode?.trim() ?? "";
  if (!/^\d+$/.test(d) || d.length === 8 || !validGtin(d)) return null;
  const core = d.replace(/^0+/, "");
  if (core.length <= 12) return core.padStart(12, "0");
  return core.length === 13 ? core : null;
}

const MAX_QUERY = 80;

/**
 * The search text: the product name, led by the brand when the name doesn't
 * already contain it, whitespace collapsed, capped at a word boundary. Only
 * pass a real brand (brand-direct and Open Beauty Facts rows): an FDA
 * labeler like "L'OREAL USA PRODUCTS" would make store results worse.
 */
export function retailerQuery(name: string, brand?: string | null): string {
  const n = name.replace(/\s+/g, " ").trim();
  // Open Beauty Facts lists brands comma-separated ("CeraVe,L'Oréal"); the first is the label brand.
  const b = brand?.split(",")[0].replace(/\s+/g, " ").trim() ?? "";
  const q = b && n && !n.toLowerCase().includes(b.toLowerCase()) ? `${b} ${n}` : n;
  if (q.length <= MAX_QUERY) return q;
  const cut = q.slice(0, MAX_QUERY);
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : cut).trim();
}

export function retailerSearchLinks(
  name: string,
  brand?: string | null,
  env: NodeJS.ProcessEnv = process.env,
  gpc = false,
  // The product's retail barcode, when one is known (catalog or label scan).
  barcode?: string | null,
): ({ name: string; byBarcode: boolean } & OutboundLink)[] {
  const q = retailerQuery(name, brand);
  const upc = storeUpc(barcode);
  if (!q && !upc) return [];
  return RETAILER_SEARCHES.flatMap((r) => {
    const byBarcode = !!upc && r.upc;
    const term = byBarcode ? upc : q;
    if (!term) return [];
    return [{ name: r.name, byBarcode, ...outboundLink(r.url(term), { placement: "product", rel: "noopener noreferrer", gpc }, env) }];
  });
}
