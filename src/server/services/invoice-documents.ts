import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, contracts, projects } from "@/db/schema";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import {
  allowedDocLangs,
  defaultDocLang,
  isDocLang,
  type DocLang,
} from "@/lib/doc-lang";
import { todayInTz } from "@/lib/dates";
import { makeQrDataUri, verificationUrl } from "@/server/pdf/qr";
import { getFontCss } from "@/server/pdf/fonts";
import {
  renderInvoiceHtml,
  type BuyerSnapshot,
  type InvoiceHtmlInput,
  type SellerSnapshot,
} from "@/server/pdf/html/invoice";
import { renderReceiptHtml } from "@/server/pdf/html/receipt";
import { getFileRow, readFile } from "@/server/services/files";
import { getSettings, buildPaymentInstructions } from "@/server/services/settings";
import {
  getInvoiceDetail,
  isOverdue,
  type InvoiceRow,
} from "@/server/services/invoices";
import { listPayments } from "@/server/services/payments";

function imageByFileId(fileId: string | null): string | null {
  if (!fileId) return null;
  const row = getFileRow(fileId);
  if (!row) return null;
  try {
    const file = readFile(row.id);
    return `data:${file.mime};base64,${file.buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export function resolveInvoiceDocLang(
  invoice: InvoiceRow,
  requested: string | undefined,
): DocLang {
  const lang = requested ?? defaultDocLang(invoice.languageMode);
  const allowed = allowedDocLangs(invoice.languageMode);
  if (!isDocLang(lang) || !allowed.includes(lang)) {
    throw new AppError("VALIDATION_FAILED", "Language not allowed", {
      lang: "errors.invalid",
    });
  }
  return lang;
}

function sellerSnapshotFor(invoice: InvoiceRow): SellerSnapshot {
  const company = getSettings("company");
  if (invoice.sellerSnapshotJson) {
    const parsed = JSON.parse(invoice.sellerSnapshotJson) as SellerSnapshot;
    return {
      ...parsed,
      logoFileId: parsed.logoFileId ?? company.logoFileId,
      stampFileId: parsed.stampFileId ?? company.stampFileId,
    };
  }
  return {
    nameAr: company.nameAr,
    nameEn: company.nameEn,
    legalNameAr: company.legalNameAr,
    legalNameEn: company.legalNameEn,
    crNumber: company.crNumber,
    taxNumber: company.taxNumber,
    addressAr: company.addressAr,
    addressEn: company.addressEn,
    email: company.email,
    phone: company.phone,
    website: company.website,
    logoFileId: company.logoFileId,
    stampFileId: company.stampFileId,
  };
}

function buyerSnapshotFor(invoice: InvoiceRow): BuyerSnapshot {
  const client = invoice.clientId
    ? db
        .select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .get()
    : undefined;

  let snapshot: Partial<BuyerSnapshot> = {};
  if (invoice.buyerSnapshotJson) {
    try {
      snapshot = JSON.parse(invoice.buyerSnapshotJson) as BuyerSnapshot;
    } catch {
      snapshot = {};
    }
  }

  return {
    nameAr: client?.nameAr ?? snapshot.nameAr ?? null,
    nameEn: client?.nameEn ?? snapshot.nameEn ?? null,
    legalNameAr: client?.legalNameAr ?? snapshot.legalNameAr ?? null,
    legalNameEn: client?.legalNameEn ?? snapshot.legalNameEn ?? null,
    addressAr: client?.addressAr ?? snapshot.addressAr ?? null,
    addressEn: client?.addressEn ?? snapshot.addressEn ?? null,
    taxNumber: client?.taxNumber ?? snapshot.taxNumber ?? null,
    crNumber: client?.crNumber ?? snapshot.crNumber ?? null,
    email: client?.email ?? snapshot.email ?? null,
    phone: client?.phone ?? snapshot.phone ?? null,
  };
}

export function invoiceSafePdfFilename(
  invoice: Pick<InvoiceRow, "number">,
  lang: DocLang,
): string {
  const base = invoice.number ?? "draft";
  return `${base}-${lang}.pdf`.replace(/[^A-Za-z0-9._-]/g, "");
}

export async function buildInvoiceHtml(
  invoiceId: string,
  lang: DocLang,
): Promise<string> {
  const { invoice, lines } = getInvoiceDetail(invoiceId);
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, invoice.projectId))
    .get();
  const contract = invoice.contractId
    ? db
        .select()
        .from(contracts)
        .where(eq(contracts.id, invoice.contractId))
        .get()
    : undefined;

  const payments = listPayments(invoiceId);
  const today = todayInTz(getSettings("defaults").timezone);
  const overdue = isOverdue(invoice, today);

  let verification: InvoiceHtmlInput["verification"] = null;
  const verificationCode =
    invoice.verificationCode ?? invoice.number ?? (invoice.status === "draft" ? "DRAFT-PREVIEW" : null);
  if (verificationCode) {
    const url = verificationUrl(env.APP_URL, verificationCode);
    verification = {
      code: verificationCode,
      url,
      qrDataUri: await makeQrDataUri(url),
    };
  }

  const seller = sellerSnapshotFor(invoice);
  const company = getSettings("company");
  const fallbackInstructionsAr = buildPaymentInstructions(company, "ar");
  const fallbackInstructionsEn = buildPaymentInstructions(company, "en");

  const input: InvoiceHtmlInput = {
    invoice: {
      id: invoice.id,
      number: invoice.number,
      currency: invoice.currency,
      languageMode: invoice.languageMode,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      projectLabel: project
        ? `${project.code} — ${
            invoice.languageMode === "ar"
              ? (project.nameAr ?? project.nameEn ?? "")
              : invoice.languageMode === "en"
                ? (project.nameEn ?? project.nameAr ?? "")
                : (project.nameEn && project.nameAr && project.nameEn !== project.nameAr
                    ? `${project.nameEn} / ${project.nameAr}`
                    : (project.nameEn ?? project.nameAr ?? ""))
          }`
        : "—",
      contractNumber: contract?.number ?? null,
      subtotalMinor: invoice.subtotalMinor,
      discountMinor: invoice.discountMinor,
      netMinor: invoice.netMinor,
      taxRateBp: invoice.taxRateBp,
      taxMinor: invoice.taxMinor,
      totalMinor: invoice.totalMinor,
      paidMinor: invoice.paidMinor,
      notesAr: invoice.notesAr,
      notesEn: invoice.notesEn,
      paymentInstructionsAr:
        invoice.paymentInstructionsAr?.trim() || fallbackInstructionsAr || null,
      paymentInstructionsEn:
        invoice.paymentInstructionsEn?.trim() || fallbackInstructionsEn || null,
    },
    lines: lines.map((line) => ({
      position: line.position,
      descriptionAr: line.descriptionAr,
      descriptionEn: line.descriptionEn,
      qtyMilli: line.qtyMilli,
      unitPriceMinor: line.unitPriceMinor,
      lineTotalMinor: line.lineTotalMinor,
    })),
    seller,
    buyer: buyerSnapshotFor(invoice),
    payments: payments.map((payment) => ({
      paidOn: payment.paidOn,
      amountMinor: payment.amountMinor,
      method: payment.method,
      reference: payment.reference,
      voided: payment.voidedAt !== null,
    })),
    lang,
    isOverdue: overdue,
    fonts: getFontCss(),
    logoDataUri: imageByFileId(seller.logoFileId ?? null),
    stampDataUri: imageByFileId(seller.stampFileId ?? null),
    verification,
  };
  return renderInvoiceHtml(input);
}

export type InvoicePdfSource = {
  html: string;
  filename: string;
  docNumber: string;
  lang: DocLang;
};

export async function resolveInvoicePdf(
  invoiceId: string,
  requestedLang: string | undefined,
): Promise<InvoicePdfSource> {
  const invoice = getInvoiceDetail(invoiceId).invoice;
  const lang = resolveInvoiceDocLang(invoice, requestedLang);
  const html = await buildInvoiceHtml(invoiceId, lang);
  return {
    html,
    filename: invoiceSafePdfFilename(invoice, lang),
    docNumber: invoice.number ?? "DRAFT",
    lang,
  };
}

export function receiptSafePdfFilename(
  invoice: Pick<InvoiceRow, "number">,
  lang: DocLang,
): string {
  const base = invoice.number ? `receipt-${invoice.number}` : "draft-receipt";
  return `${base}-${lang}.pdf`.replace(/[^A-Za-z0-9._-]/g, "");
}

export async function buildReceiptHtml(
  invoiceId: string,
  lang: DocLang,
): Promise<string> {
  const { invoice, lines } = getInvoiceDetail(invoiceId);
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, invoice.projectId))
    .get();
  const contract = invoice.contractId
    ? db
        .select()
        .from(contracts)
        .where(eq(contracts.id, invoice.contractId))
        .get()
    : undefined;

  const payments = listPayments(invoiceId);
  const today = todayInTz(getSettings("defaults").timezone);
  const overdue = isOverdue(invoice, today);

  let verification: InvoiceHtmlInput["verification"] = null;
  const verificationCode =
    invoice.verificationCode ?? invoice.number ?? (invoice.status === "draft" ? "DRAFT-PREVIEW" : null);
  if (verificationCode) {
    const url = verificationUrl(env.APP_URL, verificationCode);
    verification = {
      code: verificationCode,
      url,
      qrDataUri: await makeQrDataUri(url),
    };
  }

  const seller = sellerSnapshotFor(invoice);
  const company = getSettings("company");
  const fallbackInstructionsAr = buildPaymentInstructions(company, "ar");
  const fallbackInstructionsEn = buildPaymentInstructions(company, "en");

  const input: InvoiceHtmlInput = {
    invoice: {
      id: invoice.id,
      number: invoice.number,
      currency: invoice.currency,
      languageMode: invoice.languageMode,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      projectLabel: project
        ? `${project.code} — ${
            invoice.languageMode === "ar"
              ? (project.nameAr ?? project.nameEn ?? "")
              : invoice.languageMode === "en"
                ? (project.nameEn ?? project.nameAr ?? "")
                : (project.nameEn && project.nameAr && project.nameEn !== project.nameAr
                    ? `${project.nameEn} / ${project.nameAr}`
                    : (project.nameEn ?? project.nameAr ?? ""))
          }`
        : "—",
      contractNumber: contract?.number ?? null,
      subtotalMinor: invoice.subtotalMinor,
      discountMinor: invoice.discountMinor,
      netMinor: invoice.netMinor,
      taxRateBp: invoice.taxRateBp,
      taxMinor: invoice.taxMinor,
      totalMinor: invoice.totalMinor,
      paidMinor: invoice.paidMinor,
      notesAr: invoice.notesAr,
      notesEn: invoice.notesEn,
      paymentInstructionsAr:
        invoice.paymentInstructionsAr?.trim() || fallbackInstructionsAr || null,
      paymentInstructionsEn:
        invoice.paymentInstructionsEn?.trim() || fallbackInstructionsEn || null,
    },
    lines: lines.map((line) => ({
      position: line.position,
      descriptionAr: line.descriptionAr,
      descriptionEn: line.descriptionEn,
      qtyMilli: line.qtyMilli,
      unitPriceMinor: line.unitPriceMinor,
      lineTotalMinor: line.lineTotalMinor,
    })),
    seller,
    buyer: buyerSnapshotFor(invoice),
    payments: payments.map((payment) => ({
      paidOn: payment.paidOn,
      amountMinor: payment.amountMinor,
      method: payment.method,
      reference: payment.reference,
      voided: payment.voidedAt !== null,
    })),
    lang,
    isOverdue: overdue,
    fonts: getFontCss(),
    logoDataUri: imageByFileId(seller.logoFileId ?? null),
    stampDataUri: imageByFileId(seller.stampFileId ?? null),
    verification,
  };
  return renderReceiptHtml(input);
}

export async function resolveReceiptPdf(
  invoiceId: string,
  requestedLang: string | undefined,
): Promise<InvoicePdfSource> {
  const invoice = getInvoiceDetail(invoiceId).invoice;
  const lang = resolveInvoiceDocLang(invoice, requestedLang);
  const html = await buildReceiptHtml(invoiceId, lang);
  return {
    html,
    filename: receiptSafePdfFilename(invoice, lang),
    docNumber: `REC-${invoice.number ?? "DRAFT"}`,
    lang,
  };
}
