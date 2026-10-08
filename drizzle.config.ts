// ─────────────────────────────────────────────
// Dossier - Database Migration & Schema Config
// https://github.com/red-shadows-rs/dossier
// ─────────────────────────────────────────────

import { defineConfig } from "drizzle-kit";

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
