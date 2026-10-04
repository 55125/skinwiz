// DailyMed package photos: URLs, the image route, renditions, and the
// anti-scrape exemption. `npm test`. (The DB-backed sync is in
// product-images-sync.test.ts, which needs its own DATABASE_PATH.)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { dailymedImageUrl, isDailymedImageUrl, parseImageFile, productImageAlt, thumbnailUrl } from "./image-urls";
import { imageDir, imageKey, imagePath } from "./product-images/storage";
import { IMMUTABLE_CACHE, serveDailymedImage } from "./product-images/serve";
import { renderRenditions } from "./product-images/render";
import { judge, LIMITS } from "./anti-scrape";
import { config as proxyConfig } from "../proxy";

const SETID = "0739d631-171b-42a8-bd55-0022b8df2d8a";

test("image URLs: full/thumb pair, other sources untouched", () => {
  const key = imageKey(SETID, "carton front.jpg");
  assert.match(key, /^[0-9a-f]{12}$/);
  assert.notEqual(key, imageKey(SETID, "carton back.jpg"), "a different image gets a different URL");
  const full = dailymedImageUrl(SETID, key);
  assert.equal(full, `/img/dm/${SETID}/${key}/full.webp`);
  assert.equal(thumbnailUrl(full), `/img/dm/${SETID}/${key}/thumb.webp`);
  assert.ok(isDailymedImageUrl(full));
  const obf = "https://images.openfoodfacts.org/images/products/123/front.jpg";
  assert.equal(thumbnailUrl(obf), obf);
  assert.equal(thumbnailUrl("/product-images/brand-direct/x.png"), "/product-images/brand-direct/x.png");
  assert.ok(!isDailymedImageUrl(obf));
  assert.equal(productImageAlt({ brandName: "Differin Gel", imageUrl: full }), "Differin Gel package label");
  assert.equal(productImageAlt({ brandName: "Differin Gel", imageUrl: obf }), "Differin Gel");
  assert.equal(parseImageFile("thumb.webp"), "thumb");
  assert.equal(parseImageFile("thumb.png"), null);
  assert.equal(parseImageFile("../thumb.webp"), null);
});

test("IMAGE_DIR defaults next to the database", () => {
  const saved = { IMAGE_DIR: process.env.IMAGE_DIR, DATABASE_PATH: process.env.DATABASE_PATH };
  try {
    delete process.env.IMAGE_DIR;
    process.env.DATABASE_PATH = "/data/skinwiz.db";
    assert.equal(imageDir(), "/data/images");
    process.env.IMAGE_DIR = "/mnt/photos";
    assert.equal(imageDir(), "/mnt/photos");
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test("image paths refuse anything but a set id and a hex key", () => {
  assert.equal(imagePath("../../etc", "0123456789ab", "full", "/x"), null);
  assert.equal(imagePath(SETID, "../../passwd", "full", "/x"), null);
  assert.equal(imagePath(SETID, "0123456789ab", "full", "/x"), `/x/dailymed/${SETID}/0123456789ab-full.webp`);
});

test("image route: 200 with immutable caching, 304 on ETag, quick 404s", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "img-route-"));
  const key = "0123456789ab";
  const file = imagePath(SETID, key, "thumb", root)!;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = await sharp({ create: { width: 32, height: 24, channels: 3, background: "#ffffff" } }).webp().toBuffer();
  fs.writeFileSync(file, body);

  const ok = await serveDailymedImage({ setid: SETID, key, file: "thumb.webp" }, { root });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "image/webp");
  assert.equal(ok.headers.get("cache-control"), IMMUTABLE_CACHE);
  assert.match(ok.headers.get("cache-control")!, /immutable/);
  assert.equal(Buffer.from(await ok.arrayBuffer()).length, body.length);

  const etag = ok.headers.get("etag");
  const notModified = await serveDailymedImage({ setid: SETID, key, file: "thumb.webp" }, { root, ifNoneMatch: etag });
  assert.equal(notModified.status, 304);

  const head = await serveDailymedImage({ setid: SETID, key, file: "thumb.webp" }, { root, head: true });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), String(body.length));

  for (const params of [
    { setid: SETID, key, file: "full.webp" }, // not synced
    { setid: SETID, key: "ffffffffffff", file: "thumb.webp" }, // stale key
    { setid: "not-a-setid", key, file: "thumb.webp" },
    { setid: SETID, key: "..", file: "thumb.webp" },
    { setid: SETID, key, file: "thumb.png" },
  ]) {
    const res = await serveDailymedImage(params, { root });
    assert.equal(res.status, 404, JSON.stringify(params));
    assert.doesNotMatch(res.headers.get("cache-control") ?? "", /immutable/);
  }
});

