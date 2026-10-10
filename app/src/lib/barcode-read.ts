// What a barcode reader returned, as a retail GTIN we can look up (pure;
// shared by the phone camera scanner and the label photo scan). Retail
// symbologies only, plus GS1 DataMatrix, which drug packaging uses to carry
// the same GTIN (application identifier 01).
import { validGtin } from "./product-codes";

/** zxing-wasm format names worth reading on a skincare or OTC package. */
export const RETAIL_FORMATS = ["EAN-13", "EAN-8", "UPC-A", "UPC-E", "DataMatrix"] as const;

/** UPC-E (8 digits, number system 0/1) expanded to its UPC-A. */
export function upcEToUpcA(upce: string): string | null {
  if (!/^[01]\d{7}$/.test(upce)) return null;
  const [ns, d1, d2, d3, d4, d5, d6, check] = upce.split("");
  let body: string;
  if ("012".includes(d6)) body = `${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  else if (d6 === "3") body = `${d1}${d2}${d3}00000${d4}${d5}`;
  else if (d6 === "4") body = `${d1}${d2}${d3}${d4}00000${d5}`;
  else body = `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  const upca = `${ns}${body}${check}`;
  return validGtin(upca) ? upca : null;
}

// A US product's code as a UPC-A (12 digits), however it was read: readers
// report a UPC-A as the EAN-13 "0" + UPC, and DataMatrix as a GTIN-14.
function shortest(gtin: string): string {
  if (gtin.length === 8) return gtin;
  const core = gtin.replace(/^0+/, "");
  return core.length <= 12 ? core.padStart(12, "0") : core;
}

/** The GTIN in one read result (a UPC-A when it is one), or null when it isn't a valid retail code. */
export function gtinFromRead(text: string, format: string): string | null {
  const t = text.trim();
  if (format === "UPC-E" || format === "upc_e") return upcEToUpcA(t.length === 6 ? `0${t}` : t);
  if (format === "DataMatrix" || format === "data_matrix") {
    // GS1 element string: AI 01 then the 14-digit GTIN, first in practice.
    const m = /^(?:\]d2)?\(?01\)?(\d{14})/.exec(t);
    return m && validGtin(m[1]) ? shortest(m[1]) : null;
  }
  return /^\d+$/.test(t) && validGtin(t) ? shortest(t) : null;
}
