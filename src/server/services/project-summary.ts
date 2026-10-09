import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  contracts,
  files,
  invoices,
  paymentMilestones,
} from "@/db/schema";
import { todayInTz } from "@/lib/dates";
import { getSettings } from "@/server/services/settings";

export type CurrencySummary = {
  currency: string;
  contractedMinor: number;
  invoicedMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  overdueMinor: number;
  remainingToInvoiceMinor: number;
};

function bump(
  map: Map<string, CurrencySummary>,
  currency: string,
): CurrencySummary {
  const existing = map.get(currency);
  if (existing) return existing;
  const fresh: CurrencySummary = {
    currency,
    contractedMinor: 0,
    invoicedMinor: 0,
    paidMinor: 0,
    outstandingMinor: 0,
    overdueMinor: 0,
    remainingToInvoiceMinor: 0,
  };
  map.set(currency, fresh);
  return fresh;
}

// DOSSIER_PLAN.md 7.11 — project financial summary grouped per currency.
export function getProjectSummary(projectId: string): CurrencySummary[] {
  const today = todayInTz(getSettings("defaults").timezone);
  const map = new Map<string, CurrencySummary>();

  const contractRows = db
    .select()
    .from(contracts)
    .where(eq(contracts.projectId, projectId))
    .all();

  for (const contract of contractRows) {
    if (contract.status === "signed" || contract.status === "completed") {
      bump(map, contract.currency).contractedMinor += contract.totalMinor;
    }
  }

  const invoiceRows = db
    .select()
    .from(invoices)
    .where(eq(invoices.projectId, projectId))
    .all();

  for (const invoice of invoiceRows) {
    if (
      invoice.status === "issued" ||
      invoice.status === "partially_paid" ||
      invoice.status === "paid"
    ) {
      const summary = bump(map, invoice.currency);
      summary.invoicedMinor += invoice.totalMinor;
      summary.paidMinor += invoice.paidMinor;
      summary.outstandingMinor += invoice.totalMinor - invoice.paidMinor;
      if (
        (invoice.status === "issued" || invoice.status === "partially_paid") &&
        invoice.dueDate !== null &&
        invoice.dueDate < today
      ) {
        summary.overdueMinor += invoice.totalMinor - invoice.paidMinor;
      }
    }
  }

  // Milestones of signed/completed contracts with no active invoice.
  const activeContractIds = contractRows
    .filter((c) => c.status === "signed" || c.status === "completed")
    .map((c) => c.id);
  if (activeContractIds.length > 0) {
    const milestoneRows = db
      .select({
        totalMinor: paymentMilestones.totalMinor,
        currency: contracts.currency,
      })
      .from(paymentMilestones)
      .innerJoin(contracts, eq(paymentMilestones.contractId, contracts.id))
      .where(
        and(
          inArray(paymentMilestones.contractId, activeContractIds),
          sql`NOT EXISTS (SELECT 1 FROM invoices i WHERE i.milestone_id = ${paymentMilestones.id} AND i.status <> 'void')`,
        ),
      )
      .all();
    for (const milestone of milestoneRows) {
      bump(map, milestone.currency).remainingToInvoiceMinor +=
        milestone.totalMinor;
    }
  }

  return [...map.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export type ProjectActivityRow = typeof auditLog.$inferSelect;

// Activity = audit rows for the project and its contracts/invoices.
export function listProjectActivity(projectId: string): ProjectActivityRow[] {
  const contractIds = db
    .select({ id: contracts.id })
    .from(contracts)
    .where(eq(contracts.projectId, projectId))
    .all()
    .map((row) => row.id);
  const invoiceIds = db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.projectId, projectId))
    .all()
    .map((row) => row.id);

  const clauses = [
    and(eq(auditLog.entityType, "project"), eq(auditLog.entityId, projectId)),
    contractIds.length > 0
      ? and(
          eq(auditLog.entityType, "contract"),
          inArray(auditLog.entityId, contractIds),
        )
      : undefined,
    invoiceIds.length > 0
      ? and(
          eq(auditLog.entityType, "invoice"),
          inArray(auditLog.entityId, invoiceIds),
        )
      : undefined,
  ].filter((clause): clause is SQL => clause !== undefined);

  return db
    .select()
    .from(auditLog)
    .where(or(...clauses))
    .orderBy(desc(auditLog.ts), desc(auditLog.id))
    .limit(50)
    .all();
}

export type ProjectAttachmentRow = {
  id: string;
  originalName: string | null;
  mime: string;
  sizeBytes: number;
  createdAt: number;
};

export function listProjectAttachments(
  projectId: string,
): ProjectAttachmentRow[] {
  return db
    .select({
      id: files.id,
      originalName: files.originalName,
      mime: files.mime,
      sizeBytes: files.sizeBytes,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(
      and(
        eq(files.ownerType, "project"),
        eq(files.ownerId, projectId),
        eq(files.kind, "attachment"),
      ),
    )
    .orderBy(desc(files.createdAt))
    .all();
}
