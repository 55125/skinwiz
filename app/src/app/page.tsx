import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CircleDot,
  ClipboardList,
  Droplets,
  Hand,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Stethoscope,
  Sun,
  ThermometerSun,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { ProductGrid } from "@/components/product-grid";
import { SearchBar } from "@/components/search-bar";
import { SectionHeader } from "@/components/section-header";
import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/site-url";
import { countProducts, getAllActives, getConcerns, getTopProducts, getTopActives } from "@/lib/queries";
import { getTopRoutines } from "@/lib/routines";
import { SITE_NAME } from "@/lib/brand";
import { DERM_PANEL_LAUNCHED } from "@/lib/scoring";
import { CONTACT_ALLERGENS } from "@/db/contact-allergens";
import { ttlCache } from "@/lib/ttl-cache";

// Force dynamic: without this, Next.js statically prerenders "/" once at
// build time -- against whatever the database contains at that moment.
// The Docker build runs before db:push/db:seed (see repo-root Dockerfile),
// so a static build would bake in an empty concerns list permanently
// until the next deploy. Same reasoning as sitemap.ts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE_NAME, title: `${SITE_NAME} — OTC skincare, ingredient by ingredient`, url: "/" },
};

const CONCERN_ICONS: Record<string, LucideIcon> = {
  acne: CircleDot,
  "sun-protection": Sun,
  antifungal: ShieldPlus,
  "dandruff-seb-derm": Wind,
  "itch-relief": Hand,
  "dry-skin-eczema": Droplets,
  "excessive-sweating": ThermometerSun,
  "brightening-texture": Sparkles,
};


// The landing page is the first stop for most visitors; its catalog-wide
// aggregates (~45ms together) only change when the catalog is reseeded.
const topProductsCached = ttlCache(getTopProducts);
const topActivesCached = ttlCache(getTopActives);
const countProductsCached = ttlCache(countProducts);

