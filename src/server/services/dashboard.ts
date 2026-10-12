import { and, asc, count, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  clients,
  contracts,
  invoices,
  payments,
  projects,
} from "@/db/schema";
import { addDays, nowMs, todayInTz, utcStartOfDayMs } from "@/lib/dates";
import { getSettings } from "@/server/services/settings";

const MS_PER_DAY = 86_400_000;
const SIGNED_WINDOW_DAYS = 30;
const ENDING_WINDOW_DAYS = 30;
const DUE_SOON_DAYS = 7;
const ACTIVITY_LIMIT = 15;
const AWAITING_LIMIT = 50;
const ACTIVE_INVOICE_STATUSES = ["issued", "partially_paid"] as const;

export type CurrencyAmount = {
  currency: string;
  amountMinor: number;
};

export type AwaitingSignatureRow = {
  id: string;
  number: string | null;
  clientNameAr: string | null;
  clientNameEn: string | null;
  sentAt: number | null;
  daysWaiting: number;
};

export type DueSoonRow = {
  id: string;
  number: string | null;
  clientNameAr: string | null;
  clientNameEn: string | null;
  dueDate: string;
  currency: string;
  outstandingMinor: number;
};

export type EndingSoonRow = {
  id: string;
  number: string | null;
  clientNameAr: string | null;
  clientNameEn: string | null;
  endDate: string;
  currency: string;
};

export type ActivityRow = typeof auditLog.$inferSelect;

export type DashboardData = {
  awaitingSignature: { count: number; rows: AwaitingSignatureRow[] };
  signedLast30Days: number;
  draftContracts: number;
  draftInvoices: number;
  outstanding: CurrencyAmount[];
  overdue: { count: number; amounts: CurrencyAmount[] };
  dueSoon: DueSoonRow[];
  revenue: {
    currentMonth: CurrencyAmount[];
    previousMonth: CurrencyAmount[];
  };
  endingSoon: { count: number; rows: EndingSoonRow[] };
  recentActivity: ActivityRow[];
  clientsTotal: number;
  clientsNewThisMonth: number;
  projectsActive: number;
  contractsActive: number;
  contractsByStatus: Record<string, number>;
  invoicesByStatus: Record<string, number>;
  issuedThisMonth: { count: number; amounts: CurrencyAmount[] };
};

function addAmount(
  map: Map<string, number>,
  currency: string,
  amountMinor: number,
): void {
  map.set(currency, (map.get(currency) ?? 0) + amountMinor);
}

