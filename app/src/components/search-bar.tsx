import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SearchBar({ defaultValue, large }: { defaultValue?: string; large?: boolean }) {
  return (
    <form
      action="/search"
      method="GET"
      role="search"
      className={cn(
        "relative flex w-full items-center",
        large && "rounded-full border bg-card p-1.5 shadow-lg shadow-foreground/5 focus-within:ring-3 focus-within:ring-ring/30",
      )}
    >
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
          large ? "left-5" : "left-3",
        )}
      />
      <Input
        type="text"
        name="q"
        defaultValue={defaultValue}
        aria-label="Search products or ingredients"
        placeholder="Search products or ingredients — e.g. niacinamide, CeraVe, sunscreen"
        className={cn(
          large
            ? "h-11 flex-1 rounded-full border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
            : "h-10 rounded-lg pl-10",
        )}
        autoComplete="off"
      />
      {large && (
        <Button type="submit" size="lg" className="h-11 shrink-0 rounded-full px-6">
          Search
        </Button>
      )}
    </form>
  );
}
