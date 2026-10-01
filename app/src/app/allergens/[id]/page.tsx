import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductGrid } from "@/components/product-grid";
import { FilterChip } from "@/components/filter-chip";
import { AvoidToggleButton } from "@/components/avoid-toggle-button";
import { JsonLd } from "@/components/json-ld";
import {
  allergenMembers,
  concealableByFragrance,
  getAllergen,
  getAllergenGroup,
  getAllergenSection,
  groupsContaining,
  labelNames,
  resolveAllergenId,
} from "@/db/contact-allergens";
import { browseProducts, getAllergenProductCounts, getFreeOfAllergenByConcern } from "@/lib/queries";
import { readAvoidIds } from "@/lib/avoid";
import { breadcrumbLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

function lookup(id: string) {
  const allergen = getAllergen(id);
  const group = allergen ? undefined : getAllergenGroup(id);
  return { allergen, group, name: allergen?.name ?? group?.name };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { name } = lookup(id);
  if (!name) return {};
  return {
    title: `${name}: contact allergen guide and products without it`,
    description: `Every name ${name} goes by on an ingredient label, and skincare products whose full ingredient lists are free of it.`,
    alternates: { canonical: `/allergens/${id}` },
  };
}

export default async function AllergenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolved = resolveAllergenId(id);
  if (resolved && resolved !== id) permanentRedirect(`/allergens/${resolved}`);
  const { allergen, group, name } = lookup(id);
  if (!name) notFound();

  const avoidIds = await readAvoidIds();
  const members = allergenMembers(id);
  const counts = getAllergenProductCounts();
  const { rows, total: freeTotal } = browseProducts({ freeFromIds: [id] }, 1);
  const byConcern = getFreeOfAllergenByConcern(id);
  const hideable = members.some(concealableByFragrance);
  const section = allergen ? getAllergenSection(allergen.section) : undefined;
  const families = allergen ? groupsContaining(allergen.id) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <JsonLd data={breadcrumbLd(siteUrl(), [["Home", "/"], ["Contact allergens", "/allergens"], [name, `/allergens/${id}`]])} />
      <Link href="/allergens" className="text-sm text-muted-foreground hover:text-foreground">
        ← All contact allergens
      </Link>
      <PageHeader
        eyebrow={section ? section.title : "Allergen family"}
        title={name}
        description={
          allergen
            ? `${(counts.get(allergen.id) ?? 0).toLocaleString()} products in our catalog list it; ${freeTotal.toLocaleString()} with a full ingredient list are free of it.`
            : `${group!.note} ${freeTotal.toLocaleString()} products with a full ingredient list are free of all ${members.length}.`
        }
      >
        <div className="pt-2">
          <AvoidToggleButton id={id} avoidIds={avoidIds} size="default" />
        </div>
      </PageHeader>

      {allergen && (
        <section className="space-y-3 rounded-2xl border bg-card p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Names to look for on a label</h2>
          <p className="flex flex-wrap gap-1.5 text-sm">
            {labelNames(allergen).map((t) => (
              <span key={t} className="rounded-md bg-muted px-2 py-1">{t}</span>
            ))}
          </p>
          {allergen.aka && (
            <p className="text-sm text-muted-foreground">Also known as {allergen.aka.join(", ")}.</p>
          )}
          {allergen.note && <p className="text-sm leading-relaxed">{allergen.note}</p>}
        </section>
      )}

      {group && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">What&apos;s in this family</h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {members.map((m) => {
              const a = getAllergen(m)!;
              return (
                <li key={m} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                  <Link href={`/allergens/${m}`} className="font-medium hover:underline">
                    {a.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {labelNames(a).filter((n) => n.toLowerCase() !== a.name.toLowerCase()).slice(0, 4).join(", ")}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {hideable && (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          A fragrance allergen doesn&apos;t have to be named when it&apos;s part of a blend listed as
          &ldquo;fragrance&rdquo; or &ldquo;parfum,&rdquo; so products with an undisclosed fragrance are left out of
          the &ldquo;free of&rdquo; results below.
        </p>
      )}

      {families.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Tested or avoided together with</h2>
          <div className="flex flex-wrap gap-1.5">
            {families.map((g) => (
              <FilterChip key={g.id} selected={false} href={`/allergens/${g.id}`}>
                {g.name}
              </FilterChip>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Free of {allergen ? "it" : "all of them"}, by category</h2>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip selected={false} href={`/browse?free=${id}`}>
            All ({freeTotal.toLocaleString()})
          </FilterChip>
          {byConcern.map((c) => (
            <FilterChip selected={false} key={c.id} href={`/browse?free=${id}&concern=${c.id}`}>
              {c.name} ({c.n.toLocaleString()})
            </FilterChip>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Products</h2>
          <Link href={`/browse?free=${id}`} className="text-sm font-medium text-brand hover:underline">
            See all {freeTotal.toLocaleString()} →
          </Link>
        </div>
        <ProductGrid products={rows.slice(0, 12)} />
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {section ? `Sources: ${section.sources} ` : ""}Matched on label names, not an allergy test or medical advice.
        Confirm against the physical label, and talk to a board-certified dermatologist about a known allergy.
      </p>
    </div>
  );
}
