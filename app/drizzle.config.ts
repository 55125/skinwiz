import { defineConfig } from "drizzle-kit";

// Same DATABASE_PATH env var as src/db/client.ts, so `db:push` targets the
// same file the app actually reads/writes -- a mounted volume in
// production, ./data/skinwiz.db locally.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./data/skinwiz.db",
  },
});
