// Applies drizzle/ migrations at boot. Replaces `drizzle-kit push --force`,
// which auto-accepted destructive statements (dropping a column or table
// holding user routines) with no review step.
import path from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { db } from "./client";

const migrationsFolder = path.join(process.cwd(), "drizzle");
const MIGRATIONS_TABLE = "__drizzle_migrations";

// Databases created by the old push flow (including production) already
// have the baseline schema but no migrations table. Record the baseline as
// applied so only later migrations run against them.
function adoptLegacyDatabase() {
  const hasTable = (name: string) =>
    db.get(sql`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ${name}`) !== undefined;
  if (hasTable(MIGRATIONS_TABLE) || !hasTable("products")) return;

  const [baseline] = readMigrationFiles({ migrationsFolder });
  const baselineTables = baseline.sql.flatMap((stmt) => [...stmt.matchAll(/CREATE TABLE `([^`]+)`/g)].map((m) => m[1]));
  const missing = baselineTables.filter((t) => !hasTable(t));
  if (missing.length) {
    throw new Error(`Database predates the baseline schema (missing: ${missing.join(", ")}); migrate it manually.`);
  }
  db.run(sql`CREATE TABLE ${sql.identifier(MIGRATIONS_TABLE)} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`);
  db.run(
    sql`INSERT INTO ${sql.identifier(MIGRATIONS_TABLE)} ("hash", "created_at") VALUES (${baseline.hash}, ${baseline.folderMillis})`,
  );
  console.log("Existing database adopted: baseline migration marked as applied.");
}

adoptLegacyDatabase();
migrate(db, { migrationsFolder });
console.log("Migrations up to date.");
