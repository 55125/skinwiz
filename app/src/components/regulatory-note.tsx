import { Landmark } from "lucide-react";
import type { RegulatoryNote } from "@/db/regulatory-notes";

function checkedLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * What a regulator has done about an ingredient, with its sources. A fact
 * about the rules, not a verdict on the product: pages say "contains", and
 * an OTC drug gets told the cosmetics rule doesn't cover it.
 */
export function RegulatoryNoteCard({
  note,
  ingredientNames,
  isDrug = false,
  id,
}: {
  note: RegulatoryNote;
  /** On a product page: the matched ingredients, named in the heading. */
  ingredientNames?: string[];
  isDrug?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 space-y-2 rounded-2xl border border-sky-300 bg-sky-50 p-4 text-sm leading-relaxed text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100"
    >
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-sky-800 dark:text-sky-300">
        <Landmark className="h-4 w-4 shrink-0" aria-hidden />
        Regulatory note
      </h2>
      <p className="font-medium">
        {ingredientNames && ingredientNames.length > 0 ? `Contains ${ingredientNames.join(", ")}${note.productSuffix}.` : `${note.headline}.`}
      </p>
      <p>{note.body}</p>
      {isDrug && note.cosmeticsOnly && (
        <p className="text-sky-900/80 dark:text-sky-200/80">
          This product is sold as an OTC drug, which that cosmetics rule doesn&apos;t cover.
        </p>
      )}
      <p className="text-xs text-sky-900/80 dark:text-sky-200/80">
        Sources:{" "}
        {note.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && " · "}
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
              {s.label}
            </a>
          </span>
        ))}
        . Checked {checkedLabel(note.checked)}. A summary of public rules, not legal or medical advice.
      </p>
    </section>
  );
}
