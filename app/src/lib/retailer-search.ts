// "Check at <store>" links for products with no price, affiliate link or
// manual link yet: a plain search on each retailer's own site, so no product
// page is a dead end. Each goes through outboundLink, so it earns through
// Sovrn's Redirect API once SOVRN_SITE_API_KEY is set and is a plain link
// (labelled as such) until then. Pure apart from reading env.
import { outboundLink, type OutboundLink } from "./prices/redirect";

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
): ({ name: string } & OutboundLink)[] {
  const q = retailerQuery(name, brand);
  if (!q) return [];
  return RETAILER_SEARCHES.map((r) => ({
    name: r.name,
    ...outboundLink(r.url(q), { placement: "product", rel: "noopener noreferrer" }, env),
  }));
}
