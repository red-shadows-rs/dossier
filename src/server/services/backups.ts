// Dossier - Backups Service
// https://github.com/red-shadows-rs/dossier

import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { sqlite, withTx } from "@/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { nowMs } from "@/lib/dates";
import { audit } from "@/server/services/audit";
import { getSettings } from "@/server/services/settings";

const execFileAsync = promisify(execFile);
const MS_PER_DAY = 86_400_000;
const KEEP_NEWEST = 3;

export type BackupResult = {
  dbPath: string;
  filesPath: string | null;
};

export function backupsDir(): string {
  return join(env.DATA_DIR, "backups");
}

function dateStamp(ms: number, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}`;
}

function weekdayInTz(ms: number, tz: string): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(new Date(ms));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(label);
}

export async function createDatabaseBackup(
  ms: number,
  tz: string,
): Promise<string> {
  const dir = backupsDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, `dossier-${dateStamp(ms, tz)}.sqlite`);
  await sqlite.backup(path);
  return path;
}

export async function createFilesArchive(
  ms: number,
  tz: string,
): Promise<string | null> {
  const filesPath = join(env.DATA_DIR, "files");
  if (!existsSync(filesPath)) return null;
  const dir = backupsDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const archive = join(
    dir,
    `files-${dateStamp(ms, tz).slice(0, 8)}.tar.gz`,
  );
  await execFileAsync("tar", [
    "-czf",
    archive,
    "-C",
    env.DATA_DIR,
    "files",
  ]);
  return archive;
}

export function applyRetention(
  retentionDays: number,
  atMs: number = nowMs(),
): string[] {
  const dir = backupsDir();
  if (!existsSync(dir)) return [];
  const cutoff = atMs - retentionDays * MS_PER_DAY;
  const entries = readdirSync(dir)
    .filter(
      (name) =>
        /^dossier-.*\.sqlite$/.test(name) || /^files-.*\.tar\.gz$/.test(name),
    )
    .map((name) => ({ name, mtime: statSync(join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const deleted: string[] = [];
  entries.forEach((entry, index) => {
    if (index < KEEP_NEWEST) return;
    if (entry.mtime >= cutoff) return;
    rmSync(join(dir, entry.name), { force: true });
    deleted.push(entry.name);
  });
  return deleted;
}

function auditBackup(
  action: "backup.completed" | "backup.failed",
  entityId: string,
  meta: Record<string, unknown>,
): void {
  try {
    withTx((tx) => {
      audit(tx, {
        actorType: "system",
        action,
        entityType: "backup",
        entityId,
        meta,
      });
    });
  } catch (error) {
    logger.error("backup_audit_failed", {
      action,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function runBackup(atMs: number = nowMs()): Promise<BackupResult> {
  const tz = getSettings("defaults").timezone;
  const entityId = dateStamp(atMs, tz);
  try {
    const dbPath = await createDatabaseBackup(atMs, tz);
    let filesPath: string | null = null;
    if (weekdayInTz(atMs, tz) === 0) {
      filesPath = await createFilesArchive(atMs, tz);
    }
    const deleted = applyRetention(env.BACKUP_RETENTION_DAYS, atMs);
    auditBackup("backup.completed", entityId, {
      dbPath,
      filesPath,
      deleted,
    });
    logger.info("backup_completed", { dbPath, filesPath, deleted });
    return { dbPath, filesPath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    auditBackup("backup.failed", entityId, { message: message.slice(0, 300) });
    logger.error("backup_failed", { message: message.slice(0, 300) });
    throw error;
  }
}
