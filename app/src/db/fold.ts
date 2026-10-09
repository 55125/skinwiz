// Accent folding for search: "Curél" -> "Curel", "L’Oréal" -> "L'Oreal", so a
// shopper typing plain ASCII finds accented brand and product names. SQLite's
// LIKE has no accent-insensitive mode, so client.ts registers this as the SQL
// function fold_accents() and lib/queries.ts applies it to both sides.
export function foldAccents(s: string | null): string | null {
  if (s === null || !/[^\x00-\x7f]/.test(s)) return s;
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'");
}
