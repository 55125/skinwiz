// Retention purges against a throwaway SQLite database: `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let db: typeof import("@/db/client").db;
let sql: typeof import("drizzle-orm").sql;
let r: typeof import("./retention");

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-retention-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  ({ db } = await import("@/db/client"));
  ({ sql } = await import("drizzle-orm"));
  r = await import("./retention");
  db.run(sql`INSERT INTO concerns (id, name, description) VALUES ('acne', 'Acne', '')`);
  db.run(sql`INSERT INTO products (id, concern_id, brand_name, data_source) VALUES ('p1', 'acne', 'Wash', 'openfda')`);
});

test("YouTube rows older than 30 days are deleted; fresher ones stay", () => {
  db.run(sql`INSERT INTO video_links (product_id, video_id, title, fetched_at) VALUES
    ('p1', 'old', 'Old', '2026-09-01 12:00:00'), ('p1', 'new', 'New', '2026-09-20 12:00:00')`);
  assert.equal(r.purgeStaleYoutubeData(new Date("2026-10-09T00:00:00Z")), 1);
  assert.deepEqual(db.all<{ video_id: string }>(sql`SELECT video_id FROM video_links`).map((x) => x.video_id), ["new"]);
});
