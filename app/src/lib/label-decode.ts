// Decoding barcodes from one label image and recording what was found
// (lib/label-barcodes.ts explains the whole feature). Separate from the job
// so the image sync can use it without importing the job.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { labelBarcodes, labelScans } from "@/db/schema";
import { gtinFromRead, RETAIL_FORMATS } from "@/lib/barcode-read";
import { Rejected } from "@/lib/product-images/render";

// Large enough for a UPC on a full carton flat to keep ~2px per bar module;
// bigger only makes decoding slower.
const MAX_DECODE_PX = 2400;
let modulePrepared: Promise<typeof import("zxing-wasm/reader")> | null = null;
function zxing() {
  modulePrepared ??= (async () => {
    const mod = await import("zxing-wasm/reader");
    const wasm = fs.readFileSync(path.join(process.cwd(), "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"));
    mod.prepareZXingModule({ overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer } });
    return mod;
  })();
  return modulePrepared;
}

/** Valid retail barcodes in an image (any format sharp reads), deduplicated, in reading order. */
export async function decodeLabelBarcodes(buf: Buffer): Promise<string[]> {
  let png: Buffer;
  try {
    png = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_DECODE_PX, height: MAX_DECODE_PX, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .grayscale()
      .png({ compressionLevel: 1 })
      .toBuffer();
  } catch (err) {
    throw new Rejected(`undecodable: ${(err as Error).message}`);
  }
  const { readBarcodes } = await zxing();
  const results = await readBarcodes(new Uint8Array(png), { formats: [...RETAIL_FORMATS], tryHarder: true, maxNumberOfSymbols: 8 });
  const out: string[] = [];
  for (const r of results) {
    const gtin = r.isValid ? gtinFromRead(r.text, r.format) : null;
    if (gtin && !out.includes(gtin)) out.push(gtin);
  }
  return out;
}

/**
 * Drops a drug barcode ("3" + NDC) whose NDC belongs to another company: a
 * label sometimes pictures a different product (a kit, a sister product).
 * Other barcodes can't be checked this way and are kept.
 */
export function plausibleForSet(barcode: string, productNdcs: string[]): boolean {
  const upc = barcode.replace(/^0+/, "").padStart(12, "0");
  if (upc.length !== 12 || !upc.startsWith("3")) return true;
  const ndcDigits = upc.slice(1, 11);
  const labelers = productNdcs.map((id) => id.split("-")[0]).filter((l) => /^\d{4,5}$/.test(l));
  return labelers.length === 0 || labelers.some((l) => ndcDigits.startsWith(l));
}

function setNdcs(setid: string): string[] {
  return db.all<{ id: string }>(sql`SELECT id FROM products WHERE lower(spl_set_id) = ${setid}`).map((r) => r.id);
}

/** Records one decoded image (from the image sync or the job). */
export function recordLabelScan(setid: string, imageName: string, found: string[], now = new Date()) {
  const ndcs = setNdcs(setid);
  const barcodes = found.filter((b) => plausibleForSet(b, ndcs));
  const at = now.toISOString();
  db.transaction((tx) => {
    tx.insert(labelScans)
      .values({ splSetId: setid, imageName, status: "ok", barcodes, attempts: 0, lastError: null, scannedAt: at, retryAfter: null })
      .onConflictDoUpdate({
        target: [labelScans.splSetId, labelScans.imageName],
        set: { status: "ok", barcodes, attempts: 0, lastError: null, scannedAt: at, retryAfter: null },
      })
      .run();
    for (const barcode of barcodes) {
      tx.insert(labelBarcodes).values({ splSetId: setid, barcode, imageName, foundAt: at }).onConflictDoNothing().run();
    }
  });
  return barcodes;
}
