import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { readAvoidIds } from "@/lib/avoid";
import { cn } from "@/lib/utils";

// The one-click "safe for me" filter, above the results rather than inside
// the filter panel. Adds (or removes) every avoid-list id to the `free`
// param, keeping the visitor's other filters. Server-rendered links, no JS,
// like the rest of the filters. Renders nothing without an avoid list.
export async function AvoidSwitch({
  basePath,
  searchParams,
  selected,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  selected: string[];
}) {
  const avoidIds = await readAvoidIds();
  if (avoidIds.length === 0) return null;
  const on = avoidIds.every((id) => selected.includes(id));
  const next = on ? selected.filter((id) => !avoidIds.includes(id)) : [...new Set([...selected, ...avoidIds])];

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) if (k !== "free" && k !== "page" && v) params.set(k, v);
  if (next.length > 0) params.set("free", next.join(","));
  const qs = params.toString();
  const items = `${avoidIds.length} ${avoidIds.length === 1 ? "item" : "items"}`;

  return (
    <Link
      href={`${basePath}${qs ? `?${qs}` : ""}`}
      aria-pressed={on}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors",
        on
          ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100/70 dark:border-emerald-900 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
          : "bg-card hover:border-brand/40 hover:bg-brand-soft/50",
      )}
    >
      <ShieldCheck className={cn("h-5 w-5 shrink-0", on ? "text-emerald-600" : "text-brand")} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          {on ? `Showing only products safe for your avoid list (${items})` : `Only show products safe for your avoid list (${items})`}
        </span>
        <span className="block text-xs text-muted-foreground">
          {on
            ? "Products without a full ingredient list are hidden too, since they can't be checked."
            : "Hides anything that lists, or could be hiding, an ingredient you avoid."}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          on ? "bg-emerald-600" : "bg-muted-foreground/30",
        )}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </Link>
  );
}
