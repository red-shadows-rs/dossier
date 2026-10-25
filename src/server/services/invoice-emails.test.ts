// Dossier - Invoice Emails Tests
// https://github.com/red-shadows-rs/dossier

import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  clients,
  emailOutbox,
  invoices,
  payments,
  projects,
} from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import { updateSettings } from "@/server/services/settings";
import { runDailyJobs, sendOverdueReminders } from "./daily-jobs";
import {
  processOutbox,
  type MailSender,
  type OutgoingMail,
} from "./email-worker";
import { sendInvoiceEmail, sendReceiptEmail } from "./invoices";

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

function seedClient(overrides: Partial<typeof clients.$inferInsert> = {}): string {
  const id = newId();
  const now = nowMs();
  db.insert(clients)
    .values({
      id,
      type: "company",
      nameAr: "شركة النور",
      nameEn: "Al-Noor Co.",
      email: "client@example.test",
      preferredLanguage: "ar",
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

function seedProject(clientId: string): string {
  const id = newId();
  const now = nowMs();
  db.insert(projects)
    .values({
      id,
      code: `P-${id.slice(0, 6).toUpperCase()}`,
      clientId,
      nameAr: "متجر إلكتروني",
      nameEn: "Online Store",
      currency: "SAR",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

let invoiceSeq = 0;

function seedInvoice(
  clientId: string,
  projectId: string,
  overrides: Partial<typeof invoices.$inferInsert> = {},
): string {
  const id = newId();
  const now = nowMs();
  invoiceSeq += 1;
  db.insert(invoices)
    .values({
      id,
      clientId,
      projectId,
      status: "issued",
      number: `DOS-I-2026-${String(invoiceSeq).padStart(4, "0")}`,
      currency: "SAR",
      languageMode: "ar",
      discountType: "none",
      discountValue: 0,
      taxRateBp: 0,
      totalMinor: 100_000,
      paidMinor: 0,
      issueDate: "2026-06-01",
      dueDate: "2026-06-15",
      paymentInstructionsEn: "IBAN: SA0000",
      paymentInstructionsAr: "رقم الآيبان: SA0000",
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

function seedPayment(
  invoiceId: string,
  amountMinor = 50_000,
  overrides: Partial<typeof payments.$inferInsert> = {},
): string {
  const id = newId();
  const now = nowMs();
  db.insert(payments)
    .values({
      id,
      invoiceId,
      amountMinor,
      paidOn: "2026-06-05",
      method: "bank_transfer",
      reference: "TRX-12345",
      notes: null,
      voidedAt: null,
      createdAt: now,
      ...overrides,
    })
    .run();
  return id;
}

function outboxRows() {
  return db.select().from(emailOutbox).all();
}

function recordingSender(): { sender: MailSender; sent: OutgoingMail[] } {
  const sent: OutgoingMail[] = [];
  return {
    sent,
    sender: {
      sendMail: async (mail) => {
        sent.push(mail);
      },
    },
  };
}

beforeEach(() => {
  db.delete(emailOutbox).run();
});

async function enableRemindersUtc(): Promise<void> {
  const user = await ownerUser();
  updateSettings("defaults", { timezone: "UTC" }, user, META);
  updateSettings(
    "email",
    { overdueRemindersEnabled: true, overdueReminderDays: [1, 7, 14] },
    user,
    META,
  );
}

describe("sendInvoiceEmail", () => {
  it("enqueues invoice_issued with the PDF fields and keeps the status", async () => {
    const user = await ownerUser();
    const clientId = seedClient({ preferredLanguage: "en" });
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId, { languageMode: "en" });

    sendInvoiceEmail(user, id, {}, META);

    const rows = outboxRows();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.templateKey).toBe("invoice_issued");
    expect(row.toEmail).toBe("client@example.test");
    expect(row.locale).toBe("en");
    expect(row.entityType).toBe("invoice");
    expect(row.entityId).toBe(id);

    const payload = JSON.parse(row.payloadJson);
    expect(payload.invoiceId).toBe(id);
    expect(payload.docLang).toBe("en");
    expect(payload.number).toBe("DOS-I-2026-0001");
    expect(row.toName).toBe("شركة النور");
    expect(payload.amountFormatted).toBe("1,000.00 SAR");
    expect(payload.dueDate).toBe("2026-06-15");
    expect(payload.bankLine).toBe("IBAN: SA0000");

    const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get();
    expect(invoice?.status).toBe("issued");

    const auditRow = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "invoice.sent"))
      .all()
      .find((entry) => entry.entityId === id);
    expect(auditRow).toBeDefined();
  });

  it("uses the Arabic locale for an ar invoice", async () => {
    const user = await ownerUser();
    const clientId = seedClient({ preferredLanguage: "en" });
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId, { languageMode: "ar" });

    sendInvoiceEmail(user, id, {}, META);

    const row = outboxRows()[0];
    expect(row.locale).toBe("ar");
    expect(JSON.parse(row.payloadJson).bankLine).toBe("رقم الآيبان: SA0000");
  });

  it("honours an explicit toEmail override", async () => {
    const user = await ownerUser();
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId);

    sendInvoiceEmail(user, id, { toEmail: "other@example.test" }, META);

    expect(outboxRows()[0].toEmail).toBe("other@example.test");
  });

  it("rejects a draft invoice", async () => {
    const user = await ownerUser();
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId, { status: "draft" });

    try {
      sendInvoiceEmail(user, id, {}, META);
      throw new Error("expected INVALID_STATE");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("INVALID_STATE");
    }
    expect(outboxRows()).toHaveLength(0);
  });

  it("rejects when the client has no email", async () => {
    const user = await ownerUser();
    const clientId = seedClient({ email: null });
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId);

    try {
      sendInvoiceEmail(user, id, {}, META);
      throw new Error("expected VALIDATION_FAILED");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("VALIDATION_FAILED");
    }
  });

  it("sets attachReceipt when invoice is fully paid", async () => {
    const user = await ownerUser();
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId, {
      status: "paid",
      paidMinor: 100_000,
    });

    sendInvoiceEmail(user, id, {}, META);

    const rows = outboxRows();
    expect(rows).toHaveLength(1);
    const payload = JSON.parse(rows[0].payloadJson);
    expect(payload.isPaid).toBe(true);
    expect(payload.attachReceipt).toBe(true);
  });
});

