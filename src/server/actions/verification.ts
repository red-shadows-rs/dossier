"use server";

import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/result";
import { isLocale } from "@/lib/i18n";
import { getRequestMeta } from "@/server/services/audit";
import {
  assertFileCheckRateLimit,
  assertLookupRateLimit,
  checkPdfUpload,
  lookupVerification,
  type PdfCheckResult,
  type VerificationResult,
} from "@/server/services/verification";
import { runAction } from "./_run";

const codeSchema = z.object({
  code: z.string().trim().min(1, "errors.required").max(32),
  locale: z.string().optional(),
});

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function verifyCodeAction(
  raw: unknown,
): Promise<ActionResult<VerificationResult | null>> {
  return runAction(async () => {
    const { code, locale } = codeSchema.parse(raw);
    const meta = await getRequestMeta();
    assertLookupRateLimit(meta.ip);
    return lookupVerification(code, isLocale(locale) ? locale : "ar");
  });
}

export async function checkPdfAction(
  raw: unknown,
): Promise<ActionResult<{ check: PdfCheckResult }>> {
  return runAction(async () => {
    const parsed = codeSchema
      .extend({ dataBase64: z.string().min(1, "errors.required") })
      .parse(raw);
    const meta = await getRequestMeta();
    assertFileCheckRateLimit(meta.ip);
    const buffer = Buffer.from(parsed.dataBase64, "base64");
    if (buffer.length === 0 || buffer.length > MAX_PDF_BYTES) {
      throw new AppError("FILE_REJECTED", "The file is missing or too large", {
        file: "errors.FILE_REJECTED",
      });
    }
    return { check: checkPdfUpload(parsed.code, buffer) };
  });
}
