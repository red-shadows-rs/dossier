import { db } from "@/db";
import { users } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { newId } from "@/lib/ids";
import type { Role } from "@/lib/constants";
import { hashPassword } from "./password";

export type TestUser = {
  id: string;
  email: string;
  name: string;
  password: string;
  role: Role;
  status: "active" | "disabled";
};

export async function createTestUser(
  overrides: {
    email?: string;
    name?: string;
    password?: string;
    role?: Role;
    status?: "active" | "disabled";
  } = {},
): Promise<TestUser> {
  const email = (
    overrides.email ?? `user-${newId()}@example.com`
  ).toLowerCase();
  const password = overrides.password ?? "correct-horse-battery";
  const role = overrides.role ?? "member";
  const status = overrides.status ?? "active";
  const name = overrides.name ?? "Test User";
  const id = newId();
  const now = nowMs();

  db.insert(users)
    .values({
      id,
      email,
      name,
      passwordHash: await hashPassword(password),
      role,
      status,
      locale: "ar",
      canSignForCompany: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id, email, name, password, role, status };
}
