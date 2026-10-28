// ─────────────────────────────────────────────
// Dossier - Vitest Unit & Integration Test Config
// https://github.com/red-shadows-rs/dossier
// ─────────────────────────────────────────────

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    pool: "forks",
    testTimeout: 15000,
    setupFiles: ["tests/setup-env.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", "tests/e2e/**"],
  },
});