describe("sendReceiptEmail", () => {
  it("enqueues receipt_issued with receipt payload and audit log", async () => {
    const user = await ownerUser();
    const clientId = seedClient({ preferredLanguage: "ar" });
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId, {
      status: "partially_paid",
      totalMinor: 100_000,
      paidMinor: 50_000,
    });
    seedPayment(id, 50_000);

    sendReceiptEmail(user, id, {}, META);

    const rows = outboxRows();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.templateKey).toBe("receipt_issued");
    expect(row.toEmail).toBe("client@example.test");
    expect(row.locale).toBe("ar");
    expect(row.entityType).toBe("invoice");
    expect(row.entityId).toBe(id);

    const payload = JSON.parse(row.payloadJson);
    expect(payload.invoiceId).toBe(id);
    expect(payload.attachReceipt).toBe(true);
    expect(payload.onlyReceipt).toBe(true);
    expect(payload.isFullyPaid).toBe(false);
    expect(payload.paidFormatted).toContain("500.00");

    const auditRow = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "invoice.sent"))
      .all()
      .find((entry) => entry.entityId === id);
    expect(auditRow).toBeDefined();
    expect(JSON.parse(auditRow?.metaJson ?? "{}").kind).toBe("receipt");
  });

  it("rejects when no active payments exist", async () => {
    const user = await ownerUser();
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId);

    try {
      sendReceiptEmail(user, id, {}, META);
      throw new Error("expected INVALID_STATE");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("INVALID_STATE");
    }
  });

  it("rejects a draft invoice", async () => {
    const user = await ownerUser();
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId, { status: "draft" });

    try {
      sendReceiptEmail(user, id, {}, META);
      throw new Error("expected INVALID_STATE");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("INVALID_STATE");
    }
  });
});

describe("sendOverdueReminders", () => {
  it("does nothing when reminders are disabled", async () => {
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const atMs = Date.UTC(2020, 0, 1, 10, 0, 0);
    seedInvoice(clientId, projectId, { dueDate: "2019-12-31" });

    expect(sendOverdueReminders("2020-01-01", atMs)).toBe(0);
    expect(outboxRows()).toHaveLength(0);
  });

  it("enqueues a reminder on a configured offset and records it once per day", async () => {
    await enableRemindersUtc();
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const atMs = Date.UTC(2021, 0, 1, 10, 0, 0);
    const id = seedInvoice(clientId, projectId, { dueDate: "2020-12-31" });

    expect(sendOverdueReminders("2021-01-01", atMs)).toBe(1);
    const rows = outboxRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].templateKey).toBe("invoice_overdue_reminder");
    expect(rows[0].entityId).toBe(id);

    const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get();
    expect(invoice?.lastReminderAt).not.toBeNull();

    const auditRow = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "invoice.reminder_sent"))
      .all()
      .find((entry) => entry.entityId === id);
    expect(auditRow).toBeDefined();

    expect(sendOverdueReminders("2021-01-01", atMs)).toBe(0);
    expect(outboxRows()).toHaveLength(1);
  });

  it("skips invoices whose overdue day is not a configured offset", async () => {
    await enableRemindersUtc();
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const atMs = Date.UTC(2022, 0, 1, 10, 0, 0);
    seedInvoice(clientId, projectId, { dueDate: "2021-12-30" });

    expect(sendOverdueReminders("2022-01-01", atMs)).toBe(0);
  });

  it("skips invoices that are not overdue", async () => {
    await enableRemindersUtc();
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const atMs = Date.UTC(2023, 0, 1, 10, 0, 0);
    seedInvoice(clientId, projectId, { dueDate: "2023-01-01" });

    expect(sendOverdueReminders("2023-01-01", atMs)).toBe(0);
  });

  it("skips overdue invoices whose client has no email", async () => {
    await enableRemindersUtc();
    const clientId = seedClient({ email: null });
    const projectId = seedProject(clientId);
    const atMs = Date.UTC(2024, 0, 1, 10, 0, 0);
    seedInvoice(clientId, projectId, { dueDate: "2023-12-31" });

    expect(sendOverdueReminders("2024-01-01", atMs)).toBe(0);
  });
});

