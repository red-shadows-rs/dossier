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
import { getFileRow, readFile } from "@/server/services/files";
import { getSettings } from "@/server/services/settings";
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
  if (invoice.sellerSnapshotJson) {
    return JSON.parse(invoice.sellerSnapshotJson) as SellerSnapshot;
  }
  const company = getSettings("company");
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
  };
}

function buyerSnapshotFor(invoice: InvoiceRow): BuyerSnapshot {
  if (invoice.buyerSnapshotJson) {
    return JSON.parse(invoice.buyerSnapshotJson) as BuyerSnapshot;
  }
  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId))
    .get();
  return {
    nameAr: client?.nameAr ?? null,
    nameEn: client?.nameEn ?? null,
    legalNameAr: client?.legalNameAr ?? null,
    legalNameEn: client?.legalNameEn ?? null,
    addressAr: client?.addressAr ?? null,
    addressEn: client?.addressEn ?? null,
    taxNumber: client?.taxNumber ?? null,
    crNumber: client?.crNumber ?? null,
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
  if (invoice.verificationCode && invoice.status !== "draft") {
    const url = verificationUrl(env.APP_URL, invoice.verificationCode);
    verification = {
      code: invoice.verificationCode,
      url,
      qrDataUri: await makeQrDataUri(url),
    };
  }

  const seller = sellerSnapshotFor(invoice);
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
        ? `${project.code} — ${project.nameAr ?? project.nameEn ?? ""}`
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
      paymentInstructionsAr: invoice.paymentInstructionsAr,
      paymentInstructionsEn: invoice.paymentInstructionsEn,
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
    verification,
  };
  return renderInvoiceHtml(input);
}

export type InvoicePdfSource = {
  html: string;
  filename: string;
  docNumber: string;
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
  };
}
