"use server";

import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/permissions";
import type { ActionResult } from "@/lib/result";
import {
  recordPaymentSchema,
  voidPaymentSchema,
} from "@/lib/validation/invoices";
import { requireUser } from "@/server/auth/require-user";
import { getRequestMeta } from "@/server/services/audit";
import { recordPayment, voidPayment } from "@/server/services/payments";
import { runAction } from "./_run";

export async function recordPaymentAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "payments.write");
    const data = raw as { invoiceId?: unknown };
    const invoiceId = String(data.invoiceId ?? "");
    const input = recordPaymentSchema.parse(raw);
    const meta = await getRequestMeta();
    const id = recordPayment(user, invoiceId, input, meta);
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
