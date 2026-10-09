import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db, withTx, type DbTx } from "@/db";
import { invoices, payments } from "@/db/schema";
import { nowMs, todayInTz } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import type { RecordPaymentInput } from "@/lib/validation/invoices";
import type { RequestMeta, SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import { getSettings } from "@/server/services/settings";

export const PAYMENTS_PAGE_SIZE = 20;

export type PaymentRow = typeof payments.$inferSelect;

export type PaymentDetail = {
  payment: PaymentRow;
  invoiceNumber: string | null;
  invoiceTotalMinor: number;
  currency: string;
};

function recomputeInvoice(
  tx: DbTx,
  invoiceId: string,
  now: number,
): {
  paidMinor: number;
  status: "issued" | "partially_paid" | "paid";
  paidAt: number | null;
} {
  const invoice = tx
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .get();
  if (!invoice) {
    throw new AppError("NOT_FOUND", "Invoice not found");
  }
  const paidMinor =
    tx
      .select({
        value: sql<number>`coalesce(sum(${payments.amountMinor}), 0)`,
      })
      .from(payments)
      .where(and(eq(payments.invoiceId, invoiceId), isNull(payments.voidedAt)))
      .get()?.value ?? 0;

  if (paidMinor === 0) {
    return { paidMinor, status: "issued", paidAt: null };
  }
  if (paidMinor >= invoice.totalMinor) {
    return { paidMinor, status: "paid", paidAt: now };
  }
  return { paidMinor, status: "partially_paid", paidAt: null };
}

export function recordPayment(
  user: SessionUser,
  invoiceId: string,
  input: RecordPaymentInput,
  meta: RequestMeta,
): string {
  const now = nowMs();
  const today = todayInTz(getSettings("defaults").timezone);
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 1) {
    throw new AppError("VALIDATION_FAILED", "The amount must be positive", {
      amountMinor: "errors.invalid",
    });
  }
  if (input.paidOn > today) {
    throw new AppError(
      "VALIDATION_FAILED",
      "The payment date is in the future",
      {
        paidOn: "errors.invalid",
      },
    );
  }
  const id = newId();

  withTx((tx) => {
    const invoice = tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .get();
    if (!invoice) {
      throw new AppError("NOT_FOUND", "Invoice not found");
    }
    if (invoice.status !== "issued" && invoice.status !== "partially_paid") {
      throw new AppError(
        "INVALID_STATE",
        "Only an issued invoice can receive payments",
      );
    }
    const remaining = invoice.totalMinor - invoice.paidMinor;
    if (input.amountMinor > remaining) {
      throw new AppError(
        "PAYMENT_EXCEEDS_BALANCE",
        "The amount exceeds the remaining balance",
      );
    }

    tx.insert(payments)
      .values({
        id,
        invoiceId,
        amountMinor: input.amountMinor,
        paidOn: input.paidOn,
        method: input.method,
        reference: input.reference,
        notes: input.notes,
        createdBy: user.id,
        createdAt: now,
      })
      .run();

    const next = recomputeInvoice(tx, invoiceId, now);
    tx.update(invoices)
      .set({
        paidMinor: next.paidMinor,
        status: next.status,
        paidAt: next.paidAt,
        updatedAt: now,
      })
      .where(eq(invoices.id, invoiceId))
      .run();

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.payment_recorded",
      entityType: "invoice",
      entityId: invoiceId,
      meta: { paymentId: id, amountMinor: input.amountMinor },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });

  return id;
}

export function voidPayment(
  user: SessionUser,
  paymentId: string,
  reason: string,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const payment = tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .get();
    if (!payment) {
      throw new AppError("NOT_FOUND", "Payment not found");
    }
    if (payment.voidedAt !== null) {
      throw new AppError("INVALID_STATE", "The payment is already void");
    }

    tx.update(payments)
      .set({ voidedAt: now, voidReason: reason })
      .where(eq(payments.id, paymentId))
      .run();

    const next = recomputeInvoice(tx, payment.invoiceId, now);
    tx.update(invoices)
      .set({
        paidMinor: next.paidMinor,
        status: next.status,
        paidAt: next.paidAt,
        updatedAt: now,
      })
      .where(eq(invoices.id, payment.invoiceId))
      .run();

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "invoice.payment_voided",
      entityType: "invoice",
      entityId: payment.invoiceId,
      meta: { paymentId, reason },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function listPayments(invoiceId: string): PaymentRow[] {
  return db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(asc(payments.paidOn), asc(payments.createdAt))
    .all();
}

export function listPaymentsPaged(
  invoiceId: string,
  page = 1,
): { rows: PaymentRow[]; total: number; page: number; pageSize: number } {
  const total =
    db
      .select({ value: count() })
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .get()?.value ?? 0;
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const rows = db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(desc(payments.createdAt), desc(payments.id))
    .limit(PAYMENTS_PAGE_SIZE)
    .offset((safePage - 1) * PAYMENTS_PAGE_SIZE)
    .all();
  return { rows, total, page: safePage, pageSize: PAYMENTS_PAGE_SIZE };
}

export function getPaymentDetail(paymentId: string): PaymentDetail {
  const row = db
    .select({
      payment: payments,
      invoiceNumber: invoices.number,
      invoiceTotalMinor: invoices.totalMinor,
      currency: invoices.currency,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(eq(payments.id, paymentId))
    .get();
  if (!row) {
    throw new AppError("NOT_FOUND", "Payment not found");
  }
  return row;
}
