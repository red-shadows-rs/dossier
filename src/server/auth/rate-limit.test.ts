// Dossier - Rate Limit Tests
// https://github.com/red-shadows-rs/dossier

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import {
  assertNotRateLimited,
  clearEmailFailures,
  isRateLimited,
  recordFailure,
  resetRateLimits,
} from "./rate-limit";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T10:00:00Z"));
  resetRateLimits();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rate-limit", () => {
  it("blocks the 6th failure within 15 minutes", () => {
    for (let i = 0; i < 5; i += 1) {
      expect(isRateLimited("a@example.com", "1.1.1.1")).toBe(false);
      recordFailure("a@example.com", "1.1.1.1");
    }
    expect(isRateLimited("a@example.com", "1.1.1.1")).toBe(true);
    expect(() => assertNotRateLimited("a@example.com", "1.1.1.1")).toThrow(
      AppError,
    );
  });

  it("does not block a different email on the same ip until the ip limit", () => {
    for (let i = 0; i < 5; i += 1) {
      recordFailure("a@example.com", "1.1.1.1");
    }
    expect(isRateLimited("b@example.com", "1.1.1.1")).toBe(false);
  });

  it("blocks an ip after 30 failures", () => {
    for (let i = 0; i < 30; i += 1) {
      recordFailure(`u${i}@example.com`, "2.2.2.2");
    }
    expect(isRateLimited("fresh@example.com", "2.2.2.2")).toBe(true);
  });

  it("resets after the window elapses", () => {
    for (let i = 0; i < 5; i += 1) {
      recordFailure("a@example.com", "1.1.1.1");
    }
    expect(isRateLimited("a@example.com", "1.1.1.1")).toBe(true);
    vi.setSystemTime(new Date("2026-10-08T10:16:00Z"));
    expect(isRateLimited("a@example.com", "1.1.1.1")).toBe(false);
  });

  it("clearEmailFailures clears the email bucket", () => {
    for (let i = 0; i < 5; i += 1) {
      recordFailure("a@example.com", "1.1.1.1");
    }
    clearEmailFailures("a@example.com");
    expect(isRateLimited("a@example.com", "1.1.1.1")).toBe(false);
  });
});
