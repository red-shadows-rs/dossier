import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type EnvModule = typeof import("@/lib/env");

const MANAGED_KEYS = [
  "NODE_ENV",
  "PORT",
  "APP_URL",
  "APP_SECRET",
  "DATA_DIR",
  "DATABASE_PATH",
  "DEFAULT_LOCALE",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "BOOTSTRAP_OWNER_EMAIL",
  "BOOTSTRAP_OWNER_PASSWORD",
  "BOOTSTRAP_OWNER_NAME",
  "PDF_TIMEOUT_MS",
  "PDF_CONCURRENCY",
  "BACKUP_RETENTION_DAYS",
  "TZ",
] as const;

const saved: Record<string, string | undefined> = {};

function mutateEnv(key: string, value: string | undefined): void {
  const next: NodeJS.ProcessEnv = { ...process.env };
  if (value === undefined) {
    delete next[key];
  } else {
    next[key] = value;
  }
  process.env = next;
}

beforeEach(() => {
  for (const key of MANAGED_KEYS) {
    saved[key] = process.env[key];
    mutateEnv(key, undefined);
  }
  mutateEnv("NODE_ENV", "test");
});

afterEach(() => {
  for (const key of MANAGED_KEYS) {
    mutateEnv(key, saved[key]);
  }
});

async function loadEnv(): Promise<EnvModule> {
  vi.resetModules();
  return import("@/lib/env");
}

function setValidBase(): void {
  mutateEnv("APP_URL", "https://dossier.example.com");
  mutateEnv("APP_SECRET", "a".repeat(64));
}

describe("env", () => {
  it("throws when APP_URL is missing", async () => {
    mutateEnv("APP_SECRET", "a".repeat(64));
    await expect(loadEnv()).rejects.toThrow(/APP_URL/);
  });

  it("throws when APP_SECRET is shorter than 64 hex chars", async () => {
    setValidBase();
    mutateEnv("APP_SECRET", "short-secret");
    await expect(loadEnv()).rejects.toThrow(/APP_SECRET/);
  });

  it("throws when APP_SECRET is not hex", async () => {
    setValidBase();
    mutateEnv("APP_SECRET", "z".repeat(64));
    await expect(loadEnv()).rejects.toThrow(/APP_SECRET/);
  });

  it("loads with defaults on a minimal valid config", async () => {
    setValidBase();
    const { env } = await loadEnv();
    expect(env.APP_URL).toBe("https://dossier.example.com");
    expect(env.PORT).toBe(3000);
    expect(env.DEFAULT_LOCALE).toBe("ar");
    expect(env.DATA_DIR).toBe("./data");
    expect(env.DATABASE_PATH).toBe("data/dossier.sqlite");
    expect(env.PDF_TIMEOUT_MS).toBe(30000);
    expect(env.PDF_CONCURRENCY).toBe(2);
    expect(env.BACKUP_RETENTION_DAYS).toBe(30);
    expect(env.TZ).toBe("UTC");
  });

  it("respects explicit overrides", async () => {
    setValidBase();
    mutateEnv("PORT", "4000");
    mutateEnv("DATA_DIR", "/tmp/dossier-data");
    mutateEnv("DATABASE_PATH", "/tmp/custom.sqlite");
    mutateEnv("DEFAULT_LOCALE", "en");
    const { env } = await loadEnv();
    expect(env.PORT).toBe(4000);
    expect(env.DATABASE_PATH).toBe("/tmp/custom.sqlite");
    expect(env.DEFAULT_LOCALE).toBe("en");
  });

  it("rejects an APP_URL with a trailing slash", async () => {
    setValidBase();
    mutateEnv("APP_URL", "https://dossier.example.com/");
    await expect(loadEnv()).rejects.toThrow(/APP_URL/);
  });

  it("treats empty strings as unset", async () => {
    setValidBase();
    mutateEnv("PORT", "");
    mutateEnv("DEFAULT_LOCALE", "");
    const { env } = await loadEnv();
    expect(env.PORT).toBe(3000);
    expect(env.DEFAULT_LOCALE).toBe("ar");
  });

  it("requires SMTP configuration in production", async () => {
    setValidBase();
    mutateEnv("NODE_ENV", "production");
    await expect(loadEnv()).rejects.toThrow(/SMTP_HOST/);
    await expect(loadEnv()).rejects.toThrow(/SMTP_FROM/);
  });

  it("loads production config when SMTP variables are set", async () => {
    setValidBase();
    mutateEnv("NODE_ENV", "production");
    mutateEnv("SMTP_HOST", "smtp.example.com");
    mutateEnv("SMTP_PORT", "465");
    mutateEnv("SMTP_SECURE", "true");
    mutateEnv("SMTP_USER", "mailer");
    mutateEnv("SMTP_PASS", "mail-pass");
    mutateEnv("SMTP_FROM", "Dossier <no-reply@example.com>");
    const { env } = await loadEnv();
    expect(env.SMTP_PORT).toBe(465);
    expect(env.SMTP_SECURE).toBe(true);
  });

  it("rejects a short BOOTSTRAP_OWNER_PASSWORD", async () => {
    setValidBase();
    mutateEnv("BOOTSTRAP_OWNER_PASSWORD", "short");
    await expect(loadEnv()).rejects.toThrow(/BOOTSTRAP_OWNER_PASSWORD/);
  });

  it("accepts a valid BOOTSTRAP_OWNER_PASSWORD", async () => {
    setValidBase();
    mutateEnv("BOOTSTRAP_OWNER_EMAIL", "owner@example.com");
    mutateEnv("BOOTSTRAP_OWNER_PASSWORD", "long-enough-password");
    mutateEnv("BOOTSTRAP_OWNER_NAME", "Owner");
    const { env } = await loadEnv();
    expect(env.BOOTSTRAP_OWNER_EMAIL).toBe("owner@example.com");
  });
});
