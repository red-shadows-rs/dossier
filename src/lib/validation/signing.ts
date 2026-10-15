import { z } from "zod";
import { SIGNATURE_METHODS } from "@/lib/constants";

const dataUrl = z
  .string()
  .max(300_000, "errors.tooLong")
  .refine((value) => /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value), {
    message: "errors.invalid",
  });

export const providerSignatureSchema = z.object({
  method: z.enum(SIGNATURE_METHODS),
  dataUrl: dataUrl.optional(),
  typedName: z.string().max(120, "errors.tooLong").optional(),
});

export const sendContractInputSchema = z.object({
  providerSignerUserId: z
    .string({ required_error: "errors.required" })
    .min(1, "errors.required"),
  providerName: z.string().min(1, "errors.required").max(200, "errors.tooLong"),
  providerTitle: z.string().max(200, "errors.tooLong").optional(),
  clientSignatoryName: z
    .string()
    .min(1, "errors.required")
    .max(200, "errors.tooLong"),
  clientSignatoryEmail: z
    .string()
    .min(1, "errors.required")
    .email("errors.invalidEmail"),
  clientSignatoryTitle: z.string().max(200, "errors.tooLong").optional(),
  signature: providerSignatureSchema.optional(),
  consent: z.boolean().default(false),
  consentText: z.string().min(1, "errors.required").max(2000),
});

export type SendContractInput = z.infer<typeof sendContractInputSchema>;

export const signAsProviderInputSchema = z.object({
  signature: providerSignatureSchema,
  consent: z.boolean().default(false),
  consentText: z.string().min(1, "errors.required").max(2000),
});

export type SignAsProviderInput = z.infer<typeof signAsProviderInputSchema>;

export const clientSignInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "errors.required")
    .max(200, "errors.tooLong"),
  signature: providerSignatureSchema,
  consent: z.boolean().default(false),
  consentText: z.string().min(1, "errors.required").max(2000),
});

export type ClientSignInput = z.infer<typeof clientSignInputSchema>;

export const otpCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "errors.invalid"),
});

export type OtpCodeInput = z.infer<typeof otpCodeSchema>;

export const declineInputSchema = z.object({
  reason: z.string().trim().max(500, "errors.tooLong").optional(),
});

export type DeclineInput = z.infer<typeof declineInputSchema>;

export function validateSignature(
  signature: z.infer<typeof providerSignatureSchema>,
): string | null {
  if (signature.method === "drawn" && !signature.dataUrl) {
    return "errors.required";
  }
  if (signature.method === "typed" && !signature.typedName) {
    return "errors.required";
  }
  return null;
}
