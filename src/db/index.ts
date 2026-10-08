import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

export type DbInstance = {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
};

export function openDb(path: string): DbInstance {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  }
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");
  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

mkdirSync(env.DATA_DIR, { recursive: true, mode: 0o700 });

const instance = openDb(env.DATABASE_PATH);

export const sqlite = instance.sqlite;
export const db = instance.db;

export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function withTx<T>(fn: (tx: DbTx) => T): T {
  return db.transaction((tx) => fn(tx));
}

export function runMigrations<TSchema extends Record<string, unknown>>(
  target: BetterSQLite3Database<TSchema>,
  migrationsFolder: string,
): void {
  if (!existsSync(join(migrationsFolder, "meta", "_journal.json"))) {
    return;
  }
  migrate(target, { migrationsFolder });
}