describe("runDailyJobs", () => {
  it("runs reminders once per business-tz date at hour 08", async () => {
    await enableRemindersUtc();
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    seedInvoice(clientId, projectId, { dueDate: "2026-06-14" });

    const atHour8 = Date.UTC(2026, 5, 15, 8, 30, 0);
    await runDailyJobs(atHour8);
    expect(outboxRows()).toHaveLength(1);

    await runDailyJobs(Date.UTC(2026, 5, 15, 8, 45, 0));
    expect(outboxRows()).toHaveLength(1);
  });

  it("does not run reminders outside hour 08", async () => {
    await enableRemindersUtc();
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    seedInvoice(clientId, projectId, { dueDate: "2026-06-14" });

    await runDailyJobs(Date.UTC(2026, 5, 15, 9, 0, 0));
    expect(outboxRows()).toHaveLength(0);
  });
});

describe("processOutbox — invoice attachments", () => {
  it("attaches the PDF rendered at send time via the injected renderer", async () => {
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId);
    const user = await ownerUser();
    sendInvoiceEmail(user, id, {}, META);

    const { sender, sent } = recordingSender();
    const calls: { invoiceId: string; docLang: string }[] = [];
    await processOutbox(sender, {
      renderInvoiceAttachment: async (invoiceId, docLang) => {
        calls.push({ invoiceId, docLang });
        return {
          filename: "DOS-I-2026-0001-ar.pdf",
          content: Buffer.from("%PDF-1.4\n%%EOF"),
          contentType: "application/pdf",
        };
      },
    });

    expect(sent).toHaveLength(1);
    expect(calls).toEqual([{ invoiceId: id, docLang: "ar" }]);
    expect(sent[0].attachments).toHaveLength(1);
    expect(sent[0].attachments?.[0].contentType).toBe("application/pdf");
    expect(sent[0].attachments?.[0].filename).toBe(
      "DOS-I-2026-0001-ar.pdf",
    );
  });

  it("attaches both invoice and receipt PDF for a paid invoice", async () => {
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId, {
      status: "paid",
      paidMinor: 100_000,
    });
    const user = await ownerUser();
    sendInvoiceEmail(user, id, {}, META);

    const { sender, sent } = recordingSender();
    await processOutbox(sender, {
      renderInvoiceAttachment: async () => ({
        filename: "invoice.pdf",
        content: Buffer.from("invoice"),
        contentType: "application/pdf",
      }),
      renderReceiptAttachment: async () => ({
        filename: "receipt.pdf",
        content: Buffer.from("receipt"),
        contentType: "application/pdf",
      }),
    });

    expect(sent).toHaveLength(1);
    expect(sent[0].attachments).toHaveLength(2);
    expect(sent[0].attachments?.map((a) => a.filename)).toEqual([
      "invoice.pdf",
      "receipt.pdf",
    ]);
  });

  it("attaches only receipt PDF when onlyReceipt is set", async () => {
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const id = seedInvoice(clientId, projectId, {
      status: "paid",
      paidMinor: 100_000,
    });
    seedPayment(id, 100_000);
    const user = await ownerUser();
    sendReceiptEmail(user, id, {}, META);

    const { sender, sent } = recordingSender();
    await processOutbox(sender, {
      renderInvoiceAttachment: async () => ({
        filename: "invoice.pdf",
        content: Buffer.from("invoice"),
        contentType: "application/pdf",
      }),
      renderReceiptAttachment: async () => ({
        filename: "receipt.pdf",
        content: Buffer.from("receipt"),
        contentType: "application/pdf",
      }),
    });

    expect(sent).toHaveLength(1);
    expect(sent[0].attachments).toHaveLength(1);
    expect(sent[0].attachments?.[0].filename).toBe("receipt.pdf");
  });
});
