import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { ProductGrid } from "@/components/product-grid";
import { FilterChip } from "@/components/filter-chip";
import { db } from "@/db/client";
import { FREE_FROM_CHECKS, getFreeFromCheck } from "@/db/ingredient-flags";
import { LEGACY_ALLERGEN_IDS } from "@/db/contact-allergens";
import { browseProducts } from "@/lib/queries";
import { breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

function blurb(label: string): string {
  return `Products whose published ingredient lists pass the ${label.toLowerCase()} check — computed from the actual list, not a brand's marketing claim.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const check = getFreeFromCheck(slug);
  if (!check) return {};
  return {
    title: `${check.label} skincare products`,
    description: `Browse ${check.label.toLowerCase()} products checked against their full ingredient lists, with the exact ingredients each check looks for.`,
    alternates: { canonical: `/guide/${slug}` },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // The contact-allergen checks moved to /allergens.
  const allergenId = LEGACY_ALLERGEN_IDS[slug];
  if (allergenId) permanentRedirect(`/allergens/${allergenId}`);
  const check = getFreeFromCheck(slug);
  if (!check) notFound();

  const { rows, total } = browseProducts({ freeFromIds: [slug] }, 1);
  const byConcern = db.all<{ id: string; name: string; n: number }>(sql`
    SELECT c.id AS id, c.name AS name, COUNT(*) AS n
    FROM products p JOIN concerns c ON c.id IN (SELECT value FROM json_each(p.concern_ids))
    WHERE p.is_rx = 0 AND p.canonical_id IS NULL AND p.free_from_flags LIKE ${`%"${slug}"%`}
    GROUP BY c.id ORDER BY n DESC
  `);
  const looksFor = [...check.avoidSubstrings].filter((s) => s.trim().length > 2);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <JsonLd data={breadcrumbLd(siteUrl(), [["Home", "/"], ["Browse", "/browse"], [check.label, `/guide/${check.id}`]])} />
      <PageHeader
        eyebrow="Ingredient filter"
        title={check.label}
        description={`${total.toLocaleString()} products in our catalog pass this check. ${blurb(check.label)}`}
      />

      {check.explain && (
        <div className="rounded-2xl border bg-card p-5 text-sm leading-relaxed">
          <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What it checks</h2>
          <p>{check.explain}</p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Browse by category</h2>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip selected={false} href={`/browse?free=${slug}`}>All ({total.toLocaleString()})</FilterChip>
          {byConcern.map((c) => (
            <FilterChip selected={false} key={c.id} href={`/browse?free=${slug}&concern=${c.id}`}>
              {c.name} ({c.n.toLocaleString()})
            </FilterChip>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Products</h2>
          <Link href={`/browse?free=${slug}`} className="text-sm font-medium text-brand hover:underline">
            See all {total.toLocaleString()} →
          </Link>
        </div>
        <ProductGrid products={rows.slice(0, 12)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Ingredients this check looks for</h2>
        <p className="text-sm text-muted-foreground">
          A product fails if any ingredient name contains one of these terms. Not exhaustive — a screening aid, not
          medical advice.
        </p>
        <p className="flex flex-wrap gap-1.5 text-xs">
          {looksFor.map((t) => (
            <span key={t} className="rounded-md bg-muted px-2 py-1">{t}</span>
          ))}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Other filters</h2>
        <div className="flex flex-wrap gap-1.5">
          {FREE_FROM_CHECKS.filter((c) => c.id !== slug).map((c) => (
            <FilterChip selected={false} key={c.id} href={`/guide/${c.id}`}>{c.label}</FilterChip>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Avoiding a contact allergen? See the{" "}
          <Link href="/allergens" className="font-medium text-brand hover:underline">contact allergen guide →</Link>{" "}
          Have a product&apos;s ingredient list handy?{" "}
          <Link href="/check" className="font-medium text-brand hover:underline">Paste it into the checker →</Link>
        </p>
      </section>
    </div>
  );
}
