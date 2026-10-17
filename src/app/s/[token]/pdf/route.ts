import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { renderPdf } from "@/server/pdf/render";
import { getRequestMeta } from "@/server/services/audit";
import { resolveContractPdf } from "@/server/services/contract-documents";
import { readFile } from "@/server/services/files";
import {
  assertSigningRateLimit,
  resolveSignatory,
} from "@/server/services/signing";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  try {
    const { token } = await params;
    const meta = await getRequestMeta();
    assertSigningRateLimit(meta.ip);
    const { contract } = resolveSignatory(token);

    const lang = request.nextUrl.searchParams.get("lang") ?? undefined;
    const source = await resolveContractPdf(contract.id, lang);

    const pdf =
      source.kind === "sealed"
        ? readFile(source.fileId).buffer
        : await renderPdf(source.html, {
            docNumber: source.docNumber,
            code: null,
            kind: "contract",
            lang: source.lang,
          });

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `attachment; filename="${source.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    return new Response(new Uint8Array(pdf), { headers });
  } catch (error) {
    if (error instanceof AppError) {
      const status =
        error.code === "RATE_LIMITED"
          ? 429
          : error.code === "VALIDATION_FAILED"
            ? 400
            : 404;
      return NextResponse.json(
        { ok: false, error: { code: error.code } },
        { status },
      );
    }
    logger.error("signing_pdf_failed", {
      err: error instanceof Error ? error.name : "Unknown",
    });
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL" } },
      { status: 500 },
    );
  }
}
