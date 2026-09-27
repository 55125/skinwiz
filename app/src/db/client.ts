import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "node:path";

// SQLite for local dev/demo — swap to Postgres (Supabase/Neon, per
// project.md's cost table) via drizzle-orm/postgres-js at deploy time;
// the schema.ts column types are written to be portable to that swap.
const sqlite = new Database(path.join(process.cwd(), "data", "skinwiz.db"));
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
