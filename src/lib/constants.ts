export const ROLES = ["owner", "member", "viewer"] as const;
export type Role = (typeof ROLES)[number];
export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const LANG_MODES = ["ar", "en"] as const;
export type LangMode = (typeof LANG_MODES)[number];
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

export const BANK_PROVIDERS = [
  {
    id: "alrajhi",
    nameAr: "مصرف الراجحي",
    nameEn: "Al Rajhi Bank",
    icon: "/assets/banks/alrajhi.svg",
    color: "#221AFB",
    type: "bank",
    identifierLabelAr: "رقم الآيبان (IBAN)",
    identifierLabelEn: "IBAN",
    placeholder: "SA0000000000000000000000",
  },
  {
    id: "snb",
    nameAr: "البنك الأهلي",
    nameEn: "SNB",
    icon: "/assets/banks/snb.svg",
    color: "#006C35",
    type: "bank",
    identifierLabelAr: "رقم الآيبان (IBAN)",
    identifierLabelEn: "IBAN",
    placeholder: "SA0000000000000000000000",
  },
  {
    id: "barq",
    nameAr: "محفظة برق",
    nameEn: "Barq",
    icon: "/assets/banks/barq.svg",
    color: "#000000",
    type: "wallet",
    identifierLabelAr: "رقم المحفظة / الآيبان",
    identifierLabelEn: "Wallet ID / IBAN",
    placeholder: "رقم المحفظة أو الآيبان",
  },
  {
    id: "stcpay",
    nameAr: "stc pay",
    nameEn: "stc pay",
    icon: "/assets/banks/stcpay.svg",
    color: "#4F008C",
    type: "wallet",
    identifierLabelAr: "رقم الجوال / الآيبان",
    identifierLabelEn: "Mobile / IBAN",
    placeholder: "05xxxxxxxx أو SA...",
  },
  {
    id: "paypal",
    nameAr: "بايبال",
    nameEn: "PayPal",
    icon: "/assets/banks/paypal.svg",
    color: "#003087",
    type: "gateway",
    identifierLabelAr: "بريد PayPal الإلكتروني",
    identifierLabelEn: "PayPal Email",
    placeholder: "billing@red-shadows-rs.com",
  },
  {
    id: "binance",
    nameAr: "باينانس",
    nameEn: "Binance",
    icon: "/assets/banks/binance.svg",
    color: "#F3BA2F",
    type: "crypto",
    identifierLabelAr: "Binance Pay ID / عنوان المحفظة (USDT)",
    identifierLabelEn: "Binance Pay ID / USDT Address",
    placeholder: "Pay ID أو عنوان المحفظة TRC20/BEP20",
  },
  {
    id: "other",
    nameAr: "حساب بنكي آخر",
    nameEn: "Other Bank",
    icon: null,
    color: "#64748B",
    type: "custom",
    identifierLabelAr: "رقم الحساب / الآيبان",
    identifierLabelEn: "Account / IBAN",
    placeholder: "رقم الحساب أو الآيبان",
  },
] as const;

export type BankProviderId = (typeof BANK_PROVIDERS)[number]["id"];

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
