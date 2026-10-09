import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { JsonLd } from "@/components/json-ld";
import { DupeEmpty, DupeExplainer, DupeRows } from "@/components/dupe-list";
import { findDupesCached } from "@/lib/dupes";
import { getProduct } from "@/lib/queries";
import { isSunscreen } from "@/lib/hsa";
import { breadcrumbLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { SITE_NAME } from "@/lib/brand";

// Every dupe of one product (lib/dupes.ts): the product page shows the best
// four and links here.
const LIMIT = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(decodeURIComponent(id));
  if (!product) return {};
  const canonicalId = product.canonicalId ?? product.id;
  return {
    title: `${product.brandName} dupes`,
    description: `Products with exactly the same active ingredients as ${product.brandName}, in the same form, ranked by how closely their inactive ingredients match. On ${SITE_NAME}.`,
    alternates: { canonical: `/product/${encodeURIComponent(canonicalId)}/dupes` },
  };
}

export default async function DupesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(decodeURIComponent(id));
  if (!product) notFound();
  if (product.canonicalId) permanentRedirect(`/product/${encodeURIComponent(product.canonicalId)}/dupes`);

  const dupes = findDupesCached(product.id, LIMIT);
  const href = `/product/${encodeURIComponent(product.id)}`;
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:py-10">
      <JsonLd
        data={breadcrumbLd(siteUrl(), [
          ["Home", "/"],
          [product.brandName, href],
          ["Dupes", `${href}/dupes`],
        ])}
      />
      <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        {product.brandName}
      </Link>
      <PageHeader eyebrow="Dupes" title={`Dupes for ${product.brandName}`}>
        {dupes.total > 0 || dupes.sameBrandTotal > 0 ? <DupeExplainer result={dupes} sunscreen={isSunscreen(product)} /> : <DupeEmpty result={dupes} />}
        {!dupes.hasInactives && dupes.total > 0 && (
          <p className="text-sm text-muted-foreground">
            This product&apos;s listing has no inactive ingredient list, so these can&apos;t be ranked by inactives.
          </p>
        )}
      </PageHeader>

      {dupes.total > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            Other brands ({dupes.total > dupes.rows.length ? `best ${dupes.rows.length} of ${dupes.total}` : dupes.total})
          </h2>
          <DupeRows rows={dupes.rows} compareWith={product.id} />
        </section>
      )}
      {dupes.total === 0 && dupes.sameBrandTotal > 0 && <DupeEmpty result={dupes} />}

      {dupes.sameBrandTotal > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">
              From the same brand ({dupes.sameBrandTotal > dupes.sameBrandRows.length ? `best ${dupes.sameBrandRows.length} of ${dupes.sameBrandTotal}` : dupes.sameBrandTotal})
            </h2>
            <p className="text-sm text-muted-foreground">Other shades, sizes and scents, and the brand&apos;s other products with the same actives.</p>
          </div>
          <DupeRows rows={dupes.sameBrandRows} compareWith={product.id} />
        </section>
      )}
    </div>
  );
}
