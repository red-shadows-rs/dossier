// Dossier - Settings Library Utility
// https://github.com/red-shadows-rs/dossier

import { z } from "zod";
import {
  CURRENCIES,
  GENERAL_LANG_MODES,
  type CurrencyCode,
} from "@/lib/constants";

const text = (max = 200) =>
  z
    .string({ required_error: "errors.required" })
    .trim()
    .max(max, "errors.tooLong")
    .default("");

const optEmail = z
  .union([z.literal(""), z.string().trim().email("errors.invalidEmail")])
  .default("");

const currencyEnum = z.enum(
  Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]],
);

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const bankAccountSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  provider: z.string().default("other"),
  bankNameAr: text(),
  bankNameEn: text(),
  accountHolder: text(),
  iban: text(120),
  swift: text(50).default(""),
  currency: z.string().default("SAR"),
  isActive: z.boolean().default(true),
  isPrimary: z.boolean().default(false),
  username: text(100).optional(),
  paymentUrl: text(255).optional(),
  binanceUid: text(50).optional(),
  binancePayId: text(50).optional(),
  network: text(50).optional(),
});

export type BankAccount = z.infer<typeof bankAccountSchema>;

export const companySchema = z.object({
  nameAr: text(),
  nameEn: text(),
  legalNameAr: text(),
  legalNameEn: text(),
  crNumber: text(50),
  taxNumber: text(50),
  addressAr: text(400),
  addressEn: text(400),
  email: optEmail,
  phone: text(40),
  website: text(200),
  logoFileId: z.string().nullable().default(null),
  stampFileId: z.string().nullable().default(null),
  bank: z
    .object({
      bankNameAr: text(),
      bankNameEn: text(),
      accountHolder: text(),
      iban: text(40),
      swift: text(20),
    })
    .default({}),
  bankAccounts: z.array(bankAccountSchema).default([]),
});

export const defaultsSchema = z.object({
  country: z.string().length(2, "errors.invalid").default("SA"),
  timezone: z
    .string()
    .default("Asia/Riyadh")
    .refine(isValidTimeZone, "errors.invalid"),
  currency: currencyEnum.default("SAR"),
  taxRateBp: z.number().int().min(0).max(10000).default(1500),
  paymentTermsDays: z.number().int().min(0).max(365).default(14),
  languageMode: z
    .preprocess(
      (val) => (val === "bilingual" ? "ar" : val),
      z.enum(GENERAL_LANG_MODES),
    )
    .default("ar"),
  governingLawAr: text(200),
  governingLawEn: text(200),
  jurisdictionAr: text(200),
  jurisdictionEn: text(200),
});

export const numberingSchema = z.object({
  prefix: z
    .string()
    .regex(/^[A-Z0-9]{2,6}$/, "errors.invalid")
    .default("DOS"),
});

export const signingSchema = z.object({
  linkTtlDays: z.number().int().min(1).max(90).default(14),
  requireEmailOtp: z.boolean().default(true),
  requireProviderSignatureBeforeSend: z.boolean().default(true),
  consentTextEn: z
    .string()
    .max(600, "errors.tooLong")
    .default(
      "I have read this agreement and agree to be bound by its terms, and I consent to signing it electronically.",
    ),
  consentTextAr: z
    .string()
    .max(600, "errors.tooLong")
    .default(
      "أقر بأنني قرأت هذا العقد وأوافق على الالتزام بجميع بنوده، وأوافق على التوقيع عليه إلكترونيا.",
    ),
});

export const emailSchema = z.object({
  fromName: text(80).default("Dossier"),
  overdueRemindersEnabled: z.boolean().default(false),
  overdueReminderDays: z
    .array(z.number().int().min(1).max(365))
    .max(6)
    .default([1, 7, 14]),
});

export const workerHeartbeatSchema = z.object({ ts: z.number() });
export const workerStateSchema = z.object({
  lastReminderDate: z.string().nullable().default(null),
  lastBackupDate: z.string().nullable().default(null),
});

export const SETTINGS_SCHEMAS = {
  company: companySchema,
  defaults: defaultsSchema,
  numbering: numberingSchema,
  signing: signingSchema,
  email: emailSchema,
} as const;

export type SettingsSection = keyof typeof SETTINGS_SCHEMAS;
export type SettingsFor<S extends SettingsSection> = z.infer<
  (typeof SETTINGS_SCHEMAS)[S]
>;

export type CompanySettings = z.infer<typeof companySchema>;
