import { FlaskConical } from "lucide-react";
import { IngredientLink } from "@/components/ingredient-link";
import { activeUse } from "@/db/active-uses";
import { cn } from "@/lib/utils";

type Note = { activeId: string; activeName: string; summary: string };

// "Why this active", shown right under the product's ingredient list: one
// line per tracked active saying what it's used for. The longer factual
// summary, typical strengths and chemistry live on the ingredient page the
// name links to, so a product with seven actives stays short.
export function ActiveNotes({ notes, className }: { notes: Note[]; className?: string }) {
  if (notes.length === 0) return null;
  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <FlaskConical className="h-3.5 w-3.5 text-brand" />
        {notes.length === 1 ? "Why this active" : "Why these actives"}
      </h3>
      <ul className="space-y-1.5 text-sm leading-relaxed">
        {notes.map((note) => (
          <li key={note.activeId}>
            <IngredientLink id={note.activeId} className="font-semibold">
              {note.activeName}
            </IngredientLink>
            : {activeUse(note.activeId) ?? note.summary}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Tap an active for what it is, typical strengths and the science behind it.</p>
    </div>
  );
}
