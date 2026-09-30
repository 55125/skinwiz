import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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

      <Separator />

      <Alert>
        <AlertTitle>Terms of Service — draft, pending attorney review</AlertTitle>
        <AlertDescription>
          <p className="mt-2">
            This section is a placeholder. SkinWiz has not yet completed a healthcare regulatory attorney
            review of its terms, and nothing here should be read as finalized legal language. In the
            meantime, the substantive commitments below hold:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>SkinWiz does not diagnose any medical condition.</li>
            <li>Using SkinWiz does not create a doctor-patient relationship with any dermatologist on our panel or otherwise affiliated with the site.</li>
            <li>Nothing on this site should delay or replace seeking care from a board-certified dermatologist.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
