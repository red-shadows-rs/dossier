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
  createInvoiceFromMilestone,
  getInvoice,
  issueInvoice,
} from "./invoices";
import {
  buildInvoiceHtml,
  invoiceSafePdfFilename,
  resolveInvoiceDocLang,
  resolveInvoicePdf,
} from "./invoice-documents";

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
let invoiceId: string;

beforeEach(async () => {
  user = await ownerUser();
  updateSettings(
    "company",
    {
      nameAr: "ريد شادوز",
      nameEn: "RED SHADOWS",
      email: "h@example.com",
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
      position: 1,
      titleAr: "دفعة",
      titleEn: "Milestone",
      percentBp: 10000,
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
});

describe("resolveInvoiceDocLang", () => {
  it("rejects an incompatible language with VALIDATION_FAILED", () => {
    issueInvoice(user, invoiceId, META);
    db.update(invoices)
      .set({ languageMode: "ar" })
      .where(eq(invoices.id, invoiceId))
      .run();
    const invoice = getInvoice(invoiceId);
    expect(() => resolveInvoiceDocLang(invoice, "en")).toThrow(AppError);
  });

  it("defaults to the invoice mode", () => {
    const invoice = getInvoice(invoiceId);
    expect(resolveInvoiceDocLang(invoice, undefined)).toBe("ar");
  });
});

describe("invoiceSafePdfFilename", () => {
  it("restricts to [A-Za-z0-9._-]", () => {
    expect(invoiceSafePdfFilename({ number: null }, "ar")).toBe("draft-ar.pdf");
    expect(invoiceSafePdfFilename({ number: "DOS-I-2026-0001" }, "en")).toBe(
      "DOS-I-2026-0001-en.pdf",
    );
    expect(invoiceSafePdfFilename({ number: 'x/../y z"' }, "ar")).toBe(
      "x..yz-ar.pdf",
    );
  });
});

describe("buildInvoiceHtml", () => {
  it("renders a draft invoice with the watermark and live buyer", async () => {
    const html = await buildInvoiceHtml(invoiceId, "ar");
    expect(html).toContain("مسودة");
    expect(html).toContain("شركة");
    expect(html).toContain("دفعة");
    expect(html).toContain("4,600.01 SAR");
  });

  it("renders an issued invoice from the frozen snapshot", async () => {
    issueInvoice(user, invoiceId, META);
    const html = await buildInvoiceHtml(invoiceId, "ar");
    expect(html).not.toContain('class="watermark"');
    expect(html).toMatch(/DOS-I-\d{4}-\d{4,}/);
    expect(html).toContain("SA00");
  });
});

describe("resolveInvoicePdf", () => {
  it("returns html, filename and doc number", async () => {
    issueInvoice(user, invoiceId, META);
    const number = getInvoice(invoiceId).number ?? "";
    const source = await resolveInvoicePdf(invoiceId, "ar");
    expect(source.filename).toBe(`${number}-ar.pdf`);
    expect(source.docNumber).toBe(number);
    expect(source.html).toContain("فاتورة");
  });
});
