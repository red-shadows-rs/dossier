import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, redact } from "@/lib/logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("redact", () => {
  it("drops secret keys", () => {
    const out = redact({
      token: "raw-token",
      password: "pw",
      otp: "123456",
      signatureData: "data:image/png;base64,...",
      Authorization: "Bearer xyz",
      keep: "visible",
    });
    expect(out).toEqual({ keep: "visible" });
  });

  it("matches secret keys case-insensitively and as substrings", () => {
    expect(redact({ TOKEN: "x", accessTokens: "y", cookies: "z" })).toEqual({});
  });

  it("redacts nested objects and arrays", () => {
    const out = redact({
      meta: { token: "x", ok: 1 },
      items: [{ password: "y" }, { fine: 2 }],
    });
    expect(out).toEqual({ meta: { ok: 1 }, items: [{}, { fine: 2 }] });
  });

  it("leaves scalars untouched", () => {
    expect(redact("text")).toBe("text");
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
  });
});

describe("logger", () => {
  it("writes one JSON line to stdout with redacted fields", () => {
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    logger.info("boot", { token: "secret-token", n: 1 });
    const raw = spy.mock.calls[0][0] as string;
    const line = JSON.parse(raw) as Record<string, unknown>;
    expect(line.level).toBe("info");
    expect(line.event).toBe("boot");
    expect(line.n).toBe(1);
    expect(line.token).toBeUndefined();
    expect(typeof line.ts).toBe("number");
  });

  it("supports warn and error levels", () => {
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    logger.warn("slow", { ms: 1200 });
    logger.error("failure", { cause: "boom" });
    const first = JSON.parse(spy.mock.calls[0][0] as string) as Record<
      string,
      unknown
    >;
    const second = JSON.parse(spy.mock.calls[1][0] as string) as Record<
      string,
      unknown
    >;
    expect(first.level).toBe("warn");
    expect(second.level).toBe("error");
  });
});
