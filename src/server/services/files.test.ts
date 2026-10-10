// Dossier - Files Tests
// https://github.com/red-shadows-rs/dossier

import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import {
  deleteAttachment,
  detectMime,
  findFileBySha256,
  readFile,
  saveFile,
} from "./files";

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PDF = Buffer.from("%PDF-1.7\nrest", "ascii");
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from("WEBP"),
]);
const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  "utf8",
);

function absPath(storagePath: string): string {
  return join(env.DATA_DIR, "files", storagePath);
}

describe("detectMime", () => {
  it("detects the allowed magic bytes and rejects others", () => {
    expect(detectMime(PNG)).toBe("image/png");
    expect(detectMime(JPEG)).toBe("image/jpeg");
    expect(detectMime(WEBP)).toBe("image/webp");
    expect(detectMime(PDF)).toBe("application/pdf");
    expect(detectMime(SVG)).toBeNull();
    expect(detectMime(Buffer.from("plain text"))).toBeNull();
  });
});

describe("saveFile", () => {
  it("stores an allowed logo and writes the file to disk", () => {
    const row = saveFile({
      kind: "logo",
      buffer: PNG,
      originalName: "logo.png",
    });
    expect(row.kind).toBe("logo");
    expect(row.mime).toBe("image/png");
    expect(row.sizeBytes).toBe(PNG.length);
    expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(existsSync(absPath(row.storagePath))).toBe(true);
  });

  it("ignores the client-declared name (PNG renamed .svg is accepted)", () => {
    const row = saveFile({
      kind: "logo",
      buffer: PNG,
      originalName: "evil.svg",
    });
    expect(row.mime).toBe("image/png");
    expect(row.originalName).toBe("evil.svg");
  });

  it("rejects an SVG (wrong magic bytes) with FILE_REJECTED", () => {
    expect(() =>
      saveFile({ kind: "logo", buffer: SVG, originalName: "logo.svg" }),
    ).toThrow(AppError);
    try {
      saveFile({ kind: "logo", buffer: SVG, originalName: "logo.svg" });
    } catch (error) {
      expect((error as AppError).code).toBe("FILE_REJECTED");
    }
  });

  it("rejects a file above the kind limit", () => {
    const big = Buffer.alloc(2 * 1024 * 1024 + 1);
    PNG.copy(big, 0, 0, 4);
    expect(() => saveFile({ kind: "logo", buffer: big })).toThrow(
      /FILE_REJECTED|too large/,
    );
  });

  it("rejects a non-PNG signature", () => {
    expect(() => saveFile({ kind: "signature", buffer: JPEG })).toThrow(
      AppError,
    );
    expect(() => saveFile({ kind: "signature", buffer: PNG })).not.toThrow();
  });

  it("rejects an empty file", () => {
    expect(() =>
      saveFile({ kind: "attachment", buffer: Buffer.alloc(0) }),
    ).toThrow(AppError);
  });
});

describe("readFile / findFileBySha256", () => {
  it("round-trips the stored bytes and finds by sha256", () => {
    const row = saveFile({
      kind: "attachment",
      buffer: PDF,
      originalName: "doc.pdf",
    });
    const read = readFile(row.id);
    expect(read.buffer.equals(PDF)).toBe(true);
    expect(read.mime).toBe("application/pdf");
    expect(read.sizeBytes).toBe(PDF.length);
    expect(read.kind).toBe("attachment");

    const found = findFileBySha256(row.sha256);
    expect(found?.id).toBe(row.id);
  });

  it("throws NOT_FOUND for a missing row", () => {
    try {
      readFile("does-not-exist");
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("NOT_FOUND");
    }
  });

  it("throws NOT_FOUND when the file is missing on disk", () => {
    const row = saveFile({ kind: "attachment", buffer: PDF });
    rmSync(absPath(row.storagePath), { force: true });
    expect(() => readFile(row.id)).toThrow(AppError);
  });
});

describe("deleteAttachment", () => {
  it("refuses to delete a non-attachment", () => {
    const row = saveFile({ kind: "logo", buffer: PNG });
    try {
      deleteAttachment(row.id);
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("FORBIDDEN");
    }
    expect(readFile(row.id).mime).toBe("image/png");
  });

  it("deletes an attachment row and its file", () => {
    const row = saveFile({ kind: "attachment", buffer: PDF });
    deleteAttachment(row.id);
    expect(existsSync(absPath(row.storagePath))).toBe(false);
    expect(() => readFile(row.id)).toThrow(AppError);
  });
});