function toAmounts(map: Map<string, number>): CurrencyAmount[] {
  return [...map.entries()]
    .map(([currency, amountMinor]) => ({ currency, amountMinor }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

// 7.12.5 — calendar-month boundaries in the business timezone.
function monthBounds(today: string): {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
} {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const currentStart = `${today.slice(0, 7)}-01`;
  const previousEnd = addDays(currentStart, -1);
  const previousStart = `${previousEnd.slice(0, 7)}-01`;
  const nextMonthStart =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const currentEnd = addDays(nextMonthStart, -1);
  return { currentStart, currentEnd, previousStart, previousEnd };
}

// 7.12.5 — revenue from non-voided payments by paidOn, grouped per currency.
function revenueInRange(start: string, end: string): CurrencyAmount[] {
  const rows = db
    .select({
      currency: invoices.currency,
      amountMinor: payments.amountMinor,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(
      and(
        isNull(payments.voidedAt),
        gte(payments.paidOn, start),
        lte(payments.paidOn, end),
      ),
    )
    .all();
  const map = new Map<string, number>();
  for (const row of rows) {
    addAmount(map, row.currency, row.amountMinor);
  }
  return toAmounts(map);
}

// 7.12.1 — contracts awaiting signature.
function awaitingSignature(): {
  count: number;
  rows: AwaitingSignatureRow[];
} {
  const countRow =
    db
      .select({ value: count() })
      .from(contracts)
      .where(eq(contracts.status, "sent"))
      .get()?.value ?? 0;
  const rows = db
    .select({
      id: contracts.id,
      number: contracts.number,
      clientNameAr: clients.nameAr,
      clientNameEn: clients.nameEn,
      sentAt: contracts.sentAt,
    })
    .from(contracts)
    .innerJoin(clients, eq(contracts.clientId, clients.id))
    .where(eq(contracts.status, "sent"))
    .orderBy(asc(contracts.sentAt), asc(contracts.id))
    .limit(AWAITING_LIMIT)
    .all();
  const now = nowMs();
  return {
    count: countRow,
    rows: rows.map((row) => ({
      ...row,
      daysWaiting:
        row.sentAt === null
          ? 0
          : Math.max(0, Math.floor((now - row.sentAt) / MS_PER_DAY)),
    })),
  };
}

// 7.12.2 — contracts signed in the last 30 days.
function signedLast30Days(): number {
  const cutoff = nowMs() - SIGNED_WINDOW_DAYS * MS_PER_DAY;
  return (
    db
      .select({ value: count() })
      .from(contracts)
      .where(and(sql`${contracts.signedAt} IS NOT NULL`, gte(contracts.signedAt, cutoff)))
      .get()?.value ?? 0
  );
}

// 7.12.4 — outstanding and overdue invoices grouped per currency.
function invoiceTotals(today: string): {
  outstanding: CurrencyAmount[];
  overdue: { count: number; amounts: CurrencyAmount[] };
} {
  const rows = db
    .select({
      status: invoices.status,
      currency: invoices.currency,
      totalMinor: invoices.totalMinor,
      paidMinor: invoices.paidMinor,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .where(inArray(invoices.status, ACTIVE_INVOICE_STATUSES))
    .all();

  const outstandingMap = new Map<string, number>();
  const overdueMap = new Map<string, number>();
  let overdueCount = 0;

  for (const row of rows) {
    const remaining = row.totalMinor - row.paidMinor;
    if (remaining <= 0) continue;
    addAmount(outstandingMap, row.currency, remaining);
    if (row.dueDate !== null && row.dueDate < today) {
      overdueCount += 1;
      addAmount(overdueMap, row.currency, remaining);
    }
  }

  return {
    outstanding: toAmounts(outstandingMap),
    overdue: { count: overdueCount, amounts: toAmounts(overdueMap) },
  };
}

// 7.12.4 — invoices due in the next 7 days.
function dueSoon(today: string): DueSoonRow[] {
  const until = addDays(today, DUE_SOON_DAYS);
  return db
    .select({
      id: invoices.id,
      number: invoices.number,
      clientNameAr: clients.nameAr,
      clientNameEn: clients.nameEn,
      dueDate: invoices.dueDate,
      currency: invoices.currency,
      outstandingMinor: sql<number>`(${invoices.totalMinor} - ${invoices.paidMinor})`,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(
      and(
        inArray(invoices.status, ACTIVE_INVOICE_STATUSES),
        sql`${invoices.dueDate} IS NOT NULL`,
        gte(invoices.dueDate, today),
        lte(invoices.dueDate, until),
      ),
    )
    .orderBy(asc(invoices.dueDate), asc(invoices.id))
    .all()
    .filter((row): row is DueSoonRow => row.dueDate !== null);
}

// 7.12.6 — signed/completed contracts ending within 30 days.
function endingSoon(today: string): { count: number; rows: EndingSoonRow[] } {
  const until = addDays(today, ENDING_WINDOW_DAYS);
  const rows = db
    .select({
      id: contracts.id,
      number: contracts.number,
      clientNameAr: clients.nameAr,
      clientNameEn: clients.nameEn,
      endDate: contracts.endDate,
      currency: contracts.currency,
    })
    .from(contracts)
    .innerJoin(clients, eq(contracts.clientId, clients.id))
    .where(
      and(
        inArray(contracts.status, ["signed", "completed"]),
        sql`${contracts.endDate} IS NOT NULL`,
        gte(contracts.endDate, today),
        lte(contracts.endDate, until),
      ),
    )
    .orderBy(asc(contracts.endDate), asc(contracts.id))
    .all()
    .filter((row): row is EndingSoonRow => row.endDate !== null);
  return { count: rows.length, rows };
}

// 7.12.7 — last 15 audit rows on contracts/invoices/payments.
function recentActivity(): ActivityRow[] {
  return db
    .select()
    .from(auditLog)
    .where(inArray(auditLog.entityType, ["contract", "invoice", "payment"]))
    .orderBy(desc(auditLog.ts), desc(auditLog.id))
    .limit(ACTIVITY_LIMIT)
    .all();
}

// 7.12.8 — clients: total (non-archived) and created in the current month.
function clientCounts(currentStart: string): {
  total: number;
  newThisMonth: number;
} {
  const sinceMs = utcStartOfDayMs(currentStart);
  const total =
    db
      .select({ value: count() })
      .from(clients)
      .where(isNull(clients.archivedAt))
      .get()?.value ?? 0;
  const newThisMonth =
    db
      .select({ value: count() })
      .from(clients)
      .where(and(isNull(clients.archivedAt), gte(clients.createdAt, sinceMs)))
      .get()?.value ?? 0;
  return { total, newThisMonth };
}

// 7.12.9 — active projects (non-archived, status = active).
function activeProjects(): number {
  return (
    db
      .select({ value: count() })
      .from(projects)
      .where(and(isNull(projects.archivedAt), eq(projects.status, "active")))
      .get()?.value ?? 0
  );
}

// 7.12.10 — contracts in force (signed or completed).
function activeContracts(): number {
  return (
    db
      .select({ value: count() })
      .from(contracts)
      .where(inArray(contracts.status, ["signed", "completed"]))
      .get()?.value ?? 0
  );
}

function contractStatusCounts(): Record<string, number> {
  const rows = db
    .select({ status: contracts.status, value: count() })
    .from(contracts)
    .groupBy(contracts.status)
    .all();
  const out: Record<string, number> = {};
  for (const row of rows) out[row.status] = row.value;
  return out;
}

function invoiceStatusCounts(): Record<string, number> {
  const rows = db
    .select({ status: invoices.status, value: count() })
    .from(invoices)
    .groupBy(invoices.status)
    .all();
  const out: Record<string, number> = {};
  for (const row of rows) out[row.status] = row.value;
  return out;
}

// 7.12.11 — invoices issued in the current month (count + totals per currency).
function issuedInRange(start: string, end: string): {
  count: number;
  amounts: CurrencyAmount[];
} {
  const rows = db
    .select({
      currency: invoices.currency,
      totalMinor: invoices.totalMinor,
    })
    .from(invoices)
    .where(
      and(
        inArray(invoices.status, ["issued", "partially_paid", "paid"]),
        sql`${invoices.issueDate} IS NOT NULL`,
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
      ),
    )
    .all();
  const map = new Map<string, number>();
  for (const row of rows) {
    addAmount(map, row.currency, row.totalMinor);
  }
  return { count: rows.length, amounts: toAmounts(map) };
}

// DOSSIER_PLAN.md 7.12 — dashboard metrics.
export function getDashboard(
  today = todayInTz(getSettings("defaults").timezone),
): DashboardData {
  const { currentStart, currentEnd, previousStart, previousEnd } =
    monthBounds(today);
  const totals = invoiceTotals(today);
  const clientStats = clientCounts(currentStart);
  const issued = issuedInRange(currentStart, currentEnd);

  return {
    awaitingSignature: awaitingSignature(),
    signedLast30Days: signedLast30Days(),
    draftContracts:
      db
        .select({ value: count() })
        .from(contracts)
        .where(eq(contracts.status, "draft"))
        .get()?.value ?? 0,
    draftInvoices:
      db
        .select({ value: count() })
        .from(invoices)
        .where(eq(invoices.status, "draft"))
        .get()?.value ?? 0,
    outstanding: totals.outstanding,
    overdue: totals.overdue,
    dueSoon: dueSoon(today),
    revenue: {
      currentMonth: revenueInRange(currentStart, currentEnd),
      previousMonth: revenueInRange(previousStart, previousEnd),
    },
    endingSoon: endingSoon(today),
    recentActivity: recentActivity(),
    clientsTotal: clientStats.total,
    clientsNewThisMonth: clientStats.newThisMonth,
    projectsActive: activeProjects(),
    contractsActive: activeContracts(),
    contractsByStatus: contractStatusCounts(),
    invoicesByStatus: invoiceStatusCounts(),
    issuedThisMonth: issued,
  };
}
