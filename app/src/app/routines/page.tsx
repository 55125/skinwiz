import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { RoutineDisclaimer } from "@/components/routine-disclaimer";
import { getConcerns } from "@/lib/queries";
import { getRoutinesForConcern } from "@/lib/routines";

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
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Routines</h1>
          <p className="text-muted-foreground">Community-submitted routines, ranked by vote.</p>
        </div>
        <Link href="/routines/new" className={buttonVariants({ variant: "default" })}>
          Post a routine
        </Link>
      </div>

      <RoutineDisclaimer />

      <div className="flex flex-wrap gap-2">
        {concerns.map((c) => (
          <Link key={c.id} href={`/routines?concern=${c.id}`}>
            <Badge variant={activeConcernId === c.id ? "default" : "outline"} className="cursor-pointer">
              {c.name}
            </Badge>
          </Link>
        ))}
      </div>

      {routines.length === 0 ? (
        <p className="text-muted-foreground">No routines for this concern yet — be the first to post one.</p>
      ) : (
        <div className="space-y-3">
          {routines.map((r) => (
            <Link key={r.id} href={`/routines/${r.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{r.title}</CardTitle>
                    <CardDescription>
                      {r.stepCount} step{r.stepCount === 1 ? "" : "s"}
                      {r.authorName ? ` · by ${r.authorName}` : ""}
                    </CardDescription>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                    {r.score > 0 ? "+" : ""}
                    {r.score}
                  </span>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
