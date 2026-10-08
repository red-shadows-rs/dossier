// Dossier - Database Test Db Module
// https://github.com/red-shadows-rs/dossier

import { join } from "node:path";
import { runMigrations, openDb, type DbInstance } from "@/db";

const MIGRATIONS_FOLDER = join(process.cwd(), "drizzle");

export function createTestDb(): DbInstance {
  const instance = openDb(":memory:");
  runMigrations(instance.db, MIGRATIONS_FOLDER);
  return instance;
}
