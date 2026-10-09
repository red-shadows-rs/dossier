// Dossier - Auth Library Utility
// https://github.com/red-shadows-rs/dossier

import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ required_error: "errors.required" })
    .min(1, "errors.required")
    .email("errors.invalidEmail")
    .transform((value) => value.trim().toLowerCase()),
  password: z
    .string({ required_error: "errors.required" })
    .min(1, "errors.required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordPolicySchema = z
  .string({ required_error: "errors.required" })
  .min(12, "errors.tooShort")
  .max(128, "errors.tooLong");

export const createUserSchema = z.object({
  email: z
    .string({ required_error: "errors.required" })
    .min(1, "errors.required")
    .email("errors.invalidEmail")
    .transform((value) => value.trim().toLowerCase()),
  name: z
    .string({ required_error: "errors.required" })
    .min(1, "errors.required")
    .max(200, "errors.tooLong"),
  password: passwordPolicySchema,
  role: z.enum(["owner", "member", "viewer"], {
    required_error: "errors.required",
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
