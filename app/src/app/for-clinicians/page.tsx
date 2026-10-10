import { RaterApplicationForm } from "@/components/rater-application-form";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/brand";
import { FEATURES } from "@/lib/feature-flags";

export const metadata: Metadata = {
  alternates: { canonical: "/for-clinicians" },
  title: "For dermatologists",
  description: `Request to join the ${SITE_NAME} dermatologist rating panel.`,
};

// The clinic-tools blurb depends on a runtime feature flag.
export const dynamic = "force-dynamic";

export default function ForCliniciansPage() {
  const handouts = FEATURES.HANDOUTS;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">For dermatologists</h1>
        <p className="mt-2 text-muted-foreground">
          Every other tool in this space rates products with ingredient-list heuristics and no clinical
          authority behind them. {SITE_NAME} is building the Derm Score instead: a rating from a verified panel of
          board-certified dermatologists. The panel hasn&apos;t launched, so no product has a Derm Score yet.
        </p>
      </div>

      <section className="space-y-2 rounded-2xl border-2 border-brand/40 bg-card p-4 text-sm">
        <h2 className="text-base font-semibold text-foreground">Free clinic tools</h2>
        <p className="text-muted-foreground">
          {handouts
            ? "A library of patient handouts to use as is or customize, a tap-to-grade patch-test reader for medical assistants with a chart-ready write-up, and starter lists for your standard avoid lists. Patients get them by print, QR code or your own email, and land on a private page of their own."
            : "A tap-to-grade patch-test reader for medical assistants with a chart-ready write-up, or a one-page results sheet when the reading is already done. Patients scan its QR code and land on a private avoid list of their own."}
        </p>
        <Link href="/clinic-tools" className="inline-block font-medium text-brand hover:underline">
          See the clinic tools →
        </Link>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="text-base font-medium text-foreground">How the panel will work</h2>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Board certification (ABD/AOBD) and NPI will be verified before any rating is accepted.</li>
          <li>Scores will be per concern (e.g. &quot;for acne-prone skin&quot;), never one blended number.</li>
          <li>Rubric-based, not stars: evidence for the claimed benefit, formulation quality, irritation risk, value.</li>
          <li>
            Conflict-of-interest disclosures will be checked against CMS Open Payments, and raters recused
            from products made by companies that pay them.
          </li>
          <li>Compensation, if any, will be disclosed and never tied to the score given.</li>
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-base font-medium text-foreground">Request to join</h2>
        <p className="text-sm text-muted-foreground">
          The panel hasn&apos;t launched yet — no products have a Derm Score today. Leave your info and
          we&apos;ll reach out once verification is ready to go.
        </p>
        <RaterApplicationForm />
      </section>
    </div>
  );
}
