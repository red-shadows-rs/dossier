// Dossier - Result Library Utility
// https://github.com/red-shadows-rs/dossier

import type { ErrorCode } from "@/lib/errors";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ErrorCode;
        message: string;
        fieldErrors?: Record<string, string>;
      };
    };
