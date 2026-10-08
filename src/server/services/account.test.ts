import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, withTx } from "@/db";
import { auditLog, sessions, users } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { verifyPassword } from "@/server/auth/password";
import { createSession, type SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import { changePassword, updateAccount } from "./account";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

function asSessionUser(user: {
  id: string;
  email: string;
  name: string;
  role: "owner" | "member" | "viewer";
  canSignForCompany?: boolean;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    locale: "ar",
    canSignForCompany: user.canSignForCompany ?? false,
    signerTitleAr: null,
    signerTitleEn: null,
  };
}

describe("updateAccount", () => {
  it("updates name and locale and audits the change", async () => {
    const created = await createTestUser();
    const session = asSessionUser(created);
    const updated = updateAccount(
      session,
      { name: "New Name", locale: "en" },
      META,
    );
    expect(updated.name).toBe("New Name");
    expect(updated.locale).toBe("en");

    const row = db.select().from(users).where(eq(users.id, created.id)).get();
    expect(row?.name).toBe("New Name");
    expect(row?.locale).toBe("en");

    const logs = db.select().from(auditLog).all();
    expect(logs.some((entry) => entry.action === "user.updated")).toBe(true);
  });

  it("sets signer titles only for company signers", async () => {
    const signer = await createTestUser();
    const signed = updateAccount(
      asSessionUser({ ...signer, canSignForCompany: true }),
      {
        name: signer.name,
        locale: "ar",
        signerTitleAr: "المدير",
        signerTitleEn: "Manager",
      },
      META,
    );
    expect(signed.signerTitleAr).toBe("المدير");

    const nonSigner = await createTestUser();
    const unchanged = updateAccount(
      asSessionUser({ ...nonSigner, canSignForCompany: false }),
      {
        name: nonSigner.name,
        locale: "ar",
        signerTitleAr: "x",
        signerTitleEn: "y",
      },
      META,
    );
    expect(unchanged.signerTitleAr).toBeNull();
    expect(unchanged.signerTitleEn).toBeNull();
  });
});

describe("changePassword", () => {
  it("rejects a wrong current password", async () => {
    const created = await createTestUser();
    await expect(
      changePassword(
        asSessionUser(created),
        "wrong-current",
        "a-new-long-password",
        null,
        META,
      ),
    ).rejects.toThrow(AppError);
  });

  it("changes the password, keeps the current session and deletes the others", async () => {
    const created = await createTestUser();
    const user = asSessionUser(created);
    const keep = withTx((tx) => createSession(tx, created.id, META));
    const other = withTx((tx) => createSession(tx, created.id, META));
    const keepId = (await import("@/lib/crypto")).hmacToken(
      keep,
      (await import("@/lib/env")).env.APP_SECRET,
    );

    await changePassword(
      user,
      created.password,
      "a-new-long-password",
      keepId,
      META,
    );

    const row = db.select().from(users).where(eq(users.id, created.id)).get();
    expect(row).toBeDefined();
    expect(
      await verifyPassword(row?.passwordHash ?? "", "a-new-long-password"),
    ).toBe(true);

    const remaining = db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, created.id))
      .all();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(keepId);
    expect(other).not.toBe(keep);

    const logs = db.select().from(auditLog).all();
    expect(logs.some((entry) => entry.action === "auth.password_changed")).toBe(
      true,
    );
  });

  it("rejects a new password that violates the policy", async () => {
    const created = await createTestUser();
    await expect(
      changePassword(
        asSessionUser(created),
        created.password,
        "short",
        null,
        META,
      ),
    ).rejects.toThrow(AppError);
  });
});
