// Dossier - Run Action
// https://github.com/red-shadows-rs/dossier

import { cookies } from "next/headers";
import { ZodError } from "zod";
import { setDbMode, withDbInstance } from "@/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/lib/result";
import { DEMO_COOKIE, isDemoToken, SESSION_COOKIE } from "@/server/auth/session";

export function zodToFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function safeErr(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: "Unknown" };
}

export async function runAction<T>(
  fn: () => Promise<T> | T,
): Promise<ActionResult<T>> {
  let isDemo = false;
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    isDemo = isDemoToken(token) || store.get(DEMO_COOKIE)?.value === "1";
    setDbMode(isDemo ? "demo" : "main");
  } catch {
    isDemo = false;
  }

  return withDbInstance(isDemo, async () => {
    try {
      return { ok: true, data: await fn() };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
            fieldErrors: error.fieldErrors,
          },
        };
      }
      if (error instanceof ZodError) {
        return {
          ok: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Invalid input",
            fieldErrors: zodToFieldErrors(error),
          },
        };
      }
      logger.error("action_failed", { err: safeErr(error) });
      return {
        ok: false,
        error: { code: "INTERNAL", message: "Unexpected error" },
      };
    }
  });
}
