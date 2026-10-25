// Dossier - Subscriptions Action
// https://github.com/red-shadows-rs/dossier

"use server";

import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/permissions";
import type { ActionResult } from "@/lib/result";
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
} from "@/lib/validation/subscriptions";
import { requireUser } from "@/server/auth/require-user";
import { getRequestMeta } from "@/server/services/audit";
import {
  cancelSubscription,
  createSubscription,
  duplicateSubscription,
  generateInvoiceForSubscription,
  pauseSubscription,
  resumeSubscription,
  updateSubscription,
} from "@/server/services/subscriptions";
import { runAction } from "./_run";

function revalidateSubscription(id?: string): void {
  revalidatePath("/subscriptions");
  if (id) {
    revalidatePath(`/subscriptions/${id}`);
    revalidatePath(`/subscriptions/${id}/edit`);
  }
  revalidatePath("/invoices");
}

export async function createSubscriptionAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "subscriptions.write");
    const input = createSubscriptionSchema.parse(raw);
    const meta = await getRequestMeta();
    const id = createSubscription(user, input, meta);
    revalidateSubscription(id);
    return { id };
  });
}

export async function updateSubscriptionAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "subscriptions.write");
    const input = updateSubscriptionSchema.parse(raw);
    const meta = await getRequestMeta();
    updateSubscription(id, user, input, meta);
    revalidateSubscription(id);
    return { id };
  });
}

export async function pauseSubscriptionAction(
  id: string,
): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "subscriptions.pause");
    const meta = await getRequestMeta();
    pauseSubscription(id, user, meta);
    revalidateSubscription(id);
    return { ok: true };
  });
}

export async function resumeSubscriptionAction(
  id: string,
): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "subscriptions.pause");
    const meta = await getRequestMeta();
    resumeSubscription(id, user, meta);
    revalidateSubscription(id);
    return { ok: true };
  });
}

export async function cancelSubscriptionAction(
  id: string,
): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "subscriptions.cancel");
    const meta = await getRequestMeta();
    cancelSubscription(id, user, meta);
    revalidateSubscription(id);
    return { ok: true };
  });
}

export async function generateSubscriptionInvoiceAction(
  id: string,
): Promise<ActionResult<{ invoiceId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "invoices.write");
    const meta = await getRequestMeta();
    const invoiceId = generateInvoiceForSubscription(id, user, meta);
    revalidateSubscription(id);
    return { invoiceId };
  });
}

export async function duplicateSubscriptionAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "subscriptions.write");
    const data = raw as { id?: unknown };
    const id = String(data?.id ?? "");
    const meta = await getRequestMeta();
    const newId = duplicateSubscription(user, id, meta);
    revalidateSubscription(newId);
    return { id: newId };
  });
}

