import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-grid";
import { FilterChip } from "@/components/filter-chip";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { FreeFromFilters } from "@/components/free-from-filters";
import { getConcern, getActivesForConcern, getProductsForConcern, getStrengthOptionsForActive } from "@/lib/queries";
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

type ConcernParams = { page?: string; active?: string; free?: string; strength?: string; pregnancy?: string };

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
  const { page: pageParam, active, free, strength, pregnancy } = await searchParams;
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
  const showPregnancyFilter = pregnancyMode && (pregnancyHide || (await readProfile()).pregnant);
  const preg = pregnancyHide ? `&${PREGNANCY_FILTER_PARAM}=${PREGNANCY_FILTER_VALUE}` : "";
  const { rows, total, pageSize } = getProductsForConcern(
    slug,
    page,
    active,
    freeFromIds,
    strengthPct,
    pregnancyHide ? pregnancyAvoidIngredientIds() : undefined,
  );
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
    const q = qs.toString();
    return `/concern/${slug}${q ? `?${q}` : ""}`;
  })();
  const escalation = FEATURES.ESCALATION_GUIDANCE ? escalationFor(slug) : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <JsonLd data={breadcrumbLd(siteUrl(), [["Home", "/"], [concern.name, `/concern/${slug}`]])} />
      <PageHeader eyebrow="Concern" title={concern.name} description={concern.description} />

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
        searchParams={{ active, free, [PREGNANCY_FILTER_PARAM]: pregnancyHide ? PREGNANCY_FILTER_VALUE : undefined }}
        selected={freeFromIds}
        extra={showPregnancyFilter ? <PregnancyFilter href={pregnancyToggleHref} selected={pregnancyHide} /> : undefined}
      />

      <div className="space-y-4">
        <AvoidSwitch
          basePath={`/concern/${slug}`}
          searchParams={{ active, free, [PREGNANCY_FILTER_PARAM]: pregnancyHide ? PREGNANCY_FILTER_VALUE : undefined }}
          selected={freeFromIds}
        />
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{total.toLocaleString()}</span> product
          {total === 1 ? "" : "s"}
        </p>
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
