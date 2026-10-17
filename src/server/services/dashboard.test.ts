// Dossier - Dashboard Tests
// https://github.com/red-shadows-rs/dossier

import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  auditLog,
  clients,
  contracts,
  invoices,
  payments,
  projects,
} from "@/db/schema";
import { addDays, nowMs } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { getDashboard } from "./dashboard";

const TODAY = "2026-06-15";
const MS_PER_DAY = 86_400_000;
const NOW = nowMs();

type ContractOverrides = Partial<typeof contracts.$inferInsert>;
type InvoiceOverrides = Partial<typeof invoices.$inferInsert>;

let clientId: string;
let projectId: string;
let sentId: string;
let signedId: string;
let completedId: string;
let paidInvoiceId: string;
let aedInvoiceId: string;

function insertContract(overrides: ContractOverrides): string {
  const id = newId();
  db.insert(contracts)
    .values({
      id,
      clientId,
      projectId,
      status: "draft",
      currency: "SAR",
      discountType: "none",
      discountValue: 0,
      taxRateBp: 0,
      versionNo: 1,
      paymentTermsDays: 14,
      milestoneMode: "percent",
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides,
    })
    .run();
  return id;
}

function insertInvoice(overrides: InvoiceOverrides): string {
  const id = newId();
  db.insert(invoices)
    .values({
      id,
      clientId,
      projectId,
      status: "draft",
      currency: "SAR",
      discountType: "none",
      discountValue: 0,
      taxRateBp: 0,
      totalMinor: 0,
      paidMinor: 0,
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides,
    })
    .run();
  return id;
}

function insertPayment(
  invoiceId: string,
  amountMinor: number,
  paidOn: string,
  voidedAt: number | null = null,
): void {
  db.insert(payments)
    .values({
      id: newId(),
      invoiceId,
      amountMinor,
      paidOn,
      method: "bank_transfer",
      voidedAt,
      createdAt: NOW,
    })
    .run();
}

beforeAll(() => {
  clientId = newId();
  projectId = newId();
  db.insert(clients)
    .values({
      id: clientId,
      type: "company",
      nameAr: "شركة النور",
      nameEn: "Al-Noor Co.",
      preferredLanguage: "ar",
      createdAt: NOW,
      updatedAt: NOW,
    })
    .run();
  db.insert(projects)
    .values({
      id: projectId,
      code: `P-${projectId.slice(0, 6).toUpperCase()}`,
      clientId,
      nameAr: "متجر إلكتروني",
      nameEn: "Online Store",
      currency: "SAR",
      createdAt: NOW,
      updatedAt: NOW,
    })
    .run();

  sentId = insertContract({
    status: "sent",
    number: "DOS-C-2026-0001",
    sentAt: NOW - 5 * MS_PER_DAY,
  });
  signedId = insertContract({
    status: "signed",
    number: "DOS-C-2026-0002",
    signedAt: NOW - 10 * MS_PER_DAY,
    endDate: addDays(TODAY, 10),
  });
  completedId = insertContract({
    status: "completed",
    number: "DOS-C-2026-0003",
    signedAt: NOW - 400 * MS_PER_DAY,
    endDate: addDays(TODAY, 20),
  });
  insertContract({ status: "draft" });
  insertContract({ status: "draft" });

  insertInvoice({
    status: "issued",
    number: "DOS-I-2026-0001",
    totalMinor: 100_000,
    paidMinor: 0,
    dueDate: addDays(TODAY, -3),
  });
  insertInvoice({
    status: "partially_paid",
    number: "DOS-I-2026-0002",
    totalMinor: 200_000,
    paidMinor: 50_000,
    dueDate: addDays(TODAY, -1),
  });
  insertInvoice({
    status: "issued",
    number: "DOS-I-2026-0003",
    totalMinor: 300_000,
    paidMinor: 0,
    dueDate: addDays(TODAY, 3),
  });
  insertInvoice({
    status: "issued",
    number: "DOS-I-2026-0004",
    totalMinor: 400_000,
    paidMinor: 0,
    dueDate: addDays(TODAY, 30),
  });
  insertInvoice({ status: "draft" });
  paidInvoiceId = insertInvoice({
    status: "paid",
    number: "DOS-I-2026-0005",
    totalMinor: 500_000,
    paidMinor: 500_000,
    dueDate: addDays(TODAY, -30),
  });
  aedInvoiceId = insertInvoice({
    status: "partially_paid",
    number: "DOS-I-2026-0006",
    currency: "AED",
    totalMinor: 50_000,
    paidMinor: 30_000,
    dueDate: addDays(TODAY, -1),
  });

  insertPayment(aedInvoiceId, 30_000, "2026-06-05");
  insertPayment(paidInvoiceId, 100_000, "2026-06-10");
  insertPayment(paidInvoiceId, 50_000, "2026-06-14");
  insertPayment(paidInvoiceId, 222_222, "2026-06-01");
  insertPayment(paidInvoiceId, 111_111, "2026-05-31");
  insertPayment(paidInvoiceId, 70_000, "2026-05-20");
  insertPayment(paidInvoiceId, 888_888, "2026-04-10");
  insertPayment(paidInvoiceId, 999_999, "2026-06-12", NOW);

  const insertAudit = (
    entityType: string,
    action: string,
    ts: number,
  ): void => {
    db.insert(auditLog)
      .values({
        ts,
        actorType: "user",
        actorId: null,
        action,
        entityType,
        entityId: "x",
      })
      .run();
  };
  insertAudit("contract", "contract.signed", NOW - 1000);
  insertAudit("invoice", "invoice.issued", NOW - 2000);
  insertAudit("payment", "payment.recorded", NOW - 3000);
  insertAudit("client", "client.created", NOW); 
});

