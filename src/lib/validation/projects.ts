import { z } from "zod";
import {
  CURRENCIES,
  MAX_MINOR,
  PROJECT_STATUSES,
  type CurrencyCode,
} from "@/lib/constants";
import { isValidDateStr } from "@/lib/dates";

const optText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, "errors.tooLong")
    .optional()
    .transform((value) => (value ? value : null));

const optDate = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() ? value.trim() : null))
  .refine((value) => value === null || isValidDateStr(value), "errors.invalid");

const currencyEnum = z.enum(
  Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]],
  { required_error: "errors.required", invalid_type_error: "errors.invalid" },
);

export const projectInputSchema = z
  .object({
    clientId: z
      .string({ required_error: "errors.required" })
      .min(1, "errors.required"),
    nameAr: optText(),
    nameEn: optText(),
    description: optText(2000),
    status: z.enum(PROJECT_STATUSES).default("lead"),
    startDate: optDate,
    endDate: optDate,
    budgetMinor: z
      .number()
      .int()
      .min(0)
      .max(MAX_MINOR)
      .nullable()
      .default(null),
    currency: currencyEnum,
    notes: optText(2000),
  })
  .refine((data) => Boolean(data.nameAr || data.nameEn), {
    message: "errors.required",
    path: ["nameAr"],
  })
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    { message: "errors.invalid", path: ["endDate"] },
  );

export type ProjectInput = z.infer<typeof projectInputSchema>;
