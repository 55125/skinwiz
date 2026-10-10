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
          {SITE_NAME} matches self-reported skin concerns to FDA-recognized active ingredients and specific
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
          Products for cosmetic ingredients with no OTC drug status (niacinamide, vitamin C, and similar)
          come from{" "}
          <a href="https://world.openbeautyfacts.org" target="_blank" rel="noopener noreferrer" className="underline">
            Open Beauty Facts
          </a>
          , a community-edited database, used here under its Open Database License. These listings are
          clearly marked &quot;Community-sourced&quot; throughout the site and are not independently
          verified the way the FDA-sourced catalog is.
        </p>
      </section>

      {/* Linked from the listing filters and the product page's ingredient
          notes ("How we check"), which keep only a one-line summary. */}
      <section id="how-we-check" className="scroll-mt-24 space-y-2">
        <h2 className="text-lg font-medium">How we check ingredients</h2>
        <p className="text-sm text-muted-foreground">
          Ingredient flags (&ldquo;Fragrance-free&rdquo;, &ldquo;Paraben-free&rdquo; and the rest), the free-from
          filters on product lists, contact-allergen matches and your avoid-list checks are all computed from each
          product&apos;s published ingredient list, not a brand&apos;s marketing claim or a certification. A flag means
          we didn&apos;t find that ingredient in the list. It is not exhaustive: see a
          board-certified dermatologist about your own known allergens.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Products we don&apos;t have a full ingredient list for (most openFDA-only listings) won&apos;t match any
            filter rather than being assumed clean.
          </li>
          <li>
            A product listing only &ldquo;fragrance&rdquo; doesn&apos;t pass a fragrance-allergen filter, since the blend
            could contain it. Where it matters for your avoid list, we say the fragrance may hide it.
          </li>
          <li>
            Ingredient lists can change when a brand reformulates, and community-sourced lists aren&apos;t independently
            verified. Check the label on the product you buy.
          </li>
          <li>
            Match scores weigh a product&apos;s ingredient list against your{" "}
            <Link href="/profile" className="underline underline-offset-2">
              skin profile
            </Link>{" "}
            and{" "}
            <Link href="/avoid" className="underline underline-offset-2">
              avoid list
            </Link>
            : an ingredient you avoid caps the score low, and ones that suit your skin type or concerns raise it. They
            describe the ingredient list only, not how well a product works, and products without a full ingredient list
            can&apos;t be scored.
          </li>
        </ul>
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
