// Dossier - Files Action
// https://github.com/red-shadows-rs/dossier

"use server";

import { revalidatePath } from "next/cache";
import { withTx } from "@/db";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import type { ActionResult } from "@/lib/result";
import { requireUser } from "@/server/auth/require-user";
import { audit, getRequestMeta } from "@/server/services/audit";
import {
  deleteAttachment,
  getFileRow,
  saveFile,
} from "@/server/services/files";
import { runAction } from "./_run";

export async function uploadAttachmentAction(
  formData: FormData,
): Promise<ActionResult<{ fileId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "projects.write");
    const projectId = String(formData.get("projectId") ?? "");
    if (!projectId) {
      throw new AppError("VALIDATION_FAILED", "Missing project", {
        projectId: "errors.required",
      });
    }
    const entry = formData.get("file");
    if (!(entry instanceof File)) {
      throw new AppError("FILE_REJECTED", "No file provided");
    }
    const buffer = Buffer.from(await entry.arrayBuffer());
    const saved = saveFile({
      kind: "attachment",
      buffer,
      originalName: entry.name,
      ownerType: "project",
      ownerId: projectId,
      createdBy: user.id,
    });
    const meta = await getRequestMeta();
    withTx((tx) => {
      audit(tx, {
        actorType: "user",
        actorId: user.id,
        action: "file.uploaded",
        entityType: "file",
        entityId: saved.id,
        meta: { projectId },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    revalidatePath(`/projects/${projectId}`);
    return { fileId: saved.id };
  });
}

export async function deleteAttachmentAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "projects.write");
    const data = raw as { id?: unknown; projectId?: unknown };
    const id = String(data.id ?? "");
    const projectId = String(data.projectId ?? "");
    const file = getFileRow(id);
    if (file && file.ownerType === "project" && file.ownerId !== projectId) {
      throw new AppError("FORBIDDEN", "This file belongs to another project");
    }
    deleteAttachment(id);
    const meta = await getRequestMeta();
    withTx((tx) => {
      audit(tx, {
        actorType: "user",
        actorId: user.id,
        action: "file.deleted",
        entityType: "file",
        entityId: id,
        meta: { projectId },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    if (projectId) revalidatePath(`/projects/${projectId}`);
    return null;
  });
}
