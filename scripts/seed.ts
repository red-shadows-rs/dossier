// Dossier - Seed Script
// https://github.com/red-shadows-rs/dossier

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import {
  SETTINGS_SCHEMAS,
  type SettingsSection,
} from "@/lib/validation/settings";
import { assertPasswordPolicy, hashPassword } from "@/server/auth/password";
import { seedSystemTemplates } from "@/server/services/templates";

const SETTINGS_SECTIONS: SettingsSection[] = [
  "company",
  "defaults",
  "numbering",
  "signing",
  "email",
];

function seedDefaultSettings(): number {
  let inserted = 0;
  const now = nowMs();
  for (const section of SETTINGS_SECTIONS) {
    const existing = db
      .select({ key: settings.key })
      .from(settings)
      .where(eq(settings.key, section))
      .get();
    if (existing) continue;
    const value = SETTINGS_SCHEMAS[section].parse({});
    db.insert(settings)
      .values({
        key: section,
        valueJson: JSON.stringify(value),
        updatedAt: now,
      })
      .run();
    inserted += 1;
  }
  return inserted;
}

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
  const settingsInserted = seedDefaultSettings();
  console.log(`Default settings rows inserted: ${settingsInserted}`);

  try {
    db.run(sql`UPDATE contracts SET language_mode = 'ar' WHERE language_mode = 'bilingual' AND status = 'draft'`);
  } catch {}
  try {
    db.run(sql`UPDATE templates SET default_language_mode = 'ar' WHERE default_language_mode = 'bilingual'`);
  } catch {}

  const templateResult = seedSystemTemplates();
  console.log(
    `System templates — inserted: ${templateResult.inserted}, updated: ${templateResult.updated}, skipped: ${templateResult.skipped}`,
  );

  await seedBootstrapOwner();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
