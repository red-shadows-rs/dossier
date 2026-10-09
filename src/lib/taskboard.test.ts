import { describe, expect, it } from "vitest";
import { resolveTaskboardUrl } from "./taskboard";

describe("resolveTaskboardUrl", () => {
  it("returns null for empty references", () => {
    expect(resolveTaskboardUrl(null)).toBeNull();
    expect(resolveTaskboardUrl(undefined)).toBeNull();
    expect(resolveTaskboardUrl("   ", "https://tasks.example.com")).toBeNull();
  });

  it("uses an absolute http(s) reference as-is", () => {
    expect(resolveTaskboardUrl("https://tasks.example.com/p/42")).toBe(
      "https://tasks.example.com/p/42",
    );
    expect(resolveTaskboardUrl("http://localhost:3000/p/42", "https://other")).toBe(
      "http://localhost:3000/p/42",
    );
  });

  it("joins a plain reference onto the base URL", () => {
    expect(resolveTaskboardUrl("42", "https://tasks.example.com")).toBe(
      "https://tasks.example.com/42",
    );
    expect(resolveTaskboardUrl("/42", "https://tasks.example.com/")).toBe(
      "https://tasks.example.com/42",
    );
  });

  it("returns null when there is no base and the reference is not a URL", () => {
    expect(resolveTaskboardUrl("42", null)).toBeNull();
    expect(resolveTaskboardUrl("42", "")).toBeNull();
  });

  it("rejects non-http(s) schemes", () => {
    expect(resolveTaskboardUrl("javascript:alert(1)", "https://x")).toBeNull();
    expect(resolveTaskboardUrl("data:text/html,x", "https://x")).toBeNull();
  });
});
