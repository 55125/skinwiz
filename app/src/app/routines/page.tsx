import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FilterChip } from "@/components/filter-chip";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { RoutineDisclaimer } from "@/components/routine-disclaimer";
import { getConcerns } from "@/lib/queries";
import { getRoutinesForConcern } from "@/lib/routines";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community routines — SkinWiz",
  description: "Skincare routines posted and voted on by the SkinWiz community, grouped by skin concern.",
};

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: Promise<{ concern?: string }>;
}) {
  const { concern } = await searchParams;
  const concerns = getConcerns();
  const activeConcernId = concern ?? concerns[0]?.id;
  const routines = activeConcernId ? getRoutinesForConcern(activeConcernId) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader eyebrow="Community" title="Routines" description="Community-submitted routines, ranked by vote." />
        <Link href="/routines/new" className={cn(buttonVariants({ variant: "default", size: "lg" }), "rounded-full px-5")}>
          Post a routine
        </Link>
      </div>

      <RoutineDisclaimer />

      <div className="flex flex-wrap gap-1.5">
        {concerns.map((c) => (
          <FilterChip key={c.id} href={`/routines?concern=${c.id}`} selected={activeConcernId === c.id}>
            {c.name}
          </FilterChip>
        ))}
      </div>

      {routines.length === 0 ? (
        <p className="text-muted-foreground">No routines for this concern yet — be the first to post one.</p>
      ) : (
        <ul className="space-y-3">
          {routines.map((r) => (
            <li key={r.id}>
              <Link
                href={`/routines/${r.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
              >
                <div className="min-w-0 space-y-1">
                  <h2 className="truncate font-semibold">{r.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {r.stepCount} step{r.stepCount === 1 ? "" : "s"}
                    {r.authorName ? ` · by ${r.authorName}` : ""}
                  </p>
                </div>
                <span className="flex h-10 min-w-12 shrink-0 items-center justify-center rounded-xl bg-muted px-3 text-sm font-semibold tabular-nums">
                  {r.score > 0 ? "+" : ""}
                  {r.score}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
