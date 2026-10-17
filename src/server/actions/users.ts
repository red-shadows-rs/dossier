// Dossier - Users Action
// https://github.com/red-shadows-rs/dossier

"use server";

import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/permissions";
import type { ActionResult } from "@/lib/result";
import {
  createUserSchema,
  setUserPasswordSchema,
  setUserStatusSchema,
  updateUserSchema,
} from "@/lib/validation/users";
import { requireUser } from "@/server/auth/require-user";
import { getRequestMeta } from "@/server/services/audit";
import {
  createUser,
  setUserPassword,
  setUserStatus,
  updateUser,
} from "@/server/services/users";
import { runAction } from "./_run";

export async function createUserAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "users.manage");
    const input = createUserSchema.parse(raw);
    const meta = await getRequestMeta();
    const id = await createUser(user, input, meta);
    revalidatePath("/users");
    return { id };
  });
}

export async function updateUserAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "users.manage");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = updateUserSchema.parse(raw);
    const meta = await getRequestMeta();
    updateUser(user, id, input, meta);
    revalidatePath("/users");
    revalidatePath(`/users/${id}`);
    return null;
  });
}

export async function setUserStatusAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "users.manage");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = setUserStatusSchema.parse(raw);
    const meta = await getRequestMeta();
    setUserStatus(user, id, input.status, meta);
    revalidatePath("/users");
    revalidatePath(`/users/${id}`);
    return null;
  });
}

export async function setUserPasswordAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "users.manage");
    const id = String((raw as { id?: unknown })?.id ?? "");
    const input = setUserPasswordSchema.parse(raw);
    const meta = await getRequestMeta();
    await setUserPassword(user, id, input.password, meta);
    revalidatePath(`/users/${id}`);
    return null;
  });
}
