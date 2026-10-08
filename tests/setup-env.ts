import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env = {
  ...process.env,
  NODE_ENV: "test",
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",
  APP_SECRET: process.env.APP_SECRET ?? "a".repeat(64),
  DATA_DIR:
    process.env.DATA_DIR ?? mkdtempSync(join(tmpdir(), "dossier-test-")),
};