export default function Home() {
  const concerns = getConcerns();
  const topProducts = topProductsCached(6);
  const topActives = topActivesCached(10);
  const topRoutines = getTopRoutines(5);
  const productCount = countProductsCached();
  const activeCount = getAllActives().length;

  const stats = [
    { value: productCount.toLocaleString(), label: "products indexed" },
    { value: String(activeCount), label: "active ingredients tracked" },
    { value: String(concerns.length), label: "skin concerns covered" },
  ];

  const base = siteUrl();

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${base}/#website`,
              url: base,
              name: SITE_NAME,
              potentialAction: {
                "@type": "SearchAction",
                target: { "@type": "EntryPoint", urlTemplate: `${base}/search?q={search_term_string}` },
                "query-input": "required name=search_term_string",
              },
            },
            { "@type": "Organization", "@id": `${base}/#organization`, name: SITE_NAME, url: base },
          ],
        }}
      />
      <section className="relative overflow-hidden border-b">
        {/* The gel swatch: shown as shot on the paper-colored ground in light
            mode, inverted in dark (--hero-photo-filter) so its paper goes dark
            too. Edges are feathered into the page by .hero-photo's mask. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- one decorative, already-optimized webp; next/image would add a resize step for no gain */}
        <img
          src="/hero/gel.webp"
          alt=""
          aria-hidden
          width={1315}
          height={800}
          fetchPriority="high"
          className="hero-photo pointer-events-none absolute left-1/2 top-6 w-[190vw] max-w-none -translate-x-[32%] select-none sm:-top-[100px] sm:w-[1100px] sm:-translate-x-[46%]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_26%_at_50%_45%,color-mix(in_oklch,var(--hero-glow)_42%,transparent)_0%,color-mix(in_oklch,var(--hero-glow)_18%,transparent)_60%,transparent_100%)] sm:bg-[radial-gradient(ellipse_27%_22%_at_50%_52%,color-mix(in_oklch,var(--hero-glow)_42%,transparent)_0%,color-mix(in_oklch,var(--hero-glow)_18%,transparent)_60%,transparent_100%)]"
        />
        <div className="hero-glow relative mx-auto max-w-3xl px-4 pb-28 pt-12 text-center sm:pb-28 sm:pt-24">
          <span className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground [text-shadow:none] sm:-translate-y-[64px]">
            Built by a board-certified dermatologist
          </span>
          <h1 className="mt-10 text-[2.5rem] font-semibold leading-[1.08] sm:text-6xl">
            Find your <span className="text-brand">actives</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-foreground/85 sm:text-[19px]">
            Every product, every ingredient. Build the perfect regimen.
          </p>
          <div className="mx-auto mt-8 max-w-2xl [text-shadow:none]">
            <SearchBar large />
          </div>
        </div>
        <div className="relative border-t bg-card/60 backdrop-blur">
          <dl className="mx-auto grid max-w-4xl grid-cols-3 divide-x px-4">
            {stats.map((s) => (
              <div key={s.label} className="px-2 py-5 text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-2xl font-semibold tabular-nums sm:text-3xl">{s.value}</dd>
                <dd className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-20 px-4 py-16">
        <section className="space-y-6">
          <SectionHeader
            title="Browse by concern"
            description="Start from what you're treating — every concern maps to evidence-recognized actives."
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {concerns.map((c) => {
              const Icon = CONCERN_ICONS[c.id] ?? Sparkles;
              return (
                <Link
                  key={c.id}
                  href={`/concern/${c.id}`}
                  className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5 sm:p-5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold sm:text-base">{c.name}</h3>
                    <p className="line-clamp-2 hidden text-sm text-muted-foreground sm:block">{c.description}</p>
                  </div>
                  <span className="mt-auto hidden items-center gap-1 text-sm font-medium text-brand sm:flex">
                    Explore
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 overflow-hidden rounded-3xl border bg-card p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:items-center">
          <div className="min-w-0 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">Contact dermatitis</p>
            <h2 className="text-2xl font-semibold sm:text-3xl">Allergic to something? Avoid it under every name.</h2>
            <p className="max-w-xl text-muted-foreground">
              Labels rarely use the name on your patch-test results: methylisothiazolinone hides as &ldquo;Kathon
              CG,&rdquo; lanolin as &ldquo;wool alcohols.&rdquo; Paste your results and we&apos;ll flag all{" "}
              {CONTACT_ALLERGENS.length} allergens we track, under any of their names, on every product.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/avoid?paste=1"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <ClipboardList className="h-4 w-4" />
                Paste my patch-test results
              </Link>
              <Link href="/allergens" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                Browse the allergen guide
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div aria-hidden className="min-w-0 space-y-2 rounded-2xl border bg-background/60 p-4 text-sm">
            {[
              ["Kathon CG", "MCI/MI preservative"],
              ["Wool alcohols", "Lanolin"],
              ["Lyral", "HICC (fragrance)"],
              ["Quaternium-15", "Formaldehyde releaser"],
            ].map(([label, allergen]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2.5 shadow-sm">
                <span className="min-w-0 truncate text-muted-foreground">{label}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand" />
                <span className="min-w-0 truncate text-right font-medium">{allergen}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <SectionHeader
            title="Featured products"
            description="A rotating selection of brand-sourced listings — a showcase, not a ranking."
            action={{ href: "/browse", label: "Browse all" }}
          />
          <ProductGrid products={topProducts} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-5 rounded-2xl border bg-card p-6">
            <SectionHeader title="Top actives" description="Most common ingredients across the catalog." />
            <div className="flex flex-wrap gap-2">
              {topActives.map((a) => (
                <Link
                  key={a.activeId}
                  href={`/ingredient/${encodeURIComponent(a.activeId)}`}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-brand/40 hover:bg-brand-soft"
                >
                  {a.canonicalName}
                  <span className="text-xs tabular-nums text-muted-foreground">{a.productCount.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-5 rounded-2xl border bg-card p-6">
            <SectionHeader title="Top routines" action={{ href: "/routines", label: "See all" }} />
            {topRoutines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No routines yet —{" "}
                <Link href="/routines/new" className="font-medium text-brand hover:underline">
                  post the first one
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y">
                {topRoutines.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/routines/${r.id}`}
                      className="flex items-center justify-between gap-3 text-sm hover:text-brand"
                    >
                      <span className="truncate font-medium">{r.title}</span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-0.5">{r.concernName}</span>
                        <span className="tabular-nums">
                          {r.score > 0 ? "+" : ""}
                          {r.score}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-3xl border bg-gradient-to-br from-brand-soft/70 via-card to-card p-8 sm:p-10">
          <h2 className="text-2xl font-semibold">How scoring works</h2>
          <div className={`mt-8 grid gap-8 ${DERM_PANEL_LAUNCHED ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {[
              // The Derm Score card appears once the dermatologist panel launches.
              ...(DERM_PANEL_LAUNCHED
                ? [
                    {
                      icon: <Stethoscope className="h-5 w-5 text-sky-600" />,
                      title: "Derm Score",
                      body: "From our panel of board-certified dermatologists. A score shows only after at least 5 have rated a product for a concern.",
                    },
                  ]
                : []),
              {
                icon: <Users className="h-5 w-5 text-violet-600" />,
                title: "User Score",
                body: `The share of people who logged that a product actually helped — outcomes reported on ${SITE_NAME}, not scraped store reviews.`,
              },
              {
                icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
                title: "Not medical advice",
                body: "Education and product matching only — see a dermatologist for diagnosis or treatment.",
              },
            ].map((item) => (
              <div key={item.title} className="space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card shadow-sm">
                  {item.icon}
                </span>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
