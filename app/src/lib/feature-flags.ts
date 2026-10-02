// Feature flags for clinical content that is waiting on the dermatologist's
// sign-off (review/clinical-content-review.html). Each flag is OFF in
// production and ON in development / test, unless its env var says
// otherwise:
//
//   FEATURE_PREGNANCY_MODE=on   pregnancy & breastfeeding profile options,
//                               product notices, the listing filter and
//                               /guide/pregnancy-breastfeeding
//   FEATURE_ESCALATION=on       "When OTC isn't enough" guidance on concern,
//                               regimen and shelf pages
//
// "off" forces a flag off anywhere (handy for checking the gated-off pages
// locally). Read per call, never at module load, so a runtime env change
// takes effect without a rebuild. Server-only: client components get the
// value passed in as a prop.

function envFlag(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (v === "on" || v === "1" || v === "true") return true;
  if (v === "off" || v === "0" || v === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export const FEATURES = {
  get PREGNANCY_MODE(): boolean {
    return envFlag("FEATURE_PREGNANCY_MODE");
  },
  get ESCALATION_GUIDANCE(): boolean {
    return envFlag("FEATURE_ESCALATION");
  },
};
