import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBar({ defaultValue, large }: { defaultValue?: string; large?: boolean }) {
  return (
    <form action="/search" method="GET" className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search products or ingredients — e.g. niacinamide, CeraVe, sunscreen"
        className={large ? "h-12 pl-10 text-base" : "pl-10"}
        autoComplete="off"
      />
    </form>
  );
}
