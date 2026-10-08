// Dossier - Canonical Json Library Tests
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import { canonicalize } from "@/lib/canonical-json";
import { sha256Hex } from "@/lib/crypto";
import { AppError } from "@/lib/errors";

describe("canonicalize", () => {
  it("sorts object keys recursively without whitespace", () => {
    expect(canonicalize({ b: 1, a: { d: 2, c: 3 } })).toBe(
      '{"a":{"c":3,"d":2},"b":1}',
    );
  });

  it("produces the same output regardless of input key order", () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
  });

  it("omits undefined properties and keeps null", () => {
    expect(canonicalize({ a: undefined, b: null })).toBe('{"b":null}');
  });

  it("throws on non-integer numbers", () => {
    expect(() => canonicalize({ a: 1.5 })).toThrow(AppError);
    expect(() => canonicalize({ a: NaN })).toThrow(AppError);
  });

  it("normalizes strings to NFC", () => {
    const combining = "e\u0301";
    const precomposed = "\u00e9";
    expect(sha256Hex(canonicalize(combining))).toBe(
      sha256Hex(canonicalize(precomposed)),
    );
  });

  it("keeps array order", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  it("throws on unsupported top-level values", () => {
    expect(() => canonicalize(undefined)).toThrow(AppError);
    expect(() => canonicalize(() => 1)).toThrow(AppError);
  });
});