test("renditions: <=800px and <=320px WebP; tiny or broken sources rejected", async () => {
  const src = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#cc3333" } }).jpeg().toBuffer();
  const out = await renderRenditions(src);
  assert.equal(out.width, 800);
  assert.equal(out.height, 600);
  const thumb = await sharp(out.files.thumb).metadata();
  assert.equal(thumb.format, "webp");
  assert.equal(thumb.width, 320);
  assert.equal((await sharp(out.files.full).metadata()).format, "webp");

  // a small panel on a big white page is trimmed to the panel
  const panel = await sharp({ create: { width: 400, height: 600, channels: 3, background: "#2255aa" } }).png().toBuffer();
  const page = await sharp({ create: { width: 2000, height: 2000, channels: 3, background: "#ffffff" } })
    .composite([{ input: panel, left: 800, top: 700 }])
    .jpeg()
    .toBuffer();
  const trimmed = await renderRenditions(page);
  assert.ok(Math.abs(trimmed.width / trimmed.height - 400 / 600) < 0.05, `${trimmed.width}x${trimmed.height}`);

  // never upscaled
  const small = await renderRenditions(await sharp({ create: { width: 500, height: 400, channels: 3, background: "#fff" } }).png().toBuffer());
  assert.equal(small.width, 500);

  const tiny = await sharp({ create: { width: 120, height: 90, channels: 3, background: "#fff" } }).jpeg().toBuffer();
  await assert.rejects(renderRenditions(tiny), /too small/);
  await assert.rejects(renderRenditions(Buffer.from("<html>not an image</html>")), /undecodable/);
});

test("image requests skip the anti-scrape proxy and never count as page views", () => {
  // 1. The proxy doesn't run for them at all.
  const matcher = new RegExp(`^${proxyConfig.matcher[0]}$`);
  assert.ok(matcher.test("/product/123"), "pages go through the proxy");
  assert.ok(!matcher.test(`/img/dm/${SETID}/0123456789ab/thumb.webp`), "thumbnails bypass it");
  assert.ok(!matcher.test(`/img/dm/${SETID}/0123456789ab/full.webp`));

  // 2. Even if the proxy did judge them: a visitor loading many grids of
  //    thumbnails is never limited, and their page budget is untouched.
  const ip = "203.0.113.77";
  const headers = new Headers({ "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15", "sec-fetch-dest": "image" });
  const now = 1_000_000;
  for (let i = 0; i < LIMITS.pagesPerMinute * 5; i++) {
    const v = judge({ pathname: `/img/dm/${SETID}/0123456789ab/thumb.webp`, method: "GET", headers, ip, now });
    assert.equal(v.action, "allow", `image ${i} was blocked`);
  }
  const docHeaders = new Headers({ "user-agent": headers.get("user-agent")!, "sec-fetch-dest": "document" });
  for (let i = 0; i < LIMITS.pagesPerMinute; i++) {
    assert.equal(judge({ pathname: "/browse", method: "GET", headers: docHeaders, ip, now }).action, "allow", `page ${i} was blocked`);
  }
  // ...while pages themselves are still limited
  assert.equal(judge({ pathname: "/browse", method: "GET", headers: docHeaders, ip, now }).action, "block");
});