describe("getDashboard (7.12)", () => {
  const data = () => getDashboard(TODAY);

  it("counts contracts awaiting signature with days waiting", () => {
    const { count, rows } = data().awaitingSignature;
    expect(count).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(sentId);
    expect(rows[0].number).toBe("DOS-C-2026-0001");
    expect(rows[0].clientNameEn).toBe("Al-Noor Co.");
    expect(rows[0].daysWaiting).toBe(5);
  });

  it("counts contracts signed in the last 30 days", () => {
    expect(data().signedLast30Days).toBe(1);
  });

  it("counts draft contracts and draft invoices", () => {
    expect(data().draftContracts).toBe(2);
    expect(data().draftInvoices).toBe(1);
  });

  it("computes outstanding and overdue per currency", () => {
    const result = data();
    expect(result.outstanding).toEqual([
      { currency: "AED", amountMinor: 20_000 },
      { currency: "SAR", amountMinor: 950_000 },
    ]);
    expect(result.overdue.count).toBe(3);
    expect(result.overdue.amounts).toEqual([
      { currency: "AED", amountMinor: 20_000 },
      { currency: "SAR", amountMinor: 250_000 },
    ]);
  });

  it("lists invoices due in the next 7 days", () => {
    const rows = data().dueSoon;
    expect(rows).toHaveLength(1);
    expect(rows[0].number).toBe("DOS-I-2026-0003");
    expect(rows[0].dueDate).toBe(addDays(TODAY, 3));
    expect(rows[0].outstandingMinor).toBe(300_000);
  });

  it("sums revenue by paidOn with month boundaries and excludes voided", () => {
    const { currentMonth, previousMonth } = data().revenue;
    expect(currentMonth).toEqual([
      { currency: "AED", amountMinor: 30_000 },
      { currency: "SAR", amountMinor: 372_222 },
    ]);
    expect(previousMonth).toEqual([{ currency: "SAR", amountMinor: 181_111 }]);
  });

  it("lists signed contracts ending within 30 days", () => {
    const { count, rows } = data().endingSoon;
    expect(count).toBe(2);
    expect(rows.map((row) => row.id)).toEqual([signedId, completedId]);
    expect(rows.map((row) => row.endDate)).toEqual([
      addDays(TODAY, 10),
      addDays(TODAY, 20),
    ]);
  });

  it("returns the last 15 contract/invoice/payment audit rows", () => {
    const rows = data().recentActivity;
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.entityType !== "client")).toBe(true);
    expect(rows.map((row) => row.action)).toEqual([
      "contract.signed",
      "invoice.issued",
      "payment.recorded",
    ]);
  });
});
