// Dossier - Database Schema Tests
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import type { DbInstance } from "@/db";
import { auditLog, numberSequences, users } from "@/db/schema";
import { createTestDb } from "@/db/test-db";

function insertUser(db: DbInstance["db"], email: string): void {
  db.insert(users)
    .values({
      id: `u_${email}`,
      email,
      name: "Test User",
      passwordHash: "hash",
      createdAt: 0,
      updatedAt: 0,
    })
    .run();
}

function insertAuditRow(db: DbInstance["db"]): void {
  db.insert(auditLog)
    .values({
      ts: Date.now(),
      actorType: "system",
      action: "test.action",
      entityType: "test",
      entityId: "t1",
    })
    .run();
}

function countRows(sqlite: DbInstance["sqlite"], table: string): number {
  const row = sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as {
    c: number;
  };
  return row.c;
}

describe("users", () => {
  it("enforces the unique email index", () => {
    const { db, sqlite } = createTestDb();
    insertUser(db, "a@example.com");
    expect(() => insertUser(db, "a@example.com")).toThrow();
    expect(countRows(sqlite, "users")).toBe(1);
  });
});

describe("audit_log", () => {
  it("accepts inserts", () => {
    const { db, sqlite } = createTestDb();
    expect(() => insertAuditRow(db)).not.toThrow();
    expect(countRows(sqlite, "audit_log")).toBe(1);
  });

  it("rejects UPDATE", () => {
    const { db } = createTestDb();
    insertAuditRow(db);
    expect(() => db.update(auditLog).set({ action: "tampered" }).run()).toThrow(
      /append-only/,
    );
  });

  it("rejects DELETE", () => {
    const { db } = createTestDb();
    insertAuditRow(db);
    expect(() => db.delete(auditLog).run()).toThrow(/append-only/);
  });
});

describe("number_sequences", () => {
  it("enforces uniqueness of (seqKey, year)", () => {
    const { db, sqlite } = createTestDb();
    db.insert(numberSequences)
      .values({ seqKey: "contract", year: 2026, lastValue: 0 })
      .run();
    expect(() =>
      db
        .insert(numberSequences)
        .values({ seqKey: "contract", year: 2026, lastValue: 1 })
        .run(),
    ).toThrow();
    expect(countRows(sqlite, "number_sequences")).toBe(1);
  });

  it("allows the same key in different years and different keys", () => {
    const { db, sqlite } = createTestDb();
    db.insert(numberSequences)
      .values({ seqKey: "contract", year: 2026, lastValue: 0 })
      .run();
    db.insert(numberSequences)
      .values({ seqKey: "contract", year: 2027, lastValue: 0 })
      .run();
    db.insert(numberSequences)
      .values({ seqKey: "invoice", year: 2026, lastValue: 0 })
      .run();
    expect(countRows(sqlite, "number_sequences")).toBe(3);
  });
});
