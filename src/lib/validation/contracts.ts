// Dossier - Contracts Library Utility
// https://github.com/red-shadows-rs/dossier

import { z } from "zod";
import {
  CURRENCIES,
  DISCOUNT_TYPES,
  LANG_MODES,
  MAX_MINOR,
  MILESTONE_MODES,
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

const optDate = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() ? value.trim() : null))
  .refine((value) => value === null || isValidDateStr(value), "errors.invalid");

const nullableOptText = (max = 400) =>
  z
    .string()
    .max(max, "errors.tooLong")
    .nullable()
    .optional()
    .transform((value) => (value ? value : null))
    .optional();

const nullableOptDate = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (value && value.trim() ? value.trim() : null))
  .refine((value) => value === null || isValidDateStr(value), "errors.invalid")
  .optional();

export const createContractSchema = z.object({
  projectId: z
    .string({ required_error: "errors.required" })
    .min(1, "errors.required"),
  templateId: z
    .string({ required_error: "errors.required" })
    .min(1, "errors.required"),
});
export type CreateContractInput = z.infer<typeof createContractSchema>;

export const updateBasicsSchema = z.object({
  languageMode: z.enum(LANG_MODES),
  titleAr: optText(200),
  titleEn: optText(200),
  scopeAr: optText(4000),
  scopeEn: optText(4000),
  startDate: optDate,
  endDate: optDate,
  paymentTermsDays: z.number().int().min(0).max(365).default(14),
  governingLawAr: optText(200),
  governingLawEn: optText(200),
  jurisdictionAr: optText(200),
  jurisdictionEn: optText(200),
  signingDeadline: optDate,
  internalNotes: optText(2000),
  hasFees: z.boolean().default(true),
  currency: currencyEnum,
  milestoneMode: z.enum(MILESTONE_MODES).default("percent"),
});
export type UpdateBasicsInput = z.infer<typeof updateBasicsSchema>;

export const contractItemSchema = z.object({
  descriptionAr: optText(400),
  descriptionEn: optText(400),
  qtyMilli: z.number().int().min(1).max(1_000_000_000),
  unitPriceMinor: z.number().min(0).max(MAX_MINOR),
});
export type ContractItemInput = z.infer<typeof contractItemSchema>;

export const saveItemsSchema = z.object({
  items: z.array(contractItemSchema).max(200),
  discount: z.object({
    type: z.enum(DISCOUNT_TYPES),
    value: z.number().int().min(0).max(MAX_MINOR),
  }),
  taxRateBp: z.number().int().min(0).max(10000),
});
export type SaveItemsInput = z.infer<typeof saveItemsSchema>;

export const milestoneRowSchema = z.object({
  titleAr: z.string().min(1, "errors.required").max(120, "errors.tooLong"),
  titleEn: z.string().min(1, "errors.required").max(120, "errors.tooLong"),
  percentBp: z.number().int().min(1).max(10000).nullable().optional(),
  amountMinor: z.number().int().min(1).max(MAX_MINOR).nullable().optional(),
  dueDate: nullableOptDate,
  triggerNoteAr: nullableOptText(200),
  triggerNoteEn: nullableOptText(200),
});
export type MilestoneRowInput = z.infer<typeof milestoneRowSchema>;

export const saveMilestonesSchema = z.object({
  mode: z.enum(MILESTONE_MODES),
  rows: z.array(milestoneRowSchema).max(24),
});
export type SaveMilestonesInput = z.infer<typeof saveMilestonesSchema>;

export const contractClauseSchema = z.object({
  key: z.string().max(60).nullable().optional(),
  titleAr: z.string().min(1, "errors.required").max(200, "errors.tooLong"),
  titleEn: z.string().min(1, "errors.required").max(200, "errors.tooLong"),
  bodyAr: z.string().min(1, "errors.required").max(20000, "errors.tooLong"),
  bodyEn: z.string().min(1, "errors.required").max(20000, "errors.tooLong"),
});
export type ContractClauseInput = z.infer<typeof contractClauseSchema>;

export const saveClausesSchema = z.object({
  clauses: z.array(contractClauseSchema).min(1).max(60),
});
export type SaveClausesInput = z.infer<typeof saveClausesSchema>;

export const sendContractSchema = z.object({
  providerSignerUserId: z.string().min(1, "errors.required"),
  clientSignatoryName: z.string().min(1, "errors.required").max(200),
  clientSignatoryEmail: z
    .string()
    .min(1, "errors.required")
    .email("errors.invalidEmail"),
  clientSignatoryTitle: z.string().max(200).optional(),
});
export type SendContractInput = z.infer<typeof sendContractSchema>;
