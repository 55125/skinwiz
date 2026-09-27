import Link from "next/link";
import { Stethoscope, Users, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getConcerns } from "@/lib/queries";

export default function Home() {
  const concerns = getConcerns();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-14">
      <section className="space-y-4 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Skincare, scored two ways.
        </h1>
        <p className="text-muted-foreground text-lg">
          A <strong className="text-foreground">Derm Score</strong> from board-certified dermatologists,
          and an <strong className="text-foreground">Audience Score</strong> from real reported outcomes —
          not a guess from an ingredient list.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
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
