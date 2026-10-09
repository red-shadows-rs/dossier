import {
  and,
  asc,
  count,
  desc,
  eq,
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
  projects,
} from "@/db/schema";
import { addDays, nowMs, todayInTz } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { generateCode, newId } from "@/lib/ids";
import type { INVOICE_STATUSES, Locale } from "@/lib/constants";
import type {
  CreateInvoiceInput,
  SaveInvoiceLinesInput,
  UpdateInvoiceDraftInput,
} from "@/lib/validation/invoices";
import type { RequestMeta, SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
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

export function listInvoiceableMilestones(): {
  milestoneId: string;
  contractId: string;
  projectId: string;
  label: string;
}[] {
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
    .where(
      and(
        sql`${contracts.status} IN ('signed','completed')`,
        sql`NOT EXISTS (SELECT 1 FROM invoices i WHERE i.milestone_id = ${paymentMilestones.id} AND i.status <> 'void')`,
      ),
    )
    .orderBy(asc(contracts.createdAt), asc(paymentMilestones.position))
    .all();
  return rows.map((row) => ({
    milestoneId: row.milestoneId,
    contractId: row.contractId,
    projectId: row.projectId,
    label: `${row.projectCode} · ${row.contractNumber ?? ""} · #${row.position} ${row.titleEn} — ${formatMinorForLabel(row.amountMinor, row.currency)}`,
  }));
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

function requiredLanguages(mode: "ar" | "en" | "bilingual"): Locale[] {
  if (mode === "ar") return ["ar"];
  if (mode === "en") return ["en"];
  return ["ar", "en"];
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
          input.languageMode ?? contract?.languageMode ?? "bilingual",
        currency: project.currency,
        taxRateBp: contract?.taxRateBp ?? defaults.taxRateBp,
        discountType: "none",
        notesAr: input.notesAr,
        notesEn: input.notesEn,
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

  withTx((tx) => {
    tx.insert(invoices)
      .values({
        id,
        clientId: contract.clientId,
        projectId: contract.projectId,
        contractId: contract.id,
        milestoneId: milestone.id,
        status: "draft",
        languageMode: contract.languageMode,
        currency: contract.currency,
        discountType: "none",
        subtotalMinor: result.subtotal,
        discountMinor: result.discount,
        netMinor: result.net,
        taxRateBp: contract.taxRateBp,
        taxMinor: result.tax,
        totalMinor: result.total,
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
    tx.update(invoices)
      .set({
        languageMode: input.languageMode,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        notesAr: input.notesAr,
        notesEn: input.notesEn,
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

    let paymentTermsDays = defaults.paymentTermsDays;
    if (invoice.contractId) {
      const contract = tx
        .select()
        .from(contracts)
        .where(eq(contracts.id, invoice.contractId))
        .get();
      if (contract) paymentTermsDays = contract.paymentTermsDays;
    }

    const issueDate = invoice.issueDate ?? today;
    const dueDate = invoice.dueDate ?? addDays(issueDate, paymentTermsDays);
    if (dueDate < issueDate) {
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
