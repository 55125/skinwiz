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

// Dosage forms corrected where the manufacturer's name states a form and the
// openFDA filing disagrees with what the product plainly is. Keyed by product
// NDC; applied in the seed in place of the filed form. Filings that are right
// and merely clash with a marketing word ("Powder Fresh" deodorants are
// sticks and roll-ons, a powder-spray antifungal "powder" is filed as a
// spray) are left alone, as are ambiguous textures (day creams filed as
// lotions, foam cleansers).
export const DOSAGE_FORM_OVERRIDES: Record<string, string> = {
  // gels filed as cream, lotion or liquid
  "0299-4611": "GEL", // Differin 10% BPO Acne Treatment (spot-treatment gel)
  "14268-123": "GEL", // Byoma Moisturizing Gel Sunscreen
  "54108-8111": "GEL", // Scar Gel SPF 35
  "62742-4226": "GEL", // Prevention Clear Solar Gel SPF30
  "87507-001": "GEL", // Menokin Glow and Clear Gel Sunscreen
  "87507-002": "GEL",
  "69968-0946": "GEL", // Neutrogena Evenly Clear Acne Gel Moisturizer
  "11559-060": "GEL", // Estee Lauder Multi-Defense Aqua UV Gel
  "68577-157": "GEL", // Neora Invisibloc Sunscreen Gel
  "69968-0669": "GEL", // Neutrogena Hydro Boost Water Gel Sunscreen
  "10967-603": "GEL", // Mitchum Clear Gel
  "10967-632": "GEL", // Revlon Mitchum Clinical Gel
  "10742-1412": "GEL", // pHisoderm Clear Confidence Daily Gel Face Wash
  // sticks filed as cream, ointment or kit
  "14268-125": "STICK", // Bass Pro Shops Mineral Sun Stick
  "71261-041": "STICK", // BeginS Airy Sun Stick
  "85060-008": "STICK", // JAYSUING Moisturiser Sun Stick
  "85060-009": "STICK",
  "85060-010": "STICK",
  "85233-1000": "STICK", // EthoSun EthoSport Stick
  "10356-125": "STICK", // Aquaphor Healing Balm Stick
  "57337-167": "STICK", // Baby Balm Stick
  "58503-203": "STICK",
  "75786-229": "STICK", // All Good Mineral Sport Sunscreen Butter Stick
  "75786-230": "STICK",
  // powder, cream, lotion
  "84255-000": "POWDER", // BrushOnBlock Mineral Powder Sunscreen
  "84558-013": "CREAM", // Seebeellar Antifungal Cream 2% Miconazole
  "87083-002": "LOTION", // Intensive healing lotion for eczema
};
