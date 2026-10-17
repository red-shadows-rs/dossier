// Dossier - Users Tests
// https://github.com/red-shadows-rs/dossier

import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, withTx } from "@/db";
import { auditLog, sessions } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { verifyPassword } from "@/server/auth/password";
import {
  createSession,
  validateSession,
  type SessionUser,
} from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import {
  createUser,
  getUser,
  listUsers,
  setUserPassword,
  setUserStatus,
  updateUser,
} from "./users";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

function actor(id: string): SessionUser {
  return {
    id,
    email: "actor@example.com",
    name: "Actor",
    role: "owner",
    locale: "ar",
    canSignForCompany: true,
    signerTitleAr: null,
    signerTitleEn: null,
  };
}

async function asActor(role: "owner" | "member" = "member"): Promise<SessionUser> {
  const created = await createTestUser({ role });
  return actor(created.id);
}

function auditActions(): string[] {
  return db
    .select({ action: auditLog.action })
    .from(auditLog)
    .all()
    .map((row) => row.action);
}

describe("createUser", () => {
  it("creates a user with a hashed password and audits user.created", async () => {
    const admin = await asActor();
    const id = await createUser(
      admin,
      {
        email: "New.Person@Example.com",
        name: "New Person",
        role: "member",
        password: "a-very-long-password",
        canSignForCompany: true,
        locale: "en",
      },
      META,
    );

    const row = getUser(id);
    expect(row.email).toBe("new.person@example.com");
    expect(row.role).toBe("member");
    expect(row.canSignForCompany).toBe(true);
    expect(row.locale).toBe("en");
    expect(await verifyPassword(row.passwordHash, "a-very-long-password")).toBe(
      true,
    );
    expect(auditActions()).toContain("user.created");
  });

  it("rejects a duplicate email with CONFLICT", async () => {
    const admin = await asActor();
    const existing = await createTestUser({ email: "taken@example.com" });
    expect(existing.email).toBe("taken@example.com");

    await expect(
      createUser(
        admin,
        {
          email: "taken@example.com",
          name: "Other",
          role: "member",
          password: "a-very-long-password",
          canSignForCompany: false,
          locale: "ar",
        },
        META,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects a password that violates the policy", async () => {
    const admin = await asActor();
    await expect(
      createUser(
        admin,
        {
          email: "short@example.com",
          name: "Short",
          role: "member",
          password: "short",
          canSignForCompany: false,
          locale: "ar",
        },
        META,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("updateUser", () => {
  it("updates the role and the canSignForCompany toggle", async () => {
    const admin = await asActor();
    const target = await createTestUser({ role: "member" });

    updateUser(
      admin,
      target.id,
      { name: "Renamed", role: "viewer", canSignForCompany: true },
      META,
    );

    const row = getUser(target.id);
    expect(row.name).toBe("Renamed");
    expect(row.role).toBe("viewer");
    expect(row.canSignForCompany).toBe(true);
    expect(auditActions()).toContain("user.updated");
  });
});

describe("setUserStatus", () => {
  it("disabling a user ends their sessions immediately", async () => {
    const admin = await asActor();
    const target = await createTestUser({ role: "member" });
    const token = withTx((tx) => createSession(tx, target.id, META));
    expect(validateSession(token)?.id).toBe(target.id);

    setUserStatus(admin, target.id, "disabled", META);

    expect(validateSession(token)).toBeNull();
    const remaining = db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, target.id))
      .all();
    expect(remaining).toHaveLength(0);
    expect(getUser(target.id).status).toBe("disabled");
    expect(auditActions()).toContain("user.status_changed");
  });

  it("re-enabling a user does not restore the ended session", async () => {
    const admin = await asActor();
    const target = await createTestUser({ role: "member" });
    const token = withTx((tx) => createSession(tx, target.id, META));
    setUserStatus(admin, target.id, "disabled", META);
    setUserStatus(admin, target.id, "active", META);

    expect(getUser(target.id).status).toBe("active");
    expect(validateSession(token)).toBeNull();
  });
});

describe("setUserPassword", () => {
  it("sets a new password and deletes all sessions of that user", async () => {
    const admin = await asActor();
    const target = await createTestUser({ role: "member" });
    withTx((tx) => createSession(tx, target.id, META));
    withTx((tx) => createSession(tx, target.id, META));

    await setUserPassword(admin, target.id, "another-long-password", META);

    const row = getUser(target.id);
    expect(await verifyPassword(row.passwordHash, "another-long-password")).toBe(
      true,
    );
    const remaining = db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, target.id))
      .all();
    expect(remaining).toHaveLength(0);
    expect(auditActions()).toContain("user.password_reset");
  });
});

describe("last-owner guard", () => {
  let admin: SessionUser;
  let soleOwner: { id: string; name: string };

  beforeAll(async () => {
    admin = await asActor("member");
    soleOwner = await createTestUser({ role: "owner" });
  });

  it("cannot demote the last active owner", async () => {
    await expect(
      async () =>
        updateUser(
          admin,
          soleOwner.id,
          { name: soleOwner.name, role: "member", canSignForCompany: false },
          META,
        ),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    expect(getUser(soleOwner.id).role).toBe("owner");
  });

  it("cannot disable the last active owner", async () => {
    await expect(
      async () => setUserStatus(admin, soleOwner.id, "disabled", META),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    expect(getUser(soleOwner.id).status).toBe("active");
  });

  it("allows demoting an owner when another active owner exists", async () => {
    await createTestUser({ role: "owner" });

    updateUser(
      admin,
      soleOwner.id,
      { name: soleOwner.name, role: "member", canSignForCompany: false },
      META,
    );

    expect(getUser(soleOwner.id).role).toBe("member");
  });
});

describe("listUsers", () => {
  it("returns created users with role and status", async () => {
    const created = await createTestUser({ name: "Listed User" });
    const rows = listUsers();
    const found = rows.find((row) => row.id === created.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Listed User");
    expect(found?.status).toBe("active");
  });
});
