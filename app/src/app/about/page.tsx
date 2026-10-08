import Link from "next/link";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "About & methodology",
  description: `How ${SITE_NAME} scores skincare products, where its data comes from, and what it is not.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">About {SITE_NAME}</h1>
        <p className="mt-2 text-muted-foreground">
          {SITE_NAME} matches self-reported skin concerns to evidence-graded active ingredients and specific
          OTC products. It is built for education and product matching — not diagnosis or individualized
          treatment.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Who runs {SITE_NAME}</h2>
        <p className="text-sm text-muted-foreground">
          {SITE_NAME} is run by Michael Tassavor, MD, a board-certified dermatologist. He built it because patients
          kept asking which drugstore product actually contains the ingredient their dermatologist recommended, and
          ingredient-list apps answer that with guesses rather than evidence. Questions, corrections and partnership
          inquiries are welcome on the{" "}
          <Link href="/contact" className="underline underline-offset-2">
            contact page
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">How scoring works</h2>
        <p className="text-sm text-muted-foreground">
          Every product carries two independent scores, shown separately rather than blended into one
          number:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>
            <strong className="text-foreground">Derm Score (planned)</strong> — from a panel of board-certified
            dermatologists whose ABD/AOBD certification and NPI will be verified before they can rate.
            The panel hasn&apos;t launched yet, so no product has a Derm Score today. Once it does, a score
            is only shown after at least 5 dermatologists have rated a product for a given concern.
          </li>
          <li>
            <strong className="text-foreground">User Score</strong> — the percentage of people who
            reported improvement after using the product, logged directly on {SITE_NAME} rather than pulled
            from retailer star ratings. Shown once a few people have logged an outcome, and marked
            &ldquo;Early&rdquo; until more than 5 have.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Where the data comes from</h2>
        <p className="text-sm text-muted-foreground">
          Most product and active-ingredient data comes from the FDA&apos;s openFDA drug label and NDC
          directory — the same regulatory data manufacturers file with the FDA. Ingredient summaries on
          this site describe what a monograph active is and how it&apos;s typically used; they are not a
          clinical efficacy judgment. Any evidence grade you see (or don&apos;t, yet) is assigned only by
          a verified dermatologist rater, never inferred automatically.
        </p>
        <p className="text-sm text-muted-foreground">
          Products for cosmetic ingredients with no FDA drug status (niacinamide, vitamin C, and similar)
          come from{" "}
          <a href="https://world.openbeautyfacts.org" target="_blank" rel="noopener noreferrer" className="underline">
            Open Beauty Facts
          </a>
          , a community-edited database, used here under its Open Database License. These listings are
          clearly marked &quot;Community-sourced&quot; throughout the site and are not independently
          verified the way the FDA-sourced catalog is.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Affiliate disclosure</h2>
        <p className="text-sm text-muted-foreground">
          Some product links are affiliate links, and we may earn a commission if you buy through them, at
          no extra cost to you. This is disclosed next to every such link, not just here. Commercial
          relationships never influence the User Score or the planned Derm Score.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Not medical advice</h2>
        <p className="text-sm text-muted-foreground">
          {SITE_NAME} does not diagnose any condition, and using it does not create a doctor-patient relationship
          with any dermatologist affiliated with the site. Nothing here should delay
          or replace care from a board-certified dermatologist. See our{" "}
          <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </section>
    </div>
  );
}
