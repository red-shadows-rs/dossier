// Dossier - Create User Script
// https://github.com/red-shadows-rs/dossier

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { ROLES, type Role } from "@/lib/constants";
import { newId } from "@/lib/ids";
import { assertPasswordPolicy, hashPassword } from "@/server/auth/password";

async function main(): Promise<void> {
  const [emailArg, nameArg, passwordArg, roleArg] = process.argv.slice(2);
  if (!emailArg || !nameArg || !passwordArg) {
    console.error(
      "Usage: npm run user:create -- <email> <name> <password> [owner|member|viewer]",
    );
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const role: Role = (ROLES as readonly string[]).includes(roleArg ?? "")
    ? (roleArg as Role)
    : "member";

  assertPasswordPolicy(passwordArg, email);

  const existing = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (existing) {
    console.error(`A user with this email already exists: ${email}`);
    process.exit(1);
  }

  const now = nowMs();
  db.insert(users)
    .values({
      id: newId(),
      email,
      name: nameArg,
      passwordHash: await hashPassword(passwordArg),
      role,
      status: "active",
      locale: "ar",
      canSignForCompany: role === "owner",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  console.log(`Created ${role} account: ${email}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
