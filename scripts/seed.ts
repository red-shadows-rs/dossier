import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import { assertPasswordPolicy, hashPassword } from "@/server/auth/password";

async function seedBootstrapOwner(): Promise<void> {
  const count = db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .get();
  if ((count?.c ?? 0) > 0) {
    console.log("Users already exist; skipping bootstrap owner.");
    return;
  }

  const email = env.BOOTSTRAP_OWNER_EMAIL;
  const password = env.BOOTSTRAP_OWNER_PASSWORD;
  const name = env.BOOTSTRAP_OWNER_NAME;
  if (!email || !password || !name) {
    console.log(
      "No users and BOOTSTRAP_OWNER_EMAIL/PASSWORD/NAME not set; nothing to do.",
    );
    return;
  }

  assertPasswordPolicy(password, email);

  const now = nowMs();
  db.insert(users)
    .values({
      id: newId(),
      email: email.trim().toLowerCase(),
      name,
      passwordHash: await hashPassword(password),
      role: "owner",
      status: "active",
      locale: env.DEFAULT_LOCALE,
      canSignForCompany: true,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  console.log(`Created bootstrap owner: ${email}`);
}

async function main(): Promise<void> {
  await seedBootstrapOwner();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
