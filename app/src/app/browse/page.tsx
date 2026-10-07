import Link from "next/link";
import type { Metadata } from "next";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { ProductGrid } from "@/components/product-grid";
import { FreeFromFilters } from "@/components/free-from-filters";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { browseProducts, browseProductsByMatch, getConcerns, getAllActives } from "@/lib/queries";
import { hasProfile, readProfile, scoreProducts } from "@/lib/profile";
import { readAvoidIds } from "@/lib/avoid";
import { TRUST_TIERS } from "@/lib/trust-tiers";
import { cn } from "@/lib/utils";
import { variantRobots } from "@/lib/seo";
import { SITE_NAME } from "@/lib/brand";
import { parseFreeParam } from "@/lib/avoid-shared";
import { AvoidSwitch } from "@/components/avoid-switch";
import { HSA_GUIDE_PATH } from "@/lib/hsa";
import { FEATURES } from "@/lib/feature-flags";
import { PREGNANCY_FILTER_VALUE, pregnancyAvoidIngredientIds } from "@/lib/pregnancy";
import { PregnancyFilter } from "@/components/pregnancy-notice";

type BrowseParams = { concern?: string; tier?: string; active?: string; free?: string; hsa?: string; sort?: string; page?: string; pregnancy?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<BrowseParams> }): Promise<Metadata> {
  return {
    title: "Browse all products",
    description: `Browse the full ${SITE_NAME} catalog by concern, trust tier, active ingredient, or ingredient-based filters.`,
    alternates: { canonical: "/browse" },
    robots: variantRobots(await searchParams),
  };
}

