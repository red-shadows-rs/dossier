export const ROLES = ["owner", "member", "viewer"] as const;
export const LOCALES = ["ar", "en"] as const;
export const LANG_MODES = ["ar", "en", "bilingual"] as const;
export const CLIENT_TYPES = ["company", "individual"] as const;
export const PROJECT_STATUSES = [
  "lead",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export const TEMPLATE_TYPES = ["contract", "nda", "other"] as const;
export const CONTRACT_STATUSES = [
  "draft",
  "sent",
  "declined",
  "expired",
  "signed",
  "completed",
  "terminated",
  "cancelled",
] as const;
export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "void",
] as const;
export const DISCOUNT_TYPES = ["none", "percent", "fixed"] as const;
export const MILESTONE_MODES = ["percent", "fixed"] as const;
export const PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "card",
  "cheque",
  "other",
] as const;
export const SIGNATORY_ROLES = ["provider", "client"] as const;
export const SIGNATORY_STATUSES = ["pending", "signed", "declined"] as const;
export const SIGNATURE_METHODS = ["drawn", "typed"] as const;
export const FILE_KINDS = [
  "logo",
  "stamp",
  "signature",
  "contract_pdf",
  "attachment",
] as const;
export const EMAIL_STATUSES = ["pending", "sending", "sent", "failed"] as const;
export const SEQ_KEYS = ["contract", "invoice", "project"] as const;

export const CURRENCIES = {
  SAR: 2,
  AED: 2,
  QAR: 2,
  EGP: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  JOD: 3,
} as const;
export type CurrencyCode = keyof typeof CURRENCIES;

export const MAX_MINOR = 10_000_000_000;
