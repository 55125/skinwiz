import { RaterApplicationForm } from "@/components/rater-application-form";
import { Separator } from "@/components/ui/separator";

export default function ForCliniciansPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">For dermatologists</h1>
        <p className="mt-2 text-muted-foreground">
          SkinWiz&apos;s Derm Score exists because every other tool in this space runs on ingredient-list
          heuristics with no clinical authority behind them. We&apos;re building a verified panel of
          board-certified dermatologists instead.
        </p>
      </div>

      <section className="space-y-2 text-sm">
        <h2 className="text-base font-medium text-foreground">How the panel works</h2>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Board certification (ABD/AOBD) and NPI are verified before any rating is accepted.</li>
          <li>Scores are per concern (e.g. &quot;for acne-prone skin&quot;), never one blended number.</li>
          <li>Rubric-based, not stars: evidence for the claimed benefit, formulation quality, irritation risk, value.</li>
          <li>
            Conflict-of-interest disclosure is pulled automatically from CMS Open Payments, and raters are
            recused from products made by companies that pay them.
          </li>
          <li>Compensation, if any, is disclosed and never tied to the score given.</li>
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
