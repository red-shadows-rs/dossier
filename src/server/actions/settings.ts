"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/result";
import { assertCan } from "@/lib/permissions";
import { requireUser } from "@/server/auth/require-user";
import { audit, getRequestMeta } from "@/server/services/audit";
import { enqueueEmail } from "@/server/services/email";
import { saveFile } from "@/server/services/files";
import { getSettings, updateSettings } from "@/server/services/settings";
import { withTx } from "@/db";
import { runAction } from "./_run";

const SETTINGS_PATHS = [
  "/settings/company",
  "/settings/defaults",
  "/settings/numbering",
  "/settings/signing",
  "/settings/email",
];

function revalidateSettings(): void {
  for (const path of SETTINGS_PATHS) {
    revalidatePath(path);
  }
}

export async function updateCompanyAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "settings.write");
    const meta = await getRequestMeta();
    const current = getSettings("company");
    updateSettings(
      "company",
      {
        ...(raw as Record<string, unknown>),
        logoFileId: current.logoFileId,
        stampFileId: current.stampFileId,
      },
      user,
      meta,
    );
    revalidateSettings();
    return null;
  });
}

export async function updateDefaultsAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "settings.write");
    const meta = await getRequestMeta();
    const input = raw as Record<string, unknown>;
    const percent = Number(input.taxRatePercent);
    const normalized: Record<string, unknown> = { ...input };
    delete normalized.taxRatePercent;
    if (Number.isFinite(percent)) {
      normalized.taxRateBp = Math.round(percent * 100);
    }
    updateSettings("defaults", normalized, user, meta);
    revalidateSettings();
    return null;
  });
}

export async function updateNumberingAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "settings.write");
    const meta = await getRequestMeta();
    const input = raw as Record<string, unknown>;
    updateSettings(
      "numbering",
      { ...input, prefix: String(input.prefix ?? "").toUpperCase() },
      user,
      meta,
    );
    revalidateSettings();
    return null;
  });
}

export async function updateSigningAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "settings.write");
    const meta = await getRequestMeta();
    updateSettings("signing", raw, user, meta);
    revalidateSettings();
    return null;
  });
}

export async function updateEmailAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "settings.write");
    const meta = await getRequestMeta();
    updateSettings("email", raw, user, meta);
    revalidateSettings();
    return null;
  });
}

export async function sendTestEmailAction(): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "settings.write");
    withTx((tx) => {
      enqueueEmail(tx, {
        toEmail: user.email,
        toName: user.name,
        locale: user.locale,
        templateKey: "test_email",
        payload: { recipientName: user.name },
        entityType: "user",
        entityId: user.id,
      });
    });
    revalidateSettings();
    return null;
  });
}

async function uploadCompanyImage(
  formData: FormData,
  kind: "logo" | "stamp",
  field: "logoFileId" | "stampFileId",
): Promise<ActionResult<{ fileId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "settings.write");
    const meta = await getRequestMeta();
    const entry = formData.get("file");
    if (!(entry instanceof File)) {
      throw new AppError("FILE_REJECTED", "No file provided");
    }
    const buffer = Buffer.from(await entry.arrayBuffer());
    const saved = saveFile({
      kind,
      buffer,
      originalName: entry.name,
      ownerType: "setting",
      ownerId: "company",
      createdBy: user.id,
    });
    withTx((tx) => {
      audit(tx, {
        actorType: "user",
        actorId: user.id,
        action: "file.uploaded",
        entityType: "file",
        entityId: saved.id,
        meta: { kind },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    const current = getSettings("company");
    updateSettings("company", { ...current, [field]: saved.id }, user, meta);
    revalidateSettings();
    return { fileId: saved.id };
  });
}

export async function uploadLogoAction(
  formData: FormData,
): Promise<ActionResult<{ fileId: string }>> {
  return uploadCompanyImage(formData, "logo", "logoFileId");
}

export async function uploadStampAction(
  formData: FormData,
): Promise<ActionResult<{ fileId: string }>> {
  return uploadCompanyImage(formData, "stamp", "stampFileId");
}

async function deleteCompanyImage(
  field: "logoFileId" | "stampFileId",
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "settings.write");
    const meta = await getRequestMeta();
    const current = getSettings("company");
    updateSettings("company", { ...current, [field]: null }, user, meta);
    revalidateSettings();
    return null;
  });
}

export async function deleteLogoAction(): Promise<ActionResult<null>> {
  return deleteCompanyImage("logoFileId");
}

export async function deleteStampAction(): Promise<ActionResult<null>> {
  return deleteCompanyImage("stampFileId");
}
