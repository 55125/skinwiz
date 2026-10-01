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
