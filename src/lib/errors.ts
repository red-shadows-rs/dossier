// Dossier - Errors Library Utility
// https://github.com/red-shadows-rs/dossier

export const ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "CONFLICT",
  "INVALID_STATE",
  "RATE_LIMITED",
  "TOKEN_INVALID",
  "TOKEN_EXPIRED",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "PAYMENT_EXCEEDS_BALANCE",
  "PDF_FAILED",
  "EMAIL_FAILED",
  "FILE_REJECTED",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fieldErrors?: Record<string, string>,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
