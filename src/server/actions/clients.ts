"use server";

import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/permissions";
import type { ActionResult } from "@/lib/result";
import { clientInputSchema } from "@/lib/validation/clients";
import { requireUser } from "@/server/auth/require-user";
import { getRequestMeta } from "@/server/services/audit";
import {
  archiveClient,
  createClient,
  deleteClient,
  unarchiveClient,
  updateClient,
} from "@/server/services/clients";
import { runAction } from "./_run";

export async function createClientAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "clients.write");
    const input = clientInputSchema.parse(raw);
    const meta = await getRequestMeta();
    const id = createClient(user, input, meta);
    revalidatePath("/clients");
    return { id };
  });
}

export async function updateClientAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "clients.write");
    const payload = raw as { id?: unknown };
    const id = String(payload.id ?? "");
    const input = clientInputSchema.parse(raw);
    const meta = await getRequestMeta();
    updateClient(user, id, input, meta);
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return null;
  });
}

export async function archiveClientAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "clients.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const meta = await getRequestMeta();
    archiveClient(user, id, meta);
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return null;
  });
}

export async function unarchiveClientAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "clients.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const meta = await getRequestMeta();
    unarchiveClient(user, id, meta);
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return null;
  });
}

export async function deleteClientAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "clients.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const meta = await getRequestMeta();
    deleteClient(user, id, meta);
    revalidatePath("/clients");
    return null;
  });
}
