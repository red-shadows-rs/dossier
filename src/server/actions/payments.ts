// Dossier - Payments Action
// https://github.com/red-shadows-rs/dossier

"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import type { ActionResult } from "@/lib/result";
import {
  recordPaymentSchema,
  voidPaymentSchema,
  type RecordPaymentInput,
} from "@/lib/validation/invoices";
import { requireUser } from "@/server/auth/require-user";
import { getRequestMeta } from "@/server/services/audit";
import { detectMime, saveFile } from "@/server/services/files";
import { recordPayment, voidPayment } from "@/server/services/payments";
import { runAction } from "./_run";

export async function recordPaymentAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "payments.write");
    let invoiceId: string;
    let input: RecordPaymentInput;
    let fileBuffer: Buffer | null = null;
    let fileName: string | null = null;

    if (raw instanceof FormData) {
      invoiceId = String(raw.get("invoiceId") ?? "");
      const amountStr = String(
        raw.get("amountMinor") ?? raw.get("amount") ?? "",
      );
      input = recordPaymentSchema.parse({
        amountMinor: Number(amountStr),
        paidOn: String(raw.get("paidOn") ?? ""),
        method: String(raw.get("method") ?? "bank_transfer"),
        reference: String(raw.get("reference") ?? "") || undefined,
        notes: String(raw.get("notes") ?? "") || undefined,
      });

      const fileEntry =
        raw.get("receiptFile") ?? raw.get("receipt") ?? raw.get("file");
      if (fileEntry instanceof File && fileEntry.size > 0) {
        if (fileEntry.size > 10 * 1024 * 1024) {
          throw new AppError("FILE_REJECTED", "File is too large");
        }
        fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
        const mime = detectMime(fileBuffer);
        if (!mime) {
          throw new AppError("FILE_REJECTED", "Unsupported file type");
        }
        fileName = fileEntry.name;
      }
    } else {
      const data = raw as { invoiceId?: unknown };
      invoiceId = String(data.invoiceId ?? "");
      input = recordPaymentSchema.parse(raw);
    }

    const meta = await getRequestMeta();
    const id = recordPayment(user, invoiceId, input, meta);

    if (fileBuffer && fileName) {
      saveFile({
        kind: "attachment",
        buffer: fileBuffer,
        originalName: fileName,
        ownerType: "payment",
        ownerId: id,
        createdBy: user.id,
      });
    }

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    return { id };
  });
}

export async function voidPaymentAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "payments.void");
    const data = raw as { id?: unknown; invoiceId?: unknown };
    const paymentId = String(data.id ?? "");
    const invoiceId = String(data.invoiceId ?? "");
    const input = voidPaymentSchema.parse(raw);
    const meta = await getRequestMeta();
    voidPayment(user, paymentId, input.reason, meta);
    revalidatePath("/invoices");
    if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
    return null;
  });
}
