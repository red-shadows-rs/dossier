"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import { parseMajorToMinor } from "@/lib/money";
import type { ActionResult } from "@/lib/result";
import { PROJECT_STATUSES, type CurrencyCode } from "@/lib/constants";
import { projectInputSchema } from "@/lib/validation/projects";
import { requireUser } from "@/server/auth/require-user";
import { getRequestMeta } from "@/server/services/audit";
import {
  archiveProject,
  createProject,
  setProjectStatus,
  unarchiveProject,
  updateProject,
} from "@/server/services/projects";
import { runAction } from "./_run";

function toInput(raw: unknown): unknown {
  const data = raw as Record<string, unknown>;
  const currency = data.currency as CurrencyCode;
  const budgetRaw = data.budget;
  let budgetMinor: number | null = null;
  if (typeof budgetRaw === "string" && budgetRaw.trim() !== "") {
    budgetMinor = parseMajorToMinor(budgetRaw, currency);
  }
  return { ...data, budgetMinor };
}

export async function createProjectAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; code: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "projects.write");
    const input = projectInputSchema.parse(toInput(raw));
    const meta = await getRequestMeta();
    const result = createProject(user, input, meta);
    revalidatePath("/projects");
    return result;
  });
}

export async function updateProjectAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "projects.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = projectInputSchema.parse(toInput(raw));
    const meta = await getRequestMeta();
    updateProject(user, id, input, meta);
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return null;
  });
}

export async function setProjectStatusAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "projects.write");
    const data = raw as { id?: unknown; status?: unknown };
    const id = String(data.id ?? "");
    const status = data.status;
    if (!(PROJECT_STATUSES as readonly string[]).includes(String(status))) {
      throw new AppError("VALIDATION_FAILED", "Invalid status", {
        status: "errors.invalid",
      });
    }
    const meta = await getRequestMeta();
    setProjectStatus(
      user,
      id,
      status as (typeof PROJECT_STATUSES)[number],
      meta,
    );
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return null;
  });
}

export async function archiveProjectAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "projects.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const meta = await getRequestMeta();
    archiveProject(user, id, meta);
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return null;
  });
}

export async function unarchiveProjectAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "projects.write");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const meta = await getRequestMeta();
    unarchiveProject(user, id, meta);
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return null;
  });
}
