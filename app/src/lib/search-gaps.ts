// The admin "Searches with no results" list, kept current: a term stays on it
// only while today's catalog still finds nothing for it. The log records the
// result count at the time of each search, so a term we later fixed (an alias
// or new products) would otherwise stay listed for the whole date range.
// Server-only (reads the catalog). Used by app/admin/page.tsx and the weekly
// check's /api/cron/search-gaps.
import { searchProductsCount } from "@/lib/queries";
import type { Count } from "@/lib/analytics/report";

/** Drops the terms that find products now. Rows keep their order and counts. */
export function stillMissing(rows: Count[], count: (term: string) => number = (t) => searchProductsCount(t)): Count[] {
  return rows.filter((r) => {
    try {
      return count(r.label) === 0;
    } catch {
      return true;
    }
  });
}
