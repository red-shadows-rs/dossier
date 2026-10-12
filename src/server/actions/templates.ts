// Dossier - Templates Action
// https://github.com/red-shadows-rs/dossier

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCan } from "@/lib/permissions";
import type { ActionResult } from "@/lib/result";
import { templateInputSchema } from "@/lib/validation/template";
import { requireUser } from "@/server/auth/require-user";
import { getRequestMeta } from "@/server/services/audit";
import {
  archiveTemplate,
  createTemplate,
  duplicateTemplate,
  updateTemplate,
} from "@/server/services/templates";
import { renderTemplatePreviewHtml } from "@/server/templating/preview";
import { SAMPLE_SNAPSHOT } from "@/server/templating/sample-snapshot";
import { runAction } from "./_run";

export async function createTemplateAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "templates.write");
    const input = templateInputSchema.parse(raw);
    const meta = await getRequestMeta();
    const id = createTemplate(user, input, meta);
    revalidatePath("/templates");
    return { id };
  });
}

export async function updateTemplateAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "templates.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = templateInputSchema.parse(raw);
    const meta = await getRequestMeta();
    updateTemplate(user, id, input, meta);
    revalidatePath("/templates");
    revalidatePath(`/templates/${id}`);
    return null;
  });
}

export async function duplicateTemplateAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "templates.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const meta = await getRequestMeta();
    const newId = duplicateTemplate(user, id, meta);
    revalidatePath("/templates");
    return { id: newId };
  });
}

export async function archiveTemplateAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "templates.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const meta = await getRequestMeta();
    archiveTemplate(user, id, meta);
    revalidatePath("/templates");
    revalidatePath(`/templates/${id}`);
    return null;
  });
}

const templatePreviewInputSchema = z.object({
  clauses: z
    .array(
      z.object({
        key: z.string().nullable().optional(),
        titleAr: z.string().default(""),
        titleEn: z.string().default(""),
        bodyAr: z.string().default(""),
        bodyEn: z.string().default(""),
      }),
    )
    .default([]),
  lang: z.enum(["ar", "en"]).default("ar"),
  titleAr: z.string().optional(),
  titleEn: z.string().optional(),
  hasFees: z.boolean().optional(),
  paymentTermsDays: z.number().optional(),
});

export async function getTemplatePreviewHtmlAction(
  raw: unknown,
): Promise<ActionResult<{ html: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "templates.read");
    const input = templatePreviewInputSchema.parse(raw ?? {});
    const html = await renderTemplatePreviewHtml(
      input.clauses,
      input.lang,
      SAMPLE_SNAPSHOT,
      {
        templateTitleAr: input.titleAr,
        templateTitleEn: input.titleEn,
        hasFees: input.hasFees,
        paymentTermsDays: input.paymentTermsDays,
      },
    );
    return { html };
  });
}
