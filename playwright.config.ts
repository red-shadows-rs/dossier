import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_ENV } from "./tests/e2e/config";

// 16.2 — e2e runs against a production build with a throwaway DATA_DIR.
// The webServer prepares the DB, builds, then serves on E2E_PORT (3000 is used
// by another local project). No SMTP: tests read the outbox directly.
export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/prepare.ts", "**/config.ts"],
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run e2e:serve",
    url: `${E2E_BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: E2E_ENV,
  },
});
