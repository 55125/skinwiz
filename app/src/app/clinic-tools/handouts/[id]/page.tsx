import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { HandoutSections } from "@/components/handout-sections";
import { HANDOUT_CATEGORIES, UNIVERSAL_STOP_RULES, getTemplate } from "@/db/handout-templates";
import { FEATURES } from "@/lib/feature-flags";
import { SLOT_LABEL } from "@/lib/handout-types";

// A read-only look at a library handout before a clinician uses it. Drafts
// aren't medical advice to the public yet, so these pages stay out of search.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = getTemplate((await params).id);
  return t ? { title: `${t.name}: patient handout`, robots: { index: false, follow: true } } : {};
}

export default async function HandoutPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const t = FEATURES.HANDOUTS ? getTemplate((await params).id) : undefined;
  if (!t) notFound();
  const category = HANDOUT_CATEGORIES.find((c) => c.id === t.category);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <Link href="/clinic-tools#library" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Handout library
      </Link>
      <PageHeader eyebrow={category?.name ?? "Handout"} title={t.title} description={t.summary}>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={`/clinicians/handouts/new?template=${t.id}`}
            className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Use and customize
          </Link>
          <span className="text-xs text-muted-foreground">Free clinician account; your name and clinic go on the copy.</span>
        </div>
      </PageHeader>

      {!t.reviewed && (
        <p className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Draft: AI-written and still in dermatologist review. Read it before handing it out; every word is editable.
        </p>
      )}

      <article className="space-y-6 rounded-2xl border bg-card p-6">
        <HandoutSections sections={t.sections} />
        {t.steps.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-base font-semibold">Products and steps</h3>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {t.steps.map((s, i) => (
                <li key={i}>
                  <span className="font-medium">{s.label}</span> <span className="text-muted-foreground">({SLOT_LABEL[s.slot].toLowerCase()})</span>
                  <span className="block text-muted-foreground">{s.directions}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">You pick the exact products when you use it.</p>
          </section>
        )}
        <section className="space-y-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <h3 className="font-semibold">Stop and call us if:</h3>
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
      </section>
    </div>
  );
}
