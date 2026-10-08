import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, withTx } from "@/db";
import { sessions } from "@/db/schema";
import { env } from "@/lib/env";
import { hmacToken } from "@/lib/crypto";
import {
  cleanupExpiredSessions,
  createSession,
  deleteOtherSessions,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  sessionCookieOptions,
  validateSession,
} from "./session";
import { createTestUser } from "./test-utils";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

function newSession(userId: string): string {
  return withTx((tx) => createSession(tx, userId, META));
}

function findSession(token: string) {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.id, hmacToken(token, env.APP_SECRET)))
    .get();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("session", () => {
  it("creates a session and validates it", async () => {
    const user = await createTestUser();
    const token = newSession(user.id);
    const session = validateSession(token);
    expect(session?.id).toBe(user.id);
    expect(session?.email).toBe(user.email);
  });

  it("stores only the hmac of the token", async () => {
    const user = await createTestUser();
    const token = newSession(user.id);
    const row = findSession(token);
    expect(row).toBeDefined();
    expect(row?.id).not.toBe(token);
    expect(row?.id).toBe(hmacToken(token, env.APP_SECRET));
  });

  it("rejects and removes an expired session", async () => {
    const user = await createTestUser();
    const token = newSession(user.id);
    vi.setSystemTime(new Date(Date.now() + SESSION_TTL_MS + 1000));
    expect(validateSession(token)).toBeNull();
    expect(findSession(token)).toBeUndefined();
  });

  it("renews the expiry when under 7 days remain and last seen over an hour ago", async () => {
    const user = await createTestUser();
    const token = newSession(user.id);
    vi.setSystemTime(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000));
    expect(validateSession(token)).not.toBeNull();
    const row = findSession(token);
    expect(row?.expiresAt).toBeGreaterThan(
      Date.now() + 13 * 24 * 60 * 60 * 1000,
    );
  });

  it("does not update lastSeenAt within an hour", async () => {
    const user = await createTestUser();
    const token = newSession(user.id);
    const before = findSession(token);
    vi.setSystemTime(new Date(Date.now() + 30 * 60 * 1000));
    validateSession(token);
    const after = findSession(token);
    expect(after?.lastSeenAt).toBe(before?.lastSeenAt);
  });

  it("rejects sessions of disabled users", async () => {
    const user = await createTestUser({ status: "disabled" });
    const token = newSession(user.id);
    expect(validateSession(token)).toBeNull();
  });

  it("deleteSession invalidates the token", async () => {
    const user = await createTestUser();
    const token = newSession(user.id);
    deleteSession(token);
    expect(validateSession(token)).toBeNull();
  });

  it("deleteOtherSessions keeps only the given session", async () => {
    const user = await createTestUser();
    const keep = newSession(user.id);
    const other = newSession(user.id);
    deleteOtherSessions(user.id, hmacToken(keep, env.APP_SECRET));
    expect(validateSession(keep)).not.toBeNull();
    expect(validateSession(other)).toBeNull();
  });

  it("cleanupExpiredSessions removes expired rows", async () => {
    const user = await createTestUser();
    const token = newSession(user.id);
    vi.setSystemTime(new Date(Date.now() + SESSION_TTL_MS + 1000));
    cleanupExpiredSessions();
    expect(findSession(token)).toBeUndefined();
  });

  it("exposes the required cookie flags", () => {
    const options = sessionCookieOptions();
    expect(SESSION_COOKIE).toBe("dossier_session");
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(14 * 24 * 60 * 60);
    expect(options.secure).toBe(false);
  });
});
