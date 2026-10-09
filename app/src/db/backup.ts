// Snapshot of the database taken at every boot, before migrations and the
// seed touch it: a bad migration or a broken seed can be rolled back by
// copying a snapshot over the live file. Snapshots sit on the same volume,
// so they don't protect against losing the volume itself; that needs an
// off-box copy (Railway volume backups or a download).
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const KEEP = 5;
const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "skinwiz.db");
const dir = path.join(path.dirname(dbPath), "backups");

if (!fs.existsSync(dbPath)) {
  console.log("No database yet; nothing to back up.");
} else {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(dir, `skinwiz-${stamp}.db`);
  const started = Date.now();
  const db = new Database(dbPath, { readonly: true });
  // VACUUM INTO writes a compact, consistent copy that includes the WAL.
  db.prepare("VACUUM INTO ?").run(target);
  db.close();
  console.log(`Backed up to ${target} (${Math.round(fs.statSync(target).size / 1e6)} MB, ${Date.now() - started} ms).`);
  const old = fs
    .readdirSync(dir)
    .filter((f) => /^skinwiz-.*\.db$/.test(f))
    .sort()
    .slice(0, -KEEP);
  for (const f of old) fs.rmSync(path.join(dir, f));
  if (old.length) console.log(`Removed ${old.length} older snapshot(s); keeping ${KEEP}.`);
}
