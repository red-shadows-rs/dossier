import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const hmacToken = (token: string, secret: string): string =>
  createHmac("sha256", secret).update(token).digest("hex");

export const sha256Hex = (data: string | Buffer): string =>
  createHash("sha256").update(data).digest("hex");

export const safeEqualHex = (a: string, b: string): boolean => {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
};
