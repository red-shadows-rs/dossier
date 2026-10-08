import { defineConfig } from "drizzle-kit";

// CLI-only config: drizzle-kit does not load .env files, so the database path
// is resolved here directly (the app itself reads env only via src/lib/env.ts).
const dataDir = process.env.DATA_DIR ?? "./data";
const databasePath = process.env.DATABASE_PATH ?? `${dataDir}/dossier.sqlite`;

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databasePath,
  },
});
