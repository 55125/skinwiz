import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { EquivalenceExplainer, EquivalenceRows } from "@/components/equivalence-list";
import { JsonLd } from "@/components/json-ld";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { getEquivalenceGroup, getEquivalenceGroups } from "@/lib/otc-index";
import { getConcern, getLivePrices } from "@/lib/queries";
import { formatPerUnit, sortByUnitPrice, storeBrandSavings } from "@/lib/prices/unit";
import { StoreBrandSavingsNote } from "@/components/price-list";
import { HSA_GUIDE_PATH } from "@/lib/hsa";
import { breadcrumbLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { SITE_NAME } from "@/lib/brand";

// Groups are rebuilt from the live catalog (lib/otc-index.ts), same reason
// the sitemap is dynamic: the catalog changes on reseed, not on deploy.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = getEquivalenceGroup(slug);
  if (!group) return {};
  const stores = group.members.filter((m) => m.storeBrand).length;
  return {
    title: `${group.title}: ${group.members.length} products, same active & strength`,
    description: `${group.members.length} FDA-listed OTC ${group.title} products from ${group.labelerCount} labelers${
      stores ? `, including ${stores} store brands` : ""
    } — same active ingredient at the same strength. Compare inactive ingredients on ${SITE_NAME}.`,
    alternates: { canonical: `/same/${group.slug}` },
  };
}

export default async function SamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = getEquivalenceGroup(slug);
  if (!group) notFound();

  const concern = getConcern(group.concernId);
  const storeBrands = group.members.filter((m) => m.storeBrand);
  const named = group.members.filter((m) => !m.storeBrand);
  const reference = named[0] ?? group.members[0];

  // Live prices only (empty until a live price source is configured, and then
  // only quotes under 72h old -- so with none, no price renders and the order
  // is unchanged). Per-unit uses the offer's own size, else the priced
  // listing's NDC package size; priced rows sort cheapest per unit first.
  const live = getLivePrices(new Map(group.members.map((m) => [m.id, m.ids])));
  const prices = new Map([...live].map(([id, p]) => [id, { price: p.price, perUnit: formatPerUnit(p.perUnit) }]));
  const savings = storeBrandSavings(group.members, live);
  const namedRows = sortByUnitPrice(named, live);
  const storeRows = sortByUnitPrice(storeBrands, live);

  // Other strengths/forms of the same active(s), for internal linking.
  const related = getEquivalenceGroups()
    .filter((g) => g.slug !== group.slug && g.activeIds.some((id) => group.activeIds.includes(id)))
    .slice(0, 12);

  const base = siteUrl();
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <JsonLd
        data={breadcrumbLd(base, [
          ["Home", "/"],
          ["Same active, same strength", "/same"],
          [group.title, `/same/${group.slug}`],
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${group.title} products`,
          numberOfItems: group.members.length,
          itemListElement: group.members.map((m, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: m.brandName,
            url: `${base}/product/${encodeURIComponent(m.id)}`,
          })),
        }}
      />
      <PageHeader
        eyebrow="Same active, same strength"
        title={`${group.title}: ${group.members.length} products`}
        description={`${group.members.length} products from ${group.labelerCount} labelers list ${group.title.toLowerCase()} on their FDA drug label${
          storeBrands.length ? ` — ${storeBrands.length} of them store brands` : ""
        }.`}
      >
        <EquivalenceExplainer group={group} />
        <p className="text-sm text-muted-foreground">
          OTC medicines like these are usually{" "}
          <Link href={HSA_GUIDE_PATH} className="underline">
            HSA/FSA eligible
          </Link>
          {concern ? (
            <>
              {" "}· More for{" "}
              <Link href={`/concern/${concern.id}`} className="underline">
                {concern.name}
              </Link>
            </>
          ) : null}
        </p>
      </PageHeader>

      <RedFlagBanner />

      {savings && <StoreBrandSavingsNote savings={savings} live={live} />}

      {named.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Name brands and generics ({named.length})</h2>
          <EquivalenceRows members={namedRows} compareWith={storeBrands[0]?.id} prices={prices} />
        </section>
      )}

      {storeBrands.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Store brands ({storeBrands.length})</h2>
            <p className="text-sm text-muted-foreground">
              Retailer and pharmacy private labels, identified from the labeler name on the FDA listing.
            </p>
          </div>
          <EquivalenceRows members={storeRows} compareWith={reference.id} prices={prices} />
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Product listings come from FDA drug listing data (openFDA/DailyMed), which manufacturers file themselves; FDA
        does not verify them for accuracy, and some may be discontinued. Pack sizes of the same product are shown once.
      </p>

      {related.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Other strengths and forms</h2>
          <ul className="flex flex-wrap gap-1.5 text-sm">
            {related.map((g) => (
              <li key={g.slug}>
                <Link href={`/same/${g.slug}`} className="inline-block rounded-full border px-3 py-1 hover:bg-muted">
                  {g.title} ({g.members.length})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
