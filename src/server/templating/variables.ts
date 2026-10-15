import { formatDateLong } from "@/lib/dates";
import type { Locale } from "@/lib/constants";
import type { CurrencyCode } from "@/lib/constants";
import { formatMoney } from "@/lib/money";

export type ContractSnapshotV1 = {
  schema: "dossier.contract.v1";
  contract: {
    id: string;
    number: string | null;
    versionNo: number;
    languageMode: "ar" | "en" | "bilingual";
    hasFees: boolean;
    issueDate: string; 
    titleAr: string | null;
    titleEn: string | null;
    scopeAr: string | null;
    scopeEn: string | null;
    currency: string;
    startDate: string | null;
    endDate: string | null;
    paymentTermsDays: number;
    governingLawAr: string | null;
    governingLawEn: string | null;
    jurisdictionAr: string | null;
    jurisdictionEn: string | null;
    signingDeadline: string | null;
    milestoneMode: "percent" | "fixed";
  };
  provider: {
    nameAr: string | null;
    nameEn: string | null;
    legalNameAr: string | null;
    legalNameEn: string | null;
    crNumber: string | null;
    taxNumber: string | null;
    addressAr: string | null;
    addressEn: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    logoSha256: string | null;
    stampSha256: string | null;
  };
  client: {
    id: string;
    type: "company" | "individual";
    nameAr: string | null;
    nameEn: string | null;
    legalNameAr: string | null;
    legalNameEn: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    city: string | null;
    addressAr: string | null;
    addressEn: string | null;
    taxNumber: string | null;
    crNumber: string | null;
    repNameAr: string | null;
    repNameEn: string | null;
    repTitleAr: string | null;
    repTitleEn: string | null;
  };
  project: {
    id: string;
    code: string;
    nameAr: string | null;
    nameEn: string | null;
    description: string | null;
  };
  items: {
    position: number;
    descriptionAr: string | null;
    descriptionEn: string | null;
    qtyMilli: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }[];
  totals: {
    subtotalMinor: number;
    discountType: "none" | "percent" | "fixed";
    discountValue: number;
    discountMinor: number;
    netMinor: number;
    taxRateBp: number;
    taxMinor: number;
    totalMinor: number;
  };
  milestones: {
    position: number;
    titleAr: string;
    titleEn: string;
    percentBp: number | null;
    amountMinor: number;
    taxMinor: number;
    totalMinor: number;
    dueDate: string | null;
    triggerNoteAr: string | null;
    triggerNoteEn: string | null;
  }[];
  clauses: {
    position: number;
    key: string | null;
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
  }[];
  signatories: {
    role: "provider" | "client";
    name: string;
    title: string | null;
    email: string | null;
  }[];
};

export const ALLOWED_VARIABLES = [
  "provider.name",
  "provider.legal_name",
  "provider.cr_number",
  "provider.tax_number",
  "provider.address",
  "provider.email",
  "provider.phone",
  "provider.website",
  "provider.signatory_name",
  "provider.signatory_title",
  "client.name",
  "client.legal_name",
  "client.cr_number",
  "client.tax_number",
  "client.address",
  "client.country",
  "client.email",
  "client.phone",
  "client.rep_name",
  "client.rep_title",
  "project.name",
  "project.code",
  "project.description",
  "contract.number",
  "contract.title",
  "contract.scope",
  "contract.date",
  "contract.start_date",
  "contract.end_date",
  "contract.currency",
  "contract.subtotal",
  "contract.discount",
  "contract.net",
  "contract.tax",
  "contract.total",
  "contract.tax_rate",
  "contract.payment_terms_days",
  "contract.governing_law",
  "contract.jurisdiction",
  "contract.version",
] as const;

export type VariableName = (typeof ALLOWED_VARIABLES)[number];

const ALLOWED_SET = new Set<string>(ALLOWED_VARIABLES);

export function isAllowedVariable(name: string): name is VariableName {
  return ALLOWED_SET.has(name);
}

export const FEE_VARIABLES: readonly VariableName[] = [
  "contract.subtotal",
  "contract.discount",
  "contract.net",
  "contract.tax",
  "contract.tax_rate",
  "contract.total",
];

