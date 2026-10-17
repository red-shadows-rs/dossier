import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/server/auth/require-user";
import { resolveContractPdf } from "@/server/services/contract-documents";
import { readFile } from "@/server/services/files";
import { renderPdf } from "@/server/pdf/render";

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
    if (!can(user, "contracts.read")) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN" } },
        { status: 403 },
      );
    }

    const lang = request.nextUrl.searchParams.get("lang") ?? undefined;
    const inline = request.nextUrl.searchParams.get("inline") === "1";

    const source = await resolveContractPdf(id, lang);

    let pdf: Buffer;
    if (source.kind === "sealed") {
      pdf = readFile(source.fileId).buffer;
    } else {
      pdf = await renderPdf(source.html, {
        docNumber: source.docNumber,
        code: null,
        kind: "contract",
        lang: source.lang,
      });
    }

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${source.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });

    return new Response(new Uint8Array(pdf), { headers });
  } catch (error) {
    if (error instanceof AppError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "FORBIDDEN"
            ? 403
            : error.code === "VALIDATION_FAILED"
              ? 400
              : error.code === "PDF_FAILED"
                ? 500
                : 400;
      return NextResponse.json(
        { ok: false, error: { code: error.code } },
        { status },
      );
    }
    logger.error("contract_pdf_failed", {
      err: error instanceof Error ? error.name : "Unknown",
    });
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL" } },
      { status: 500 },
    );
  }
}
