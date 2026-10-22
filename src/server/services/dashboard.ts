// Dossier - Dashboard Service
// https://github.com/red-shadows-rs/dossier

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
import { addDays, nowMs, todayInTz, utcEndOfDayMs, utcStartOfDayMs } from "@/lib/dates";
import type { CurrencyCode } from "@/lib/constants";
import {
  aggregateAmountsToCurrency,
  type ConvertedAggregate,
  type ExchangeRates,
} from "@/lib/currency";
import { getCachedExchangeRates } from "@/server/services/currency";
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

export type MonthlyPoint = {
  month: string;
  issued: number;
  signed: number;
};

export type DashboardRange =
  | "today"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "this_year"
  | "all"
  | "custom";

export type DashboardFilterOptions = {
  range?: DashboardRange;
  from?: string;
  to?: string;
};

export type DashboardData = {
  filter: {
    range: DashboardRange;
    start: string;
    end: string;
    isFiltered: boolean;
  };
  revenueInPeriod: CurrencyAmount[];
  issuedInPeriod: { count: number; amounts: CurrencyAmount[] };
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
  monthlyActivity: MonthlyPoint[];
  currencyRates: {
    targetCurrency: CurrencyCode;
    rates: ExchangeRates;
    updatedAt: number;
    totals: {
      outstanding: ConvertedAggregate;
      overdue: ConvertedAggregate;
      revenueInPeriod: ConvertedAggregate;
      issuedInPeriod: ConvertedAggregate;
      revenueCurrentMonth: ConvertedAggregate;
      revenuePreviousMonth: ConvertedAggregate;
    };
  };
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

function recentActivity(startMs?: number, endMs?: number): ActivityRow[] {
  const conditions = [inArray(auditLog.entityType, ["contract", "invoice", "payment"])];
  if (startMs !== undefined) conditions.push(gte(auditLog.ts, startMs));
  if (endMs !== undefined) conditions.push(lte(auditLog.ts, endMs));
  return db
    .select()
    .from(auditLog)
    .where(and(...conditions))
    .orderBy(desc(auditLog.ts), desc(auditLog.id))
    .limit(ACTIVITY_LIMIT)
    .all();
}

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

function activeProjects(): number {
  return (
    db
      .select({ value: count() })
      .from(projects)
      .where(and(isNull(projects.archivedAt), eq(projects.status, "active")))
      .get()?.value ?? 0
  );
}

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

function lastMonths(today: string, count: number): string[] {
  const months: string[] = [];
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7));
  for (let i = 0; i < count; i += 1) {
    months.unshift(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return months;
}

function monthlyActivity(today: string, count = 6): MonthlyPoint[] {
  const months = lastMonths(today, count);
  const buckets = new Map<string, MonthlyPoint>(
    months.map((month) => [month, { month, issued: 0, signed: 0 }]),
  );

  const issuedRows = db
    .select({ issueDate: invoices.issueDate })
    .from(invoices)
    .where(
      and(
        inArray(invoices.status, ["issued", "partially_paid", "paid"]),
        sql`${invoices.issueDate} IS NOT NULL`,
        gte(invoices.issueDate, `${months[0]}-01`),
      ),
    )
    .all();
  for (const row of issuedRows) {
    const bucket = buckets.get((row.issueDate as string).slice(0, 7));
    if (bucket) bucket.issued += 1;
  }

  const signedRows = db
    .select({ signedAt: contracts.signedAt })
    .from(contracts)
    .where(sql`${contracts.signedAt} IS NOT NULL`)
    .all();
  for (const row of signedRows) {
    if (row.signedAt === null) continue;
    const bucket = buckets.get(
      new Date(row.signedAt).toISOString().slice(0, 7),
    );
    if (bucket) bucket.signed += 1;
  }

  return months.map(
    (month) => buckets.get(month) ?? { month, issued: 0, signed: 0 },
  );
}

export function getDashboard(
  today = todayInTz(getSettings("defaults").timezone),
  filterOptions?: DashboardFilterOptions,
): DashboardData {
  const { currentStart, currentEnd, previousStart, previousEnd } =
    monthBounds(today);
  const totals = invoiceTotals(today);
  const clientStats = clientCounts(currentStart);
  const issued = issuedInRange(currentStart, currentEnd);

  const range: DashboardRange = filterOptions?.range ?? "this_month";
  const year = today.slice(0, 4);

  let periodStart = currentStart;
  let periodEnd = currentEnd;
  let isFiltered = false;

  switch (range) {
    case "today":
      periodStart = today;
      periodEnd = today;
      isFiltered = true;
      break;
    case "7d":
      periodStart = addDays(today, -7);
      periodEnd = today;
      isFiltered = true;
      break;
    case "30d":
      periodStart = addDays(today, -30);
      periodEnd = today;
      isFiltered = true;
      break;
    case "last_month":
      periodStart = previousStart;
      periodEnd = previousEnd;
      isFiltered = true;
      break;
    case "this_year":
      periodStart = `${year}-01-01`;
      periodEnd = `${year}-12-31`;
      isFiltered = true;
      break;
    case "all":
      periodStart = "1970-01-01";
      periodEnd = "2099-12-31";
      isFiltered = true;
      break;
    case "custom":
      periodStart =
        filterOptions?.from && filterOptions.from.length === 10
          ? filterOptions.from
          : currentStart;
      periodEnd =
        filterOptions?.to && filterOptions.to.length === 10
          ? filterOptions.to
          : today;
      isFiltered = true;
      break;
    case "this_month":
    default:
      periodStart = currentStart;
      periodEnd = currentEnd;
      isFiltered = false;
      break;
  }

  const revenueInPeriod = revenueInRange(periodStart, periodEnd);
  const issuedInPeriod = issuedInRange(periodStart, periodEnd);
  const activityStartMs = isFiltered ? utcStartOfDayMs(periodStart) : undefined;
  const activityEndMs = isFiltered ? utcEndOfDayMs(periodEnd) : undefined;

  const targetCurrency = getSettings("defaults").currency as CurrencyCode;
  const { rates, updatedAt: ratesUpdatedAt } = getCachedExchangeRates();
  const revenueCurrentMonth = revenueInRange(currentStart, currentEnd);
  const revenuePreviousMonth = revenueInRange(previousStart, previousEnd);

  const currencyRates = {
    targetCurrency,
    rates,
    updatedAt: ratesUpdatedAt,
    totals: {
      outstanding: aggregateAmountsToCurrency(totals.outstanding, targetCurrency, rates),
      overdue: aggregateAmountsToCurrency(totals.overdue.amounts, targetCurrency, rates),
      revenueInPeriod: aggregateAmountsToCurrency(revenueInPeriod, targetCurrency, rates),
      issuedInPeriod: aggregateAmountsToCurrency(issuedInPeriod.amounts, targetCurrency, rates),
      revenueCurrentMonth: aggregateAmountsToCurrency(revenueCurrentMonth, targetCurrency, rates),
      revenuePreviousMonth: aggregateAmountsToCurrency(revenuePreviousMonth, targetCurrency, rates),
    },
  };

  return {
    filter: {
      range,
      start: periodStart,
      end: periodEnd,
      isFiltered,
    },
    revenueInPeriod,
    issuedInPeriod,
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
      currentMonth: revenueCurrentMonth,
      previousMonth: revenuePreviousMonth,
    },
    endingSoon: endingSoon(today),
    recentActivity: recentActivity(activityStartMs, activityEndMs),
    clientsTotal: clientStats.total,
    clientsNewThisMonth: clientStats.newThisMonth,
    projectsActive: activeProjects(),
    contractsActive: activeContracts(),
    contractsByStatus: contractStatusCounts(),
    invoicesByStatus: invoiceStatusCounts(),
    issuedThisMonth: issued,
    monthlyActivity: monthlyActivity(today),
    currencyRates,
  };
}
