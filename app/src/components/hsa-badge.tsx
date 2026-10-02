import { Badge } from "@/components/ui/badge";
import { HSA_LABEL } from "@/lib/hsa";

export const HSA_BADGE_CLASS = "border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300";

// Plain badge: product cards are already one big link, so no link inside.
// The product page wraps it in a link to the eligibility guide.
export function HsaBadge() {
  return (
    <Badge variant="outline" className={HSA_BADGE_CLASS} title="OTC medicines are HSA/FSA-eligible without a prescription since the 2020 CARES Act. Your plan decides.">
      {HSA_LABEL}
    </Badge>
  );
}
