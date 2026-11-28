import type { Metadata } from "next";

// Filtered, sorted and paginated variants of a listing page are kept out of
// the index (links are still followed, so every product stays reachable);
// only the base listing is indexed, under its canonical URL.
export function variantRobots(params: Record<string, string | undefined>): Metadata["robots"] {
  return Object.values(params).some(Boolean) ? { index: false, follow: true } : undefined;
}

// JSON-LD BreadcrumbList from [name, path] pairs; paths are site-relative.
export function breadcrumbLd(base: string, items: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${base}${path}`,
    })),
  };
}

type TitleProduct = {
  brandName: string;
  manufacturer: string | null;
  dosageForm: string | null;
  strengths: Record<string, number> | null;
  activeIds: string[];
};

// ~3k products share a brandName with another listing (same product line in
// a different strength, form or labeler), so the title adds whichever of
// strength, form and maker it takes to tell them apart, most useful first.
export function productTitle(p: TitleProduct, describe: (s: TitleProduct["strengths"], ids: string[]) => string | null, maker: (m: string) => string): string {
  const name = p.brandName.trim();
  const lower = name.toLowerCase();
  const parts: string[] = [];
  const strength = describe(p.strengths, p.activeIds);
  if (strength && p.strengths && Object.keys(p.strengths).length > 0) parts.push(strength);
  const form = p.dosageForm?.toLowerCase();
  if (form && !lower.includes(form)) parts.push(form);
  let title = parts.length ? `${name} (${parts.join(", ")})` : name;
  const m = p.manufacturer ? maker(p.manufacturer) : "";
  const makerWord = m.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (m && makerWord.length > 2 && !lower.includes(makerWord)) title += ` by ${m}`;
  return title;
}

// The search snippet for a product page. FDA drug rows lead with the label's
// active ingredient and strength; everything else used to lead with the raw
// ingredient list ("Aqua (Water), Dimethicone, ..."), which tells a searcher
// nothing, so it now names the tracked actives, the concern and the
// free-from checks it passes instead.
export type DescribedProduct = {
  name: string;
  brand: string | null;
  isDrugLabel: boolean;
  activeIngredientText: string | null;
  activeNames: string[];
  concernName: string | null;
  freeFrom: string[]; // labels of passed checks, most useful first ("Fragrance-free", ...)
};

const MAX_DESCRIPTION = 200;

function clip(s: string, max = MAX_DESCRIPTION): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40)).replace(/[\s,;:.—-]+$/, "")}…`;
}

const joinAnd = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

export function productDescription(p: DescribedProduct, siteName: string): string {
  const who = p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? `${p.name} by ${p.brand}` : p.name;
  if (p.isDrugLabel && p.activeIngredientText) {
    const what = p.concernName ? ` OTC ${p.concernName.toLowerCase()} product.` : "";
    return clip(`${who}: ${p.activeIngredientText.trim().replace(/\.$/, "")}.${what} Label details, ingredient checks and where to buy on ${siteName}.`);
  }
  const parts: string[] = [];
  const kind = p.concernName ? `a ${p.concernName.toLowerCase()} product` : "a skincare product";
  parts.push(p.activeNames.length ? `${who}: ${kind} with ${joinAnd(p.activeNames.slice(0, 3).map((a) => a.toLowerCase()))}.` : `${who}: ${kind}.`);
  if (p.freeFrom.length) {
    const ff = joinAnd(p.freeFrom.slice(0, 3).map((f) => f.toLowerCase()));
    parts.push(`${ff[0].toUpperCase()}${ff.slice(1)}.`);
  }
  // The closing line only when it fits whole; a cut-off sentence reads worse than none.
  const close = `Full ingredients, allergen flags and where to buy on ${siteName}.`;
  const body = parts.join(" ");
  return body.length + 1 + close.length <= MAX_DESCRIPTION ? `${body} ${close}` : clip(body);
}

// schema.org Product for a product page, or null. Google requires offers, a
// review or a rating on Product markup and flags every page without one as
// an error in Search Console, so the markup is only emitted when the page
// shows fresh prices (an AggregateOffer across stores). We have no reviews or
// ratings Google accepts. The barcode goes in as gtin only when it is a valid UPC/EAN.
export function productLd(p: {
  url: string;
  name: string;
  brand: string | null;
  description: string;
  image: string | null;
  gtin: string | null;
  prices: number[];
}) {
  const prices = p.prices.filter((x) => Number.isFinite(x) && x > 0);
  if (!prices.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    url: p.url,
    description: p.description,
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(p.image ? { image: p.image } : {}),
    ...(p.gtin ? { gtin: p.gtin } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: prices.length,
    },
  };
}
