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
  previewTotals,
  saveClauses,
  saveContractItems,
  saveMilestones,
  updateContractBasics,
} from "@/server/services/contracts";
import type { CalcInput, CalcOutput } from "@/server/services/contract-calc";
import {
  buildContractHtml,
  resolveDocLang,
} from "@/server/services/contract-documents";
import { getContract } from "@/server/services/contracts";
import { sendContract, signAsProvider } from "@/server/services/contracts-send";
import {
  sendContractInputSchema,
  signAsProviderInputSchema,
} from "@/lib/validation/signing";
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

export async function previewTotalsAction(
  raw: unknown,
): Promise<ActionResult<CalcOutput>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "contracts.write");
    const input = saveItemsSchema.parse(raw);
    return previewTotals({
      items: input.items.map((item) => ({
        unitPriceMinor: item.unitPriceMinor,
        qtyMilli: item.qtyMilli,
      })),
      discount: input.discount,
      taxRateBp: input.taxRateBp,
    } satisfies CalcInput);
  });
}

export async function getContractPreviewHtmlAction(
  raw: unknown,
): Promise<ActionResult<{ html: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "contracts.read");
    const data = raw as { id?: unknown; lang?: unknown };
    const id = String(data.id ?? "");
    const contract = getContract(id);
    const lang = resolveDocLang(
      contract,
      data.lang ? String(data.lang) : undefined,
    );
    const html = await buildContractHtml(id, lang, "preview");
    return { html };
  });
}

export async function sendContractAction(
  raw: unknown,
): Promise<ActionResult<{ clientToken: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "contracts.send");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = sendContractInputSchema.parse(raw);
    const meta = await getRequestMeta();
    const result = sendContract(user, id, input, meta);
    revalidateContract(id);
    return result;
  });
}

export async function signAsProviderAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "contracts.sign_provider");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = signAsProviderInputSchema.parse(raw);
    const meta = await getRequestMeta();
    signAsProvider(user, id, input, meta);
    revalidateContract(id);
    return null;
  });
}
