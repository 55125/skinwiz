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
//   FEATURE_RX_CATALOG=on       prescription reference pages (/rx, /rx/[id]),
//                               noindex; off = 404 (review/rx-handouts-review.html)
//   FEATURE_HANDOUTS=on         clinician sign-in, NPI verification, the
//                               handout builder, dashboard, /h/[token] claim
//                               links and clinician-issued regimens; off = 404
//
// Rx rows never appear in consumer listings, search or the sitemap whatever
// these flags say (lib/queries.ts OTC_ONLY).
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
  get RX_CATALOG(): boolean {
    return envFlag("FEATURE_RX_CATALOG");
  },
  get HANDOUTS(): boolean {
    return envFlag("FEATURE_HANDOUTS");
  },
};
