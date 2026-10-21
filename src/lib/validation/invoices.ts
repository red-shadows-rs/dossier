// Dossier - Invoices Library Utility
// https://github.com/red-shadows-rs/dossier

import { z } from "zod";
import {
  CURRENCIES,
  DISCOUNT_TYPES,
  INVOICE_LANG_MODES,
  MAX_MINOR,
  PAYMENT_METHODS,
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

const nullableOptDate = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (value && value.trim() ? value.trim() : null))
  .refine((value) => value === null || isValidDateStr(value), "errors.invalid")
  .default(null);

export const createInvoiceSchema = z.object({
  projectId: z
    .string({ required_error: "errors.required" })
    .min(1, "errors.required"),
  contractId: z.string().min(1).nullable().optional(),
  currency: currencyEnum.optional(),
  languageMode: z.enum(INVOICE_LANG_MODES).default("ar"),
  issueDate: nullableOptDate.optional(),
  dueDate: nullableOptDate.optional(),
  notesAr: nullableOptText(),
  notesEn: nullableOptText(),
  bankAccountIds: z.array(z.string()).optional(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceDraftSchema = z.object({
  languageMode: z.enum(INVOICE_LANG_MODES),
  currency: currencyEnum.optional(),
  issueDate: nullableOptDate,
  dueDate: nullableOptDate,
  notesAr: nullableOptText(),
  notesEn: nullableOptText(),
  bankAccountIds: z.array(z.string()).optional(),
});
export type UpdateInvoiceDraftInput = z.infer<typeof updateInvoiceDraftSchema>;

export const invoiceLineSchema = z.object({
  descriptionAr: optText(400),
  descriptionEn: optText(400),
  qtyMilli: z.number().int().min(1).max(1_000_000_000),
  unitPriceMinor: z.number().min(0).max(MAX_MINOR),
});
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

export const saveInvoiceLinesSchema = z.object({
  lines: z.array(invoiceLineSchema).max(200),
  discount: z.object({
    type: z.enum(DISCOUNT_TYPES),
    value: z.number().int().min(0).max(MAX_MINOR),
  }),
  taxRateBp: z.number().int().min(0).max(10000),
});
export type SaveInvoiceLinesInput = z.infer<typeof saveInvoiceLinesSchema>;

export const voidInvoiceSchema = z.object({
  reason: z.string().min(1, "errors.required").max(500, "errors.tooLong"),
});

export const recordPaymentSchema = z.object({
  amountMinor: z
    .number({
      required_error: "errors.required",
      invalid_type_error: "errors.invalid",
    })
    .int()
    .min(1, "errors.invalid")
    .max(MAX_MINOR),
  paidOn: z
    .string({ required_error: "errors.required" })
    .refine((value) => isValidDateStr(value), "errors.invalid"),
  method: z.enum(PAYMENT_METHODS),
  reference: optText(200),
  notes: optText(1000),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const voidPaymentSchema = z.object({
  reason: z.string().min(1, "errors.required").max(500, "errors.tooLong"),
});

export { currencyEnum };
