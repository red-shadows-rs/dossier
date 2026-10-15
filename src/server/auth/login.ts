import { eq } from "drizzle-orm";
import { db, withTx } from "@/db";
import { users } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { audit } from "@/server/services/audit";
import { verifyPassword } from "./password";
import { clearEmailFailures, isRateLimited, recordFailure } from "./rate-limit";
import { createSession, type RequestMeta, type SessionUser } from "./session";

export type LoginResult = { token: string; user: SessionUser };

export async function login(
  email: string,
  password: string,
  meta: RequestMeta,
): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();
  const ip = meta.ip ?? "unknown";

  if (isRateLimited(normalized, ip)) {
    throw new AppError("RATE_LIMITED", "Too many attempts");
  }

  const record = db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .get();

  const passwordOk = await verifyPassword(
    record?.passwordHash ?? null,
    password,
  );

  if (!record || !passwordOk || record.status !== "active") {
    recordFailure(normalized, ip);
    withTx((tx) => {
      audit(tx, {
        actorType: "user",
        actorId: record?.id ?? null,
        action: "auth.login_failed",
        entityType: "user",
        entityId: record?.id ?? normalized,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    throw new AppError("UNAUTHENTICATED", "Invalid credentials");
  }

  clearEmailFailures(normalized);

  const token = withTx((tx) => {
    const raw = createSession(tx, record.id, meta);
    audit(tx, {
      actorType: "user",
      actorId: record.id,
      action: "auth.login",
      entityType: "user",
      entityId: record.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return raw;
  });

  return {
    token,
    user: {
      id: record.id,
      email: record.email,
      name: record.name,
      role: record.role,
      locale: record.locale,
      canSignForCompany: record.canSignForCompany,
      signerTitleAr: record.signerTitleAr,
      signerTitleEn: record.signerTitleEn,
    },
  };
}
