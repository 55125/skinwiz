// Hand-made affiliate links from tools/affiliate_feeds/manual_links.csv
// (columns product_id,retailer,url,size_label,added_at). Pure validation,
// shared by the seed and the product page read, tested in
// manual-links.test.ts. Works with no env vars at all.
//
// Only https URLs on an affiliate host we have an account with are
// accepted, so a typo or a pasted plain retailer URL can never render as
// an affiliate link: Sovrn short links (sovrn.co), and Amazon product pages
// (amazon.com/dp/<ASIN>), which get our Associates tag added at render.
// Never request these URLs from code or tests: an automated hit could count
// as invalid traffic on the account.

export const MANUAL_LINK_HOSTS = ["sovrn.co"];

// Amazon Associates store ID. Not a secret (it's in every link); the env var
// only exists so a different ID can be used without a code change.
export function amazonTag(): string {
  return process.env.AMAZON_ASSOCIATE_TAG?.trim() || "mtass-20";
}

const AMAZON_HOSTS = ["amazon.com", "www.amazon.com"];
const ASIN_PATH = /^\/(?:[^/]+\/)?dp\/([A-Z0-9]{10})(?:[/?]|$)/;

/** The ASIN of an amazon.com product-page URL, or null. */
export function amazonAsin(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !AMAZON_HOSTS.includes(u.hostname.toLowerCase())) return null;
  return ASIN_PATH.exec(u.pathname)?.[1] ?? null;
}

export function isAllowedManualLinkUrl(url: string): boolean {
  if (amazonAsin(url)) return true;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
  return MANUAL_LINK_HOSTS.includes(u.hostname.toLowerCase()) && u.pathname.length > 1;
}

/**
 * The href to render. Amazon links are rebuilt as a clean
 * amazon.com/dp/<ASIN>?tag=<our tag> (Amazon requires the tag and forbids
 * cloaking, so it's never shortened or wrapped); other hosts pass through.
 */
export function manualLinkHref(url: string): string {
  const asin = amazonAsin(url);
  return asin ? `https://www.amazon.com/dp/${asin}?tag=${encodeURIComponent(amazonTag())}` : url;
}

export function isAmazonLink(url: string): boolean {
  return amazonAsin(url) !== null;
}

export type ManualLinkRow = { product_id?: string; retailer?: string; url?: string; size_label?: string; added_at?: string };
export type ManualLink = { productId: string; retailer: string; url: string; sizeLabel: string | null; addedAt: string | null };

/**
 * The CSV rows that may be seeded: an allowed URL, a retailer name, and a
 * product that exists and isn't Rx. Everything else is reported back.
 */
export function validateManualLinks(rows: ManualLinkRow[], otcIds: Set<string>): { links: ManualLink[]; rejected: { row: number; reason: string }[] } {
  const links: ManualLink[] = [];
  const rejected: { row: number; reason: string }[] = [];
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const productId = r.product_id?.trim() ?? "";
    const retailer = r.retailer?.trim() ?? "";
    const url = r.url?.trim() ?? "";
    const reason = !otcIds.has(productId)
      ? "unknown or prescription product"
      : !retailer
        ? "missing retailer"
        : !isAllowedManualLinkUrl(url)
          ? "url not on the affiliate-host allowlist"
          : seen.has(`${productId}|${url}`)
            ? "duplicate"
            : null;
    if (reason) {
      rejected.push({ row: i + 2, reason }); // +2: header line, 1-based
      return;
    }
    seen.add(`${productId}|${url}`);
    links.push({ productId, retailer, url, sizeLabel: r.size_label?.trim() || null, addedAt: r.added_at?.trim() || null });
  });
  return { links, rejected };
}

/** "Buy at Walmart (8 oz)". */
export function manualLinkLabel(l: { retailer: string; sizeLabel: string | null }): string {
  return `Buy at ${l.retailer}${l.sizeLabel ? ` (${l.sizeLabel})` : ""}`;
}
