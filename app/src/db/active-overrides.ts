// Drug labels whose openFDA/DailyMed active-ingredient field came through
// empty (kits, mostly), filled in by hand from the label's own Purpose
// section or Drug Facts text. Keyed by product NDC; the text replaces both
// the structured and free-text active fields before matching, so the usual
// matchActiveIds/strength parsing runs on it.
export const ACTIVE_TEXT_OVERRIDES: Record<string, string> = {
  // Purpose section: insert 1200 mg + external cream 2%
  "63736-013": "Miconazole Nitrate 1200 mg (vaginal insert); Miconazole Nitrate 2% (external cream)",
  // Purpose section: Butt Paste and the dimethicone cream in the bundle
  "0132-0327": "Zinc Oxide 40%; Dimethicone 1%",
  // Drug Facts text (acne_sun_unmatched.csv): Titanium Dioxide 15% Zinc Oxide 17%
  "71182-1706": "Titanium Dioxide 15%; Zinc Oxide 17%",
};
