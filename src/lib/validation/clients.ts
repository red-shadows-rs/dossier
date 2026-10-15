import { z } from "zod";
import { CLIENT_TYPES, LOCALES } from "@/lib/constants";

const optText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, "errors.tooLong")
    .optional()
    .transform((value) => (value ? value : null));

const optEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .pipe(z.union([z.null(), z.string().email("errors.invalidEmail")]));

const optCountry = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value.toUpperCase() : null))
  .pipe(z.union([z.null(), z.string().regex(/^[A-Z]{2}$/, "errors.invalid")]));

export const clientInputSchema = z
  .object({
    type: z.enum(CLIENT_TYPES).default("company"),
    nameAr: optText(),
    nameEn: optText(),
    legalNameAr: optText(),
    legalNameEn: optText(),
    email: optEmail,
    phone: optText(40),
    country: optCountry,
    city: optText(100),
    addressAr: optText(400),
    addressEn: optText(400),
    taxNumber: optText(50),
    crNumber: optText(50),
    repNameAr: optText(),
    repNameEn: optText(),
    repTitleAr: optText(),
    repTitleEn: optText(),
    preferredLanguage: z.enum(LOCALES).default("ar"),
    notes: optText(2000),
  })
  .refine((data) => Boolean(data.nameAr || data.nameEn), {
    message: "errors.required",
    path: ["nameAr"],
  });

export const deleteClientSchema = z.object({
  id: z.string().min(1),
});

export type ClientInput = z.infer<typeof clientInputSchema>;
