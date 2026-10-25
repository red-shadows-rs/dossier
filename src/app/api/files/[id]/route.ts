// Dossier - Api Files Id API Route Handler
// https://github.com/red-shadows-rs/dossier

import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { can, type Permission } from "@/lib/permissions";
import { getCurrentUser } from "@/server/auth/require-user";
import { getFileRow, readFile, type FileKind } from "@/server/services/files";

const KIND_PERMISSION: Record<FileKind, Permission> = {
  logo: "settings.read",
  stamp: "settings.read",
  signature: "contracts.read",
  contract_pdf: "contracts.read",
  attachment: "projects.read",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED" } },
        { status: 401 },
      );
    }

    const { id } = await params;
    const row = getFileRow(id);
    if (!row) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND" } },
        { status: 404 },
      );
    }

    if (row.ownerType === "payment") {
      if (!can(user, "invoices.read")) {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN" } },
          { status: 403 },
        );
      }
    } else if (!can(user, KIND_PERMISSION[row.kind])) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN" } },
        { status: 403 },
      );
    }

    const file = readFile(id);
    const inline =
      request.nextUrl.searchParams.get("inline") === "1" &&
      (file.mime === "application/pdf" || file.mime.startsWith("image/"));

    const filename = (file.originalName ?? id).replace(/["\r\n]/g, "");
    const headers = new Headers({
      "Content-Type": file.mime,
      "Content-Length": String(file.sizeBytes),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
    });

    return new Response(new Uint8Array(file.buffer), { headers });
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND" } },
        { status: 404 },
      );
    }
    logger.error("file_download_failed", {
      err: error instanceof Error ? error.name : "Unknown",
    });
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL" } },
      { status: 500 },
    );
  }
}
