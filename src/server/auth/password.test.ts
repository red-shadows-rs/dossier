import { describe, expect, it } from "vitest";
import { assertPasswordPolicy, hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hashes with argon2id and verifies", async () => {
    const hash = await hashPassword("correct-horse-battery");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "correct-horse-battery")).toBe(true);
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });

  it("fails for unknown users (dummy hash) without throwing", async () => {
    expect(await verifyPassword(null, "anything")).toBe(false);
  });

  it("enforces the password policy", () => {
    expect(() => assertPasswordPolicy("short", "a@example.com")).toThrow();
    expect(() =>
      assertPasswordPolicy("a".repeat(129), "a@example.com"),
    ).toThrow();
    expect(() =>
      assertPasswordPolicy("a@example.com", "a@example.com"),
    ).toThrow();
    expect(() =>
      assertPasswordPolicy("long-enough-password", "a@example.com"),
    ).not.toThrow();
  });
});
