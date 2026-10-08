import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { HandoutSections } from "@/components/handout-sections";
import { UNIVERSAL_STOP_RULES, getTemplate } from "@/db/handout-templates";
import { SLOT_LABEL } from "@/lib/handout-types";

// A pediatric library handout for parents. These are written for a clinic to
// hand out ("call us"), so the page says who "we" is, keeps the education
// and over-the-counter care steps, and leaves out prescription steps and
// directions: those come from the child's own clinician.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = getTemplate((await params).id);
  return t?.category === "pediatric" ? { title: t.title, description: t.summary, robots: { index: false, follow: true } } : {};
}

export default async function KidsGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const t = getTemplate((await params).id);
  if (!t || t.category !== "pediatric") notFound();
  const otcSteps = t.steps.filter((s) => s.kind === "otc");
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <Link href="/guide/kids" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Children&apos;s skin guides
      </Link>
      <PageHeader eyebrow="For parents" title={t.title} description={t.summary} />
      <p className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
        Written as a handout a dermatology clinic gives families. Where it says &ldquo;we&rdquo; or &ldquo;us&rdquo;, that means
        your child&apos;s doctor or dermatologist. It&apos;s general information, not a diagnosis, and any prescription is used
        only as your child&apos;s clinician directs.
      </p>

      <article className="space-y-6 rounded-2xl border bg-card p-6">
        <h2 className="sr-only">The guide</h2>
        <HandoutSections sections={t.sections} />
        {otcSteps.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-base font-semibold">Everyday care</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {otcSteps.map((s, i) => (
                <li key={i}>
                  <span className="font-medium">{s.label}</span> <span className="text-muted-foreground">({SLOT_LABEL[s.slot].toLowerCase()})</span>
                  <span className="block text-muted-foreground">{s.directions}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
        <section className="space-y-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <h2 className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden /> Call your child&apos;s doctor if:
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {[...t.stopRules, ...UNIVERSAL_STOP_RULES].map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      </article>

      <section className="space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Sources</p>
        <ul className="list-disc space-y-0.5 pl-5">
          {t.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="pt-2">{t.reviewed ? "Drafted with AI assistance and reviewed by the site's dermatologist." : "Drafted with AI assistance; physician review in progress."}</p>
      </section>
    </div>
  );
}
