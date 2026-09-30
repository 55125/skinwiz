import Link from "next/link";
import { cn } from "@/lib/utils";

export type IngredientLink = {
  ingredientId: string;
  rawName: string;
  isActive: boolean;
};

// Every ingredient links to its own page. Tracked actives are set in bold so
// the eye finds them in a 30-item INCI list; the label's own spelling is kept.
export function IngredientList({
  items,
  className,
  likes = [],
  dislikes = [],
}: {
  items: IngredientLink[];
  className?: string;
  likes?: string[];
  dislikes?: string[];
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-1 gap-y-1 text-sm leading-relaxed", className)}>
      {items.map((item, i) => (
        <li key={`${item.ingredientId}-${i}`} className="inline-flex">
          <Link
            href={`/ingredient/${encodeURIComponent(item.ingredientId)}`}
            className={cn(
              "rounded-md px-1.5 py-0.5 underline decoration-border decoration-1 underline-offset-4 transition-colors hover:bg-brand-soft hover:text-brand-foreground hover:decoration-brand",
              item.isActive && "font-semibold",
              likes.includes(item.ingredientId) && "bg-emerald-100 text-emerald-900 decoration-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-300",
              dislikes.includes(item.ingredientId) && "bg-red-100 text-red-900 decoration-red-400 dark:bg-red-950/50 dark:text-red-300",
            )}
          >
            {item.rawName}
          </Link>
          {i < items.length - 1 && <span aria-hidden className="text-muted-foreground">,</span>}
        </li>
      ))}
    </ul>
  );
}
