import Link from "next/link";
import { cn } from "@/lib/utils";

export type IngredientLink = {
  ingredientId: string;
  rawName: string;
  isActive: boolean;
};

// Every ingredient links to its own page. Tracked actives are set in bold so
// the eye finds them in a 30-item INCI list; the label's own spelling is kept.
export function IngredientList({ items, className }: { items: IngredientLink[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-1 gap-y-1 text-sm leading-relaxed", className)}>
      {items.map((item, i) => (
        <li key={`${item.ingredientId}-${i}`} className="inline-flex">
          <Link
            href={`/ingredient/${encodeURIComponent(item.ingredientId)}`}
            className={cn(
              "rounded-md px-1.5 py-0.5 underline decoration-border decoration-1 underline-offset-4 transition-colors hover:bg-brand-soft hover:text-brand-foreground hover:decoration-brand",
              item.isActive && "font-semibold",
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
