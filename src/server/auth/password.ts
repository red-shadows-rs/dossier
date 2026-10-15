import { hash, verify } from "@node-rs/argon2";
import { AppError } from "@/lib/errors";

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

let dummyHash: string | null = null;

async function getDummyHash(): Promise<string> {
  if (dummyHash === null) {
    dummyHash = await hashPassword("dossier-dummy-password");
  }
  return dummyHash;
}

export async function verifyPassword(
  storedHash: string | null,
  password: string,
): Promise<boolean> {
  const target = storedHash ?? (await getDummyHash());
  let matches = false;
  try {
    matches = await verify(target, password);
  } catch {
    matches = false;
  }
  return storedHash !== null && matches;
}

export function assertPasswordPolicy(password: string, email: string): void {
  const fieldErrors: Record<string, string> = {};
  if (password.length < 12) {
    fieldErrors.password = "errors.tooShort";
  } else if (password.length > 128) {
    fieldErrors.password = "errors.tooLong";
  }
  if (password.toLowerCase() === email.trim().toLowerCase()) {
    fieldErrors.password = "errors.invalid";
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Password policy violated",
      fieldErrors,
    );
  }
}
