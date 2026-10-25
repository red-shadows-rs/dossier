// Dossier - Constants Library Utility
// https://github.com/red-shadows-rs/dossier

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
export const SUBSCRIPTION_STATUSES = [
  "active",
  "paused",
  "canceled",
  "completed",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_FREQUENCIES = [
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "weekly",
  "custom",
] as const;
export type SubscriptionFrequency = (typeof SUBSCRIPTION_FREQUENCIES)[number];

export const DISCOUNT_TYPES = ["none", "percent", "fixed"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];
export const MILESTONE_MODES = ["percent", "fixed"] as const;
export const PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "card",
  "cheque",
  "binance",
  "paypal",
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
    accountHolderLabelAr: "اسم المستفيد لدى البنك",
    accountHolderLabelEn: "Beneficiary Name",
    accountHolderPlaceholderAr: "اسم المستفيد أو المنشأة لدى البنك",
    accountHolderPlaceholderEn: "Beneficiary or entity name with the bank",
    swiftPlaceholder: "RJHISARI",
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
    accountHolderLabelAr: "اسم المستفيد لدى البنك",
    accountHolderLabelEn: "Beneficiary Name",
    accountHolderPlaceholderAr: "اسم المستفيد أو المنشأة لدى البنك",
    accountHolderPlaceholderEn: "Beneficiary or entity name with the bank",
    swiftPlaceholder: "NCBKSARI",
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
    accountHolderLabelAr: "اسم صاحب المحفظة (اختياري)",
    accountHolderLabelEn: "Wallet Holder Name (Optional)",
    accountHolderPlaceholderAr: "الاسم المسجل في محفظة برق",
    accountHolderPlaceholderEn: "Registered wallet name",
    swiftPlaceholder: null,
  },
  {
    id: "stcpay",
    nameAr: "STC Pay",
    nameEn: "STC Pay",
    icon: "/assets/banks/stcpay.svg",
    color: "#4F008C",
    type: "wallet",
    identifierLabelAr: "رقم الجوال / الآيبان",
    identifierLabelEn: "Mobile / IBAN",
    placeholder: "05xxxxxxxx أو SA...",
    accountHolderLabelAr: "اسم صاحب المحفظة (اختياري)",
    accountHolderLabelEn: "Wallet Holder Name (Optional)",
    accountHolderPlaceholderAr: "الاسم المسجل في STC Pay",
    accountHolderPlaceholderEn: "Registered STC Pay name",
    swiftPlaceholder: null,
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
    accountHolderLabelAr: "اسم صاحب الحساب (اختياري)",
    accountHolderLabelEn: "Account Holder Name (Optional)",
    accountHolderPlaceholderAr: "الاسم المسجل في بايبال",
    accountHolderPlaceholderEn: "Name registered on PayPal",
    swiftPlaceholder: null,
  },
  {
    id: "binance",
    nameAr: "باينانس",
    nameEn: "Binance",
    icon: "/assets/banks/binance.svg",
    color: "#F3BA2F",
    type: "crypto",
    identifierLabelAr: "معرف باينانس (UID) / عنوان المحفظة",
    identifierLabelEn: "Binance UID / Wallet Address",
    placeholder: "UID أو عنوان المحفظة TRC20/BEP20",
    accountHolderLabelAr: "اسم الحساب أو اللقب التعريفي (اختياري)",
    accountHolderLabelEn: "Account Name / Nickname (Optional)",
    accountHolderPlaceholderAr: "اسم الحساب في باينانس أو المعرف",
    accountHolderPlaceholderEn: "Binance account name or handle",
    swiftPlaceholder: null,
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
    accountHolderLabelAr: "اسم المستفيد",
    accountHolderLabelEn: "Beneficiary Name",
    accountHolderPlaceholderAr: "اسم المستفيد أو المنشأة لدى البنك",
    accountHolderPlaceholderEn: "Beneficiary or entity name with the bank",
    swiftPlaceholder: "SWIFT / BIC",
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
export const SEQ_KEYS = ["contract", "invoice", "project", "subscription"] as const;

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
  "contract.duplicated",
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
  "invoice.duplicated",
  "invoice.issued",
  "invoice.sent",
  "invoice.voided",
  "invoice.payment_recorded",
  "invoice.payment_voided",
  "invoice.reminder_sent",
  "subscription.created",
  "subscription.updated",
  "subscription.duplicated",
  "subscription.paused",
  "subscription.resumed",
  "subscription.cancelled",
  "subscription.invoice_generated",
  "settings.updated",
  "file.uploaded",
  "file.deleted",
  "email.failed",
  "backup.completed",
  "backup.failed",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const SUPPORTED_CURRENCIES = [
  { code: "SAR", symbol: "ر.س", nameAr: "ريال سعودي", nameEn: "Saudi Riyal", decimals: 2 },
  { code: "USD", symbol: "$", nameAr: "دولار أمريكي", nameEn: "US Dollar", decimals: 2 },
  { code: "EUR", symbol: "€", nameAr: "يورو", nameEn: "Euro", decimals: 2 },
  { code: "USDT", symbol: "₮", nameAr: "تيثر", nameEn: "Tether (USDT)", decimals: 2 },
  { code: "AED", symbol: "د.إ", nameAr: "درهم إماراتي", nameEn: "UAE Dirham", decimals: 2 },
  { code: "QAR", symbol: "ر.ق", nameAr: "ريال قطري", nameEn: "Qatari Riyal", decimals: 2 },
  { code: "KWD", symbol: "د.ك", nameAr: "دينار كويتي", nameEn: "Kuwaiti Dinar", decimals: 3 },
  { code: "BHD", symbol: "د.ب", nameAr: "دينار بحريني", nameEn: "Bahraini Dinar", decimals: 3 },
  { code: "OMR", symbol: "ر.ع", nameAr: "ريال عماني", nameEn: "Omani Rial", decimals: 3 },
  { code: "JOD", symbol: "د.أ", nameAr: "دينار أردني", nameEn: "Jordanian Dinar", decimals: 3 },
  { code: "EGP", symbol: "ج.م", nameAr: "جنيه مصري", nameEn: "Egyptian Pound", decimals: 2 },
  { code: "GBP", symbol: "£", nameAr: "جنيه إسترليني", nameEn: "British Pound", decimals: 2 },
] as const;

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
  USDT: 2,
} as const;
export type CurrencyCode = keyof typeof CURRENCIES;

export const MAX_MINOR = 10_000_000_000;

export const CRYPTO_NETWORKS = [
  { id: "TRC20", name: "TRC20 (Tron)", note: "Fastest / Low fee" },
  { id: "BEP20", name: "BEP20 (BNB Smart Chain)", note: "Low fee" },
  { id: "ERC20", name: "ERC20 (Ethereum)", note: "High fee" },
  { id: "SOL", name: "SOL (Solana)", note: "Fast / Low fee" },
  { id: "POLYGON", name: "Polygon (MATIC)", note: "Low fee" },
  { id: "BTC", name: "BTC (Bitcoin Network)", note: "Standard" },
  { id: "TON", name: "TON (The Open Network)", note: "Low fee" },
  { id: "ARBITRUM", name: "Arbitrum One", note: "Low fee" },
] as const;

