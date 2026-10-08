import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { login } from "./login";
import { resetRateLimits } from "./rate-limit";
import { createTestUser } from "./test-utils";

const META = { ip: "9.9.9.9", userAgent: "vitest" };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T10:00:00Z"));
  resetRateLimits();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("login", () => {
  it("returns the same error for a wrong password and an unknown email", async () => {
    const user = await createTestUser();
    const wrong = await login(user.email, "wrong-password", META).catch(
      (error: unknown) => error,
    );
    const unknown = await login(
      "nobody@example.com",
      "whatever-password",
      META,
    ).catch((error: unknown) => error);

    expect(wrong).toBeInstanceOf(AppError);
    expect(unknown).toBeInstanceOf(AppError);
    expect((wrong as AppError).code).toBe("UNAUTHENTICATED");
    expect((unknown as AppError).code).toBe("UNAUTHENTICATED");
    expect((wrong as AppError).message).toBe((unknown as AppError).message);
  });

  it("blocks the 6th failure within 15 minutes", async () => {
    const user = await createTestUser();
    for (let i = 0; i < 5; i += 1) {
      await expect(login(user.email, "wrong-password", META)).rejects.toThrow(
        AppError,
      );
    }
    await expect(login(user.email, user.password, META)).rejects.toThrow(
      /RATE_LIMITED|Too many/,
    );
  });

  it("clears the email counter on a successful login", async () => {
    const user = await createTestUser();
    for (let i = 0; i < 4; i += 1) {
      await expect(login(user.email, "wrong-password", META)).rejects.toThrow(
        AppError,
      );
    }
    await expect(login(user.email, user.password, META)).resolves.toBeDefined();
    for (let i = 0; i < 4; i += 1) {
      await expect(login(user.email, "wrong-password", META)).rejects.toThrow(
        AppError,
      );
    }
    await expect(login(user.email, user.password, META)).resolves.toBeDefined();
  });

  it("rejects a disabled user", async () => {
    const user = await createTestUser({ status: "disabled" });
    await expect(login(user.email, user.password, META)).rejects.toThrow(
      /Invalid credentials/,
    );
  });

  it("creates a session and writes audit rows on success", async () => {
    const user = await createTestUser();
    const result = await login(user.email, user.password, META);
    expect(result.token).toHaveLength(43);
    expect(result.user.id).toBe(user.id);

    const logs = db.select().from(auditLog).all();
    expect(
      logs.some(
        (entry) => entry.action === "auth.login" && entry.actorId === user.id,
      ),
    ).toBe(true);
  });

  it("audits failed logins", async () => {
    const user = await createTestUser();
    await expect(login(user.email, "wrong-password", META)).rejects.toThrow(
      AppError,
    );
    const logs = db.select().from(auditLog).all();
    expect(
      logs.some(
        (entry) =>
          entry.action === "auth.login_failed" && entry.actorId === user.id,
      ),
    ).toBe(true);
  });
});
