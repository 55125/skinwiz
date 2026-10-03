import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { PriceQuote } from "@/lib/prices/types";
import { formatPerUnit, type LivePrice, type StoreBrandSavings } from "@/lib/prices/unit";
import { unitPrice } from "@/lib/equivalence";

/** "under an hour ago", "5 hours ago", "2 days ago". */
export function checkedAgo(fetchedAt: string, now = new Date()): string {
  const hours = Math.max(0, (now.getTime() - Date.parse(fetchedAt)) / 3_600_000);
  if (hours < 1) return "under an hour ago";
  if (hours < 48) return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? "" : "s"} ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

// The product page's live prices: one row per merchant, cheapest first, from
// lib/prices/store.ts getDisplayQuotes (fresh, OTC-only, only while enabled).
export function PriceList({ quotes, fallbackPack }: { quotes: PriceQuote[]; fallbackPack?: Parameters<typeof unitPrice>[1] }) {
  if (quotes.length === 0) return null;
  const oldest = quotes.reduce((a, q) => (q.fetchedAt < a ? q.fetchedAt : a), quotes[0].fetchedAt);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">Prices</h3>
        <p className="text-xs text-muted-foreground">Checked {checkedAgo(oldest)}. Prices and stock can change.</p>
      </div>
      {quotes.map((q) => {
        const per = formatPerUnit(unitPrice(q.price, q.pack ?? fallbackPack ?? null));
        return (
          <div key={`${q.source}-${q.merchantId}`} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
            <div>
              <p className="font-medium tabular-nums">
                ${q.price.toFixed(2)} <span className="text-sm font-normal">at {q.merchantName}</span>
                {per && <span className="ml-1 text-xs text-muted-foreground">· {per}</span>}
              </p>
              <p className="text-xs text-muted-foreground">Affiliate link — we may earn a commission.</p>
            </div>
            <a
              href={q.url}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Buy <ExternalLink className="ml-1 h-3.5 w-3.5" />
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </div>
        );
      })}
    </div>
  );
}

// "Store brand saves X%" on equivalence lists (business-plan.md §5).
export function StoreBrandSavingsNote({ savings, live }: { savings: StoreBrandSavings; live: Map<string, LivePrice> }) {
  const s = live.get(savings.storeBrand.id)!;
  const n = live.get(savings.nameBrand.id)!;
  return (
    <p className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm dark:border-teal-800 dark:bg-teal-950/30">
      <span className="font-semibold">Store brand saves {savings.pct}%</span> per {savings.per === "oz" ? "ounce" : "item"}:{" "}
      {savings.storeBrand.storeBrand} at {formatPerUnit(s.perUnit)} vs {savings.nameBrand.brandName} at {formatPerUnit(n.perUnit)}, at
      recent retailer prices.
    </p>
  );
}
