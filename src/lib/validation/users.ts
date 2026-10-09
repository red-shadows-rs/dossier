import { z } from "zod";
import { LOCALES, ROLES } from "@/lib/constants";

export const USER_STATUSES = ["active", "disabled"] as const;

const name = z
  .string({ required_error: "errors.required" })
  .trim()
  .min(1, "errors.required")
  .max(200, "errors.tooLong");

const password = z
  .string({ required_error: "errors.required" })
  .min(12, "errors.tooShort")
  .max(128, "errors.tooLong");

export const createUserSchema = z.object({
  email: z
    .string({ required_error: "errors.required" })
    .trim()
    .min(1, "errors.required")
    .email("errors.invalidEmail")
    .transform((value) => value.toLowerCase()),
  name,
  role: z.enum(ROLES).default("member"),
  password,
  canSignForCompany: z.boolean().default(false),
  locale: z.enum(LOCALES).default("ar"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name,
  role: z.enum(ROLES),
  canSignForCompany: z.boolean().default(false),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const setUserStatusSchema = z.object({
  status: z.enum(USER_STATUSES),
});

export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;

export const setUserPasswordSchema = z.object({
  password,
});

export type SetUserPasswordInput = z.infer<typeof setUserPasswordSchema>;
