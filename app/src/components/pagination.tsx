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
  const edge = (enabled: boolean, target: number, content: React.ReactNode) =>
    enabled ? (
      <Link href={hrefFor(target)} className={button}>
        {content}
      </Link>
    ) : (
      <span aria-disabled="true" className={cn(button, "pointer-events-none opacity-40")}>
        {content}
      </span>
    );
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pt-6 text-sm">
      {edge(
        page > 1,
        page - 1,
        <>
          <ChevronLeft className="h-4 w-4" /> Previous
        </>,
      )}
      <span className="min-w-28 text-center tabular-nums text-muted-foreground">
        Page {page.toLocaleString()} of {totalPages.toLocaleString()}
      </span>
      {edge(
        page < totalPages,
        page + 1,
        <>
          Next <ChevronRight className="h-4 w-4" />
        </>,
      )}
    </nav>
  );
}
