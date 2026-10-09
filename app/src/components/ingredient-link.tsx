import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ingredientHref(id: string): string {
  return `/ingredient/${encodeURIComponent(id)}`;
}

// The one way an ingredient name links to its page, so every mention looks
// and behaves the same: a quiet underline that turns brand-colored on hover.
// Ids are ingredient slugs; tracked actives share their slug with their
// ingredient row, so an active id works here too.
export function IngredientLink({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={ingredientHref(id)}
      className={cn("underline decoration-border decoration-1 underline-offset-4 transition-colors hover:text-brand hover:decoration-brand", className)}
    >
      {children}
    </Link>
  );
}
