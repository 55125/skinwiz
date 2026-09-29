import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const button = cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-full px-4");
  const disabled = "pointer-events-none opacity-40";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-6 text-sm">
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={cn(button, page <= 1 && disabled)}
      >
        <ChevronLeft className="h-4 w-4" /> Previous
      </Link>
      <span className="min-w-28 text-center tabular-nums text-muted-foreground">
        Page {page.toLocaleString()} of {totalPages.toLocaleString()}
      </span>
      <Link
        href={hrefFor(page + 1)}
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
        className={cn(button, page >= totalPages && disabled)}
      >
        Next <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
