// Dossier - Subscriptions Service
// https://github.com/red-shadows-rs/dossier

import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { db, withTx, type DbTx } from "@/db";
import {
  clients,
  invoiceLines,
  invoices,
  projects,
  subscriptionItems,
  subscriptions,
} from "@/db/schema";
import type {
  CurrencyCode,
  SubscriptionFrequency,
  SubscriptionStatus,
} from "@/lib/constants";
import { addDays, nowMs, todayInTz } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { generateCode, newId } from "@/lib/ids";
import { formatMoney } from "@/lib/money";
import { calculateNextRunDate } from "@/lib/subscriptions";
import type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
} from "@/lib/validation/subscriptions";
import type { RequestMeta, SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import { calcTotals, type CalcInput } from "@/server/services/contract-calc";
import { enqueueEmail } from "@/server/services/email";
import { localeForInvoice } from "@/server/services/invoices";
import {
  allocateNumber,
  formatDocNumber,
  formatProjectCode,
} from "@/server/services/numbering";
import {
  buildPaymentInstructions,
  getSettings,
} from "@/server/services/settings";

export type SubscriptionRow = {
  id: string;
  number: string | null;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;
  titleAr: string;
  titleEn: string | null;
  status: SubscriptionStatus;
  frequency: SubscriptionFrequency;
  intervalCount: number;
  startDate: string;
  nextRunDate: string;
  endDate: string | null;
  currency: string;
  totalMinor: number;
  totalFormatted: string;
  invoicesCount: number;
  lastRunDate: string | null;
  createdAt: number;
};

export type SubscriptionFilters = {
  q?: string;
  status?: SubscriptionStatus;
  clientId?: string;
  frequency?: SubscriptionFrequency;
  sort?: string;
  dir?: string;
  page?: number;
  pageSize?: number;
};

export function listSubscriptions(
  filters: SubscriptionFilters = {},
  locale: "ar" | "en" = "ar",
): { rows: SubscriptionRow[]; total: number; page: number; pageSize: number } {
  const conditions: SQL[] = [];

  if (filters.status) {
    conditions.push(eq(subscriptions.status, filters.status));
  }
  if (filters.clientId) {
    conditions.push(eq(subscriptions.clientId, filters.clientId));
  }
  if (filters.frequency) {
    conditions.push(eq(subscriptions.frequency, filters.frequency));
  }
  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        like(subscriptions.number, term),
        like(subscriptions.titleAr, term),
        like(subscriptions.titleEn, term),
        like(clients.nameAr, term),
        like(clients.nameEn, term),
      ) as SQL,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const totalRow = db
    .select({ count: sql<number>`count(*)` })
    .from(subscriptions)
    .innerJoin(clients, eq(subscriptions.clientId, clients.id))
    .where(whereClause)
    .get();

  const total = totalRow?.count ?? 0;
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  let orderBy = desc(subscriptions.createdAt);
  if (filters.sort === "nextRunDate") {
    orderBy = filters.dir === "asc" ? asc(subscriptions.nextRunDate) : desc(subscriptions.nextRunDate);
  } else if (filters.sort === "number") {
    orderBy = filters.dir === "asc" ? asc(subscriptions.number) : desc(subscriptions.number);
  } else if (filters.sort === "total") {
    orderBy = filters.dir === "asc" ? asc(subscriptions.totalMinor) : desc(subscriptions.totalMinor);
  }

  const rows = db
    .select({
      id: subscriptions.id,
      number: subscriptions.number,
      clientId: subscriptions.clientId,
      clientNameAr: clients.nameAr,
      clientNameEn: clients.nameEn,
      projectId: subscriptions.projectId,
      projectNameAr: projects.nameAr,
      projectNameEn: projects.nameEn,
      projectCode: projects.code,
      titleAr: subscriptions.titleAr,
      titleEn: subscriptions.titleEn,
      status: subscriptions.status,
      frequency: subscriptions.frequency,
      intervalCount: subscriptions.intervalCount,
      startDate: subscriptions.startDate,
      nextRunDate: subscriptions.nextRunDate,
      endDate: subscriptions.endDate,
      currency: subscriptions.currency,
      totalMinor: subscriptions.totalMinor,
      invoicesCount: subscriptions.invoicesCount,
      lastRunDate: subscriptions.lastRunDate,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .innerJoin(clients, eq(subscriptions.clientId, clients.id))
    .leftJoin(projects, eq(subscriptions.projectId, projects.id))
    .where(whereClause)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(offset)
    .all();

  return {
    rows: rows.map((r) => {
      const clientName =
        locale === "ar"
          ? r.clientNameAr || r.clientNameEn || ""
          : r.clientNameEn || r.clientNameAr || "";
      const projectName =
        locale === "ar"
          ? r.projectNameAr || r.projectNameEn || null
          : r.projectNameEn || r.projectNameAr || null;
      return {
        id: r.id,
        number: r.number,
        clientId: r.clientId,
        clientName,
        projectId: r.projectId,
        projectName,
        projectCode: r.projectCode,
        titleAr: r.titleAr,
        titleEn: r.titleEn,
        status: r.status as SubscriptionStatus,
        frequency: r.frequency as SubscriptionFrequency,
        intervalCount: r.intervalCount,
        startDate: r.startDate,
        nextRunDate: r.nextRunDate,
        endDate: r.endDate,
        currency: r.currency,
        totalMinor: r.totalMinor,
        totalFormatted: formatMoney(r.totalMinor, r.currency as CurrencyCode, locale),
        invoicesCount: r.invoicesCount,
        lastRunDate: r.lastRunDate,
        createdAt: r.createdAt,
      };
    }),
    total,
    page,
    pageSize,
  };
}

export function getSubscription(id: string) {
  const sub = db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .get();

  if (!sub) return null;

  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, sub.clientId))
    .get();

  const project = sub.projectId
    ? db.select().from(projects).where(eq(projects.id, sub.projectId)).get()
    : null;

  const items = db
    .select()
    .from(subscriptionItems)
    .where(eq(subscriptionItems.subscriptionId, id))
    .orderBy(asc(subscriptionItems.position))
    .all();

  const subInvoices = db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      totalMinor: invoices.totalMinor,
      paidMinor: invoices.paidMinor,
      currency: invoices.currency,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .where(eq(invoices.subscriptionId, id))
    .orderBy(desc(invoices.createdAt))
    .all();

  return {
    subscription: sub,
    client,
    project,
    items,
    invoices: subInvoices,
  };
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

function ensureProjectForClient(
  tx: DbTx,
  clientId: string,
  preferredProjectId: string | null | undefined,
  currency: string,
  userId: string,
): string {
  if (preferredProjectId) {
    const existing = tx
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, preferredProjectId), eq(projects.clientId, clientId)))
      .get();
    if (existing) return existing.id;
  }

  const clientProjects = tx
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.clientId, clientId))
    .orderBy(asc(projects.createdAt))
    .all();

  if (clientProjects.length > 0) {
    return clientProjects[0].id;
  }

  const defaults = getSettings("defaults");
  const today = todayInTz(defaults.timezone);
  const year = Number(today.slice(0, 4));
  const seq = allocateNumber(tx, "project", year);
  const code = formatProjectCode(seq);
  const projectId = newId();
  const now = nowMs();

  tx.insert(projects)
    .values({
      id: projectId,
      code,
      clientId,
      nameAr: "الخدمات المجدولة",
      nameEn: "Scheduled Services",
      status: "active",
      currency,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return projectId;
}

export function createSubscription(
  user: SessionUser,
  input: CreateSubscriptionInput,
  meta: RequestMeta,
): string {
  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, input.clientId))
    .get();

  if (!client) {
    throw new AppError("VALIDATION_FAILED", "Client not found", {
      clientId: "errors.invalid",
    });
  }

  const defaults = getSettings("defaults");
  const numbering = getSettings("numbering");
  const company = getSettings("company");
  const today = todayInTz(defaults.timezone);
  const year = Number(today.slice(0, 4));

  const calcInput: CalcInput = {
    items: input.items.map((item) => ({
      unitPriceMinor: item.unitPriceMinor,
      qtyMilli: item.quantity * 1000,
    })),
    discount: {
      type: input.discountType,
      value: input.discountValue,
    },
    taxRateBp: input.taxRateBp,
  };
  const totals = calcTotals(calcInput);

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

  const subId = newId();
  const now = nowMs();

  withTx((tx) => {
    const seq = allocateNumber(tx, "subscription", year);
    const subNumber = formatDocNumber(numbering.prefix, "S", year, seq);

    const finalProjectId = ensureProjectForClient(
      tx,
      client.id,
      input.projectId,
      input.currency,
      user.id,
    );

    tx.insert(subscriptions)
      .values({
        id: subId,
        number: subNumber,
        clientId: client.id,
        projectId: finalProjectId,
        contractId: input.contractId || null,
        titleAr: input.titleAr,
        titleEn: input.titleEn || null,
        description: input.description || null,
        status: "active",
        frequency: input.frequency,
        intervalCount: input.intervalCount,
        startDate: input.startDate,
        nextRunDate: input.nextRunDate,
        endDate: input.endDate || null,
        languageMode: input.languageMode,
        currency: input.currency,
        taxRateBp: input.taxRateBp,
        discountType: input.discountType,
        discountValue: input.discountValue,
        subtotalMinor: totals.subtotal,
        discountMinor: totals.discount,
        netMinor: totals.net,
        taxMinor: totals.tax,
        totalMinor: totals.total,
        paymentInstructionsAr,
        paymentInstructionsEn,
        paymentTermsDays: input.paymentTermsDays,
        autoIssueInvoice: input.autoIssueInvoice,
        autoSendEmail: input.autoSendEmail,
        invoicesCount: 0,
        notesAr: input.notesAr,
        notesEn: input.notesEn,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    input.items.forEach((item, idx) => {
      tx.insert(subscriptionItems)
        .values({
          id: newId(),
          subscriptionId: subId,
          position: idx + 1,
          descriptionAr: item.descriptionAr,
          descriptionEn: item.descriptionEn || null,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          taxRateBp: item.taxRateBp ?? input.taxRateBp,
          subtotalMinor: totals.lineTotals[idx],
          taxMinor: 0,
          totalMinor: totals.lineTotals[idx],
          createdAt: now,
        })
        .run();
    });

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "subscription.created",
      entityType: "subscription",
      entityId: subId,
      meta: { number: subNumber, title: input.titleAr },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });

  return subId;
}

export function updateSubscription(
  id: string,
  user: SessionUser,
  input: UpdateSubscriptionInput,
  meta: RequestMeta,
): void {
  const sub = db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .get();

  if (!sub) {
    throw new AppError("NOT_FOUND", "Subscription not found");
  }

  const company = getSettings("company");

  const calcInput: CalcInput = {
    items: input.items.map((item) => ({
      unitPriceMinor: item.unitPriceMinor,
      qtyMilli: item.quantity * 1000,
    })),
    discount: {
      type: input.discountType,
      value: input.discountValue,
    },
    taxRateBp: input.taxRateBp,
  };
  const totals = calcTotals(calcInput);

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

  const now = nowMs();

  withTx((tx) => {
    tx.update(subscriptions)
      .set({
        titleAr: input.titleAr,
        titleEn: input.titleEn || null,
        description: input.description || null,
        frequency: input.frequency,
        intervalCount: input.intervalCount,
        startDate: input.startDate,
        nextRunDate: input.nextRunDate,
        endDate: input.endDate || null,
        languageMode: input.languageMode,
        currency: input.currency,
        taxRateBp: input.taxRateBp,
        discountType: input.discountType,
        discountValue: input.discountValue,
        subtotalMinor: totals.subtotal,
        discountMinor: totals.discount,
        netMinor: totals.net,
        taxMinor: totals.tax,
        totalMinor: totals.total,
        paymentInstructionsAr,
        paymentInstructionsEn,
        paymentTermsDays: input.paymentTermsDays,
        autoIssueInvoice: input.autoIssueInvoice,
        autoSendEmail: input.autoSendEmail,
        notesAr: input.notesAr,
        notesEn: input.notesEn,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, id))
      .run();

    tx.delete(subscriptionItems)
      .where(eq(subscriptionItems.subscriptionId, id))
      .run();

    input.items.forEach((item, idx) => {
      tx.insert(subscriptionItems)
        .values({
          id: newId(),
          subscriptionId: id,
          position: idx + 1,
          descriptionAr: item.descriptionAr,
          descriptionEn: item.descriptionEn || null,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          taxRateBp: item.taxRateBp ?? input.taxRateBp,
          subtotalMinor: totals.lineTotals[idx],
          taxMinor: 0,
          totalMinor: totals.lineTotals[idx],
          createdAt: now,
        })
        .run();
    });

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "subscription.updated",
      entityType: "subscription",
      entityId: id,
      meta: { title: input.titleAr, totalMinor: totals.total },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function pauseSubscription(
  id: string,
  user: SessionUser,
  meta: RequestMeta,
): void {
  const sub = db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .get();

  if (!sub) throw new AppError("NOT_FOUND", "Subscription not found");
  if (sub.status !== "active") {
    throw new AppError("INVALID_STATE", "Only active subscriptions can be paused");
  }

  const now = nowMs();
  withTx((tx) => {
    tx.update(subscriptions)
      .set({ status: "paused", updatedAt: now })
      .where(eq(subscriptions.id, id))
      .run();

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "subscription.paused",
      entityType: "subscription",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function resumeSubscription(
  id: string,
  user: SessionUser,
  meta: RequestMeta,
): void {
  const sub = db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .get();

  if (!sub) throw new AppError("NOT_FOUND", "Subscription not found");
  if (sub.status !== "paused") {
    throw new AppError("INVALID_STATE", "Only paused subscriptions can be resumed");
  }

  const defaults = getSettings("defaults");
  const today = todayInTz(defaults.timezone);
  const now = nowMs();

  const nextRun = sub.nextRunDate < today ? today : sub.nextRunDate;

  withTx((tx) => {
    tx.update(subscriptions)
      .set({ status: "active", nextRunDate: nextRun, updatedAt: now })
      .where(eq(subscriptions.id, id))
      .run();

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "subscription.resumed",
      entityType: "subscription",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function cancelSubscription(
  id: string,
  user: SessionUser,
  meta: RequestMeta,
): void {
  const sub = db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .get();

  if (!sub) throw new AppError("NOT_FOUND", "Subscription not found");
  if (sub.status === "canceled") {
    throw new AppError("INVALID_STATE", "Subscription is already canceled");
  }

  const now = nowMs();
  withTx((tx) => {
    tx.update(subscriptions)
      .set({ status: "canceled", updatedAt: now })
      .where(eq(subscriptions.id, id))
      .run();

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "subscription.cancelled",
      entityType: "subscription",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function generateInvoiceForSubscription(
  subscriptionId: string,
  user: SessionUser | null,
  meta?: RequestMeta,
): string {
  const sub = db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .get();

  if (!sub) throw new AppError("NOT_FOUND", "Subscription not found");

  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, sub.clientId))
    .get();

  if (!client) throw new AppError("INTERNAL", "Missing client for subscription");

  const items = db
    .select()
    .from(subscriptionItems)
    .where(eq(subscriptionItems.subscriptionId, subscriptionId))
    .orderBy(asc(subscriptionItems.position))
    .all();

  if (items.length === 0) {
    throw new AppError("VALIDATION_FAILED", "Subscription has no items");
  }

  const defaults = getSettings("defaults");
  const numbering = getSettings("numbering");
  const today = todayInTz(defaults.timezone);
  const now = nowMs();

  const issueDate = sub.nextRunDate <= today ? today : sub.nextRunDate;
  const dueDate = addDays(issueDate, sub.paymentTermsDays);
  const year = Number(issueDate.slice(0, 4));

  const invoiceId = newId();

  withTx((tx) => {
    const finalProjectId = ensureProjectForClient(
      tx,
      client.id,
      sub.projectId,
      sub.currency,
      user?.id ?? "system",
    );

    let invoiceNumber: string | null = null;
    let verificationCode: string | null = null;
    const shouldIssue = sub.autoIssueInvoice;

    if (shouldIssue) {
      const seq = allocateNumber(tx, "invoice", year);
      invoiceNumber = formatDocNumber(numbering.prefix, "I", year, seq);
      verificationCode = uniqueVerificationCode(tx);
    }

    tx.insert(invoices)
      .values({
        id: invoiceId,
        number: null,
        verificationCode: null,
        clientId: client.id,
        projectId: finalProjectId,
        contractId: sub.contractId,
        subscriptionId: sub.id,
        status: "draft",
        languageMode: sub.languageMode,
        currency: sub.currency,
        issueDate,
        dueDate,
        discountType: sub.discountType,
        discountValue: sub.discountValue,
        subtotalMinor: sub.subtotalMinor,
        discountMinor: sub.discountMinor,
        netMinor: sub.netMinor,
        taxRateBp: sub.taxRateBp,
        taxMinor: sub.taxMinor,
        totalMinor: sub.totalMinor,
        paidMinor: 0,
        notesAr: sub.notesAr,
        notesEn: sub.notesEn,
        paymentInstructionsAr: sub.paymentInstructionsAr,
        paymentInstructionsEn: sub.paymentInstructionsEn,
        sellerSnapshotJson: null,
        buyerSnapshotJson: null,
        issuedAt: null,
        createdBy: user?.id ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    items.forEach((item, idx) => {
      tx.insert(invoiceLines)
        .values({
          id: newId(),
          invoiceId,
          position: idx + 1,
          descriptionAr: item.descriptionAr,
          descriptionEn: item.descriptionEn,
          qtyMilli: item.quantity * 1000,
          unitPriceMinor: item.unitPriceMinor,
          lineTotalMinor: item.totalMinor,
        })
        .run();
    });

    if (shouldIssue) {
      tx.update(invoices)
        .set({
          status: "issued",
          number: invoiceNumber,
          verificationCode,
          sellerSnapshotJson: JSON.stringify(sellerSnapshot()),
          buyerSnapshotJson: JSON.stringify(clientSnapshot(client)),
          issuedAt: now,
          updatedAt: now,
        })
        .where(eq(invoices.id, invoiceId))
        .run();
    }

    const nextRun = calculateNextRunDate(
      sub.nextRunDate,
      sub.frequency as SubscriptionFrequency,
      sub.intervalCount,
    );

    let nextStatus: SubscriptionStatus = sub.status as SubscriptionStatus;
    if (sub.endDate && nextRun > sub.endDate) {
      nextStatus = "completed";
    }

    tx.update(subscriptions)
      .set({
        lastRunDate: issueDate,
        lastInvoiceId: invoiceId,
        invoicesCount: sub.invoicesCount + 1,
        nextRunDate: nextRun,
        status: nextStatus,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, subscriptionId))
      .run();

    if (shouldIssue && sub.autoSendEmail && client.email?.trim()) {
      const emailLocale = localeForInvoice(
        sub.languageMode,
        client.preferredLanguage,
      );
      const recipientName =
        (emailLocale === "ar" ? client.nameAr : client.nameEn) ||
        client.nameAr ||
        client.nameEn ||
        "";

      enqueueEmail(tx, {
        toEmail: client.email.trim(),
        toName: recipientName || null,
        locale: emailLocale,
        templateKey: "invoice_issued",
        payload: {
          number: invoiceNumber,
          totalFormatted: formatMoney(
            sub.totalMinor,
            sub.currency as CurrencyCode,
            emailLocale,
          ),
          dueDate,
          bankLine:
            (emailLocale === "ar"
              ? sub.paymentInstructionsAr
              : sub.paymentInstructionsEn) ?? "",
          invoiceId,
          docLang: sub.languageMode,
          recipientName,
        },
        entityType: "invoice",
        entityId: invoiceId,
      });
    }

    audit(tx, {
      actorType: user ? "user" : "system",
      actorId: user?.id,
      action: "subscription.invoice_generated",
      entityType: "subscription",
      entityId: subscriptionId,
      meta: {
        invoiceId,
        invoiceNumber,
        totalMinor: sub.totalMinor,
        cycleDate: issueDate,
      },
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  });

  return invoiceId;
}

export function processScheduledSubscriptions(
  today: string,
  _atMs: number = nowMs(),
): number {
  const due = db
    .select({ id: subscriptions.id, titleAr: subscriptions.titleAr })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        sql`${subscriptions.nextRunDate} <= ${today}`,
      ),
    )
    .all();

  let generated = 0;
  for (const s of due) {
    try {
      generateInvoiceForSubscription(s.id, null);
      generated += 1;
    } catch (err) {
      console.error(
        `Failed to generate scheduled invoice for subscription ${s.id} (${s.titleAr}):`,
        err,
      );
    }
  }

  return generated;
}

export function duplicateSubscription(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): string {
  const source = db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .get();
  if (!source) {
    throw new AppError("NOT_FOUND", "Subscription not found");
  }

  const items = db
    .select()
    .from(subscriptionItems)
    .where(eq(subscriptionItems.subscriptionId, id))
    .orderBy(asc(subscriptionItems.position))
    .all();

  const newSubId = newId();
  const now = nowMs();

  withTx((tx) => {
    tx.insert(subscriptions)
      .values({
        id: newSubId,
        number: null,
        clientId: source.clientId,
        projectId: source.projectId,
        contractId: source.contractId,
        titleAr: source.titleAr,
        titleEn: source.titleEn,
        description: source.description,
        status: "active",
        frequency: source.frequency,
        intervalCount: source.intervalCount,
        startDate: source.startDate,
        nextRunDate: source.startDate,
        endDate: source.endDate,
        languageMode: source.languageMode,
        currency: source.currency,
        taxRateBp: source.taxRateBp,
        discountType: source.discountType,
        discountValue: source.discountValue,
        subtotalMinor: source.subtotalMinor,
        discountMinor: source.discountMinor,
        netMinor: source.netMinor,
        taxMinor: source.taxMinor,
        totalMinor: source.totalMinor,
        paymentInstructionsAr: source.paymentInstructionsAr,
        paymentInstructionsEn: source.paymentInstructionsEn,
        paymentTermsDays: source.paymentTermsDays,
        autoIssueInvoice: source.autoIssueInvoice,
        autoSendEmail: source.autoSendEmail,
        lastRunDate: null,
        lastInvoiceId: null,
        invoicesCount: 0,
        notesAr: source.notesAr,
        notesEn: source.notesEn,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    items.forEach((item, index) => {
      tx.insert(subscriptionItems)
        .values({
          id: newId(),
          subscriptionId: newSubId,
          position: index + 1,
          descriptionAr: item.descriptionAr,
          descriptionEn: item.descriptionEn,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          taxRateBp: item.taxRateBp,
          subtotalMinor: item.subtotalMinor,
          taxMinor: item.taxMinor,
          totalMinor: item.totalMinor,
          createdAt: now,
        })
        .run();
    });

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "subscription.duplicated",
      entityType: "subscription",
      entityId: newSubId,
      meta: { sourceId: id },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });

  return newSubId;
}

