import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-grid";
import { FilterChip } from "@/components/filter-chip";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { FreeFromFilters } from "@/components/free-from-filters";
import {
  browseProducts,
  browseProductsByMatch,
  getActivesForConcern,
  getConcern,
  getProductsForConcern,
  getStrengthOptionsForActive,
} from "@/lib/queries";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { MatchSortNote, SortChips, parseListSort, type ListSort } from "@/components/sort-chips";
import { readAvoidIds } from "@/lib/avoid";
import { hasProfile, scoreProducts } from "@/lib/profile";
import { formatPct } from "@/db/strength";
import { variantRobots, breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/site-url";
import { parseFreeParam } from "@/lib/avoid-shared";
import { AvoidSwitch } from "@/components/avoid-switch";
import { FEATURES } from "@/lib/feature-flags";
import { readProfile } from "@/lib/profile";
import { PREGNANCY_FILTER_PARAM, PREGNANCY_FILTER_VALUE, pregnancyAvoidIngredientIds } from "@/lib/pregnancy";
import { PregnancyFilter } from "@/components/pregnancy-notice";
import { escalationFor } from "@/db/escalation-guidance";
import { EscalationPanel } from "@/components/escalation-guidance";

type ConcernParams = { page?: string; active?: string; free?: string; strength?: string; pregnancy?: string; sort?: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ConcernParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const concern = getConcern(slug);
  if (!concern) return {};
  return {
    title: `${concern.name} products`,
    description: `${concern.description} Products matched by active ingredient, with User Scores from real reported outcomes.`,
    alternates: { canonical: `/concern/${slug}` },
    robots: variantRobots(await searchParams),
  };
}

export default async function ConcernPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ConcernParams>;
}) {
  const { slug } = await params;
  const { page: pageParam, active, free, strength, pregnancy, sort: sortParam } = await searchParams;
  const concern = getConcern(slug);
  if (!concern) notFound();

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const freeFromIds = parseFreeParam(free);
  const activesList = getActivesForConcern(slug);
  const allStrengthOptions = active ? getStrengthOptionsForActive(slug, active) : [];
  // Labels carry one-off values (3.69%, 5.25%) that are almost always a
  // filing quirk of a single product; a chip per singleton would drown the
  // real strengths (2.5 / 5 / 10 for benzoyl peroxide). Rare values stay
  // reachable via the URL and "All strengths", just not as chips.
  const strengthOptions = allStrengthOptions.filter((o) => o.count >= 3);
  const strengthPct = strength !== undefined && allStrengthOptions.some((o) => String(o.pct) === strength) ? Number(strength) : undefined;
  // Pregnancy filter (gated): only offered once the profile says pregnant,
  // but an existing ?pregnancy=hide link keeps working while the flag is on.
  const pregnancyMode = FEATURES.PREGNANCY_MODE;
  const pregnancyHide = pregnancyMode && pregnancy === PREGNANCY_FILTER_VALUE;
  const profile = await readProfile();
  const avoidIds = await readAvoidIds();
  const showPregnancyFilter = pregnancyMode && (pregnancyHide || profile.pregnant);
  const canMatch = hasProfile(profile) || avoidIds.length > 0;
  const sort = parseListSort(sortParam, canMatch);
  // ?sort and ?pregnancy ride along on every filter and page link.
  const preg = `${pregnancyHide ? `&${PREGNANCY_FILTER_PARAM}=${PREGNANCY_FILTER_VALUE}` : ""}${sort ? `&sort=${sort}` : ""}`;
  const excludeIngredientIds = pregnancyHide ? pregnancyAvoidIngredientIds() : undefined;
  const listFilters = { concernId: slug, activeId: active, freeFromIds, strengthPct, excludeIngredientIds, concernListing: true };
  const { rows, total, pageSize } =
    sort === "match"
      ? browseProductsByMatch(listFilters, page, (all) => scoreProducts(all, profile, avoidIds), JSON.stringify([listFilters, profile, avoidIds]))
      : sort === "name"
        ? browseProducts(listFilters, page, "name")
        : getProductsForConcern(slug, page, active, freeFromIds, strengthPct, excludeIngredientIds);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageLinkSuffix = `${active ? `&active=${active}` : ""}${free ? `&free=${free}` : ""}${strengthPct !== undefined ? `&strength=${strengthPct}` : ""}${preg}`;
  const strengthHref = (pct?: number) =>
    `/concern/${slug}?active=${active}${free ? `&free=${free}` : ""}${pct !== undefined ? `&strength=${pct}` : ""}${preg}`;
  const pregnancyToggleHref = (() => {
    const qs = new URLSearchParams();
    if (active) qs.set("active", active);
    if (free) qs.set("free", free);
    if (strengthPct !== undefined) qs.set("strength", String(strengthPct));
    if (!pregnancyHide) qs.set(PREGNANCY_FILTER_PARAM, PREGNANCY_FILTER_VALUE);
    if (sort) qs.set("sort", sort);
    const q = qs.toString();
    return `/concern/${slug}${q ? `?${q}` : ""}`;
  })();
  const escalation = FEATURES.ESCALATION_GUIDANCE ? escalationFor(slug) : undefined;
  const sortHref = (next: ListSort) => {
    const qs = new URLSearchParams();
    if (active) qs.set("active", active);
    if (free) qs.set("free", free);
    if (strengthPct !== undefined) qs.set("strength", String(strengthPct));
    if (pregnancyHide) qs.set(PREGNANCY_FILTER_PARAM, PREGNANCY_FILTER_VALUE);
    if (next) qs.set("sort", next);
    const q = qs.toString();
    return `/concern/${slug}${q ? `?${q}` : ""}`;
  };
  const filterCount = [active, strengthPct !== undefined ? "s" : undefined, pregnancyHide ? "p" : undefined].filter(Boolean).length + freeFromIds.length;

  const filters = (
    <>
      <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active ingredient</p>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip href={`/concern/${slug}${`${free ? `&free=${free}` : ""}${preg}`.replace(/^&/, "?")}`} selected={!active}>
              All actives
            </FilterChip>
            {activesList.map((a) => (
              <FilterChip
                key={a.id}
                href={`/concern/${slug}?active=${a.id}${free ? `&free=${free}` : ""}${preg}`}
                selected={active === a.id}
              >
                {a.canonicalName}
              </FilterChip>
            ))}
          </div>
        </div>
  
        {active && strengthOptions.length > 1 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Strength <span className="font-normal normal-case tracking-normal">(from the FDA label)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip href={strengthHref()} selected={strengthPct === undefined}>
                All strengths
              </FilterChip>
              {strengthOptions.map((o) => (
                <FilterChip key={o.pct} href={strengthHref(o.pct)} selected={strengthPct === o.pct}>
                  {formatPct(o.pct)} <span className="ml-1 opacity-70">{o.count}</span>
                </FilterChip>
              ))}
            </div>
          </div>
        )}
  
        <FreeFromFilters
          basePath={`/concern/${slug}`}
          searchParams={{ active, free, strength, sort, [PREGNANCY_FILTER_PARAM]: pregnancyHide ? PREGNANCY_FILTER_VALUE : undefined }}
          selected={freeFromIds}
          extra={showPregnancyFilter ? <PregnancyFilter href={pregnancyToggleHref} selected={pregnancyHide} /> : undefined}
        />
    </>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <JsonLd data={breadcrumbLd(siteUrl(), [["Home", "/"], [concern.name, `/concern/${slug}`]])} />
      <PageHeader eyebrow="Concern" title={concern.name} description={concern.description} />
      {slug === "dry-skin-eczema" && (
        <p className="text-sm">
          For a child?{" "}
          <Link href="/guide/kids/peds-eczema" className="font-medium text-brand hover:underline">
            Caring for your child&apos;s eczema
          </Link>{" "}
          ·{" "}
          <Link href="/guide/kids" className="font-medium text-brand hover:underline">
            All children&apos;s skin guides
          </Link>
        </p>
      )}

      {escalation ? (
        <div className="space-y-2">
          <RedFlagBanner />
          <a href="#otc-not-enough" className="inline-block text-sm font-medium text-brand hover:underline">
            When OTC isn&apos;t enough: how long to try, and when to see a dermatologist ↓
          </a>
        </div>
      ) : (
        <RedFlagBanner />
      )}

      {/* Rendered twice like /browse: collapsed behind "Filters" on phones,
          where the open panel pushed the first product a full screen down,
          and always open from md up. Server-rendered, no client JS. */}
      <details className="group rounded-2xl border bg-card md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-brand" aria-hidden />
            Filters
            {filterCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{filterCount}</span>}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-6 border-t p-4">{filters}</div>
      </details>
      <div className="hidden space-y-8 md:block">{filters}</div>

      <div className="space-y-4">
        <AvoidSwitch
          basePath={`/concern/${slug}`}
          searchParams={{ active, free, strength, sort, [PREGNANCY_FILTER_PARAM]: pregnancyHide ? PREGNANCY_FILTER_VALUE : undefined }}
          selected={freeFromIds}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{total.toLocaleString()}</span> product
            {total === 1 ? "" : "s"}
          </p>
          <SortChips sort={sort} canMatch={canMatch} hrefFor={sortHref} />
        </div>
        {sort === "match" && <MatchSortNote />}
        <h2 className="sr-only">Products</h2>
        <ProductGrid products={rows} />
        <Pagination
          page={page}
          totalPages={totalPages}
          hrefFor={(p) => `/concern/${slug}?page=${p}${pageLinkSuffix}`}
        />
      </div>

      {escalation && <EscalationPanel guidance={escalation} concernName={concern.name} />}
    </div>
  );
}
