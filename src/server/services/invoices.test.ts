import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  contracts,
  invoices,
  paymentMilestones,
  projects,
} from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import { updateSettings } from "@/server/services/settings";
import {
  createInvoice,
  createInvoiceFromMilestone,
  deleteDraftInvoice,
  getInvoiceDetail,
  isOverdue,
  issueInvoice,
  listInvoiceableMilestones,
  listInvoices,
  saveInvoiceLines,
  updateInvoiceDraft,
  voidInvoice,
} from "./invoices";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

async function ownerUser(): Promise<SessionUser> {
  const created = await createTestUser({ role: "owner" });
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: "owner",
    locale: "ar",
    canSignForCompany: true,
    signerTitleAr: null,
    signerTitleEn: null,
  };
}

let user: SessionUser;
let clientId: string;
let projectId: string;
let contractId: string;
let contractNumber: string;
let milestoneIds: string[];

function seedFixture(contractStatus: "signed" | "draft" = "signed"): void {
  const now = nowMs();
  clientId = newId();
  projectId = newId();
  contractId = newId();
  db.insert(clients)
    .values({
      id: clientId,
      type: "company",
      nameAr: "شركة النور",
      nameEn: "Al-Noor Co.",
      email: "c@example.com",
      preferredLanguage: "ar",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(projects)
    .values({
      id: projectId,
      code: `P-${projectId.slice(0, 6).toUpperCase()}`,
      clientId,
      nameAr: "متجر",
      nameEn: "Store",
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
      status: "draft",
      number: null,
      languageMode: "bilingual",
      currency: "SAR",
      taxRateBp: 1500,
      subtotalMinor: 1_000_001,
      netMinor: 1_000_001,
      taxMinor: 150_000,
      totalMinor: 1_150_001,
      paymentTermsDays: 14,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const amounts = [
    { amount: 300000, tax: 45000, total: 345000, bp: 3000, idx: 1 },
    { amount: 400001, tax: 60000, total: 460001, bp: 4000, idx: 2 },
    { amount: 300000, tax: 45000, total: 345000, bp: 3000, idx: 3 },
  ];
  milestoneIds = amounts.map((entry) => {
    const id = newId();
    db.insert(paymentMilestones)
      .values({
        id,
        contractId,
        position: entry.idx,
        titleAr: `دفعة ${entry.idx}`,
        titleEn: `Milestone ${entry.idx}`,
        percentBp: entry.bp,
        amountMinor: entry.amount,
        taxMinor: entry.tax,
        totalMinor: entry.total,
      })
      .run();
    return id;
  });
  if (contractStatus === "signed") {
    // Milestones only insert while the contract is a draft; sign it afterwards.
    db.update(contracts)
      .set({
        status: "signed",
        number: `DOS-C-2026-${contractId.slice(0, 4).toUpperCase()}`,
      })
      .where(eq(contracts.id, contractId))
      .run();
  }
  contractNumber =
    db.select().from(contracts).where(eq(contracts.id, contractId)).get()
      ?.number ?? "—";
}

beforeEach(async () => {
  // Signed contracts / issued invoices are immutable, so tests never clean up
  // shared rows: each test creates its own company-independent fixture with
  // unique ids (same approach as the trigger integrity tests).
  user = await ownerUser();
  updateSettings(
    "company",
    {
      nameAr: "ريد شادوز",
      nameEn: "RED SHADOWS",
      email: "hello@example.com",
      bank: {
        bankNameAr: "بنك",
        bankNameEn: "Bank",
        accountHolder: "RS",
        iban: "SA00",
        swift: "XXXX",
      },
    },
    user,
    META,
  );
  seedFixture("signed");
});

describe("createInvoiceFromMilestone (16.1 vectors)", () => {
  it("copies milestone 2 exactly: line 400001, tax 60000, total 460001", () => {
    const id = createInvoiceFromMilestone(user, milestoneIds[1], META);
    const detail = getInvoiceDetail(id);
    expect(detail.lines).toHaveLength(1);
    expect(detail.lines[0].unitPriceMinor).toBe(400001);
    expect(detail.lines[0].qtyMilli).toBe(1000);
    expect(detail.lines[0].lineTotalMinor).toBe(400001);
    expect(detail.lines[0].descriptionEn).toBe(
      `Milestone 2 — ${contractNumber}`,
    );
    expect(detail.invoice.subtotalMinor).toBe(400001);
    expect(detail.invoice.netMinor).toBe(400001);
    expect(detail.invoice.taxMinor).toBe(60000);
    expect(detail.invoice.totalMinor).toBe(460001);
    expect(detail.invoice.status).toBe("draft");
    expect(detail.invoice.milestoneId).toBe(milestoneIds[1]);
  });

  it("requires a signed or completed contract", () => {
    // A separate draft contract (never signed) cannot produce an invoice.
    const draftContractId = newId();
    const now = nowMs();
    db.insert(contracts)
      .values({
        id: draftContractId,
        clientId,
        projectId,
        status: "draft",
        languageMode: "bilingual",
        currency: "SAR",
        paymentTermsDays: 14,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const draftMilestoneId = newId();
    db.insert(paymentMilestones)
      .values({
        id: draftMilestoneId,
        contractId: draftContractId,
        position: 1,
        titleAr: "دفعة",
        titleEn: "Milestone",
        amountMinor: 100,
        totalMinor: 100,
      })
      .run();
    expect(() =>
      createInvoiceFromMilestone(user, draftMilestoneId, META),
    ).toThrow(AppError);
  });

  it("rejects a second active invoice for the same milestone; voiding frees it", () => {
    const first = createInvoiceFromMilestone(user, milestoneIds[0], META);
    expect(() =>
      createInvoiceFromMilestone(user, milestoneIds[0], META),
    ).toThrow(AppError);
    issueInvoice(user, first, META);
    voidInvoice(user, first, "mistake", META);
    expect(() =>
      createInvoiceFromMilestone(user, milestoneIds[0], META),
    ).not.toThrow();
  });

  it("locks lines and tax for milestone invoices", () => {
    const id = createInvoiceFromMilestone(user, milestoneIds[1], META);
    expect(() =>
      saveInvoiceLines(
        user,
        id,
        {
          lines: [
            {
              descriptionAr: "x",
              descriptionEn: "x",
              qtyMilli: 1000,
              unitPriceMinor: 1,
            },
          ],
          discount: { type: "none", value: 0 },
          taxRateBp: 0,
        },
        META,
      ),
    ).toThrow(AppError);
  });
});

describe("issueInvoice", () => {
  it("allocates the number, sets the due-date default and freezes snapshots", () => {
    const id = createInvoiceFromMilestone(user, milestoneIds[1], META);
    updateInvoiceDraft(
      user,
      id,
      {
        languageMode: "bilingual",
        issueDate: "2026-10-20",
        dueDate: null,
        notesAr: null,
        notesEn: null,
      },
      META,
    );
    issueInvoice(user, id, META);
    const invoice = getInvoiceDetail(id).invoice;
    expect(invoice.number).toMatch(/^DOS-I-2026-\d{4,}$/);
    expect(invoice.issueDate).toBe("2026-10-20");
    expect(invoice.dueDate).toBe("2026-11-03");
    expect(invoice.status).toBe("issued");
    expect(invoice.issuedAt).not.toBeNull();
    expect(invoice.verificationCode).toMatch(/^[0-9A-Z]{12}$/);
    expect(invoice.sellerSnapshotJson).not.toBeNull();
    expect(invoice.buyerSnapshotJson).not.toBeNull();
    expect(invoice.paymentInstructionsEn).toContain("IBAN: SA00");
    expect(JSON.parse(invoice.sellerSnapshotJson ?? "{}").nameEn).toBe(
      "RED SHADOWS",
    );
    expect(JSON.parse(invoice.buyerSnapshotJson ?? "{}").nameEn).toBe(
      "Al-Noor Co.",
    );
  });

  it("uses the issue-date year for the number", () => {
    const id = createInvoiceFromMilestone(user, milestoneIds[0], META);
    updateInvoiceDraft(
      user,
      id,
      {
        languageMode: "bilingual",
        issueDate: "2027-01-02",
        dueDate: null,
        notesAr: null,
        notesEn: null,
      },
      META,
    );
    issueInvoice(user, id, META);
    expect(getInvoiceDetail(id).invoice.number).toBe("DOS-I-2027-0001");
  });

  it("requires at least one line and a positive total", () => {
    const id = createInvoice(
      user,
      { projectId, languageMode: "bilingual", notesAr: null, notesEn: null },
      META,
    );
    expect(() => issueInvoice(user, id, META)).toThrow(AppError);
  });

  it("freezes money columns after issue (trigger)", () => {
    const id = createInvoiceFromMilestone(user, milestoneIds[2], META);
    issueInvoice(user, id, META);
    expect(() =>
      db
        .update(invoices)
        .set({ totalMinor: 1 })
        .where(eq(invoices.id, id))
        .run(),
    ).toThrow(/immutable/);
  });
});

describe("delete / void", () => {
  it("deletes an unnumbered draft but not an issued invoice", () => {
    const draft = createInvoice(
      user,
      { projectId, languageMode: "bilingual", notesAr: null, notesEn: null },
      META,
    );
    deleteDraftInvoice(user, draft, META);
    expect(
      db.select().from(invoices).where(eq(invoices.id, draft)).get(),
    ).toBeUndefined();

    const issued = createInvoiceFromMilestone(user, milestoneIds[0], META);
    issueInvoice(user, issued, META);
    expect(() => deleteDraftInvoice(user, issued, META)).toThrow(AppError);
  });

  it("voids an unpaid issued invoice and rejects one with payments", () => {
    const a = createInvoiceFromMilestone(user, milestoneIds[0], META);
    issueInvoice(user, a, META);
    const numberA = getInvoiceDetail(a).invoice.number;
    voidInvoice(user, a, "cancelled", META);
    expect(getInvoiceDetail(a).invoice.status).toBe("void");
    expect(getInvoiceDetail(a).invoice.number).toBe(numberA);

    const b = createInvoiceFromMilestone(user, milestoneIds[1], META);
    issueInvoice(user, b, META);
    db.update(invoices).set({ paidMinor: 1 }).where(eq(invoices.id, b)).run();
    expect(() => voidInvoice(user, b, "x", META)).toThrow(AppError);
  });
});

describe("isOverdue (16.1 vectors)", () => {
  function withStatus(
    status: "draft" | "issued" | "partially_paid" | "paid" | "void",
    dueDate: string,
  ) {
    const id = createInvoice(
      user,
      { projectId, languageMode: "bilingual", notesAr: null, notesEn: null },
      META,
    );
    db.update(invoices)
      .set({ status, dueDate })
      .where(eq(invoices.id, id))
      .run();
    return getInvoiceDetail(id).invoice;
  }

  it("matches the vectors", () => {
    expect(isOverdue(withStatus("issued", "2026-10-01"), "2026-10-02")).toBe(
      true,
    );
    expect(isOverdue(withStatus("issued", "2026-10-02"), "2026-10-02")).toBe(
      false,
    );
    expect(isOverdue(withStatus("paid", "2026-10-01"), "2026-10-02")).toBe(
      false,
    );
    expect(isOverdue(withStatus("void", "2026-10-01"), "2026-10-02")).toBe(
      false,
    );
    expect(
      isOverdue(withStatus("partially_paid", "2026-10-01"), "2026-10-02"),
    ).toBe(true);
  });

  it("filters overdue invoices in listInvoices", () => {
    const probe = `probe-${newId().slice(0, 8)}`;
    const overdue = createInvoice(
      user,
      { projectId, languageMode: "bilingual", notesAr: null, notesEn: probe },
      META,
    );
    db.update(invoices)
      .set({ status: "issued", dueDate: "2026-10-01" })
      .where(eq(invoices.id, overdue))
      .run();
    const notOverdue = createInvoice(
      user,
      { projectId, languageMode: "bilingual", notesAr: null, notesEn: null },
      META,
    );
    db.update(invoices)
      .set({ status: "issued", dueDate: "2026-12-01" })
      .where(eq(invoices.id, notOverdue))
      .run();
    const rows = listInvoices(
      { overdue: true, q: probe },
      "2026-10-02",
    ).rows.map((r) => r.id);
    expect(rows).toEqual([overdue]);
    void contractId;
  });
});

describe("listInvoiceableMilestones", () => {
  it("returns milestones of signed contracts with no active invoice", () => {
    const before = listInvoiceableMilestones();
    expect(before.some((row) => row.contractId === contractId)).toBe(true);

    createInvoiceFromMilestone(user, milestoneIds[0], META);
    const after = listInvoiceableMilestones();
    expect(after).toHaveLength(before.length - 1);
  });
});
