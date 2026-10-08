// Dossier - Database Index Tests
// https://github.com/red-shadows-rs/dossier

import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import {
  db as appDb,
  openDb,
  runMigrations,
  sqlite as appSqlite,
  withTx,
} from "@/db";
import { createTestDb } from "@/db/test-db";

const createdPaths: string[] = [];

function tempDbPath(): string {
  const path = join(
    tmpdir(),
    `dossier-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`,
  );
  createdPaths.push(path);
  return path;
}

afterEach(() => {
  for (const path of createdPaths.splice(0)) {
    for (const candidate of [path, `${path}-wal`, `${path}-shm`]) {
      if (existsSync(candidate)) {
        rmSync(candidate, { force: true });
      }
    }
  }
});

describe("openDb", () => {
  it("applies the required pragmas to a file database", () => {
    const path = tempDbPath();
    const { sqlite } = openDb(path);
    try {
      expect(sqlite.pragma("journal_mode", { simple: true })).toBe("wal");
      expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(sqlite.pragma("busy_timeout", { simple: true })).toBe(5000);
      expect(sqlite.pragma("synchronous", { simple: true })).toBe(1);
    } finally {
      sqlite.close();
    }
  });

  it("works on an in-memory database", () => {
    const { sqlite } = openDb(":memory:");
    try {
      expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(sqlite.pragma("busy_timeout", { simple: true })).toBe(5000);
    } finally {
      sqlite.close();
    }
  });

  it("creates the parent directory of the database file", () => {
    const root = join(tmpdir(), `dossier-dir-${Date.now()}`);
    const path = join(root, "sub", "db.sqlite");
    const { sqlite } = openDb(path);
    try {
      expect(existsSync(path)).toBe(true);
    } finally {
      sqlite.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("withTx", () => {
  it("commits when the callback succeeds", () => {
    const table = `tx_commit_${Date.now()}`;
    withTx((tx) => {
      tx.run(sql.raw(`CREATE TABLE ${table} (id INTEGER)`));
    });
    const row = appSqlite
      .prepare("SELECT name FROM sqlite_master WHERE name = ?")
      .get(table) as { name: string } | undefined;
    expect(row?.name).toBe(table);
  });

  it("rolls back when the callback throws", () => {
    const table = `tx_rollback_${Date.now()}`;
    expect(() =>
      withTx((tx) => {
        tx.run(sql.raw(`CREATE TABLE ${table} (id INTEGER)`));
        throw new Error("boom");
      }),
    ).toThrow("boom");
    const row = appSqlite
      .prepare("SELECT name FROM sqlite_master WHERE name = ?")
      .get(table);
    expect(row).toBeUndefined();
  });
});

describe("createTestDb", () => {
  it("returns a usable in-memory database with pragmas applied", () => {
    const { db, sqlite } = createTestDb();
    expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    db.run(sql`CREATE TABLE probe (id INTEGER)`);
    const row = sqlite.prepare("SELECT COUNT(*) AS c FROM probe").get() as {
      c: number;
    };
    expect(row.c).toBe(0);
  });

  it("runs migrations (none yet -> no error)", () => {
    expect(() => createTestDb()).not.toThrow();
  });
});

describe("runMigrations", () => {
  it("is a no-op when the migrations folder has no journal", () => {
    const { db } = createTestDb();
    expect(() => runMigrations(db, "/no/such/migrations-folder")).not.toThrow();
  });
});

describe("app database", () => {
  it("exposes the singleton db bound to the configured path", () => {
    expect(appDb).toBeDefined();
    expect(appSqlite).toBeDefined();
  });
});
