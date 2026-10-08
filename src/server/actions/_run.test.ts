import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { runAction, zodToFieldErrors } from "./_run";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runAction", () => {
  it("wraps a successful result", async () => {
    await expect(runAction(() => 42)).resolves.toEqual({ ok: true, data: 42 });
  });

  it("awaits async functions", async () => {
    await expect(runAction(async () => "done")).resolves.toEqual({
      ok: true,
      data: "done",
    });
  });

  it("maps AppError to an error result", async () => {
    const result = await runAction(() => {
      throw new AppError("FORBIDDEN", "You do not have permission", {
        field: "errors.required",
      });
    });
    expect(result).toEqual({
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission",
        fieldErrors: { field: "errors.required" },
      },
    });
  });

  it("maps ZodError to VALIDATION_FAILED with i18n field errors", async () => {
    const schema = z.object({
      name: z
        .string({ required_error: "errors.required" })
        .min(1, "errors.required"),
      amount: z.number({
        required_error: "errors.required",
        invalid_type_error: "errors.invalid",
      }),
    });
    const result = await runAction(() => schema.parse({ amount: "x" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_FAILED");
      expect(result.error.fieldErrors?.name).toBe("errors.required");
      expect(result.error.fieldErrors?.amount).toBe("errors.invalid");
    }
  });

  it("maps unknown errors to INTERNAL without leaking details to the caller", async () => {
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const result = await runAction(() => {
      throw new Error("SECRET internal detail");
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: "Unexpected error" },
    });
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(spy).toHaveBeenCalled();
  });
});

describe("zodToFieldErrors", () => {
  it("maps dotted paths to the first issue message", () => {
    const schema = z.object({
      nested: z.object({
        value: z.string().min(1, "errors.required"),
      }),
    });
    const parsed = schema.safeParse({ nested: { value: "" } });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(zodToFieldErrors(parsed.error)).toEqual({
        "nested.value": "errors.required",
      });
    }
  });

  it("keeps the first message for a repeated path", () => {
    const schema = z.object({
      value: z.string().min(1, "errors.required").max(2, "errors.tooLong"),
    });
    const parsed = schema.safeParse({ value: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(zodToFieldErrors(parsed.error)).toEqual({
        value: "errors.required",
      });
    }
  });
});
