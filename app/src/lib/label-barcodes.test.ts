// Barcodes read off DailyMed label photos (lib/label-barcodes.ts,
// lib/label-decode.ts) against a throwaway database, with DailyMed faked by
// generated label images: decoding, the drug-UPC sanity check, the job's
// queue and re-run state, the image sync's own scan, and what the rest of
// the app does with a found barcode (search, aliases, price lookups). `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { gtinFromRead, upcEToUpcA } from "./barcode-read";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "label-scan-"));
process.env.DATABASE_PATH = path.join(tmp, "test.db");
process.env.IMAGE_DIR = path.join(tmp, "images");

// A = an OTC label with its UPC on the carton; B = a label whose only image
// shows no barcode; R = an Rx label (never scanned); U = an OTC label that
// already has an openFDA UPC (not scanned either).
const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";
const R = "cccccccc-0000-4000-8000-00000000000c";
const U = "dddddddd-0000-4000-8000-00000000000d";
const A_UPC = "302994910458"; // a drug UPC: "3" + NDC 0299-4910-45
const OTHER_LABELER_UPC = "311111111116"; // "3" + an NDC of labeler 11111

/** A JPEG "carton": a barcode (zxing's own writer) on a big busy panel. */
async function labelJpeg(code: string | null, format = "UPC-A"): Promise<Buffer> {
  const layers: OverlayOptions[] = [];
  if (code) {
    const { writeBarcode, prepareZXingModule } = await import("zxing-wasm/writer");
    const wasm = fs.readFileSync(path.join(process.cwd(), "node_modules/zxing-wasm/dist/writer/zxing_writer.wasm"));
    prepareZXingModule({ overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer } });
    const out = await writeBarcode(code, { format: format as "UPC-A", scale: 3 });
    assert.ok(out.image, out.error);
    layers.push({ input: Buffer.from(await out.image!.arrayBuffer()), left: 1300, top: 900 });
  }
  layers.push({ input: { create: { width: 900, height: 700, channels: 3, background: "#1d4fa0" } }, left: 100, top: 100 });
  return sharp({ create: { width: 2000, height: 1400, channels: 3, background: "#ffffff" } })
    .composite(layers)
    .jpeg({ quality: 82 })
    .toBuffer();
}

type Q = typeof import("./queries");
let q: Q;
let db: typeof import("@/db/client").db;
let schema: typeof import("@/db/schema");

before(async () => {
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  ({ db } = await import("@/db/client"));
  schema = await import("@/db/schema");
  q = await import("./queries");
  db.insert(schema.concerns).values([{ id: "acne", name: "Acne", description: "" }, { id: "rx", name: "Rx", description: "" }]).run();
  const base = { concernId: "acne", activeIds: [], verified: true, isRx: false, dataSource: "openfda" };
  db.insert(schema.products)
    .values([
      { ...base, id: "0299-4910", brandName: "Differin Gel 15 g", splSetId: A },
      { ...base, id: "0299-4911", brandName: "Differin Gel 45 g", splSetId: A },
      { ...base, id: "1111-2222", brandName: "No Barcode Cream", splSetId: B },
      { ...base, id: "0168-0099", brandName: "Rx Cream", splSetId: R, isRx: true, concernId: "rx" },
      { ...base, id: "4444-5555", brandName: "Has UPC Lotion", splSetId: U },
    ])
    .run();
  db.insert(schema.productBarcodes)
    .values([
      { productId: "4444-5555", barcode: "0012345678905", source: "openfda_upc", rank: 0 },
      { productId: "0299-4910", barcode: "302994910014", source: "ndc_derived", rank: 2 },
    ])
    .run();
});

test("read results: UPC-E expands, GS1 DataMatrix gives its GTIN, bad check digits are dropped", () => {
  assert.equal(upcEToUpcA("04252614"), "042100005264");
  assert.equal(gtinFromRead("04252614", "UPC-E"), "042100005264");
  assert.equal(gtinFromRead("0100302994910458172801311020A", "DataMatrix"), "302994910458");
  assert.equal(gtinFromRead("0302994910458", "EAN-13"), "302994910458");
  assert.equal(gtinFromRead("302994910458", "upc_a"), "302994910458");
  assert.equal(gtinFromRead("302994910459", "UPC-A"), null);
  assert.equal(gtinFromRead("hello", "DataMatrix"), null);
});

test("decodes a UPC off a carton photo, and nothing off a panel without one", async () => {
  const { decodeLabelBarcodes } = await import("./label-decode");
  assert.deepEqual(await decodeLabelBarcodes(await labelJpeg(A_UPC)), [A_UPC]);
  assert.deepEqual(await decodeLabelBarcodes(await labelJpeg("5012345678900", "EAN-13")), ["5012345678900"]);
  assert.deepEqual(await decodeLabelBarcodes(await labelJpeg(null)), []);
});

