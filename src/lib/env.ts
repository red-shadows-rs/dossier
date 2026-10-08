// Dossier - Env Library Utility
// https://github.com/red-shadows-rs/dossier

import { join } from "node:path";
import { z } from "zod";

const emptyToUndefined = (value: unknown): unknown =>
  value === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const smtpSecure = z.preprocess(
  emptyToUndefined,
  z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(65535).default(3000),
    ),
    APP_URL: z
      .string()
      .min(1, "APP_URL is required")
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "APP_URL must start with http:// or https://",
      )
      .refine(
        (value) => !value.endsWith("/"),
        "APP_URL must not end with a trailing slash",
      ),
    APP_SECRET: z
      .string()
      .min(1, "APP_SECRET is required")
      .refine(
        (value) => /^[0-9a-f]{64,}$/i.test(value),
        "APP_SECRET must be at least 64 hex characters (generate with: openssl rand -hex 32)",
      ),
    DATA_DIR: z.preprocess(emptyToUndefined, z.string().default("./data")),
    DATABASE_PATH: optionalString,
    DEFAULT_LOCALE: z.preprocess(
      emptyToUndefined,
      z.enum(["ar", "en"]).default("ar"),
    ),
    SMTP_HOST: optionalString,
    SMTP_PORT: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(65535).optional(),
    ),
    SMTP_SECURE: smtpSecure,
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    SMTP_FROM: optionalString,
    BOOTSTRAP_OWNER_EMAIL: z.preprocess(
      emptyToUndefined,
      z.string().email().optional(),
    ),
    BOOTSTRAP_OWNER_PASSWORD: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .min(12, "BOOTSTRAP_OWNER_PASSWORD must be at least 12 characters")
        .optional(),
    ),
    BOOTSTRAP_OWNER_NAME: optionalString,
    PDF_TIMEOUT_MS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).default(30000),
    ),
    PDF_CONCURRENCY: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).default(2),
    ),
    BACKUP_RETENTION_DAYS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).default(30),
    ),
    TZ: z.preprocess(emptyToUndefined, z.string().default("UTC")),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") return;
    const required: Array<[string, unknown]> = [
      ["SMTP_HOST", data.SMTP_HOST],
      ["SMTP_PORT", data.SMTP_PORT],
      ["SMTP_SECURE", data.SMTP_SECURE],
      ["SMTP_USER", data.SMTP_USER],
      ["SMTP_PASS", data.SMTP_PASS],
      ["SMTP_FROM", data.SMTP_FROM],
    ];
    for (const [key, value] of required) {
      if (value === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required in production`,
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map(
    (issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
  throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
}

const data = parsed.data;

export type Env = Omit<typeof data, "DATABASE_PATH"> & {
  DATABASE_PATH: string;
};

export const env: Env = {
  ...data,
  DATABASE_PATH: data.DATABASE_PATH ?? join(data.DATA_DIR, "dossier.sqlite"),
};
