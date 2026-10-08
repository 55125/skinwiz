import Link from "next/link";
import { cn } from "@/lib/utils";

export type ListSort = "name" | "match" | undefined;

/** Reads ?sort= for a product listing: "match" only when there's something to match on. */
export function parseListSort(param: string | undefined, canMatch: boolean): ListSort {
  return param === "match" && canMatch ? "match" : param === "name" ? "name" : undefined;
}

// The Sort row shared by /browse and the concern pages.
export function SortChips({ sort, canMatch, hrefFor }: { sort: ListSort; canMatch: boolean; hrefFor: (sort: ListSort) => string }) {
  const options: { id: ListSort; label: string }[] = [
    { id: undefined, label: "Default" },
    { id: "name", label: "A–Z" },
    ...(canMatch ? [{ id: "match" as const, label: "Best match" }] : []),
  ];
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="mr-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Sort</span>
      {options.map((o) => (
        <Link
          key={o.label}
          href={hrefFor(o.id)}
          aria-current={sort === o.id ? "true" : undefined}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            sort === o.id ? "border-brand/50 bg-brand-soft text-brand-foreground" : "hover:bg-muted",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export function MatchSortNote() {
  return (
    <p className="text-xs text-muted-foreground">
      Ranked by your{" "}
      <Link href="/profile" className="underline">
        profile
      </Link>{" "}
      and avoid list. Products without a full ingredient list can&apos;t be scored and are left out of this view.
    </p>
  );
}
