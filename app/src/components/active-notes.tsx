import { FlaskConical } from "lucide-react";
import { IngredientLink } from "@/components/ingredient-link";
import { activeUse } from "@/db/active-uses";
import { pubchemLinkText } from "@/lib/pubchem";
import { cn } from "@/lib/utils";

type Note = {
  activeId: string;
  activeName: string;
  summary: string;
  typicalConcentrationText: string | null;
  needsClinicianReview: boolean;
  pubchemCid: number | null;
  molecularFormula: string | null;
};

// "Why this active", shown right under the product's ingredient list so the
// explanation sits next to the names it explains: what each tracked active is
// used for, then its factual summary.
export function ActiveNotes({ notes, className }: { notes: Note[]; className?: string }) {
  if (notes.length === 0) return null;
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <FlaskConical className="h-3.5 w-3.5 text-brand" />
        {notes.length === 1 ? "Why this active" : "Why these actives"}
      </h3>
      <ul className="space-y-2">
        {notes.map((note) => {
          const use = activeUse(note.activeId);
          return (
            <li key={note.activeId} className="space-y-1.5 rounded-lg bg-muted/40 p-3">
              <p className="text-sm">
                <IngredientLink id={note.activeId} className="font-semibold">
                  {note.activeName}
                </IngredientLink>
              </p>
              {use && (
                <p className="text-sm leading-relaxed">
                  <span className="font-medium">Used for:</span> {use}
                </p>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground">{note.summary}</p>
              {note.typicalConcentrationText && <p className="text-xs text-muted-foreground">{note.typicalConcentrationText}</p>}
              {note.needsClinicianReview && (
                <p className="text-xs italic text-amber-700 dark:text-amber-400">
                  Clinical evidence grade: pending board-certified dermatologist review.
                </p>
              )}
              {note.pubchemCid && (
                <p className="text-xs">
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${note.pubchemCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:underline"
                  >
                    {pubchemLinkText(note.activeId, note.molecularFormula)}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
