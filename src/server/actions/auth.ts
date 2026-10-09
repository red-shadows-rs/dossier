// Dossier - Auth Action
// https://github.com/red-shadows-rs/dossier

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withTx } from "@/db";
import { loginSchema } from "@/lib/validation/auth";
import type { ActionResult } from "@/lib/result";
import { login } from "@/server/auth/login";
import { getCurrentUser } from "@/server/auth/require-user";
import {
  deleteSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/server/auth/session";
import { audit, getRequestMeta } from "@/server/services/audit";
import { runAction } from "./_run";

export async function loginAction(raw: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const input = loginSchema.parse(raw);
    const meta = await getRequestMeta();
    const { token } = await login(input.email, input.password, meta);
    const store = await cookies();
    store.set(SESSION_COOKIE, token, sessionCookieOptions());
    return null;
  });
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const user = await getCurrentUser();

  if (token) {
    deleteSession(token);
  }
  if (user) {
    const meta = await getRequestMeta();
    withTx((tx) => {
      audit(tx, {
        actorType: "user",
        actorId: user.id,
        action: "auth.logout",
        entityType: "user",
        entityId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
  }

  store.delete(SESSION_COOKIE);
  redirect("/login");
}
