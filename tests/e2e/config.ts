import { join } from "node:path";

// Shared e2e configuration. The Playwright webServer runs a production build
// against a throwaway DATA_DIR; tests read the same SQLite file to inspect the
// email outbox (no SMTP).

export const E2E_PORT = 3210;
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
export const E2E_DATA_DIR = join(process.cwd(), ".e2e-data");
export const E2E_DB_PATH = join(E2E_DATA_DIR, "dossier.sqlite");

// A fixed, clearly test-only secret (64 hex chars). Not a real credential.
export const E2E_APP_SECRET =
  "e2e0000000000000000000000000000000000000000000000000000000000000000";

export const OWNER_EMAIL = "owner@e2e.test";
export const OWNER_PASSWORD = "e2e-owner-password-123";
export const OWNER_NAME = "E2E Owner";

export const COMPANY_NAME_AR = "شركة الاختبار";
export const COMPANY_NAME_EN = "E2E Test Company";

export const E2E_ENV: Record<string, string> = {
  NODE_ENV: "production",
  // The standalone server binds to HOSTNAME (defaults to the OS hostname).
  HOSTNAME: "127.0.0.1",
  PORT: String(E2E_PORT),
  APP_URL: E2E_BASE_URL,
  APP_SECRET: E2E_APP_SECRET,
  DATA_DIR: E2E_DATA_DIR,
  DEFAULT_LOCALE: "en",
  SMTP_HOST: "localhost",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "e2e",
  SMTP_PASS: "e2e",
  SMTP_FROM: "Dossier <no-reply@e2e.test>",
  TZ: "UTC",
  BOOTSTRAP_OWNER_EMAIL: OWNER_EMAIL,
  BOOTSTRAP_OWNER_PASSWORD: OWNER_PASSWORD,
  BOOTSTRAP_OWNER_NAME: OWNER_NAME,
};
