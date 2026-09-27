import Link from "next/link";
import { Stethoscope, Users, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product-card";
import { SearchBar } from "@/components/search-bar";
import { getConcerns, getTopProducts, getTopActives } from "@/lib/queries";
import { getTopRoutines } from "@/lib/routines";

// Force dynamic: without this, Next.js statically prerenders "/" once at
// build time -- against whatever the database contains at that moment.
// The Docker build runs before db:push/db:seed (see repo-root Dockerfile),
// so a static build would bake in an empty concerns list permanently
// until the next deploy. Same reasoning as sitemap.ts.
export const dynamic = "force-dynamic";

export default function Home() {
  const concerns = getConcerns();
  const topProducts = getTopProducts(6);
  const topActives = getTopActives(10);
  const topRoutines = getTopRoutines(5);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-16">
      <section className="space-y-6 text-center max-w-2xl mx-auto">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Skincare, scored two ways.
          </h1>
          <p className="text-muted-foreground text-lg">
            A <strong className="text-foreground">Derm Score</strong> from board-certified dermatologists,
            and an <strong className="text-foreground">Audience Score</strong> from real reported outcomes —
            not a guess from an ingredient list.
          </p>
        </div>
        <SearchBar large />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Top Products</h2>
          <p className="text-xs text-muted-foreground">
            No Derm/Audience scores exist yet — featured by data quality, not popularity
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="grid gap-10 sm:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Top Actives</h2>
          <p className="text-xs text-muted-foreground">Most common ingredients across the catalog</p>
          <div className="flex flex-wrap gap-2">
            {topActives.map((a) => (
              <Link key={a.activeId} href={`/search?q=${encodeURIComponent(a.canonicalName)}`}>
                <Badge variant="outline" className="cursor-pointer">
                  {a.canonicalName} <span className="ml-1 text-muted-foreground">{a.productCount}</span>
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium">Top Routines</h2>
            <Link href="/routines" className="text-xs text-muted-foreground underline">
              See all
            </Link>
          </div>
          {topRoutines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No routines yet —{" "}
              <Link href="/routines/new" className="underline">
                post the first one
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {topRoutines.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/routines/${r.id}`}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span className="truncate">{r.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {r.concernName} · {r.score > 0 ? "+" : ""}
                      {r.score}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Browse by concern</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {concerns.map((c) => (
            <Link key={c.id} href={`/concern/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl">{c.name}</CardTitle>
                  <CardDescription>{c.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3 text-sm">
        <div className="flex gap-3">
          <Stethoscope className="h-5 w-5 shrink-0 text-sky-600" />
          <p>
            <strong className="text-foreground block">Derm Score</strong>
            From a verified panel of board-certified dermatologists — never shown until at least 5 have rated it.
          </p>
        </div>
        <div className="flex gap-3">
          <Users className="h-5 w-5 shrink-0 text-violet-600" />
          <p>
            <strong className="text-foreground block">Audience Score</strong>
            Real reported outcomes from people who used the product, not scraped store reviews.
          </p>
        </div>
        <div className="flex gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <p>
            <strong className="text-foreground block">Not medical advice</strong>
            Education and product matching only — see a dermatologist for diagnosis or treatment.
          </p>
        </div>
      </section>
    </div>
  );
}
