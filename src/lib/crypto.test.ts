// Dossier - Crypto Library Tests
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import { hmacToken, safeEqualHex, sha256Hex } from "@/lib/crypto";

describe("crypto helpers", () => {
  it("hmacToken is deterministic and secret-dependent", () => {
    const a = hmacToken("token", "secret-1");
    const b = hmacToken("token", "secret-1");
    const c = hmacToken("token", "secret-2");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sha256Hex hashes strings and buffers equally", () => {
    expect(sha256Hex("abc")).toBe(sha256Hex(Buffer.from("abc")));
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("safeEqualHex compares without throwing on length mismatch", () => {
    expect(safeEqualHex("abcd", "abcd")).toBe(true);
    expect(safeEqualHex("abcd", "abce")).toBe(false);
    expect(safeEqualHex("abcd", "abcdef")).toBe(false);
  });
});
