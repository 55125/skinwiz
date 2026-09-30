// Display-only cleanup for text that arrives in regulatory form (FDA labeler
// names, ALL-CAPS INCI lists). Never used for matching or storage.

const LEGAL_SUFFIX =
  /[\s,]+(inc|incorporated|llc|l\.l\.c|ltd|limited|co|corp|corporation|company|a\.s|s\.r\.l|s\.a|l\.p|gmbh|plc|pty)\.?$/i;

// "Conopco, Inc. d/b/a Unilever" -> "Unilever";
// "THE HAIN CELESTIAL GROUP, INC." -> "THE HAIN CELESTIAL GROUP"
export function displayManufacturer(name: string): string {
  let s = name.trim();
  const dba = s.match(/d\/b\/a\/?\s+(.+)$/i);
  if (dba) s = dba[1];
  // Strip repeatedly: "NANDA CO., LTD" carries two suffixes.
  for (let prev = ""; prev !== s; ) {
    prev = s;
    s = s.replace(LEGAL_SUFFIX, "").replace(/[\s,]+$/, "");
  }
  return s || name;
}

const KEEP_UPPER = new Set([
  "EDTA", "PEG", "PPG", "BHT", "BHA", "AHA", "PHA", "PCA", "CI", "DNA", "SPF", "UV",
  "USP", "II", "III", "IV", "TEA", "MEA", "DEA", "HCL", "DMDM", "PVP", "VP", "SD",
]);

// Only rewrites a name that is entirely upper case; a label that already
// uses mixed case ("Aqua (Water)") is kept exactly as printed.
export function tidyIngredientName(raw: string): string {
  if (/[a-z]/.test(raw)) return raw;
  return raw.replace(/[A-Z][A-Z0-9'-]*/g, (word) => {
    if (KEEP_UPPER.has(word) || /\d/.test(word)) return word;
    return word
      .split("-")
      .map((part) => (KEEP_UPPER.has(part) ? part : part.charAt(0) + part.slice(1).toLowerCase()))
      .join("-");
  });
}
