import { ExternalLink, ShieldAlert } from "lucide-react";
import type { ProductRecall } from "@/lib/recalls";
import { classMeaning, EMAIL_CONFIDENCE, fdaRecallUrl } from "@/lib/recall-match";

const fmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const date = (d: string | null) => (d ? fmt.format(new Date(`${d}T00:00:00Z`)) : null);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Prominent but calm: recalls usually cover specific lots, and a text-based
// match is only a "may", so this informs and points at the FDA notice rather
// than alarming.
export function RecallBanner({ recalls }: { recalls: ProductRecall[] }) {
  if (!recalls.length) return null;
  return (
    <section
      aria-labelledby="recall-banner-title"
      className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/30"
    >
      <h2 id="recall-banner-title" className="flex items-center gap-2 text-base font-semibold text-amber-950 dark:text-amber-100">
        <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
        {recalls.some((r) => r.confidence >= EMAIL_CONFIDENCE)
          ? `FDA recall${recalls.length > 1 ? "s" : ""} for this product`
          : "An FDA recall may cover this product"}
      </h2>
      <ul className="space-y-3">
        {recalls.map((r) => {
          const sure = r.confidence >= EMAIL_CONFIDENCE;
          const meaning = classMeaning(r.classification);
          const ended = r.status === "Terminated";
          return (
            <li key={r.recallNumber} className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                {r.classification ?? "Recall"}
                {date(r.recallInitiationDate) && <> · started {date(r.recallInitiationDate)}</>}
                {r.status && <> · {ended ? "recall has ended" : r.status.toLowerCase()}</>}
              </p>
              {meaning && <p className="text-muted-foreground">{meaning[0].toUpperCase() + meaning.slice(1)}.</p>}
              {r.reasonForRecall && (
                <p>
                  <span className="font-medium">Reason:</span> {clip(r.reasonForRecall, 320)}
                </p>
              )}
              {!sure && (
                <p className="text-muted-foreground">
                  Matched by company and product name, not by product code, so it may be a different version of this
                  product. Recalled item: &ldquo;{clip(r.productDescription, 160)}&rdquo;
                </p>
              )}
              <p className="text-muted-foreground">
                Recalls usually cover specific lots: check the lot number on your package against the notice.{" "}
                <a
                  href={fdaRecallUrl(r.eventId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                >
                  FDA notice {r.recallNumber} <ExternalLink className="h-3 w-3" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
