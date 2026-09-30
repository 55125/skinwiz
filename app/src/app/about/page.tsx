import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About & methodology — SkinWiz",
  description: "How SkinWiz scores skincare products, where its data comes from, and what it is not.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">About SkinWiz</h1>
        <p className="mt-2 text-muted-foreground">
          SkinWiz matches self-reported skin concerns to evidence-graded active ingredients and specific
          OTC products. It is built for education and product matching — not diagnosis or individualized
          treatment.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">How scoring works</h2>
        <p className="text-sm text-muted-foreground">
          Every product carries two independent scores, shown separately rather than blended into one
          number:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>
            <strong className="text-foreground">Derm Score</strong> — from a panel of board-certified
            dermatologists whose ABD/AOBD certification and NPI will be verified before they can rate.
            The panel hasn&apos;t launched yet, so no product has a Derm Score today. Once it does, a score
            is only shown after at least 5 dermatologists have rated a product for a given concern.
          </li>
          <li>
            <strong className="text-foreground">User Score</strong> — the percentage of people who
            reported improvement after using the product, logged directly on SkinWiz rather than pulled
            from retailer star ratings. Not shown until at least 10 people have logged an outcome.
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
          relationships never influence Derm Score or User Score.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Not medical advice</h2>
        <p className="text-sm text-muted-foreground">
          SkinWiz does not diagnose any condition, and using it does not create a doctor-patient relationship
          with any dermatologist on our panel or otherwise affiliated with the site. Nothing here should delay
          or replace care from a board-certified dermatologist. See our{" "}
          <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </section>
    </div>
  );
}
