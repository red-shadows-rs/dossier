import { and, eq, ne } from "drizzle-orm";
import { db, withTx } from "@/db";
import { sessions, users } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import type { UpdateAccountInput } from "@/lib/validation/account";
import type { SessionUser, RequestMeta } from "@/server/auth/session";
import {
  assertPasswordPolicy,
  hashPassword,
  verifyPassword,
} from "@/server/auth/password";
import { audit } from "@/server/services/audit";

export function updateAccount(
  user: SessionUser,
  input: UpdateAccountInput,
  meta: RequestMeta,
): SessionUser {
  const now = nowMs();
  return withTx((tx) => {
    const signerTitleAr = user.canSignForCompany
      ? (input.signerTitleAr ?? null)
      : user.signerTitleAr;
    const signerTitleEn = user.canSignForCompany
      ? (input.signerTitleEn ?? null)
      : user.signerTitleEn;

    tx.update(users)
      .set({
        name: input.name,
        locale: input.locale,
        signerTitleAr,
        signerTitleEn,
        updatedAt: now,
      })
      .where(eq(users.id, user.id))
      .run();

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "user.updated",
      entityType: "user",
      entityId: user.id,
      meta: { changedKeys: ["name", "locale", "signerTitles"] },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      ...user,
      name: input.name,
      locale: input.locale,
      signerTitleAr,
      signerTitleEn,
    };
  });
}

export async function changePassword(
  user: SessionUser,
  currentPassword: string,
  newPassword: string,
  keepSessionId: string | null,
  meta: RequestMeta,
): Promise<void> {
  const record = db
    .select({ passwordHash: users.passwordHash, email: users.email })
    .from(users)
    .where(eq(users.id, user.id))
    .get();
  if (!record) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  const currentOk = await verifyPassword(record.passwordHash, currentPassword);
  if (!currentOk) {
    throw new AppError("VALIDATION_FAILED", "Current password is incorrect", {
      currentPassword: "errors.invalidCredentials",
    });
  }

  assertPasswordPolicy(newPassword, record.email);
  const passwordHash = await hashPassword(newPassword);
  const now = nowMs();

  withTx((tx) => {
    tx.update(users)
      .set({ passwordHash, updatedAt: now })
      .where(eq(users.id, user.id))
      .run();

    if (keepSessionId) {
      tx.delete(sessions)
        .where(
          and(eq(sessions.userId, user.id), ne(sessions.id, keepSessionId)),
        )
        .run();
    } else {
      tx.delete(sessions).where(eq(sessions.userId, user.id)).run();
    }

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "auth.password_changed",
      entityType: "user",
      entityId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}
