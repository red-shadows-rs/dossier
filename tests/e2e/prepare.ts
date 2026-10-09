import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { E2E_DATA_DIR, E2E_ENV, COMPANY_NAME_AR, COMPANY_NAME_EN } from "./config";

// 16.2 setup — fresh temp DATA_DIR, migrations, seed (owner + settings +
// templates), then fill the company name so a contract passes send validation.
async function main(): Promise<void> {
  Object.assign(process.env, E2E_ENV);
  rmSync(E2E_DATA_DIR, { recursive: true, force: true });

  const tsx = join(process.cwd(), "node_modules", ".bin", "tsx");
  const run = (script: string): void => {
    execFileSync(tsx, [script], { stdio: "inherit", env: process.env });
  };
  run("src/db/migrate.ts");
  run("scripts/seed.ts");

  // Fill company + defaults that send validation requires (the template
  // clauses reference provider.email / contract.governing_law / jurisdiction).
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { updateSettings } = await import("@/server/services/settings");

  const owner = db.select().from(users).limit(1).get();
  if (!owner) throw new Error("prepare: no seeded owner found");

  const actor = {
    id: owner.id,
    email: owner.email,
    name: owner.name,
    role: owner.role,
    locale: owner.locale,
    canSignForCompany: owner.canSignForCompany,
    signerTitleAr: owner.signerTitleAr,
    signerTitleEn: owner.signerTitleEn,
  };
  const meta = { ip: null, userAgent: null };

  updateSettings(
    "company",
    {
      nameAr: COMPANY_NAME_AR,
      nameEn: COMPANY_NAME_EN,
      email: "billing@e2e.test",
      taxNumber: "300000000000003",
      crNumber: "1010000000",
      bank: {
        bankNameAr: "بنك الاختبار",
        bankNameEn: "E2E Bank",
        accountHolder: COMPANY_NAME_EN,
        iban: "SA0000000000000000000000",
        swift: "E2EBANK",
      },
    },
    actor,
    meta,
  );

  updateSettings(
    "defaults",
    {
      governingLawAr: "أنظمة المملكة العربية السعودية",
      governingLawEn: "the laws of the Kingdom of Saudi Arabia",
      jurisdictionAr: "محاكم الرياض",
      jurisdictionEn: "the courts of Riyadh",
    },
    actor,
    meta,
  );

  console.log("e2e: database prepared at", E2E_DATA_DIR);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
