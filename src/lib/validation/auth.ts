import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "errors.required")
    .email("errors.invalidEmail")
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, "errors.required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordPolicySchema = z
  .string()
  .min(12, "errors.tooShort")
  .max(128, "errors.tooLong");

export const createUserSchema = z.object({
  email: z
    .string()
    .min(1, "errors.required")
    .email("errors.invalidEmail")
    .transform((value) => value.trim().toLowerCase()),
  name: z.string().min(1, "errors.required").max(200, "errors.tooLong"),
  password: passwordPolicySchema,
  role: z.enum(["owner", "member", "viewer"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
