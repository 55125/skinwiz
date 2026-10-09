import Link from "next/link";
import { PackageX } from "lucide-react";
import type { DiscontinuedReason } from "@/lib/availability-rules";

const monthYear = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", timeZone: "UTC" });

// Shown on a product page when lib/availability-rules.ts thinks it's no
// longer made. Calm, like the recall banner: the page stays useful for
// someone who already owns it, and the automatic flags are only a "likely".
export function DiscontinuedBanner({
  reason,
  alternatives,
}: {
  reason: DiscontinuedReason | null;
  alternatives?: { href: string; label: string };
}) {
  if (!reason) return null;
  const confirmed = reason.kind === "manual";
  let why: string;
  if (reason.kind === "manual") why = reason.note?.trim() || "We've confirmed this product has been discontinued.";
  else if (reason.kind === "retail") why = `The stores we check stopped listing it after ${monthYear.format(new Date(reason.lastSeen))}.`;
  else {
    const year = reason.labelDate.slice(0, 4);
    why = `Its FDA drug listing is no longer active and its label was last updated in ${year}, which usually means the maker stopped selling it.`;
  }
  return (
    <section
      aria-labelledby="discontinued-banner-title"
      className="space-y-2 rounded-2xl border border-slate-300 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40"
    >
      <h2 id="discontinued-banner-title" className="flex items-center gap-2 text-base font-semibold">
        <PackageX className="h-5 w-5 shrink-0" aria-hidden />
        {confirmed ? "No longer available" : "Likely no longer available"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {why} {!confirmed && "Some stores may still have stock. "}The ingredient details stay here for reference.
      </p>
      {alternatives && (
        <p className="text-sm">
          <Link href={alternatives.href} className="font-medium text-brand hover:underline">
            {alternatives.label}
          </Link>
        </p>
      )}
    </section>
  );
}
