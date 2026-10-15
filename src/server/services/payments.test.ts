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
import { nowMs, todayInTz } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { assertCan } from "@/lib/permissions";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import { updateSettings } from "@/server/services/settings";
import { createInvoiceFromMilestone, issueInvoice } from "./invoices";
import {
  getPaymentDetail,
  listPayments,
  recordPayment,
  voidPayment,
} from "./payments";

const META = { ip: "1.2.3.4", userAgent: "vitest" };
const TODAY = todayInTz("Asia/Riyadh");

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
let invoiceId: string;

function paymentInput(amountMinor: number, paidOn = TODAY) {
  return {
    amountMinor,
    paidOn,
    method: "bank_transfer" as const,
    reference: null,
    notes: null,
  };
}

function currentInvoice() {
  return db.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
}

beforeEach(async () => {
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

  const now = nowMs();
  const clientId = newId();
  const projectId = newId();
  const contractId = newId();
  const milestoneId = newId();
  db.insert(clients)
    .values({
      id: clientId,
      type: "company",
      nameAr: "شركة",
      nameEn: "Client Co",
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
      nameAr: "مشروع",
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
      status: "draft",
      languageMode: "bilingual",
      currency: "SAR",
      taxRateBp: 1500,
      paymentTermsDays: 14,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(paymentMilestones)
    .values({
      id: milestoneId,
      contractId,
      position: 2,
      titleAr: "دفعة 2",
      titleEn: "Milestone 2",
      percentBp: 4000,
      amountMinor: 400001,
      taxMinor: 60000,
      totalMinor: 460001,
    })
    .run();
  db.update(contracts)
    .set({
      status: "signed",
      number: `DOS-C-2026-${contractId.slice(0, 4).toUpperCase()}`,
    })
    .where(eq(contracts.id, contractId))
    .run();

  invoiceId = createInvoiceFromMilestone(user, milestoneId, META);
  issueInvoice(user, invoiceId, META);
});

describe("recordPayment (16.1 vectors)", () => {
  it("pay 100000 → partially_paid with paidMinor 100000", () => {
    const id = recordPayment(user, invoiceId, paymentInput(100000), META);
    expect(getPaymentDetail(id).payment.amountMinor).toBe(100000);
    const invoice = currentInvoice();
    expect(invoice?.paidMinor).toBe(100000);
    expect(invoice?.status).toBe("partially_paid");
    expect(invoice?.paidAt).toBeNull();
  });

  it("pay 360001 → paid with paidAt set", () => {
    recordPayment(user, invoiceId, paymentInput(100000), META);
    recordPayment(user, invoiceId, paymentInput(360001), META);
    const invoice = currentInvoice();
    expect(invoice?.paidMinor).toBe(460001);
    expect(invoice?.status).toBe("paid");
    expect(invoice?.paidAt).not.toBeNull();
  });

  it("paying beyond the balance → PAYMENT_EXCEEDS_BALANCE", () => {
    recordPayment(user, invoiceId, paymentInput(100000), META);
    try {
      recordPayment(user, invoiceId, paymentInput(360002), META);
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("PAYMENT_EXCEEDS_BALANCE");
    }
  });

  it("voiding the second payment → partially_paid with paidAt cleared", () => {
    recordPayment(user, invoiceId, paymentInput(100000), META);
    const second = recordPayment(user, invoiceId, paymentInput(360001), META);
    voidPayment(user, second, "duplicate", META);
    const invoice = currentInvoice();
    expect(invoice?.paidMinor).toBe(100000);
    expect(invoice?.status).toBe("partially_paid");
    expect(invoice?.paidAt).toBeNull();
  });

  it("voiding the first too → issued", () => {
    const first = recordPayment(user, invoiceId, paymentInput(100000), META);
    const second = recordPayment(user, invoiceId, paymentInput(360001), META);
    voidPayment(user, second, "x", META);
    voidPayment(user, first, "x", META);
    const invoice = currentInvoice();
    expect(invoice?.paidMinor).toBe(0);
    expect(invoice?.status).toBe("issued");
  });

  it("rejects a payment on a draft invoice", () => {
    const now = nowMs();
    const draftId = newId();
    db.insert(invoices)
      .values({
        id: draftId,
        clientId: currentInvoice()?.clientId ?? "",
        projectId: currentInvoice()?.projectId ?? "",
        status: "draft",
        currency: "SAR",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    expect(() =>
      recordPayment(user, draftId, paymentInput(1000), META),
    ).toThrow(AppError);
  });

  it("rejects a zero amount and a future paidOn", () => {
    expect(() => recordPayment(user, invoiceId, paymentInput(0), META)).toThrow(
      AppError,
    );
    expect(() =>
      recordPayment(user, invoiceId, paymentInput(1000, "2999-01-01"), META),
    ).toThrow(AppError);
  });

  it("records and lists payments", () => {
    recordPayment(user, invoiceId, paymentInput(100000), META);
    recordPayment(user, invoiceId, paymentInput(50000), META);
    expect(listPayments(invoiceId)).toHaveLength(2);
  });
});

describe("voidInvoice interaction", () => {
  it("rejects voiding an invoice with an active payment", async () => {
    const { voidInvoice } = await import("./invoices");
    recordPayment(user, invoiceId, paymentInput(100000), META);
    expect(() => voidInvoice(user, invoiceId, "x", META)).toThrow(AppError);
    const paymentId = listPayments(invoiceId)[0].id;
    voidPayment(user, paymentId, "x", META);
    expect(() => voidInvoice(user, invoiceId, "x", META)).not.toThrow();
  });

  it("rejects voiding an already-void payment", () => {
    const id = recordPayment(user, invoiceId, paymentInput(1000), META);
    voidPayment(user, id, "x", META);
    expect(() => voidPayment(user, id, "y", META)).toThrow(AppError);
  });
});

describe("payment authorization (section 8)", () => {
  it("viewer cannot write, member cannot void", () => {
    expect(() =>
      assertCan({ role: "viewer", canSignForCompany: false }, "payments.write"),
    ).toThrow(AppError);
    expect(() =>
      assertCan({ role: "member", canSignForCompany: false }, "payments.void"),
    ).toThrow(AppError);
    expect(() =>
      assertCan({ role: "owner", canSignForCompany: true }, "payments.void"),
    ).not.toThrow();
  });
});
