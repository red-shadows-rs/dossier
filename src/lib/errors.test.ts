import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/result";

describe("AppError", () => {
  it("carries code, message and field errors", () => {
    const error = new AppError("VALIDATION_FAILED", "bad input", {
      amount: "errors.required",
    });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.message).toBe("bad input");
    expect(error.fieldErrors).toEqual({ amount: "errors.required" });
  });

  it("supports an optional cause", () => {
    const cause = new Error("root");
    const error = new AppError("INTERNAL", "boom", undefined, cause);
    expect(error.cause).toBe(cause);
  });
});

describe("ActionResult", () => {
  it("narrows on ok", () => {
    const success: ActionResult<number> = { ok: true, data: 42 };
    const failure: ActionResult<number> = {
      ok: false,
      error: { code: "NOT_FOUND", message: "missing" },
    };
    expect(success.ok && success.data).toBe(42);
    expect(!failure.ok && failure.error.code).toBe("NOT_FOUND");
  });
});
