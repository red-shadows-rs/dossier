import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/db";
import {
  clients,
  contracts,
  invoiceLines,
  invoices,
  paymentMilestones,
  payments,
  projects,
} from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { nowMs } from "@/lib/dates";
import { newId } from "@/lib/ids";

let db: DbInstance["db"];

beforeEach(() => {
  db = createTestDb().db;
});

function seed(): { clientId: string; projectId: string; milestoneId: string } {
  const now = nowMs();
  const clientId = newId();
  const projectId = newId();
  const contractId = newId();
  const milestoneId = newId();
  db.insert(clients)
    .values({
      id: clientId,
      type: "company",
      nameEn: "Client",
      preferredLanguage: "ar",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(projects)
    .values({
      id: projectId,
      code: `P-${projectId.slice(0, 4)}`,
      clientId,
      nameEn: "Project",
      currency: "SAR",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(contracts)
    .values({
      id: contractId,
      clientId,
      projectId,
      currency: "SAR",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(paymentMilestones)
    .values({
      id: milestoneId,
      contractId,
      position: 1,
      titleAr: "دفعة",
      titleEn: "Milestone",
      amountMinor: 100000,
      totalMinor: 115000,
    })
    .run();
  return { clientId, projectId, milestoneId };
}

function createInvoice(
  ids: { clientId: string; projectId: string; milestoneId: string },
  status: "draft" | "issued" | "void" = "draft",
  number: string | null = null,
): string {
  const id = newId();
  const now = nowMs();
  db.insert(invoices)
    .values({
      id,
      number,
      clientId: ids.clientId,
      projectId: ids.projectId,
      milestoneId: ids.milestoneId,
      status,
      currency: "SAR",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

describe("invoices_issued_immutable", () => {
  it("rejects editing the total of an issued invoice", () => {
    const ids = seed();
    const id = createInvoice(ids, "issued", "DOS-I-2026-0001");
    expect(() =>
      db
        .update(invoices)
        .set({ totalMinor: 999999 })
        .where(eq(invoices.id, id))
        .run(),
    ).toThrow(/immutable/);
    expect(() =>
      db
        .update(invoices)
        .set({ status: "paid", paidAt: nowMs() })
        .where(eq(invoices.id, id))
        .run(),
    ).not.toThrow();
  });

  it("allows the draft→issued transition to set money and identity columns", () => {
    const ids = seed();
    const id = createInvoice(ids, "draft");
    expect(() =>
      db
        .update(invoices)
        .set({
          status: "issued",
          number: "DOS-I-2026-0002",
          totalMinor: 115000,
        })
        .where(eq(invoices.id, id))
        .run(),
    ).not.toThrow();
  });
});

describe("invoices_no_delete_issued", () => {
  it("allows deleting a plain draft but not a numbered/issued invoice", () => {
    const ids = seed();
    const draft = createInvoice(ids, "draft");
    expect(() =>
      db.delete(invoices).where(eq(invoices.id, draft)).run(),
    ).not.toThrow();

    const issued = createInvoice(ids, "issued", "DOS-I-2026-0003");
    expect(() =>
      db.delete(invoices).where(eq(invoices.id, issued)).run(),
    ).toThrow(/cannot be deleted/);
  });
});

describe("one active invoice per milestone", () => {
  it("rejects a second active invoice for the same milestone", () => {
    const ids = seed();
    createInvoice(ids, "issued", "DOS-I-2026-0001");
    expect(() => createInvoice(ids, "draft")).toThrow();
    expect(() => createInvoice(ids, "issued", "DOS-I-2026-0002")).toThrow();
  });

  it("frees the milestone once the first invoice is void", () => {
    const ids = seed();
    const first = createInvoice(ids, "issued", "DOS-I-2026-0001");
    db.update(invoices)
      .set({ status: "void", voidedAt: nowMs() })
      .where(eq(invoices.id, first))
      .run();
    expect(() => createInvoice(ids, "draft")).not.toThrow();
  });

  it("allows many invoices without a milestone", () => {
    const ids = seed();
    const now = nowMs();
    for (let i = 0; i < 2; i += 1) {
      db.insert(invoices)
        .values({
          id: newId(),
          clientId: ids.clientId,
          projectId: ids.projectId,
          milestoneId: null,
          status: "draft",
          currency: "SAR",
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
    expect(db.select().from(invoices).all()).toHaveLength(2);
  });
});

describe("payments are append-only", () => {
  function addPayment(invoiceId: string): string {
    const id = newId();
    db.insert(payments)
      .values({
        id,
        invoiceId,
        amountMinor: 50000,
        paidOn: "2026-10-09",
        createdAt: nowMs(),
      })
      .run();
    return id;
  }

  it("rejects DELETE", () => {
    const ids = seed();
    const invoiceId = createInvoice(ids, "draft");
    const paymentId = addPayment(invoiceId);
    expect(() =>
      db.delete(payments).where(eq(payments.id, paymentId)).run(),
    ).toThrow(/cannot be deleted/);
  });

  it("rejects editing core columns but allows voiding", () => {
    const ids = seed();
    const invoiceId = createInvoice(ids, "draft");
    const paymentId = addPayment(invoiceId);
    expect(() =>
      db
        .update(payments)
        .set({ amountMinor: 1 })
        .where(eq(payments.id, paymentId))
        .run(),
    ).toThrow(/immutable/);
    expect(() =>
      db
        .update(payments)
        .set({ voidedAt: nowMs(), voidReason: "mistake" })
        .where(eq(payments.id, paymentId))
        .run(),
    ).not.toThrow();
  });

  it("rejects a non-positive amount", () => {
    const ids = seed();
    const invoiceId = createInvoice(ids, "draft");
    expect(() =>
      db
        .insert(payments)
        .values({
          id: newId(),
          invoiceId,
          amountMinor: 0,
          paidOn: "2026-10-09",
          createdAt: nowMs(),
        })
        .run(),
    ).toThrow();
  });
});

describe("invoice_lines are editable only in draft", () => {
  it("rejects insert/update/delete once the invoice is not a draft", () => {
    const ids = seed();
    const id = createInvoice(ids, "draft");
    const lineId = newId();
    db.insert(invoiceLines)
      .values({
        id: lineId,
        invoiceId: id,
        position: 1,
        unitPriceMinor: 100,
        lineTotalMinor: 100,
      })
      .run();

    db.update(invoices)
      .set({ status: "issued" })
      .where(eq(invoices.id, id))
      .run();

    expect(() =>
      db
        .insert(invoiceLines)
        .values({
          id: newId(),
          invoiceId: id,
          position: 2,
          unitPriceMinor: 1,
          lineTotalMinor: 1,
        })
        .run(),
    ).toThrow(/not editable/);
    expect(() =>
      db
        .update(invoiceLines)
        .set({ position: 3 })
        .where(eq(invoiceLines.id, lineId))
        .run(),
    ).toThrow(/not editable/);
    expect(() =>
      db.delete(invoiceLines).where(eq(invoiceLines.id, lineId)).run(),
    ).toThrow(/not editable/);
  });
});
