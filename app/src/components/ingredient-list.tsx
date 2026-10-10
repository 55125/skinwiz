import { cn } from "@/lib/utils";
import { tidyIngredientName } from "@/lib/format";
import { IngredientLink } from "@/components/ingredient-link";

export type IngredientListItem = {
  ingredientId: string;
  rawName: string;
  isActive: boolean;
};

// Every ingredient links to its own page. Tracked actives are set in bold so
// the eye finds them in a 30-item INCI list. ALL-CAPS labels are shown in
// title case for readability; mixed-case spellings are kept as printed.
export function IngredientList({
  items,
  className,
  likes = [],
  dislikes = [],
}: {
  items: IngredientListItem[];
  className?: string;
  likes?: string[];
  dislikes?: string[];
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-1 gap-y-1 text-sm leading-relaxed", className)}>
      {items.map((item, i) => (
        <li key={`${item.ingredientId}-${i}`} className="inline-flex">
          <IngredientLink
            id={item.ingredientId}
            className={cn(
              "rounded-md px-1.5 py-0.5 hover:bg-brand-soft hover:text-brand-foreground",
              item.isActive && "font-semibold",
              likes.includes(item.ingredientId) && "bg-emerald-100 text-emerald-900 decoration-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-300",
              dislikes.includes(item.ingredientId) && "bg-red-100 text-red-900 decoration-red-400 dark:bg-red-950/50 dark:text-red-300",
            )}
          >
            {tidyIngredientName(item.rawName)}
          </IngredientLink>
          {i < items.length - 1 && <span aria-hidden className="text-muted-foreground">,</span>}
        </li>
      ))}
    </ul>
  );
}
