import { randomBytes, randomInt } from "node:crypto";

const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 12;

export const newId = (): string => randomBytes(12).toString("base64url");

export const newToken = (): string => randomBytes(32).toString("base64url");

export function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CROCKFORD_ALPHABET[randomInt(0, CROCKFORD_ALPHABET.length)];
  }
  return code;
}

export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

export function formatCode(code: string): string {
  const clean = code.toUpperCase().replace(/[\s-]/g, "");
  return clean.replace(/(.{4})(?=.)/g, "$1-");
}
