// Dossier - Demo Server Actions
// https://github.com/red-shadows-rs/dossier

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { getCurrentUser } from "@/server/auth/require-user";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/session";
import { getRequestMeta } from "@/server/services/audit";
import { isDemoUser, loginAsDemo, resetDemoData } from "@/server/services/demo";
import { runAction } from "./_run";

export async function resetDemoAction(): Promise<ActionResult<null>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    if (!user || !isDemoUser(user.email)) {
      throw new AppError("FORBIDDEN", "Reset demo is only available in demo mode");
    }
    const meta = await getRequestMeta();
    resetDemoData(user, meta);
    revalidatePath("/");
    return null;
  });
}

export async function loginAsDemoAction(): Promise<ActionResult<null>> {
  return runAction(async () => {
    const meta = await getRequestMeta();
    const token = await loginAsDemo(meta);
    const store = await cookies();
    store.set(SESSION_COOKIE, token, sessionCookieOptions());
    return null;
  });
}

