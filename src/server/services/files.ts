import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { FILE_KINDS } from "@/lib/constants";
import { sha256Hex } from "@/lib/crypto";
import { nowMs } from "@/lib/dates";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { logger } from "@/lib/logger";

export type FileKind = (typeof FILE_KINDS)[number];
export type FileMime =
  "image/png" | "image/jpeg" | "image/webp" | "application/pdf";

export type StoredFile = typeof files.$inferSelect;

const MB = 1024 * 1024;

const RULES: Record<FileKind, { mimes: FileMime[]; maxBytes: number }> = {
  logo: { mimes: ["image/png", "image/jpeg", "image/webp"], maxBytes: 2 * MB },
  stamp: { mimes: ["image/png", "image/jpeg", "image/webp"], maxBytes: 2 * MB },
  signature: { mimes: ["image/png"], maxBytes: 200 * 1024 },
  attachment: {
    mimes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
    maxBytes: 10 * MB,
  },
  contract_pdf: { mimes: ["application/pdf"], maxBytes: 25 * MB },
};

export function detectMime(buffer: Buffer): FileMime | null {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  return null;
}

function sanitizeName(name: string | undefined): string | null {
  if (!name) return null;
  const base = basename(name)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return base ? base.slice(0, 200) : null;
}

function storagePathFor(
  id: string,
  atMs: number,
): { relPath: string; absPath: string } {
  const date = new Date(atMs);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const relPath = `${year}/${month}/${id}`;
  return { relPath, absPath: join(env.DATA_DIR, "files", relPath) };
}

export type SaveFileInput = {
  kind: FileKind;
  buffer: Buffer;
  originalName?: string;
  ownerType?: string;
  ownerId?: string;
  createdBy?: string;
};

export function saveFile(input: SaveFileInput): StoredFile {
  const rule = RULES[input.kind];
  if (!rule) {
    throw new AppError("FILE_REJECTED", "Unknown file kind");
  }
  const buffer = input.buffer;
  if (buffer.length === 0) {
    throw new AppError("FILE_REJECTED", "Empty file");
  }
  if (buffer.length > rule.maxBytes) {
    throw new AppError("FILE_REJECTED", "File is too large");
  }
  const mime = detectMime(buffer);
  if (!mime || !rule.mimes.includes(mime)) {
    throw new AppError("FILE_REJECTED", "Unsupported file type");
  }

  const id = newId();
  const now = nowMs();
  const sha256 = sha256Hex(buffer);
  const { relPath, absPath } = storagePathFor(id, now);

  mkdirSync(dirname(absPath), { recursive: true, mode: 0o700 });
  const tmpPath = `${absPath}.tmp`;
  writeFileSync(tmpPath, buffer, { mode: 0o600 });
  renameSync(tmpPath, absPath);

  db.insert(files)
    .values({
      id,
      kind: input.kind,
      mime,
      sizeBytes: buffer.length,
      sha256,
      storagePath: relPath,
      originalName: sanitizeName(input.originalName),
      ownerType: input.ownerType ?? null,
      ownerId: input.ownerId ?? null,
      createdBy: input.createdBy ?? null,
      createdAt: now,
    })
    .run();

  const row = db.select().from(files).where(eq(files.id, id)).get();
  if (!row) {
    throw new AppError("INTERNAL", "Failed to persist file");
  }
  return row;
}

export type ReadFileResult = {
  buffer: Buffer;
  mime: string;
  sizeBytes: number;
  sha256: string;
  kind: FileKind;
  originalName: string | null;
};

export function readFile(id: string): ReadFileResult {
  const row = db.select().from(files).where(eq(files.id, id)).get();
  if (!row) {
    throw new AppError("NOT_FOUND", "File not found");
  }
  const absPath = join(env.DATA_DIR, "files", row.storagePath);
  let buffer: Buffer;
  try {
    buffer = readFileSync(absPath);
  } catch {
    logger.error("file_missing_on_disk", { fileId: id });
    throw new AppError("NOT_FOUND", "File not found");
  }
  return {
    buffer,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    kind: row.kind,
    originalName: row.originalName,
  };
}

export function findFileBySha256(sha256: string): StoredFile | undefined {
  return db.select().from(files).where(eq(files.sha256, sha256)).get();
}

export function getFileRow(id: string): StoredFile | undefined {
  return db.select().from(files).where(eq(files.id, id)).get();
}

export function deleteAttachment(id: string): void {
  const row = db.select().from(files).where(eq(files.id, id)).get();
  if (!row) {
    throw new AppError("NOT_FOUND", "File not found");
  }
  if (row.kind !== "attachment") {
    throw new AppError("FORBIDDEN", "Only attachments can be deleted");
  }
  const absPath = join(env.DATA_DIR, "files", row.storagePath);
  try {
    rmSync(absPath, { force: true });
  } catch {
    logger.warn("file_unlink_failed", { fileId: id });
  }
  db.delete(files).where(eq(files.id, id)).run();
}
