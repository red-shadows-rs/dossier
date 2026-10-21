// Dossier - Subscriptions Library Utility
// https://github.com/red-shadows-rs/dossier

import { z } from "zod";
import {
  CURRENCIES,
  DISCOUNT_TYPES,
  INVOICE_LANG_MODES,
  MAX_MINOR,
  SUBSCRIPTION_FREQUENCIES,
  SUBSCRIPTION_STATUSES,
  type CurrencyCode,
} from "@/lib/constants";
import { isValidDateStr } from "@/lib/dates";

const currencyEnum = z.enum(
  Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]],
  { required_error: "errors.required", invalid_type_error: "errors.invalid" },
);

const optText = (max = 400) =>
  z
    .string()
    .trim()
    .max(max, "errors.tooLong")
    .nullable()
    .optional()
    .transform((value) => (value ? value : null));

const nullableOptText = (max = 4000) =>
  z
    .string()
    .max(max, "errors.tooLong")
    .nullable()
    .optional()
    .transform((value) => (value ? value : null))
    .default(null);

const dateStr = z
  .string({ required_error: "errors.required" })
  .trim()
  .refine((value) => isValidDateStr(value), "errors.invalid");

const nullableOptDate = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (value && value.trim() ? value.trim() : null))
  .refine((value) => value === null || isValidDateStr(value), "errors.invalid")
  .default(null);

export const subscriptionItemSchema = z.object({
  id: z.string().optional(),
  descriptionAr: z.string().trim().min(1, "errors.required").max(500, "errors.tooLong"),
  descriptionEn: optText(500),
  quantity: z.number().int().min(1, "errors.invalid").max(100000).default(1),
  unitPriceMinor: z.number().min(0, "errors.invalid").max(MAX_MINOR),
  taxRateBp: z.number().int().min(0).max(10000).default(1500),
});
export type SubscriptionItemInput = z.infer<typeof subscriptionItemSchema>;

export const createSubscriptionSchema = z.object({
  clientId: z.string({ required_error: "errors.required" }).min(1, "errors.required"),
  projectId: z.string().trim().optional().nullable().default(null),
  contractId: z.string().trim().optional().nullable().default(null),
  titleAr: z.string().trim().min(1, "errors.required").max(200, "errors.tooLong"),
  titleEn: optText(200),
  description: optText(1000),
  frequency: z.enum(SUBSCRIPTION_FREQUENCIES).default("monthly"),
  intervalCount: z.number().int().min(1).max(365).default(1),
  startDate: dateStr,
  nextRunDate: dateStr,
  endDate: nullableOptDate,
  languageMode: z.enum(INVOICE_LANG_MODES).default("ar"),
  currency: currencyEnum.default("SAR"),
  taxRateBp: z.number().int().min(0).max(10000).default(1500),
  discountType: z.enum(DISCOUNT_TYPES).default("none"),
  discountValue: z.number().int().min(0).max(MAX_MINOR).default(0),
  paymentTermsDays: z.number().int().min(0).max(365).default(14),
  bankAccountIds: z.array(z.string()).optional().default([]),
  autoIssueInvoice: z.boolean().default(true),
  autoSendEmail: z.boolean().default(true),
  notesAr: nullableOptText(),
  notesEn: nullableOptText(),
  items: z.array(subscriptionItemSchema).min(1, "errors.itemsRequired"),
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const updateSubscriptionSchema = z.object({
  clientId: z.string().min(1).optional(),
  projectId: z.string().trim().optional().nullable(),
  contractId: z.string().trim().optional().nullable(),
  titleAr: z.string().trim().min(1, "errors.required").max(200, "errors.tooLong"),
  titleEn: optText(200),
  description: optText(1000),
  frequency: z.enum(SUBSCRIPTION_FREQUENCIES),
  intervalCount: z.number().int().min(1).max(365).default(1),
  startDate: dateStr,
  nextRunDate: dateStr,
  endDate: nullableOptDate,
  languageMode: z.enum(INVOICE_LANG_MODES),
  currency: currencyEnum,
  taxRateBp: z.number().int().min(0).max(10000),
  discountType: z.enum(DISCOUNT_TYPES).default("none"),
  discountValue: z.number().int().min(0).max(MAX_MINOR).default(0),
  paymentTermsDays: z.number().int().min(0).max(365).default(14),
  bankAccountIds: z.array(z.string()).optional().default([]),
  autoIssueInvoice: z.boolean().default(true),
  autoSendEmail: z.boolean().default(true),
  notesAr: nullableOptText(),
  notesEn: nullableOptText(),
  items: z.array(subscriptionItemSchema).min(1, "errors.itemsRequired"),
});
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

export const updateSubscriptionStatusSchema = z.object({
  status: z.enum(SUBSCRIPTION_STATUSES),
});

