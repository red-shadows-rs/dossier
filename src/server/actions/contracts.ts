"use server";

import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/permissions";
import type { ActionResult } from "@/lib/result";
import {
  createContractSchema,
  saveClausesSchema,
  saveItemsSchema,
  saveMilestonesSchema,
  updateBasicsSchema,
} from "@/lib/validation/contracts";
import { requireUser } from "@/server/auth/require-user";
import { getRequestMeta } from "@/server/services/audit";
import {
  cancelContract,
  createContractFromTemplate,
  deleteDraftContract,
  saveClauses,
  saveContractItems,
  saveMilestones,
  updateContractBasics,
} from "@/server/services/contracts";
import { runAction } from "./_run";

function revalidateContract(id: string): void {
  revalidatePath("/contracts");
  revalidatePath(`/contracts/${id}`);
}

export async function createContractAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "contracts.write");
    const input = createContractSchema.parse(raw);
    const meta = await getRequestMeta();
    const id = createContractFromTemplate(user, input, meta);
    revalidatePath("/contracts");
    return { id };
  });
}

export async function updateContractBasicsAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "contracts.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = updateBasicsSchema.parse(raw);
    const meta = await getRequestMeta();
    updateContractBasics(user, id, input, meta);
    revalidateContract(id);
    return null;
  });
}

export async function saveContractItemsAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "contracts.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = saveItemsSchema.parse(raw);
    const meta = await getRequestMeta();
    saveContractItems(user, id, input, meta);
    revalidateContract(id);
    return null;
  });
}

export async function saveMilestonesAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "contracts.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = saveMilestonesSchema.parse(raw);
    const meta = await getRequestMeta();
    saveMilestones(user, id, input, meta);
    revalidateContract(id);
    return null;
  });
}

export async function saveClausesAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "contracts.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = saveClausesSchema.parse(raw);
    const meta = await getRequestMeta();
    saveClauses(user, id, input.clauses, meta);
    revalidateContract(id);
    return null;
  });
}

export async function deleteDraftContractAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "contracts.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const meta = await getRequestMeta();
    deleteDraftContract(user, id, meta);
    revalidatePath("/contracts");
    return null;
  });
}

export async function cancelContractAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "contracts.cancel");
    const data = raw as { id?: unknown; reason?: unknown };
    const id = String(data.id ?? "");
    const reason = data.reason ? String(data.reason) : null;
    const meta = await getRequestMeta();
    cancelContract(user, id, reason, meta);
    revalidateContract(id);
    return null;
  });
}
