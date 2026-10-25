// Dossier - Invoices Service
// https://github.com/red-shadows-rs/dossier

import {
  and,
  asc,
  count,
  desc,
  eq,
  isNull,
  ne,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";
import { db, withTx, type DbTx } from "@/db";
import {
  clients,
  contracts,
  invoiceLines,
  invoices,
  paymentMilestones,
  payments,
  projects,
} from "@/db/schema";
import { nowMs, todayInTz } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { generateCode, newId } from "@/lib/ids";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode, INVOICE_STATUSES, Locale } from "@/lib/constants";
import type {
  CreateInvoiceInput,
  SaveInvoiceLinesInput,
  UpdateInvoiceDraftInput,
} from "@/lib/validation/invoices";
import type { RequestMeta, SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import { enqueueEmail } from "@/server/services/email";
import {
  buildPaymentInstructions,
  getSettings,
} from "@/server/services/settings";
import { allocateNumber, formatDocNumber } from "@/server/services/numbering";
import { calcTotals, type CalcInput } from "./contract-calc";

export const INVOICES_PAGE_SIZE = 20;

export type InvoiceRow = typeof invoices.$inferSelect;
export type InvoiceLineRow = typeof invoiceLines.$inferSelect;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type InvoiceSort =
  | "createdAt"
  | "updatedAt"
  | "number"
  | "status"
  | "totalMinor"
  | "dueDate"
  | "issueDate";

export const INVOICE_SORT_FIELDS: readonly InvoiceSort[] = [
  "createdAt",
  "updatedAt",
  "number",
  "status",
  "totalMinor",
  "dueDate",
  "issueDate",
];

const SORT_COLUMNS: Record<InvoiceSort, AnyColumn> = {
  createdAt: invoices.createdAt,
  updatedAt: invoices.updatedAt,
  number: invoices.number,
  status: invoices.status,
  totalMinor: invoices.totalMinor,
  dueDate: invoices.dueDate,
  issueDate: invoices.issueDate,
};

export type InvoiceFilters = {
  q?: string;
  status?: InvoiceStatus;
  projectId?: string;
  clientId?: string;
  contractId?: string;
  overdue?: boolean;
  sort?: string;
  dir?: string;
  page?: number;
};

export type InvoiceDetail = {
  invoice: InvoiceRow;
  lines: InvoiceLineRow[];
};

function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function listInvoices(
  filters: InvoiceFilters = {},
  today = todayInTz(getSettings("defaults").timezone),
): { rows: InvoiceRow[]; total: number; page: number; pageSize: number } {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(invoices.status, filters.status));
  if (filters.projectId)
    conditions.push(eq(invoices.projectId, filters.projectId));
  if (filters.clientId)
    conditions.push(eq(invoices.clientId, filters.clientId));
  if (filters.contractId)
    conditions.push(eq(invoices.contractId, filters.contractId));
  if (filters.overdue) {
    conditions.push(
      sql`${invoices.status} IN ('issued','partially_paid') AND ${invoices.dueDate} IS NOT NULL AND ${invoices.dueDate} < ${today}`,
    );
  }
  const q = filters.q?.trim();
  if (q) {
    const pattern = `%${escapeLike(q.toLowerCase())}%`;
    conditions.push(
      sql`(lower(${invoices.number}) LIKE ${pattern} ESCAPE '\\' OR lower(${invoices.notesEn}) LIKE ${pattern} ESCAPE '\\' OR lower(${invoices.notesAr}) LIKE ${pattern} ESCAPE '\\')`,
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const total =
    db.select({ value: count() }).from(invoices).where(where).get()?.value ?? 0;
  const requestedPage = filters.page ?? 1;
  const page =
    Number.isFinite(requestedPage) && requestedPage >= 1
      ? Math.floor(requestedPage)
      : 1;

  const sort: InvoiceSort = (INVOICE_SORT_FIELDS as readonly string[]).includes(
    filters.sort ?? "",
  )
    ? (filters.sort as InvoiceSort)
    : "createdAt";
  const descending = filters.dir !== "asc";
  const column = SORT_COLUMNS[sort];

  const rows = db
    .select()
    .from(invoices)
    .where(where)
    .orderBy(descending ? desc(column) : asc(column), desc(invoices.id))
    .limit(INVOICES_PAGE_SIZE)
    .offset((page - 1) * INVOICES_PAGE_SIZE)
    .all();

  return { rows, total, page, pageSize: INVOICES_PAGE_SIZE };
}

export function getInvoice(id: string): InvoiceRow {
  const row = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!row) {
    throw new AppError("NOT_FOUND", "Invoice not found");
  }
  return row;
}

export function getInvoiceDetail(id: string): InvoiceDetail {
  const invoice = getInvoice(id);
  const lines = db
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, id))
    .orderBy(asc(invoiceLines.position))
    .all();
  return { invoice, lines };
}

