// The DailyMed image sync against a throwaway database and image directory,
// with DailyMed faked: candidate fallback (404, tiny), renditions on disk,
// products linked (FDA rows only), state that makes re-runs free, and the
// seed's re-link after a rebuild. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "img-sync-"));
process.env.DATABASE_PATH = path.join(tmp, "test.db");
const ROOT = path.join(tmp, "images");

const A = "aaaaaaaa-0000-4000-8000-000000000001"; // DISC 404, then a good front
const B = "bbbbbbbb-0000-4000-8000-000000000002"; // only a tiny image
const C = "cccccccc-0000-4000-8000-000000000003"; // server error
const OBF_URL = "https://images.openfoodfacts.org/x.jpg";

async function setup() {
  const { db } = await import("@/db/client");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const schema = await import("@/db/schema");
  db.insert(schema.concerns).values({ id: "acne", name: "Acne", description: "" }).run();
  const base = { concernId: "acne", activeIds: [], verified: true, isRx: false };
  db.insert(schema.products)
    .values([
      { ...base, id: "a-1", brandName: "A one", splSetId: A, dataSource: "dailymed" },
      { ...base, id: "a-2", brandName: "A two", splSetId: A, dataSource: "openfda" },
      { ...base, id: "a-obf", brandName: "A retail", splSetId: A, dataSource: "open_beauty_facts", imageUrl: OBF_URL },
      { ...base, id: "b-1", brandName: "B", splSetId: B, dataSource: "openfda" },
      { ...base, id: "c-1", brandName: "C", splSetId: C, dataSource: "openfda" },
    ])
    .run();
  return { db, schema };
}

test("sync downloads, falls back past bad candidates, links FDA products, and re-runs cheaply", async () => {
  const { db, schema } = await setup();
  const { syncDailymedImages } = await import("./product-images/sync");
  const { linkAllDailymedImages } = await import("./product-images/link");
  const { eq } = await import("drizzle-orm");

  const big = await sharp({ create: { width: 1000, height: 800, channels: 3, background: "#2255aa" } }).jpeg().toBuffer();
  const tiny = await sharp({ create: { width: 80, height: 60, channels: 3, background: "#fff" } }).jpeg().toBuffer();
  const requested: string[] = [];
  const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const name = url.searchParams.get("name")!;
    requested.push(name);
    assert.match(String((init?.headers as Record<string, string>)["User-Agent"]), /hello@activelyskin\.com/);
    const img = (b: Buffer) => new Response(new Uint8Array(b), { headers: { "content-type": "image/jpeg" } });
    if (name === "old-DISC.jpg") return new Response("gone", { status: 404 });
    if (name === "front.jpg") return img(big);
    if (name === "tiny.jpg") return img(tiny);
    return new Response("busy", { status: 503 });
  }) as typeof fetch;
  const candidates = new Map([
    [A, [{ name: "old-DISC.jpg", score: 12 }, { name: "front.jpg", score: 10 }]],
    [B, [{ name: "tiny.jpg", score: 10 }]],
    [C, [{ name: "error.jpg", score: 10 }]],
  ]);
  const now = new Date("2026-10-04T12:00:00Z");
  const opts = { root: ROOT, fetchImpl: fakeFetch, candidates, perSecond: 1000, now };

  const r1 = await syncDailymedImages(opts);
  assert.equal(r1.candidates, 3);
  assert.equal(r1.downloaded, 1);
  assert.equal(r1.rejected, 2); // the 404 and the tiny image
  assert.equal(r1.none, 1);
  assert.equal(r1.errors, 1);
  assert.equal(r1.linkedProducts, 2);

  const rowA = db.select().from(schema.dailymedImages).where(eq(schema.dailymedImages.splSetId, A)).get()!;
  assert.equal(rowA.status, "ok");
  assert.equal(rowA.imageName, "front.jpg");
  assert.deepEqual(rowA.rejected, ["old-DISC.jpg"]);
  assert.equal(rowA.width, 800);
  for (const size of ["full", "thumb"]) {
    assert.ok(fs.existsSync(path.join(ROOT, "dailymed", A, `${rowA.imageKey}-${size}.webp`)), size);
  }

  const img = (id: string) => db.select().from(schema.products).where(eq(schema.products.id, id)).get()!.imageUrl;
  assert.equal(img("a-1"), `/img/dm/${A}/${rowA.imageKey}/full.webp`);
  assert.equal(img("a-2"), img("a-1"));
  assert.equal(img("a-obf"), OBF_URL, "retail photos are never replaced");
  assert.equal(img("b-1"), null);
  assert.equal(img("c-1"), null);
  const rowC = db.select().from(schema.dailymedImages).where(eq(schema.dailymedImages.splSetId, C)).get()!;
  assert.equal(rowC.status, "error");
  assert.ok(rowC.retryAfter! > now.toISOString());

  // Second run: nothing to download, the 503 waits for its retry time.
  requested.length = 0;
  const r2 = await syncDailymedImages(opts);
  assert.equal(r2.ready, 1);
  assert.equal(r2.downloaded, 0);
  assert.deepEqual(requested, []);

  // Per-run cap
  const later = { ...opts, now: new Date("2026-10-05T12:00:00Z"), limit: 1 };
  fs.rmSync(path.join(ROOT, "dailymed", A), { recursive: true });
  const r3 = await syncDailymedImages(later);
  assert.equal(r3.queued, 2); // A (files gone) and C (retry due)
  assert.ok(r3.stoppedEarly);
  assert.equal(r3.downloaded + r3.errors, 1);

  // What the seed does after rebuilding products: re-link from state + disk.
  db.update(schema.products).set({ imageUrl: null }).where(eq(schema.products.dataSource, "dailymed")).run();
  const linked = linkAllDailymedImages(ROOT);
  assert.equal(linked.sets, 1);
  assert.equal(img("a-1"), `/img/dm/${A}/${rowA.imageKey}/full.webp`);
});

test("loadCandidates follows the pipeline's usable column (all-DISC labels), else score >= 0", async () => {
  const { loadCandidates } = await import("@/lib/product-images/sync");
  const csvPath = path.join(tmp, "cands.csv");
  fs.writeFileSync(
    csvPath,
    [
      "setid,rank,image_name,score,section_code,caption,reasons,usable",
      `${A},1,front.jpg,12,51945-4,,pdp-section front,1`,
      `${A},2,facts.jpg,-3,51945-4,,pdp-section drug-facts,0`,
      `${B},2,Carton (Pump) - DISC.jpg,-12.5,48780-1,,carton discontinued,1`,
      `${B},1,Carton (Tube) - DISC.jpg,-12,48780-1,,carton discontinued,1`,
      `${C},1,insert.jpg,-9,48780-1,,insert,0`,
    ].join("\n"),
  );
  const got = loadCandidates(csvPath);
  assert.deepEqual(got.get(A)?.map((c) => c.name), ["front.jpg"]);
  assert.deepEqual(got.get(B)?.map((c) => c.name), ["Carton (Tube) - DISC.jpg", "Carton (Pump) - DISC.jpg"]);
  assert.equal(got.has(C), false);

  // An older CSV without the column: score >= 0 only.
  fs.writeFileSync(csvPath, ["setid,rank,image_name,score", `${A},1,front.jpg,12`, `${B},1,disc.jpg,-12`].join("\n"));
  const legacy = loadCandidates(csvPath);
  assert.deepEqual(legacy.get(A)?.map((c) => c.name), ["front.jpg"]);
  assert.equal(legacy.has(B), false);
});