function SidebarLink({ href, selected, children }: { href: string; selected: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "block rounded-lg px-2.5 py-1.5 transition-colors",
        selected
          ? "bg-brand-soft font-medium text-brand-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function SidebarGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

// The general catalog browser -- unlike /concern/[slug] (one concern, top
// filter chips) or /search (requires a query), this is every product,
// every filter, all at once, with the filters in a left sidebar -- the
// conventional e-commerce-catalog layout, requested explicitly rather than
// reusing the top-chip pattern the other two pages use.
const ACTIVES_SHOWN = 8;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<BrowseParams>;
}) {
  const { concern, tier, active, free, hsa: hsaParam, sort: sortParam, page: pageParam, pregnancy: pregnancyParam } = await searchParams;
  const hsa = hsaParam === "1" ? "1" : undefined;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const freeFromIds = parseFreeParam(free);
  const selectedTier = TRUST_TIERS.find((t) => t.label === tier);
  const concerns = getConcerns();
  const allActives = getAllActives();

  const profile = await readProfile();
  const avoidIds = await readAvoidIds();
  const canMatch = hasProfile(profile) || avoidIds.length > 0;
  const sort = sortParam === "match" && canMatch ? "match" : sortParam === "name" ? "name" : undefined;
  // Gated pregnancy filter: offered once the profile says pregnant; a
  // ?pregnancy=hide link keeps working while the flag is on.
  const pregnancy = FEATURES.PREGNANCY_MODE && pregnancyParam === PREGNANCY_FILTER_VALUE ? PREGNANCY_FILTER_VALUE : undefined;
  const showPregnancyFilter = FEATURES.PREGNANCY_MODE && (!!pregnancy || profile.pregnant);
  const queryFilters = {
    concernId: concern,
    dataSources: selectedTier?.dataSources,
    activeId: active,
    freeFromIds,
    hsaOnly: !!hsa,
    excludeIngredientIds: pregnancy ? pregnancyAvoidIngredientIds() : undefined,
  };

  const { rows, total, pageSize } =
    sort === "match"
      ? browseProductsByMatch(queryFilters, page, (all) => scoreProducts(all, profile, avoidIds), JSON.stringify([queryFilters, profile, avoidIds]))
      : browseProducts(queryFilters, page, sort);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeFilterCount = [concern, selectedTier, active, hsa, pregnancy].filter(Boolean).length + freeFromIds.length;

  function hrefWith(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { concern, tier, active, free, hsa, sort, pregnancy, page: undefined as string | undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  }

  function pageHref(p: number) {
    return hrefWith({ page: p > 1 ? String(p) : undefined });
  }

  const filters = (
    <div className="space-y-6 text-sm">
      <SidebarGroup title="Concern">
        <ul className="space-y-0.5">
          <li>
            <SidebarLink href={hrefWith({ concern: undefined })} selected={!concern}>
              All concerns
            </SidebarLink>
          </li>
          {concerns.map((c) => (
            <li key={c.id}>
              <SidebarLink href={hrefWith({ concern: c.id })} selected={concern === c.id}>
                {c.name}
              </SidebarLink>
            </li>
          ))}
        </ul>
      </SidebarGroup>

      <SidebarGroup title="Source">
        <ul className="space-y-0.5">
          <li>
            <SidebarLink href={hrefWith({ tier: undefined })} selected={!tier}>
              All sources
            </SidebarLink>
          </li>
          {TRUST_TIERS.map((t) => (
            <li key={t.label}>
              <SidebarLink href={hrefWith({ tier: t.label })} selected={tier === t.label}>
                {t.label}
              </SidebarLink>
            </li>
          ))}
        </ul>
      </SidebarGroup>

      <SidebarGroup title="Active ingredient">
        {/* First few inline, the rest behind a disclosure (opened when the
            selected active is in it) -- a short scroll box inside the
            sidebar cut the list off mid-word. */}
        <ul className="space-y-0.5">
          <li>
            <SidebarLink href={hrefWith({ active: undefined })} selected={!active}>
              All actives
            </SidebarLink>
          </li>
          {allActives.slice(0, ACTIVES_SHOWN).map((a) => (
            <li key={a.id}>
              <SidebarLink href={hrefWith({ active: a.id })} selected={active === a.id}>
                {a.canonicalName}
              </SidebarLink>
            </li>
          ))}
        </ul>
        {allActives.length > ACTIVES_SHOWN && (
          <details className="group/actives" open={allActives.slice(ACTIVES_SHOWN).some((a) => a.id === active)}>
            <summary className="mt-1 flex cursor-pointer list-none items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand [&::-webkit-details-marker]:hidden">
              <span className="group-open/actives:hidden">Show all {allActives.length} actives</span>
              <span className="hidden group-open/actives:inline">Show fewer</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/actives:rotate-180" />
            </summary>
            <ul className="space-y-0.5">
              {allActives.slice(ACTIVES_SHOWN).map((a) => (
                <li key={a.id}>
                  <SidebarLink href={hrefWith({ active: a.id })} selected={active === a.id}>
                    {a.canonicalName}
                  </SidebarLink>
                </li>
              ))}
            </ul>
          </details>
        )}
      </SidebarGroup>

      <SidebarGroup title="Spending account">
        <ul className="space-y-0.5">
          <li>
            <SidebarLink href={hrefWith({ hsa: hsa ? undefined : "1" })} selected={!!hsa}>
              HSA/FSA eligible
            </SidebarLink>
          </li>
        </ul>
        <p className="mt-1 px-2.5 text-xs text-muted-foreground">
          OTC medicines and broad spectrum SPF 15+ sunscreens. Your plan decides.{" "}
          <Link href={HSA_GUIDE_PATH} className="underline">
            How this works
          </Link>
        </p>
      </SidebarGroup>

      <FreeFromFilters
        basePath="/browse"
        searchParams={{ concern, tier, active, free, hsa, sort, pregnancy }}
        selected={freeFromIds}
        extra={
          showPregnancyFilter ? (
            <PregnancyFilter href={hrefWith({ pregnancy: pregnancy ? undefined : PREGNANCY_FILTER_VALUE })} selected={!!pregnancy} />
          ) : undefined
        }
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Catalog"
        title="Browse all products"
        description="Filter the full catalog by concern, source, active ingredient, or ingredient-based flags."
      />

      <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
        {/* Rendered twice (collapsed on mobile, always-open sidebar on
            desktop) since <details> can't be forced open per breakpoint
            and this page stays server-rendered with no client JS. */}
        <details className="group rounded-2xl border bg-card lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-brand" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t p-3">{filters}</div>
        </details>
        <aside className="hidden lg:block">{filters}</aside>

        <div className="min-w-0 space-y-5">
          <RedFlagBanner />

          <AvoidSwitch basePath="/browse" searchParams={{ concern, tier, active, free, hsa, sort, pregnancy }} selected={freeFromIds} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{total.toLocaleString()}</span> product
              {total === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-1 text-sm">
              <span className="mr-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Sort</span>
              {[
                { id: undefined, label: "Default" },
                { id: "name", label: "A–Z" },
                ...(canMatch ? [{ id: "match", label: "Best match" }] : []),
              ].map((o) => (
                <Link
                  key={o.label}
                  href={hrefWith({ sort: o.id })}
                  aria-current={sort === o.id ? "true" : undefined}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    sort === o.id ? "border-brand/50 bg-brand-soft text-brand-foreground" : "hover:bg-muted",
                  )}
                >
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
          {sort === "match" && (
            <p className="text-xs text-muted-foreground">
              Ranked by your <Link href="/profile" className="underline">profile</Link> and avoid list. Products
              without a full ingredient list can&apos;t be scored and are left out of this view.
            </p>
          )}

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              No products match this combination of filters.
            </div>
          ) : (
            <>
              <h2 className="sr-only">Products</h2>
              <ProductGrid products={rows} columns="sm:grid-cols-2 xl:grid-cols-3" />
            </>
          )}

          <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
        </div>
      </div>
    </div>
  );
}
