import { describe, expect, it } from "vitest";
import {
  formatCode,
  generateCode,
  newId,
  newToken,
  normalizeCode,
} from "@/lib/ids";

describe("newId / newToken", () => {
  it("newId is a 16-char base64url id", () => {
    const id = newId();
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("newToken is a 43-char base64url token", () => {
    const token = newToken();
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates distinct values", () => {
    expect(newId()).not.toBe(newId());
    expect(newToken()).not.toBe(newToken());
  });
});

describe("verification codes", () => {
  it("generateCode returns 12 Crockford characters", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateCode()).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{12}$/);
    }
  });

  it("normalizeCode uppercases, strips separators and maps O/I/L", () => {
    expect(normalizeCode("abcd-ef0o-1ilL")).toBe("ABCDEF001111");
    expect(normalizeCode("  abcd efgh  ")).toBe("ABCDEFGH");
  });

  it("formatCode groups into XXXX-XXXX-XXXX", () => {
    expect(formatCode("ABCDEF001111")).toBe("ABCD-EF00-1111");
  });
});
