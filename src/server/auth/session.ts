import { and, eq, lt, ne } from "drizzle-orm";
import { withTx, type DbTx } from "@/db";
import { sessions, users } from "@/db/schema";
import { env } from "@/lib/env";
import { hmacToken } from "@/lib/crypto";
import { newToken } from "@/lib/ids";
import { nowMs } from "@/lib/dates";
import type { Locale, Role } from "@/lib/constants";

export const SESSION_COOKIE = "dossier_session";
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;
const RENEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export type RequestMeta = { ip: string | null; userAgent: string | null };

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: Locale;
  canSignForCompany: boolean;
  signerTitleAr: string | null;
  signerTitleEn: string | null;
};

export function sessionIdFromToken(rawToken: string): string {
  return hmacToken(rawToken, env.APP_SECRET);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export function createSession(
  tx: DbTx,
  userId: string,
  meta: RequestMeta,
): string {
  const token = newToken();
  const now = nowMs();
  tx.insert(sessions)
    .values({
      id: hmacToken(token, env.APP_SECRET),
      userId,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      lastSeenAt: now,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    .run();
  return token;
}

export function validateSession(rawToken: string): SessionUser | null {
  const id = hmacToken(rawToken, env.APP_SECRET);
  return withTx((tx) => {
    const row = tx
      .select({
        expiresAt: sessions.expiresAt,
        lastSeenAt: sessions.lastSeenAt,
        userId: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        locale: users.locale,
        status: users.status,
        canSignForCompany: users.canSignForCompany,
        signerTitleAr: users.signerTitleAr,
        signerTitleEn: users.signerTitleEn,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, id))
      .get();

    if (!row) return null;

    const now = nowMs();
    if (row.expiresAt <= now) {
      tx.delete(sessions).where(eq(sessions.id, id)).run();
      return null;
    }
    if (row.status !== "active") return null;

    if (now - row.lastSeenAt >= HOUR_MS) {
      const expiresAt =
        row.expiresAt - now < RENEW_THRESHOLD_MS
          ? now + SESSION_TTL_MS
          : row.expiresAt;
      tx.update(sessions)
        .set({ lastSeenAt: now, expiresAt })
        .where(eq(sessions.id, id))
        .run();
    }

    return {
      id: row.userId,
      email: row.email,
      name: row.name,
      role: row.role,
      locale: row.locale,
      canSignForCompany: row.canSignForCompany,
      signerTitleAr: row.signerTitleAr,
      signerTitleEn: row.signerTitleEn,
    };
  });
}

export function deleteSession(rawToken: string): void {
  const id = hmacToken(rawToken, env.APP_SECRET);
  withTx((tx) => {
    tx.delete(sessions).where(eq(sessions.id, id)).run();
  });
}

export function deleteOtherSessions(
  userId: string,
  keepSessionId: string,
): void {
  withTx((tx) => {
    tx.delete(sessions)
      .where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)))
      .run();
  });
}

export function deleteUserSessions(userId: string): void {
  withTx((tx) => {
    tx.delete(sessions).where(eq(sessions.userId, userId)).run();
  });
}

export function cleanupExpiredSessions(): void {
  withTx((tx) => {
    tx.delete(sessions).where(lt(sessions.expiresAt, nowMs())).run();
  });
}
