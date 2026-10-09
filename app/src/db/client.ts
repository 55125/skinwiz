import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { foldAccents } from "./fold";
import path from "node:path";
import fs from "node:fs";

// SQLite for local dev/demo — swap to Postgres (Supabase/Neon, per
// project.md's cost table) via drizzle-orm/postgres-js if/when real
// concurrency needs it; the schema.ts column types are written to be
// portable to that swap. Path is configurable so a deployed instance can
// point it at a mounted persistent volume (e.g. Railway) instead of the
// container's ephemeral filesystem — set DATABASE_PATH there.
const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "skinwiz.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
// Accent-insensitive search (see fold.ts).
sqlite.function("fold_accents", { deterministic: true }, (s: unknown) => foldAccents(s as string | null));

export const db = drizzle(sqlite, { schema });
