import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { quickBuyDisclosure, type QuickBuyLink } from "@/lib/quick-buy";

// The product page's short "Where to buy" row near the top (lib/quick-buy):
// the store buttons and a one-line disclosure, with a jump to the full
// section, which keeps sizes, stock and per-store notes.
export function QuickBuyRow({ links, moreHref }: { links: QuickBuyLink[]; moreHref: string }) {
  if (links.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {links.every((l) => l.search) ? "Check at" : "Where to buy"}
        </span>
        {links.map((l) => (
          <a key={l.key} href={l.href} target="_blank" rel={l.rel} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {l.label} <ExternalLink className="ml-1 h-3.5 w-3.5" />
            <span className="sr-only">{l.search ? " (search, opens in new tab)" : " (opens in new tab)"}</span>
          </a>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {quickBuyDisclosure(links)}{" "}
        <a href={moreHref} className="font-medium text-brand hover:underline">
          More on where to buy ↓
        </a>
      </p>
    </div>
  );
}
