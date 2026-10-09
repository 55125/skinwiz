import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { SITE_NAME } from "@/lib/brand";
import { RX_RETINOID_GUIDE as G, type GuidePoint } from "@/db/rx-retinoid-guide";

// Plain-language companion for people already using a prescription retinoid.
// General skincare around the medicine only: no dosing, and never advice to
// start, stop or change a prescription. Kept out of search until the site's
// dermatologist has reviewed it.
export const metadata: Metadata = {
  title: "Using a prescription retinoid",
  description:
    "Tretinoin, prescription adapalene, tazarotene or trifarotene: which everyday products usually pair well, what to space out, and what to expect in the first weeks.",
  alternates: { canonical: "/guide/prescription-retinoids" },
  robots: { index: false, follow: true },
};

function Points({ points }: { points: GuidePoint[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {points.map((p) => (
        <li key={p.lead}>
          <span className="font-medium">{p.lead}</span> {p.text}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

export default function PrescriptionRetinoidGuide() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <JsonLd data={breadcrumbLd(siteUrl(), [["Home", "/"], ["Using a prescription retinoid", "/guide/prescription-retinoids"]])} />
      <PageHeader
        eyebrow="Guide"
        title={G.title}
        description={G.intro}
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-relaxed dark:border-amber-900/60 dark:bg-amber-950/20">
        <p className="font-semibold">{G.disclaimerTitle}</p>
        <p className="mt-1 text-foreground/80">{G.disclaimer}</p>
      </div>

      <Section title="What usually pairs well">
        <Points points={G.pairsWell} />
        <p>
          <Link href="/concern/dry-skin-eczema?free=fragrance-free" className="font-medium text-brand hover:underline">
            Fragrance-free moisturizers
          </Link>{" "}
          ·{" "}
          <Link href="/concern/sun-protection?free=fragrance-free" className="font-medium text-brand hover:underline">
            Fragrance-free sunscreens
          </Link>
        </p>
      </Section>

      <Section title="What to space out, or ask about first">
        <Points points={G.spaceOut} />
      </Section>

      <Section title="The first few weeks">
        {G.firstWeeks.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </Section>

      <Section title={`Using ${SITE_NAME} with it`}>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Mark it on{" "}
            <Link href="/regimen" className="font-medium text-brand hover:underline">
              your regimen
            </Link>{" "}
            (&ldquo;Also using a prescription retinoid?&rdquo;), and the regimen flags products you&apos;ve added that are usually
            spaced apart from it.
          </li>
          <li>
            Use the <span className="font-medium">Sensitive skin</span> filter on any product list to see options without fragrance,
            drying alcohol or essential oils.
          </li>
        </ul>
      </Section>

      <section className="space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Sources</p>
        <ul className="list-disc space-y-0.5 pl-5">
          {G.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="pt-2">Drafted with AI assistance; physician review in progress.</p>
      </section>
    </div>
  );
}
