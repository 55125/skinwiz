import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ALL_HANDOUT_TEMPLATES } from "@/db/handout-templates";

// The clinician library's pediatric handouts, readable by parents without a
// clinician account. Education only (see ./[id]/page.tsx).
export const metadata: Metadata = {
  title: "Children's skin: guides for parents",
  description: "Plain-language guides for parents on common children's skin problems: eczema, diaper rash, cradle cap, molluscum, warts, sun protection and more.",
  robots: { index: false, follow: true },
};

export default function KidsGuidesPage() {
  const guides = ALL_HANDOUT_TEMPLATES.filter((t) => t.category === "pediatric");
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="For parents"
        title="Children's skin"
        description="Plain-language guides to common skin problems in babies and children, written for parents. They don't replace a visit: your child's doctor knows your child."
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {guides.map((t) => (
          <li key={t.id}>
            <Link href={`/guide/kids/${t.id}`} className="block h-full rounded-2xl border bg-card p-4 transition-colors hover:border-brand/40">
              <p className="font-semibold">{t.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Drafted with AI assistance; physician review in progress.</p>
    </div>
  );
}
