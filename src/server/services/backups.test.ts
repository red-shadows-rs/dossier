import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { env } from "@/lib/env";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import { updateSettings } from "@/server/services/settings";
import {
  applyRetention,
  backupsDir,
  createDatabaseBackup,
  runBackup,
} from "./backups";
import { runDailyJobs } from "./daily-jobs";

const META = { ip: "1.2.3.4", userAgent: "vitest" };
const MS_PER_DAY = 86_400_000;

async function ownerUser(): Promise<SessionUser> {
  const created = await createTestUser({ role: "owner" });
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: "owner",
    locale: "ar",
    canSignForCompany: true,
    signerTitleAr: null,
    signerTitleEn: null,
  };
}

async function useUtc(): Promise<void> {
  const user = await ownerUser();
  updateSettings("defaults", { timezone: "UTC" }, user, META);
}

function backupNames(): string[] {
  return existsSync(backupsDir()) ? readdirSync(backupsDir()) : [];
}

beforeEach(() => {
  rmSync(backupsDir(), { recursive: true, force: true });
});

describe("createDatabaseBackup", () => {
  it("writes a snapshot that opens and answers SELECT 1", async () => {
    const path = await createDatabaseBackup(Date.UTC(2026, 5, 15, 3, 0), "UTC");
    expect(path.endsWith("dossier-20260615-0300.sqlite")).toBe(true);

    const copy = new Database(path, { readonly: true });
    try {
      expect(copy.prepare("SELECT 1 AS ok").get()).toEqual({ ok: 1 });
    } finally {
      copy.close();
    }
  });
});

describe("applyRetention", () => {
  it("keeps the 3 newest and deletes the older files past the window", () => {
    const dir = backupsDir();
    mkdirSync(dir, { recursive: true });
    const now = Date.UTC(2026, 5, 15, 3, 0);
    const names = [0, 1, 2, 3, 4].map((i) => `dossier-2026060${i}-0300.sqlite`);
    names.forEach((name, i) => {
      const file = join(dir, name);
      writeFileSync(file, "x");
      const age = (5 - i) * 40 * MS_PER_DAY;
      const secs = (now - age) / 1000;
      utimesSync(file, secs, secs);
    });

    const deleted = applyRetention(30, now);

    expect(deleted.sort()).toEqual(["dossier-20260600-0300.sqlite", "dossier-20260601-0300.sqlite"]);
    const remaining = backupNames().filter((n) => n.startsWith("dossier-"));
    expect(remaining.sort()).toEqual([
      "dossier-20260602-0300.sqlite",
      "dossier-20260603-0300.sqlite",
      "dossier-20260604-0300.sqlite",
    ]);
  });

  it("keeps files inside the retention window even beyond the newest three", () => {
    const dir = backupsDir();
    mkdirSync(dir, { recursive: true });
    const now = Date.UTC(2026, 5, 15, 3, 0);
    const names = [0, 1, 2, 3].map((i) => `dossier-2026061${i}-0300.sqlite`);
    names.forEach((name, i) => {
      const file = join(dir, name);
      writeFileSync(file, "x");
      const secs = (now - i * MS_PER_DAY) / 1000; 
      utimesSync(file, secs, secs);
    });

    const deleted = applyRetention(30, now);
    expect(deleted).toEqual([]);
  });
});

describe("runBackup", () => {
  it("creates a DB backup and audits backup.completed", async () => {
    await useUtc();
    const before = backupNames().length;
    const result = await runBackup(Date.UTC(2026, 5, 15, 3, 0)); 
    expect(result.filesPath).toBeNull();
    expect(backupNames().length).toBe(before + 1);

    const auditRow = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "backup.completed"))
      .all()
      .find((row) => row.entityId === "20260615-0300");
    expect(auditRow).toBeDefined();
    expect(auditRow?.entityType).toBe("backup");
  });

  it("also creates the files tar on Sundays", async () => {
    await useUtc();
    mkdirSync(join(env.DATA_DIR, "files"), { recursive: true });
    writeFileSync(join(env.DATA_DIR, "files", "note.txt"), "hello");

    const result = await runBackup(Date.UTC(2024, 0, 7, 3, 0));
    expect(result.filesPath).not.toBeNull();
    expect(statSync(result.filesPath ?? "").isFile()).toBe(true);
  });
});

describe("runDailyJobs — backup pass", () => {
  it("creates one backup per business-tz date at hour 03", async () => {
    await useUtc();

    await runDailyJobs(Date.UTC(2026, 5, 15, 3, 0));
    const count = backupNames().length;
    expect(count).toBeGreaterThan(0);

    await runDailyJobs(Date.UTC(2026, 5, 15, 3, 15));
    expect(backupNames().length).toBe(count);
  });
});
