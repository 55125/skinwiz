// "Check at <store>" links for products with no price, affiliate link or
// manual link yet: a plain search on each retailer's own site, so no product
// page is a dead end. Store search pages can't be pointed at one product
// (their search ignores UPCs and NDCs, checked 2026-10-09), so the query is
// made as specific as a store title: label filler out, package size in. Each goes through outboundLink, so it earns through
// Sovrn's Redirect API once SOVRN_SITE_API_KEY is set and is a plain link
// (labelled as such) until then. Pure apart from reading env.
import { outboundLink, type OutboundLink } from "./prices/redirect";
import { FLOZ_TO_ML, OZ_TO_G, parsePackageDescription, type PackageSize } from "./equivalence";

export const RETAILER_SEARCHES: { name: string; url: (q: string) => string }[] = [
  { name: "Target", url: (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}` },
  { name: "Walmart", url: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}` },
  { name: "CVS", url: (q) => `https://www.cvs.com/search?searchTerm=${encodeURIComponent(q)}` },
];

const MAX_QUERY = 80;

/**
 * The search text: the product name, led by the brand when the name doesn't
 * already contain it, whitespace collapsed, capped at a word boundary. Only
 * pass a real brand (brand-direct and Open Beauty Facts rows): an FDA
 * labeler like "L'OREAL USA PRODUCTS" would make store results worse.
 */
// Label wording that every sunscreen shares and store titles mostly leave
// out, so it only widens a store's results.
const FILLER = /\b(?:broad[\s-]+spectrum|clubtray|club\s+tray)\b/gi;

/** "3 fl oz" / "1.7 oz" for a package size, as US store titles write it; "" when unknown. */
export function storeSize(size: PackageSize | null): string {
  if (!size || size.unit === "count") return "";
  const oz = size.amount / (size.unit === "mL" ? FLOZ_TO_ML : OZ_TO_G);
  if (!(oz >= 0.1 && oz < 100)) return "";
  const n = oz >= 10 ? Math.round(oz) : Math.round(oz * 10) / 10;
  return `${n} ${size.unit === "mL" ? "fl oz" : "oz"}`;
}

export function retailerQuery(name: string, brand?: string | null, size = ""): string {
  const n = name.replace(FILLER, " ").replace(/\s+/g, " ").trim();
  // Open Beauty Facts lists brands comma-separated ("CeraVe,L'Oréal"); the first is the label brand.
  const b = brand?.split(",")[0].replace(/\s+/g, " ").trim() ?? "";
  const q = b && n && !n.toLowerCase().includes(b.toLowerCase()) ? `${b} ${n}` : n;
  // The size goes on the end and is never what gets cut.
  const tail = q && size ? ` ${size}` : "";
  const room = MAX_QUERY - tail.length;
  if (q.length <= room) return q + tail;
  const cut = q.slice(0, room);
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : cut).trim() + tail;
}

export function retailerSearchLinks(
  name: string,
  brand?: string | null,
  env: NodeJS.ProcessEnv = process.env,
  gpc = false,
  // The NDC directory's package line, for the size (lib/equivalence.ts).
  packageDescription?: string | null,
): ({ name: string } & OutboundLink)[] {
  const q = retailerQuery(name, brand, storeSize(parsePackageDescription(packageDescription)));
  if (!q) return [];
  return RETAILER_SEARCHES.map((r) => ({
    name: r.name,
    ...outboundLink(r.url(q), { placement: "product", rel: "noopener noreferrer", gpc }, env),
  }));
}