test("a drug UPC must carry one of the label's own labeler codes", async () => {
  const { plausibleForSet } = await import("./label-decode");
  assert.ok(plausibleForSet(A_UPC, ["0299-4910"]));
  assert.ok(!plausibleForSet(OTHER_LABELER_UPC, ["0299-4910"]));
  assert.ok(plausibleForSet("012345678905", ["0299-4910"]), "a non-drug UPC can't be checked, so it stays");
});

test("the job scans OTC labels without a barcode, stops at the first hit, and never re-fetches", async () => {
  const { scanLabelBarcodes } = await import("./label-barcodes");
  const images = new Map([
    ["front.jpg", await labelJpeg(null)],
    ["carton.jpg", await labelJpeg(A_UPC)],
    ["back.jpg", await labelJpeg(A_UPC)],
    ["plain.jpg", await labelJpeg(null)],
    ["rx.jpg", await labelJpeg("312345678906")],
    ["u.jpg", await labelJpeg("012345678905")],
  ]);
  const requested: string[] = [];
  const fakeFetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const name = url.searchParams.get("name")!;
    requested.push(`${url.searchParams.get("setid")}/${name}`);
    if (name === "gone.jpg") return new Response("gone", { status: 404 });
    return new Response(new Uint8Array(images.get(name)!), { headers: { "content-type": "image/jpeg" } });
  }) as typeof fetch;
  const candidates = new Map([
    [A, [{ name: "front.jpg", score: 12 }, { name: "carton.jpg", score: 10 }, { name: "back.jpg", score: -3 }]],
    [B, [{ name: "gone.jpg", score: 10 }, { name: "plain.jpg", score: 9 }]],
    [R, [{ name: "rx.jpg", score: 10 }]],
    [U, [{ name: "u.jpg", score: 10 }]],
  ]);
  const opts = { fetchImpl: fakeFetch, candidates, perSecond: 1000, now: new Date("2026-10-09T05:00:00Z") };

  const r1 = await scanLabelBarcodes(opts);
  assert.equal(r1.sets, 2, "A and B: Rx and labels with an openFDA UPC are skipped");
  assert.equal(r1.setsFound, 1);
  assert.equal(r1.rejected, 1);
  assert.deepEqual(requested, [`${A}/front.jpg`, `${A}/carton.jpg`, `${B}/gone.jpg`, `${B}/plain.jpg`], "stops at A's first hit");
  assert.deepEqual(
    db.select().from(schema.labelBarcodes).all().map((r) => [r.splSetId, r.barcode, r.imageName]),
    [[A, A_UPC, "carton.jpg"]],
  );

  requested.length = 0;
  const r2 = await scanLabelBarcodes(opts);
  assert.equal(r2.sets, 1, "A has its barcode now");
  assert.equal(r2.queued, 0, "B's images are all scanned or rejected");
  assert.deepEqual(requested, []);
});

test("a label barcode finds every product on that label, and feeds aliases and price lookups", async () => {
  const ids = (s: string) => q.lookupProductsByCode(s)?.map((p) => p.id);
  assert.deepEqual(ids(A_UPC), ["0299-4910", "0299-4911"]);
  assert.deepEqual(ids(`0${A_UPC}`), ["0299-4910", "0299-4911"]);
  assert.ok(q.getRetailBarcodes(["0299-4911"]).includes(A_UPC));
  const { loadLookupProducts } = await import("./prices/store");
  const [p] = loadLookupProducts(["0299-4910"]);
  assert.deepEqual(p.barcodes, [
    { barcode: A_UPC, source: "label_scan" },
    { barcode: "302994910014", source: "ndc_derived" },
  ]);
});

test("the image sync scans each photo it downloads", async () => {
  const { syncDailymedImages } = await import("./product-images/sync");
  const photo = await labelJpeg("5012345678900", "EAN-13");
  const fakeFetch = (async () => new Response(new Uint8Array(photo), { headers: { "content-type": "image/jpeg" } })) as typeof fetch;
  await syncDailymedImages({ fetchImpl: fakeFetch, candidates: new Map([[B, [{ name: "pdp.jpg", score: 10 }]]]), perSecond: 1000 });
  const scan = db.select().from(schema.labelScans).all().find((r) => r.splSetId === B && r.imageName === "pdp.jpg");
  assert.deepEqual(scan?.barcodes, ["5012345678900"]);
  assert.deepEqual(q.lookupProductsByCode("5012345678900")?.map((p) => p.id), ["1111-2222"]);
});
