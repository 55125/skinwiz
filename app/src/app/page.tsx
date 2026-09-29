import Link from "next/link";
import {
  ArrowRight,
  CircleDot,
  Droplets,
  FlaskConical,
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
import { countProducts, getAllActives, getConcerns, getTopProducts, getTopActives } from "@/lib/queries";
import { getTopRoutines } from "@/lib/routines";

// Force dynamic: without this, Next.js statically prerenders "/" once at
// build time -- against whatever the database contains at that moment.
// The Docker build runs before db:push/db:seed (see repo-root Dockerfile),
// so a static build would bake in an empty concerns list permanently
// until the next deploy. Same reasoning as sitemap.ts.
export const dynamic = "force-dynamic";

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

const SUGGESTED_SEARCHES = ["Niacinamide", "Sunscreen", "Salicylic acid", "Ceramides", "CeraVe"];

export default function Home() {
  const concerns = getConcerns();
  const topProducts = getTopProducts(6);
  const topActives = getTopActives(10);
  const topRoutines = getTopRoutines(5);
  const productCount = countProducts();
  const activeCount = getAllActives().length;

  const stats = [
    { value: productCount.toLocaleString(), label: "products indexed" },
    { value: String(activeCount), label: "active ingredients tracked" },
    { value: String(concerns.length), label: "skin concerns covered" },
  ];

  return (
    <div>
      <section className="relative border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,var(--brand-soft),transparent)]"
        />
        <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <FlaskConical className="h-3.5 w-3.5 text-brand" />
            OTC skincare, ingredient by ingredient
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.1] sm:text-6xl">
            Skincare, scored <span className="text-brand">two ways.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            A <strong className="font-medium text-foreground">Derm Score</strong> from board-certified
            dermatologists and an <strong className="font-medium text-foreground">Audience Score</strong> from
            real reported outcomes — not a guess from an ingredient list.
          </p>
          <div className="mx-auto mt-8 max-w-2xl">
            <SearchBar large />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Try:</span>
            {SUGGESTED_SEARCHES.map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="rounded-full border bg-card px-3 py-1 text-foreground/80 transition-colors hover:border-brand/40 hover:text-foreground"
              >
                {term}
              </Link>
            ))}
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

        <section className="space-y-6">
          <SectionHeader
            title="Featured products"
            description="No Derm or Audience scores exist yet — featured by data quality, not popularity."
            action={{ href: "/browse", label: "Browse all" }}
          />
          <ProductGrid products={topProducts} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5 rounded-2xl border bg-card p-6">
            <SectionHeader title="Top actives" description="Most common ingredients across the catalog." />
            <div className="flex flex-wrap gap-2">
              {topActives.map((a) => (
                <Link
                  key={a.activeId}
                  href={`/search?q=${encodeURIComponent(a.canonicalName)}`}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-brand/40 hover:bg-brand-soft"
                >
                  {a.canonicalName}
                  <span className="text-xs tabular-nums text-muted-foreground">{a.productCount.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border bg-card p-6">
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
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: <Stethoscope className="h-5 w-5 text-sky-600" />,
                title: "Derm Score",
                body: "Will come from a panel of board-certified dermatologists once it launches — never shown until at least 5 have rated a product.",
              },
              {
                icon: <Users className="h-5 w-5 text-violet-600" />,
                title: "Audience Score",
                body: "Real reported outcomes from people who used the product, not scraped store reviews.",
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
