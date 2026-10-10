// The product page's short "Where to buy" row near the top: the same store
// links as the full section further down, in the same order and under the
// same rules, capped to a few buttons. Each link carries whether it can earn
// us a commission, so the row's one-line disclosure is worded from what it
// actually holds (FTC: disclosure next to the links, not only in the footer).

import { isAmazonLink, manualLinkHref, manualLinkLabel } from "@/lib/manual-links";

export type QuickBuyLink = {
  key: string;
  label: string;
  href: string;
  rel: string;
  /** We may earn a commission on it. */
  affiliate: boolean;
  amazon?: boolean;
  /** Opens a store search rather than the product. */
  search?: boolean;
};

type Sources = {
  quotes: { source: string; merchantId: string; merchantName: string; price: number; url: string; affiliatable: boolean }[];
  manualLinks: { id: number | string; retailer: string; sizeLabel: string | null; url: string }[];
  affiliateLinks: { id: number | string; network: string; price: number | null; buyUrl: string }[];
  brandLink: { href: string; rel: string; wrapped: boolean } | null;
  brandName: string | null;
  retailerSearches: { name: string; href: string; rel: string; wrapped: boolean }[];
};

const money = (n: number) => `$${n.toFixed(2)}`;

export function quickBuyLinks(s: Sources, max = 4): QuickBuyLink[] {
  const out: QuickBuyLink[] = [];
  for (const q of s.quotes) {
    out.push({
      key: `q-${q.source}-${q.merchantId}`,
      label: `${money(q.price)} at ${q.merchantName}`,
      href: q.url,
      rel: q.affiliatable ? "sponsored nofollow noopener noreferrer" : "nofollow noopener noreferrer",
      affiliate: q.affiliatable,
    });
  }
  for (const l of s.manualLinks) {
    out.push({
      key: `m-${l.id}`,
      label: manualLinkLabel(l),
      href: manualLinkHref(l.url),
      rel: "sponsored nofollow noopener",
      affiliate: true,
      amazon: isAmazonLink(l.url),
    });
  }
  // As in the full section: network links only without live prices, else the brand's own page.
  if (s.affiliateLinks.length > 0 && s.quotes.length === 0) {
    for (const l of s.affiliateLinks) {
      out.push({
        key: `a-${l.id}`,
        label: l.price ? `${money(l.price)} via ${l.network}` : `Buy via ${l.network}`,
        href: l.buyUrl,
        rel: "noopener noreferrer sponsored",
        affiliate: true,
      });
    }
  } else if (s.brandLink) {
    out.push({
      key: "brand",
      label: `Buy from ${s.brandName || "the manufacturer"}`,
      href: s.brandLink.href,
      rel: s.brandLink.rel,
      affiliate: s.brandLink.wrapped,
    });
  }
  if (s.quotes.length === 0 && s.manualLinks.length === 0 && s.affiliateLinks.length === 0) {
    for (const r of s.retailerSearches) {
      out.push({ key: `s-${r.name}`, label: r.name, href: r.href, rel: r.rel, affiliate: r.wrapped, search: true });
    }
  }
  return out.slice(0, max);
}

/** One line of disclosure for the links in the row. */
export function quickBuyDisclosure(links: QuickBuyLink[]): string {
  const paid = links.filter((l) => l.affiliate).length;
  const base =
    paid === 0
      ? "Not affiliate links: we don't earn a commission on them."
      : paid === links.length
        ? "Affiliate links: we may earn a commission."
        : "Some are affiliate links: we may earn a commission.";
  return links.some((l) => l.amazon) ? `${base} As an Amazon Associate I earn from qualifying purchases.` : base;
}