export function isOverdue(invoice: InvoiceRow, today: string): boolean {
  return (
    (invoice.status === "issued" || invoice.status === "partially_paid") &&
    invoice.dueDate !== null &&
    invoice.dueDate < today
  );
}

export function listInvoiceableMilestones(
  projectId?: string,
  locale: "ar" | "en" = "ar",
): {
  milestoneId: string;
  contractId: string;
  projectId: string;
  label: string;
}[] {
  const conditions: SQL[] = [
    sql`${contracts.status} IN ('signed','completed')`,
    sql`NOT EXISTS (SELECT 1 FROM invoices i WHERE i.milestone_id = ${paymentMilestones.id} AND i.status <> 'void')`,
  ];
  if (projectId) {
    conditions.push(eq(contracts.projectId, projectId));
  }
  const rows = db
    .select({
      milestoneId: paymentMilestones.id,
      contractId: contracts.id,
      projectId: contracts.projectId,
      titleAr: paymentMilestones.titleAr,
      titleEn: paymentMilestones.titleEn,
      position: paymentMilestones.position,
      amountMinor: paymentMilestones.amountMinor,
      currency: contracts.currency,
      contractNumber: contracts.number,
      projectCode: projects.code,
    })
    .from(paymentMilestones)
    .innerJoin(contracts, eq(paymentMilestones.contractId, contracts.id))
    .innerJoin(projects, eq(contracts.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(asc(contracts.createdAt), asc(paymentMilestones.position))
    .all();
  return rows.map((row) => {
    const title =
      locale === "en"
        ? (row.titleEn || row.titleAr || "")
        : (row.titleAr || row.titleEn || "");
    return {
      milestoneId: row.milestoneId,
      contractId: row.contractId,
      projectId: row.projectId,
      label: `${row.projectCode} · ${row.contractNumber ?? ""} · #${row.position} ${title} — ${formatMinorForLabel(row.amountMinor, row.currency)}`,
    };
  });
}

function formatMinorForLabel(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

function assertDraft(tx: DbTx, id: string): InvoiceRow {
  const row = tx.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!row) throw new AppError("NOT_FOUND", "Invoice not found");
  if (row.status !== "draft") {
    throw new AppError("INVALID_STATE", "Only drafts can be edited");
  }
  return row;
}

function clientSnapshot(client: typeof clients.$inferSelect) {
  return {
    id: client.id,
    type: client.type,
    nameAr: client.nameAr,
    nameEn: client.nameEn,
    legalNameAr: client.legalNameAr,
    legalNameEn: client.legalNameEn,
    email: client.email,
    phone: client.phone,
    country: client.country,
    city: client.city,
    addressAr: client.addressAr,
    addressEn: client.addressEn,
    taxNumber: client.taxNumber,
    crNumber: client.crNumber,
    repNameAr: client.repNameAr,
    repNameEn: client.repNameEn,
    repTitleAr: client.repTitleAr,
    repTitleEn: client.repTitleEn,
  };
}

function sellerSnapshot() {
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
    logoFileId: company.logoFileId,
    stampFileId: company.stampFileId,
    bank: company.bank,
  };
}

function requiredLanguages(mode: "ar" | "en"): Locale[] {
  return mode === "en" ? ["en"] : ["ar"];
}

export function createInvoice(
  user: SessionUser,
  input: CreateInvoiceInput,
  meta: RequestMeta,
): string {
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .get();
  if (!project) {
    throw new AppError("VALIDATION_FAILED", "Project not found", {
      projectId: "errors.invalid",
    });
  }
  let contract: typeof contracts.$inferSelect | undefined;
  if (input.contractId) {
    contract = db
      .select()
      .from(contracts)
      .where(eq(contracts.id, input.contractId))
      .get();
    if (!contract || contract.projectId !== project.id) {
      throw new AppError("VALIDATION_FAILED", "Contract not found", {
        contractId: "errors.invalid",
      });
    }
  }
  const defaults = getSettings("defaults");
  const company = getSettings("company");
  const paymentInstructionsAr = buildPaymentInstructions(
    company,
    "ar",
    input.bankAccountIds,
  );
  const paymentInstructionsEn = buildPaymentInstructions(
    company,
    "en",
    input.bankAccountIds,
  );
  const id = newId();
  const now = nowMs();
  withTx((tx) => {
    tx.insert(invoices)
      .values({
        id,
        clientId: project.clientId,
        projectId: project.id,
        contractId: contract?.id ?? null,
        status: "draft",
        languageMode:
          input.languageMode ?? (contract?.languageMode === "en" ? "en" : "ar"),
        currency: input.currency ?? project.currency,
        issueDate: input.issueDate ?? null,
        dueDate: input.dueDate ?? null,
        taxRateBp: contract?.taxRateBp ?? defaults.taxRateBp,
        discountType: "none",
        notesAr: input.notesAr,
        notesEn: input.notesEn,
        paymentInstructionsAr,
        paymentInstructionsEn,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.created",
      entityType: "invoice",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
  return id;
}

export function createInvoiceFromMilestone(
  user: SessionUser,
  milestoneId: string,
  meta: RequestMeta,
): string {
  const milestone = db
    .select()
    .from(paymentMilestones)
    .where(eq(paymentMilestones.id, milestoneId))
    .get();
  if (!milestone) {
    throw new AppError("NOT_FOUND", "Milestone not found");
  }
  const contract = db
    .select()
    .from(contracts)
    .where(eq(contracts.id, milestone.contractId))
    .get();
  if (!contract) {
    throw new AppError("NOT_FOUND", "Contract not found");
  }
  if (contract.status !== "signed" && contract.status !== "completed") {
    throw new AppError(
      "INVALID_STATE",
      "The contract must be signed or completed",
    );
  }
  const active = db
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(eq(invoices.milestoneId, milestoneId), ne(invoices.status, "void")),
    )
    .get();
  if (active) {
    throw new AppError("INVALID_STATE", "The milestone is already invoiced");
  }

  const id = newId();
  const now = nowMs();
  const suffix = contract.number ? ` — ${contract.number}` : "";
  const result = calcTotals({
    items: [{ unitPriceMinor: milestone.amountMinor, qtyMilli: 1000 }],
    discount: { type: "none", value: 0 },
    taxRateBp: contract.taxRateBp,
    fixedTaxMinor: milestone.taxMinor,
  });

  const company = getSettings("company");
  withTx((tx) => {
    tx.insert(invoices)
      .values({
        id,
        clientId: contract.clientId,
        projectId: contract.projectId,
        contractId: contract.id,
        milestoneId: milestone.id,
        status: "draft",
        languageMode: contract.languageMode === "en" ? "en" : "ar",
        currency: contract.currency,
        discountType: "none",
        subtotalMinor: result.subtotal,
        discountMinor: result.discount,
        netMinor: result.net,
        taxRateBp: contract.taxRateBp,
        taxMinor: result.tax,
        totalMinor: result.total,
        paymentInstructionsAr: buildPaymentInstructions(company, "ar"),
        paymentInstructionsEn: buildPaymentInstructions(company, "en"),
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    tx.insert(invoiceLines)
      .values({
        id: newId(),
        invoiceId: id,
        position: 1,
        descriptionAr: `${milestone.titleAr}${suffix}`,
        descriptionEn: `${milestone.titleEn}${suffix}`,
        qtyMilli: 1000,
        unitPriceMinor: milestone.amountMinor,
        lineTotalMinor: result.lineTotals[0],
      })
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.created",
      entityType: "invoice",
      entityId: id,
      meta: { milestoneId, contractId: contract.id },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
  return id;
}

export function updateInvoiceDraft(
  user: SessionUser,
  id: string,
  input: UpdateInvoiceDraftInput,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    assertDraft(tx, id);
    const updateValues: Record<string, unknown> = {
      languageMode: input.languageMode,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      notesAr: input.notesAr,
      notesEn: input.notesEn,
      updatedAt: now,
    };
    if (input.currency) {
      updateValues.currency = input.currency;
    }
    if (input.bankAccountIds !== undefined) {
      const company = getSettings("company");
      updateValues.paymentInstructionsAr = buildPaymentInstructions(
        company,
        "ar",
        input.bankAccountIds,
      );
      updateValues.paymentInstructionsEn = buildPaymentInstructions(
        company,
        "en",
        input.bankAccountIds,
      );
    }
    tx.update(invoices)
      .set(updateValues)
      .where(eq(invoices.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.updated",
      entityType: "invoice",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function saveInvoiceLines(
  user: SessionUser,
  id: string,
  input: SaveInvoiceLinesInput,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const invoice = assertDraft(tx, id);
    if (invoice.milestoneId !== null) {
      throw new AppError(
        "INVALID_STATE",
        "Lines and tax are locked for milestone invoices",
      );
    }
    const calcInput: CalcInput = {
      items: input.lines.map((line) => ({
        unitPriceMinor: line.unitPriceMinor,
        qtyMilli: line.qtyMilli,
      })),
      discount: input.discount,
      taxRateBp: input.taxRateBp,
    };
    const result = calcTotals(calcInput);
    tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id)).run();
    input.lines.forEach((line, index) => {
      tx.insert(invoiceLines)
        .values({
          id: newId(),
          invoiceId: id,
          position: index + 1,
          descriptionAr: line.descriptionAr ?? null,
          descriptionEn: line.descriptionEn ?? null,
          qtyMilli: line.qtyMilli,
          unitPriceMinor: line.unitPriceMinor,
          lineTotalMinor: result.lineTotals[index],
        })
        .run();
    });
    tx.update(invoices)
      .set({
        discountType: input.discount.type,
        discountValue: input.discount.value,
        subtotalMinor: result.subtotal,
        discountMinor: result.discount,
        netMinor: result.net,
        taxRateBp: input.taxRateBp,
        taxMinor: result.tax,
        totalMinor: result.total,
        updatedAt: now,
      })
      .where(eq(invoices.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.updated",
      entityType: "invoice",
      entityId: id,
      meta: { section: "lines" },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

function uniqueVerificationCode(tx: DbTx): string {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    const clash = tx
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.verificationCode, code))
      .get();
    if (!clash) return code;
  }
  throw new AppError("INTERNAL", "Failed to generate a unique code");
}

export function issueInvoice(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): void {
  const defaults = getSettings("defaults");
  const numbering = getSettings("numbering");
  const company = getSettings("company");
  const today = todayInTz(defaults.timezone);
  const now = nowMs();

  withTx((tx) => {
    const invoice = assertDraft(tx, id);
    const lines = tx
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, id))
      .orderBy(asc(invoiceLines.position))
      .all();
    if (lines.length < 1) {
      throw new AppError(
        "VALIDATION_FAILED",
        "The invoice needs at least one line",
      );
    }
    if (invoice.totalMinor <= 0) {
      throw new AppError(
        "VALIDATION_FAILED",
        "The invoice total must be positive",
      );
    }

    const langs = requiredLanguages(invoice.languageMode);
    for (const lang of langs) {
      if (lang === "ar" ? !company.nameAr : !company.nameEn) {
        throw new AppError("VALIDATION_FAILED", "The company name is missing");
      }
      for (const line of lines) {
        const description =
          lang === "ar" ? line.descriptionAr : line.descriptionEn;
        if (!description) {
          throw new AppError(
            "VALIDATION_FAILED",
            "A line description is missing",
          );
        }
      }
    }

    const client = tx
      .select()
      .from(clients)
      .where(eq(clients.id, invoice.clientId))
      .get();
    if (!client) {
      throw new AppError("INTERNAL", "Invoice references a missing client");
    }
    for (const lang of langs) {
      if (lang === "ar" ? !client.nameAr : !client.nameEn) {
        throw new AppError("VALIDATION_FAILED", "The client name is missing");
      }
    }

    const issueDate = invoice.issueDate ?? today;
    const dueDate = invoice.dueDate ?? null;
    if (dueDate !== null && dueDate < issueDate) {
      throw new AppError(
        "VALIDATION_FAILED",
        "The due date cannot be before the issue date",
      );
    }

    const year = Number(issueDate.slice(0, 4));
    const seq = allocateNumber(tx, "invoice", year);
    const number = formatDocNumber(numbering.prefix, "I", year, seq);
    const verificationCode = uniqueVerificationCode(tx);

    const paymentInstructionsAr = buildPaymentInstructions(company, "ar");
    const paymentInstructionsEn = buildPaymentInstructions(company, "en");

    tx.update(invoices)
      .set({
        number,
        verificationCode,
        issueDate,
        dueDate,
        status: "issued",
        issuedAt: now,
        sellerSnapshotJson: JSON.stringify(sellerSnapshot()),
        buyerSnapshotJson: JSON.stringify(clientSnapshot(client)),
        paymentInstructionsAr:
          invoice.paymentInstructionsAr ?? paymentInstructionsAr,
        paymentInstructionsEn:
          invoice.paymentInstructionsEn ?? paymentInstructionsEn,
        updatedAt: now,
      })
      .where(eq(invoices.id, id))
      .run();

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.issued",
      entityType: "invoice",
      entityId: id,
      meta: { number },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function voidInvoice(
  user: SessionUser,
  id: string,
  reason: string,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const invoice = tx.select().from(invoices).where(eq(invoices.id, id)).get();
    if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found");
    if (invoice.status !== "issued" || invoice.paidMinor !== 0) {
      throw new AppError(
        "INVALID_STATE",
        "Only an unpaid issued invoice can be voided",
      );
    }
    tx.update(invoices)
      .set({
        status: "void",
        voidedAt: now,
        voidReason: reason,
        updatedAt: now,
      })
      .where(eq(invoices.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.voided",
      entityType: "invoice",
      entityId: id,
      meta: { reason },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function localeForInvoice(
  mode: "ar" | "en",
  _preferredLanguage: Locale,
): Locale {
  return mode === "en" ? "en" : "ar";
}

export type SendInvoiceEmailOptions = { toEmail?: string };

export function sendInvoiceEmail(
  user: SessionUser,
  id: string,
  options: SendInvoiceEmailOptions,
  meta: RequestMeta,
): void {
  const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!invoice) {
    throw new AppError("NOT_FOUND", "Invoice not found");
  }
  if (invoice.status === "draft" || invoice.status === "void") {
    throw new AppError(
      "INVALID_STATE",
      "Only an issued invoice can be emailed",
    );
  }
  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId))
    .get();
  if (!client) {
    throw new AppError("INTERNAL", "Invoice references a missing client");
  }

  const toEmail = (options.toEmail?.trim() || client.email || "").trim();
  if (!toEmail) {
    throw new AppError(
      "VALIDATION_FAILED",
      "The client has no email address",
      { toEmail: "errors.required" },
    );
  }

  const locale = localeForInvoice(
    invoice.languageMode,
    client.preferredLanguage,
  );
  const currency = invoice.currency as CurrencyCode;
  const bankLine =
    (locale === "ar"
      ? invoice.paymentInstructionsAr
      : invoice.paymentInstructionsEn) ?? "";
  const recipientName = client.nameAr ?? client.nameEn ?? "";
  const isPaid = invoice.status === "paid";

  withTx((tx) => {
    enqueueEmail(tx, {
      toEmail,
      toName: recipientName || null,
      locale,
      templateKey: "invoice_issued",
      payload: {
        number: invoice.number,
        amountFormatted: formatMoney(invoice.totalMinor, currency, locale),
        dueDate: invoice.dueDate,
        bankLine,
        invoiceId: invoice.id,
        docLang: invoice.languageMode,
        recipientName,
        isPaid,
        attachReceipt: isPaid,
      },
      entityType: "invoice",
      entityId: id,
    });
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.sent",
      entityType: "invoice",
      entityId: id,
      meta: { number: invoice.number },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export type SendReceiptEmailOptions = { toEmail?: string };

export function sendReceiptEmail(
  user: SessionUser,
  id: string,
  options: SendReceiptEmailOptions,
  meta: RequestMeta,
): void {
  const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!invoice) {
    throw new AppError("NOT_FOUND", "Invoice not found");
  }
  if (invoice.status === "draft" || invoice.status === "void") {
    throw new AppError(
      "INVALID_STATE",
      "Only an issued or paid invoice can have a receipt emailed",
    );
  }
  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId))
    .get();
  if (!client) {
    throw new AppError("INTERNAL", "Invoice references a missing client");
  }

  const activePayments = db
    .select()
    .from(payments)
    .where(and(eq(payments.invoiceId, id), isNull(payments.voidedAt)))
    .all();
  if (activePayments.length === 0) {
    throw new AppError(
      "INVALID_STATE",
      "Invoice has no payments recorded",
    );
  }

  const toEmail = (options.toEmail?.trim() || client.email || "").trim();
  if (!toEmail) {
    throw new AppError(
      "VALIDATION_FAILED",
      "The client has no email address",
      { toEmail: "errors.required" },
    );
  }

  const locale = localeForInvoice(
    invoice.languageMode,
    client.preferredLanguage,
  );
  const currency = invoice.currency as CurrencyCode;
  const recipientName = client.nameAr ?? client.nameEn ?? "";
  const totalPaidMinor = activePayments.reduce(
    (sum, p) => sum + p.amountMinor,
    0,
  );

  const remainingMinor = Math.max(0, invoice.totalMinor - invoice.paidMinor);

  withTx((tx) => {
    enqueueEmail(tx, {
      toEmail,
      toName: recipientName || null,
      locale,
      templateKey: "receipt_issued",
      payload: {
        number: invoice.number,
        totalAmountFormatted: formatMoney(invoice.totalMinor, currency, locale),
        paidFormatted: formatMoney(totalPaidMinor, currency, locale),
        balanceFormatted: formatMoney(remainingMinor, currency, locale),
        isFullyPaid: invoice.status === "paid",
        invoiceId: invoice.id,
        docLang: invoice.languageMode,
        recipientName,
        attachReceipt: true,
        onlyReceipt: true,
      },
      entityType: "invoice",
      entityId: id,
    });
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.sent",
      entityType: "invoice",
      entityId: id,
      meta: { number: invoice.number, kind: "receipt" },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function deleteDraftInvoice(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): void {
  withTx((tx) => {
    const invoice = assertDraft(tx, id);
    if (invoice.number !== null) {
      throw new AppError(
        "INVALID_STATE",
        "Only unnumbered drafts can be deleted",
      );
    }
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.voided",
      entityType: "invoice",
      entityId: id,
      meta: { deleted: true },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    tx.delete(invoices).where(eq(invoices.id, id)).run();
  });
}

export function duplicateInvoice(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): string {
  const source = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!source) {
    throw new AppError("NOT_FOUND", "Invoice not found");
  }

  const lines = db
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, id))
    .orderBy(asc(invoiceLines.position))
    .all();

  const newInvoiceId = newId();
  const now = nowMs();

  withTx((tx) => {
    tx.insert(invoices)
      .values({
        id: newInvoiceId,
        clientId: source.clientId,
        projectId: source.projectId,
        contractId: source.contractId,
        milestoneId: null,
        subscriptionId: null,
        status: "draft",
        languageMode: source.languageMode,
        currency: source.currency,
        issueDate: null,
        dueDate: null,
        discountType: source.discountType,
        discountValue: source.discountValue,
        subtotalMinor: source.subtotalMinor,
        discountMinor: source.discountMinor,
        netMinor: source.netMinor,
        taxRateBp: source.taxRateBp,
        taxMinor: source.taxMinor,
        totalMinor: source.totalMinor,
        paidMinor: 0,
        notesAr: source.notesAr,
        notesEn: source.notesEn,
        paymentInstructionsAr: source.paymentInstructionsAr,
        paymentInstructionsEn: source.paymentInstructionsEn,
        sellerSnapshotJson: null,
        buyerSnapshotJson: null,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    lines.forEach((line, index) => {
      tx.insert(invoiceLines)
        .values({
          id: newId(),
          invoiceId: newInvoiceId,
          position: index + 1,
          descriptionAr: line.descriptionAr,
          descriptionEn: line.descriptionEn,
          qtyMilli: line.qtyMilli,
          unitPriceMinor: line.unitPriceMinor,
          lineTotalMinor: line.lineTotalMinor,
        })
        .run();
    });

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.duplicated",
      entityType: "invoice",
      entityId: newInvoiceId,
      meta: { sourceId: id },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });

  return newInvoiceId;
}
