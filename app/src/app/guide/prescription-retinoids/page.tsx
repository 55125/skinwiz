import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { SITE_NAME } from "@/lib/brand";

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

const SOURCES = [
  "Reynolds RV et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol 2024;90(5):1006.e1-30 (AAD)",
  "FDA prescribing information: tretinoin cream and gel (sun sensitivity, irritation, use with other topical products); tazarotene (pregnancy)",
  "American Academy of Dermatology, acne patient education (aad.org/public/diseases/acne)",
];

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
        title="Using a prescription retinoid?"
        description="Tretinoin (Retin-A and others), prescription-strength adapalene, tazarotene or trifarotene. The everyday products around it make a real difference to how well you tolerate it."
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-relaxed dark:border-amber-900/60 dark:bg-amber-950/20">
        <p className="font-semibold">Your prescriber&apos;s directions come first.</p>
        <p className="mt-1 text-foreground/80">
          This page is general information about the skincare around a prescription, not instructions for the medicine itself.
          {" "}{SITE_NAME} never tells you how much to use, how often, or whether to start or stop. Ask your prescriber before
          changing how you use it.
        </p>
      </div>

      <Section title="What usually pairs well">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium">A gentle, non-medicated cleanser.</span> Fragrance-free, without scrubbing beads or acids.
          </li>
          <li>
            <span className="font-medium">A fragrance-free moisturizer.</span> Dryness and peeling are the most common side effects,
            and moisturizing helps. Ask your prescriber whether to apply it before or after the retinoid.
          </li>
          <li>
            <span className="font-medium">Broad-spectrum sunscreen, SPF 30 or higher, every morning.</span> Retinoids make skin
            more sensitive to the sun, and their labels say to limit sun exposure and use sun protection.
          </li>
        </ul>
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
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium">Exfoliating acids</span> (glycolic, lactic, mandelic, salicylic). Together with a retinoid
            they add up to more dryness and irritation. Many people keep them to different nights, or skip them while getting used
            to the retinoid.
          </li>
          <li>
            <span className="font-medium">Benzoyl peroxide with tretinoin.</span> Benzoyl peroxide can break down tretinoin, so the
            two are usually used at different times of day unless your prescription is made to be combined.
          </li>
          <li>
            <span className="font-medium">Another retinoid on top</span>, such as an over-the-counter retinol serum or adapalene gel.
            Doubling up adds irritation without being part of the plan.
          </li>
          <li>
            <span className="font-medium">Scrubs, cleansing brushes, astringent or alcohol toners</span>, and waxing on treated skin,
            which can lift fragile skin.
          </li>
        </ul>
      </Section>

      <Section title="The first few weeks">
        <p>
          Dryness, redness, flaking and stinging are common at first and usually ease as skin adjusts. For acne, breakouts can
          look a little worse before they get better, and real improvement usually takes 8 to 12 weeks of steady use.
        </p>
        <p>
          Call your prescriber if irritation is severe or doesn&apos;t settle, if you have swelling or blistering, or if you are
          pregnant, planning a pregnancy or breastfeeding.
        </p>
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
          {SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="pt-2">Drafted with AI assistance; physician review in progress.</p>
      </section>
    </div>
  );
}
