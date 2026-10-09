import { and, count, desc, eq } from "drizzle-orm";
import { db, withTx, type DbTx } from "@/db";
import { sessions, users } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import type { Role } from "@/lib/constants";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "@/lib/validation/users";
import { assertPasswordPolicy, hashPassword } from "@/server/auth/password";
import type { RequestMeta, SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";

export type UserRow = typeof users.$inferSelect;

export type UserListRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "active" | "disabled";
  canSignForCompany: boolean;
  lastLoginAt: number | null;
  createdAt: number;
};

export function listUsers(): UserListRow[] {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      canSignForCompany: users.canSignForCompany,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt), desc(users.id))
    .all();
}

export function getUser(id: string): UserRow {
  const row = db.select().from(users).where(eq(users.id, id)).get();
  if (!row) {
    throw new AppError("NOT_FOUND", "User not found");
  }
  return row;
}

// 8 — the last active owner can never be demoted or disabled.
function isLastActiveOwner(tx: DbTx, userId: string): boolean {
  const target = tx.select().from(users).where(eq(users.id, userId)).get();
  if (!target || target.role !== "owner" || target.status !== "active") {
    return false;
  }
  const activeOwners =
    tx
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, "owner"), eq(users.status, "active")))
      .get()?.value ?? 0;
  return activeOwners <= 1;
}

export async function createUser(
  actor: SessionUser,
  input: CreateUserInput,
  meta: RequestMeta,
): Promise<string> {
  const email = input.email.trim().toLowerCase();
  assertPasswordPolicy(input.password, email);
  const existing = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (existing) {
    throw new AppError("CONFLICT", "A user with this email already exists", {
      email: "errors.emailInUse",
    });
  }

  const id = newId();
  const now = nowMs();
  const passwordHash = await hashPassword(input.password);
  withTx((tx) => {
    tx.insert(users)
      .values({
        id,
        email,
        name: input.name,
        passwordHash,
        role: input.role,
        status: "active",
        locale: input.locale,
        canSignForCompany: input.canSignForCompany,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    audit(tx, {
      actorType: "user",
      actorId: actor.id,
      action: "user.created",
      entityType: "user",
      entityId: id,
      meta: { role: input.role },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
  return id;
}

export function updateUser(
  actor: SessionUser,
  id: string,
  input: UpdateUserInput,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const existing = tx.select().from(users).where(eq(users.id, id)).get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "User not found");
    }
    if (input.role !== "owner" && isLastActiveOwner(tx, id)) {
      throw new AppError(
        "INVALID_STATE",
        "The last owner cannot be demoted",
      );
    }
    tx.update(users)
      .set({
        name: input.name,
        role: input.role,
        canSignForCompany: input.canSignForCompany,
        updatedAt: now,
      })
      .where(eq(users.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: actor.id,
      action: "user.updated",
      entityType: "user",
      entityId: id,
      meta: { role: input.role },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function setUserStatus(
  actor: SessionUser,
  id: string,
  status: "active" | "disabled",
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const existing = tx.select().from(users).where(eq(users.id, id)).get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "User not found");
    }
    if (status === "disabled" && isLastActiveOwner(tx, id)) {
      throw new AppError(
        "INVALID_STATE",
        "The last owner cannot be disabled",
      );
    }
    tx.update(users)
      .set({ status, updatedAt: now })
      .where(eq(users.id, id))
      .run();
    if (status === "disabled") {
      tx.delete(sessions).where(eq(sessions.userId, id)).run();
    }
    audit(tx, {
      actorType: "user",
      actorId: actor.id,
      action: "user.status_changed",
      entityType: "user",
      entityId: id,
      meta: { status },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export async function setUserPassword(
  actor: SessionUser,
  id: string,
  password: string,
  meta: RequestMeta,
): Promise<void> {
  const record = db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, id))
    .get();
  if (!record) {
    throw new AppError("NOT_FOUND", "User not found");
  }
  assertPasswordPolicy(password, record.email);
  const passwordHash = await hashPassword(password);
  const now = nowMs();
  withTx((tx) => {
    tx.update(users)
      .set({ passwordHash, updatedAt: now })
      .where(eq(users.id, id))
      .run();
    // Force a fresh sign-in everywhere for that user.
    tx.delete(sessions).where(eq(sessions.userId, id)).run();
    audit(tx, {
      actorType: "user",
      actorId: actor.id,
      action: "user.password_reset",
      entityType: "user",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}
