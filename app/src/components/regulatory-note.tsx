import Link from "next/link";
import { ChevronDown, Landmark } from "lucide-react";
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
        Banned by at least one authority
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
        <Sources note={note} /> A summary of public rules, not legal or medical advice.
      </p>
    </section>
  );
}

function Sources({ note }: { note: RegulatoryNote }) {
  return (
    <>
      Sources:{" "}
      {note.sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 && " · "}
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
            {s.label}
          </a>
        </span>
      ))}
      . Checked {checkedLabel(note.checked)}.
    </>
  );
}

/**
 * Product pages: one plain box, "N ingredients banned by at least one
 * authority", naming them; tapping opens who acted and the sources. Neutral
 * on purpose: red is for "not a match for you" alone.
 */
export function BannedIngredientsBox({
  entries,
  isDrug = false,
}: {
  entries: { note: RegulatoryNote; allergenIds: string[]; names: string[] }[];
  isDrug?: boolean;
}) {
  const names = [...new Set(entries.flatMap((e) => e.names))];
  if (names.length === 0) return null;
  const count = `${names.length} ${names.length === 1 ? "ingredient" : "ingredients"}`;
  return (
    <details id="banned" className="group scroll-mt-24 rounded-xl border bg-card px-4 py-3 text-sm">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-semibold">{count} banned by at least one authority</span>
          <span className="block text-[13px] text-muted-foreground">{names.join(", ")}</span>
        </span>
        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-3 space-y-3 border-t pt-3">
        {entries.map(({ note, allergenIds, names }) => (
          <div key={note.id} className="space-y-1.5">
            <p>
              {allergenIds.map((id, i) => (
                <span key={id}>
                  {i > 0 && ", "}
                  <Link href={`/allergens/${id}`} className="font-medium underline underline-offset-2">
                    {names[i]}
                  </Link>
                </span>
              ))}
              {note.productSuffix && <span className="text-muted-foreground">{note.productSuffix.replace(/^, (which )?/, " · ")}</span>}
            </p>
            <p className="text-[13px] leading-relaxed">{note.body}</p>
            <p className="text-xs text-muted-foreground">
              {isDrug && note.cosmeticsOnly && "This product is sold as an OTC drug, which that cosmetics rule doesn't cover. "}
              <Sources note={note} /> A summary of public rules, not legal or medical advice.
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}
