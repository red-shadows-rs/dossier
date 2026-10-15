export const ROLES = ["owner", "member", "viewer"] as const;
export type Role = (typeof ROLES)[number];
export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const LANG_MODES = ["ar", "en", "bilingual"] as const;
export const GENERAL_LANG_MODES = ["ar", "en"] as const;
export type GeneralLangMode = (typeof GENERAL_LANG_MODES)[number];
export const INVOICE_LANG_MODES = ["ar", "en"] as const;
export type InvoiceLangMode = (typeof INVOICE_LANG_MODES)[number];
export const CLIENT_TYPES = ["company", "individual"] as const;
export const PROJECT_STATUSES = [
  "lead",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
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

export const AUDIT_ACTIONS = [
  "auth.login",
  "auth.login_failed",
  "auth.logout",
  "auth.password_changed",
  "user.created",
  "user.updated",
  "user.status_changed",
  "user.password_reset",
  "client.created",
  "client.updated",
  "client.archived",
  "project.created",
  "project.updated",
  "project.status_changed",
  "project.archived",
  "template.created",
  "template.updated",
  "template.duplicated",
  "template.archived",
  "contract.created",
  "contract.updated",
  "contract.sent",
  "contract.viewed",
  "contract.otp_sent",
  "contract.otp_verified",
  "contract.signed",
  "contract.declined",
  "contract.expired",
  "contract.recalled",
  "contract.cancelled",
  "contract.completed",
  "contract.terminated",
  "contract.link_regenerated",
  "contract.finalized",
  "contract.pdf_failed",
  "invoice.created",
  "invoice.updated",
  "invoice.issued",
  "invoice.sent",
  "invoice.voided",
  "invoice.payment_recorded",
  "invoice.payment_voided",
  "invoice.reminder_sent",
  "settings.updated",
  "file.uploaded",
  "file.deleted",
  "email.failed",
  "backup.completed",
  "backup.failed",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

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
