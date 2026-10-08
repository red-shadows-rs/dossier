"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/result";
import {
  changePasswordSchema,
  updateAccountSchema,
} from "@/lib/validation/account";
import { requireUser } from "@/server/auth/require-user";
import { SESSION_COOKIE, sessionIdFromToken } from "@/server/auth/session";
import { getRequestMeta } from "@/server/services/audit";
import { changePassword, updateAccount } from "@/server/services/account";
import { runAction } from "./_run";

export async function updateAccountAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    const input = updateAccountSchema.parse(raw);
    const meta = await getRequestMeta();
    updateAccount(user, input, meta);
    const store = await cookies();
    store.set(LOCALE_COOKIE, input.locale, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
    revalidatePath("/", "layout");
    return null;
  });
}

export async function changePasswordAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await requireUser();
    const input = changePasswordSchema.parse(raw);
    const meta = await getRequestMeta();
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    const keepSessionId = token ? sessionIdFromToken(token) : null;
    await changePassword(
      user,
      input.currentPassword,
      input.newPassword,
      keepSessionId,
      meta,
    );
    return null;
  });
}
