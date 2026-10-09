"use server";

import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/permissions";
import type { ActionResult } from "@/lib/result";
import {
  createInvoiceSchema,
  saveInvoiceLinesSchema,
  updateInvoiceDraftSchema,
  voidInvoiceSchema,
} from "@/lib/validation/invoices";
import { requireUser } from "@/server/auth/require-user";
import { getRequestMeta } from "@/server/services/audit";
import {
  createInvoice,
  createInvoiceFromMilestone,
  deleteDraftInvoice,
  issueInvoice,
  saveInvoiceLines,
  updateInvoiceDraft,
  voidInvoice,
} from "@/server/services/invoices";
import { runAction } from "./_run";
import { previewTotals } from "@/server/services/contracts";
import type { CalcInput, CalcOutput } from "@/server/services/contract-calc";

function revalidateInvoice(id: string): void {
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function createInvoiceAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "invoices.write");
    const input = createInvoiceSchema.parse(raw);
    const meta = await getRequestMeta();
    const id = createInvoice(user, input, meta);
    revalidatePath("/invoices");
    return { id };
  });
}

export async function createInvoiceFromMilestoneAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "invoices.write");
    const milestoneId = String(
      (raw as { milestoneId?: unknown })?.milestoneId ?? "",
    );
    const meta = await getRequestMeta();
    const id = createInvoiceFromMilestone(user, milestoneId, meta);
    revalidatePath("/invoices");
    return { id };
  });
}

export async function updateInvoiceDraftAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "invoices.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = updateInvoiceDraftSchema.parse(raw);
    const meta = await getRequestMeta();
    updateInvoiceDraft(user, id, input, meta);
    revalidateInvoice(id);
    return null;
  });
}

export async function saveInvoiceLinesAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "invoices.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = saveInvoiceLinesSchema.parse(raw);
    const meta = await getRequestMeta();
    saveInvoiceLines(user, id, input, meta);
    revalidateInvoice(id);
    return null;
  });
}

export async function issueInvoiceAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "invoices.issue");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const meta = await getRequestMeta();
    issueInvoice(user, id, meta);
    revalidateInvoice(id);
    return null;
  });
}

export async function voidInvoiceAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "invoices.void");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = voidInvoiceSchema.parse(raw);
    const meta = await getRequestMeta();
    voidInvoice(user, id, input.reason, meta);
    revalidateInvoice(id);
    return null;
  });
}

export async function deleteDraftInvoiceAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "invoices.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const meta = await getRequestMeta();
    deleteDraftInvoice(user, id, meta);
    revalidatePath("/invoices");
    return null;
  });
}

export async function previewInvoiceTotalsAction(
  raw: unknown,
): Promise<ActionResult<CalcOutput>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "invoices.write");
    const input = saveInvoiceLinesSchema.parse(raw);
    return previewTotals({
      items: input.lines.map((line) => ({
        unitPriceMinor: line.unitPriceMinor,
        qtyMilli: line.qtyMilli,
      })),
      discount: input.discount,
      taxRateBp: input.taxRateBp,
    } satisfies CalcInput);
  });
}