function formatTaxRate(bp: number): string {
  const percent = (bp / 100).toFixed(2).replace(/\.?0+$/, "");
  return `${percent}%`;
}

function buildProvider(
  snapshot: ContractSnapshotV1,
  lang: Locale,
): Record<string, string> {
  const p = snapshot.provider;
  const pick = (ar: string | null, en: string | null): string =>
    (lang === "ar" ? ar : en) ?? "";
  const signatory = snapshot.signatories.find((s) => s.role === "provider");
  return {
    "provider.name": pick(p.nameAr, p.nameEn),
    "provider.legal_name":
      pick(p.legalNameAr, p.legalNameEn) || pick(p.nameAr, p.nameEn),
    "provider.cr_number": p.crNumber ?? "",
    "provider.tax_number": p.taxNumber ?? "",
    "provider.address": pick(p.addressAr, p.addressEn),
    "provider.email": p.email ?? "",
    "provider.phone": p.phone ?? "",
    "provider.website": p.website ?? "",
    "provider.signatory_name": signatory?.name ?? "",
    "provider.signatory_title": signatory?.title ?? "",
  };
}

function buildClient(
  snapshot: ContractSnapshotV1,
  lang: Locale,
): Record<string, string> {
  const c = snapshot.client;
  const pick = (ar: string | null, en: string | null): string =>
    (lang === "ar" ? ar : en) ?? "";
  return {
    "client.name": pick(c.nameAr, c.nameEn),
    "client.legal_name":
      pick(c.legalNameAr, c.legalNameEn) || pick(c.nameAr, c.nameEn),
    "client.cr_number": c.crNumber ?? "",
    "client.tax_number": c.taxNumber ?? "",
    "client.address": pick(c.addressAr, c.addressEn),
    "client.country": c.country ?? "",
    "client.email": c.email ?? "",
    "client.phone": c.phone ?? "",
    "client.rep_name": pick(c.repNameAr, c.repNameEn),
    "client.rep_title": pick(c.repTitleAr, c.repTitleEn),
  };
}

function buildContract(
  snapshot: ContractSnapshotV1,
  lang: Locale,
): Record<string, string> {
  const c = snapshot.contract;
  const totals = snapshot.totals;
  const currency = c.currency as CurrencyCode;
  const pick = (ar: string | null, en: string | null): string =>
    (lang === "ar" ? ar : en) ?? "";
  const date = (value: string | null): string =>
    value ? formatDateLong(value, lang) : "";
  return {
    "contract.number": c.number ?? "",
    "contract.title": pick(c.titleAr, c.titleEn),
    "contract.scope": pick(c.scopeAr, c.scopeEn),
    "contract.date": date(c.issueDate),
    "contract.start_date": date(c.startDate),
    "contract.end_date": date(c.endDate),
    "contract.currency": c.currency,
    "contract.subtotal": formatMoney(totals.subtotalMinor, currency, lang),
    "contract.discount": formatMoney(totals.discountMinor, currency, lang),
    "contract.net": formatMoney(totals.netMinor, currency, lang),
    "contract.tax": formatMoney(totals.taxMinor, currency, lang),
    "contract.total": formatMoney(totals.totalMinor, currency, lang),
    "contract.tax_rate": formatTaxRate(totals.taxRateBp),
    "contract.payment_terms_days": String(c.paymentTermsDays),
    "contract.governing_law": pick(c.governingLawAr, c.governingLawEn),
    "contract.jurisdiction": pick(c.jurisdictionAr, c.jurisdictionEn),
    "contract.version": String(c.versionNo),
  };
}

export function buildVariableMap(
  snapshot: ContractSnapshotV1,
  lang: Locale,
): Record<string, string> {
  const p = snapshot.project;
  const project: Record<string, string> = {
    "project.name": (lang === "ar" ? p.nameAr : p.nameEn) ?? "",
    "project.code": p.code,
    "project.description": p.description ?? "",
  };
  return {
    ...buildProvider(snapshot, lang),
    ...buildClient(snapshot, lang),
    ...project,
    ...buildContract(snapshot, lang),
  };
}
