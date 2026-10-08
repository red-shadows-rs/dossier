import { z } from "zod";

export const updateAccountSchema = z.object({
  name: z
    .string({ required_error: "errors.required" })
    .min(1, "errors.required")
    .max(200, "errors.tooLong"),
  locale: z.enum(["ar", "en"], { required_error: "errors.required" }),
  signerTitleAr: z.string().max(200, "errors.tooLong").optional(),
  signerTitleEn: z.string().max(200, "errors.tooLong").optional(),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: "errors.required" })
    .min(1, "errors.required"),
  newPassword: z
    .string({ required_error: "errors.required" })
    .min(12, "errors.tooShort")
    .max(128, "errors.tooLong"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
