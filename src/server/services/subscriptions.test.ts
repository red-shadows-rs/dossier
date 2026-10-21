// Dossier - Subscriptions Service Tests
// https://github.com/red-shadows-rs/dossier

import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices, projects } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { newId } from "@/lib/ids";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import {
  cancelSubscription,
  createSubscription,
  generateInvoiceForSubscription,
  getSubscription,
  listSubscriptions,
  pauseSubscription,
  processScheduledSubscriptions,
  resumeSubscription,
  updateSubscription,
} from "./subscriptions";

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

function seedFixture(): void {
  const now = nowMs();
  clientId = newId();
  projectId = newId();

  db.insert(clients)
    .values({
      id: clientId,
      type: "company",
      nameAr: "عميل استضافة تجريبي",
      nameEn: "Hosting Test Client",
      email: "hosting@example.com",
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
      nameAr: "خوادم سحابية",
      nameEn: "Cloud Servers",
      currency: "SAR",
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

describe("subscriptions service", () => {
  beforeEach(async () => {
    user = await ownerUser();
    seedFixture();
  });

  it("creates a subscription with items and calculates totals", () => {
    const subId = createSubscription(
      user,
      {
        clientId,
        contractId: null,
        projectId,
        titleAr: "باقة استضافة سحابية شهرية",
        titleEn: "Monthly Cloud Hosting",
        description: "20GB NVMe + Support",
        frequency: "monthly",
        intervalCount: 1,
        startDate: "2026-01-01",
        nextRunDate: "2026-02-01",
        endDate: null,
        languageMode: "ar",
        currency: "SAR",
        taxRateBp: 1500,
        discountType: "none",
        discountValue: 0,
        paymentTermsDays: 14,
        bankAccountIds: [],
        autoIssueInvoice: true,
        autoSendEmail: false,
        notesAr: "شروط تجديد الاستضافة",
        notesEn: "Hosting renewal terms",
        items: [
          {
            descriptionAr: "خادم سحابي 4 Cores 8GB RAM",
            descriptionEn: "Cloud Server 4 Cores",
            quantity: 2,
            unitPriceMinor: 20000,
            taxRateBp: 1500,
          },
          {
            descriptionAr: "نسخ احتياطي يومي",
            descriptionEn: "Daily Backup",
            quantity: 1,
            unitPriceMinor: 5000,
            taxRateBp: 1500,
          },
        ],
      },
      META,
    );

    expect(subId).toBeDefined();

    const detail = getSubscription(subId);
    expect(detail).not.toBeNull();
    expect(detail?.subscription.titleAr).toBe("باقة استضافة سحابية شهرية");
    expect(detail?.subscription.subtotalMinor).toBe(45000);
    expect(detail?.subscription.taxMinor).toBe(6750);
    expect(detail?.subscription.totalMinor).toBe(51750);
    expect(detail?.items.length).toBe(2);
    expect(detail?.subscription.status).toBe("active");
  });

  it("updates subscription pricing and items", () => {
    const subId = createSubscription(
      user,
      {
        clientId,
        contractId: null,
        projectId,
        titleAr: "استضافة قابلة للتعديل",
        titleEn: null,
        description: null,
        frequency: "monthly",
        intervalCount: 1,
        startDate: "2026-01-01",
        nextRunDate: "2026-02-01",
        endDate: null,
        languageMode: "ar",
        currency: "SAR",
        taxRateBp: 1500,
        discountType: "none",
        discountValue: 0,
        paymentTermsDays: 14,
        bankAccountIds: [],
        autoIssueInvoice: true,
        autoSendEmail: false,
        notesAr: null,
        notesEn: null,
        items: [
          {
            descriptionAr: "باقة أولية",
            descriptionEn: null,
            quantity: 1,
            unitPriceMinor: 10000,
            taxRateBp: 1500,
          },
        ],
      },
      META,
    );

    updateSubscription(
      subId,
      user,
      {
        titleAr: "استضافة مطورة بسعر جديد",
        titleEn: "Upgraded Hosting",
        description: "ترقية المساحة والسرعة",
        frequency: "quarterly",
        intervalCount: 1,
        startDate: "2026-01-01",
        nextRunDate: "2026-04-01",
        endDate: null,
        languageMode: "ar",
        currency: "SAR",
        taxRateBp: 1500,
        discountType: "none",
        discountValue: 0,
        paymentTermsDays: 20,
        bankAccountIds: [],
        autoIssueInvoice: true,
        autoSendEmail: false,
        notesAr: "شروط الترقية",
        notesEn: null,
        items: [
          {
            descriptionAr: "باقة الخادم المطور",
            descriptionEn: null,
            quantity: 1,
            unitPriceMinor: 35000,
            taxRateBp: 1500,
          },
        ],
      },
      META,
    );

    const detail = getSubscription(subId);
    expect(detail?.subscription.titleAr).toBe("استضافة مطورة بسعر جديد");
    expect(detail?.subscription.frequency).toBe("quarterly");
    expect(detail?.subscription.totalMinor).toBe(40250);
    expect(detail?.items[0].descriptionAr).toBe("باقة الخادم المطور");
  });

  it("handles pause, resume, and cancel lifecycle", () => {
    const subId = createSubscription(
      user,
      {
        clientId,
        contractId: null,
        projectId,
        titleAr: "خدمة صيانة",
        titleEn: null,
        description: null,
        frequency: "monthly",
        intervalCount: 1,
        startDate: "2026-01-01",
        nextRunDate: "2026-02-01",
        endDate: null,
        languageMode: "ar",
        currency: "SAR",
        taxRateBp: 0,
        discountType: "none",
        discountValue: 0,
        paymentTermsDays: 7,
        bankAccountIds: [],
        autoIssueInvoice: true,
        autoSendEmail: false,
        notesAr: null,
        notesEn: null,
        items: [
          {
            descriptionAr: "صيانة",
            descriptionEn: null,
            quantity: 1,
            unitPriceMinor: 5000,
            taxRateBp: 0,
          },
        ],
      },
      META,
    );

    pauseSubscription(subId, user, META);
    let detail = getSubscription(subId);
    expect(detail?.subscription.status).toBe("paused");

    resumeSubscription(subId, user, META);
    detail = getSubscription(subId);
    expect(detail?.subscription.status).toBe("active");

    cancelSubscription(subId, user, META);
    detail = getSubscription(subId);
    expect(detail?.subscription.status).toBe("canceled");
  });

  it("generates an invoice manually and advances nextRunDate", () => {
    const subId = createSubscription(
      user,
      {
        clientId,
        contractId: null,
        projectId,
        titleAr: "استضافة مواقع سنوية",
        titleEn: null,
        description: null,
        frequency: "annual",
        intervalCount: 1,
        startDate: "2026-01-01",
        nextRunDate: "2026-01-01",
        endDate: null,
        languageMode: "ar",
        currency: "SAR",
        taxRateBp: 1500,
        discountType: "none",
        discountValue: 0,
        paymentTermsDays: 14,
        bankAccountIds: [],
        autoIssueInvoice: true,
        autoSendEmail: false,
        notesAr: null,
        notesEn: null,
        items: [
          {
            descriptionAr: "استضافة لمدة سنة",
            descriptionEn: null,
            quantity: 1,
            unitPriceMinor: 120000,
            taxRateBp: 1500,
          },
        ],
      },
      META,
    );

    const invoiceId = generateInvoiceForSubscription(subId, user, META);
    expect(invoiceId).toBeDefined();

    const createdInvoice = db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .get();

    expect(createdInvoice).toBeDefined();
    expect(createdInvoice?.subscriptionId).toBe(subId);
    expect(createdInvoice?.status).toBe("issued");
    expect(createdInvoice?.totalMinor).toBe(138000);

    const updatedSub = getSubscription(subId);
    expect(updatedSub?.subscription.invoicesCount).toBe(1);
    expect(updatedSub?.subscription.lastRunDate).toBeDefined();
    expect(updatedSub?.subscription.nextRunDate).toBe("2027-01-01");
    expect(updatedSub?.invoices.length).toBe(1);
  });

  it("processes scheduled subscriptions automatically when due", () => {
    const subId = createSubscription(
      user,
      {
        clientId,
        contractId: null,
        projectId,
        titleAr: "خدمة سحابية مجدولة",
        titleEn: null,
        description: null,
        frequency: "monthly",
        intervalCount: 1,
        startDate: "2026-01-01",
        nextRunDate: "2026-01-15",
        endDate: null,
        languageMode: "ar",
        currency: "SAR",
        taxRateBp: 0,
        discountType: "none",
        discountValue: 0,
        paymentTermsDays: 10,
        bankAccountIds: [],
        autoIssueInvoice: true,
        autoSendEmail: false,
        notesAr: null,
        notesEn: null,
        items: [
          {
            descriptionAr: "باقة دورية",
            descriptionEn: null,
            quantity: 1,
            unitPriceMinor: 8000,
            taxRateBp: 0,
          },
        ],
      },
      META,
    );

    const generated = processScheduledSubscriptions("2026-01-20");
    expect(generated).toBeGreaterThanOrEqual(1);

    const updatedSub = getSubscription(subId);
    expect(updatedSub?.subscription.invoicesCount).toBe(1);
    expect(updatedSub?.subscription.nextRunDate).toBe("2026-02-15");
  });

  it("lists subscriptions with filters and pagination", () => {
    createSubscription(
      user,
      {
        clientId,
        contractId: null,
        projectId,
        titleAr: "اشتراك للبحث والتصفية",
        titleEn: "Search Filter Subscription",
        description: null,
        frequency: "weekly",
        intervalCount: 1,
        startDate: "2026-01-01",
        nextRunDate: "2026-01-08",
        endDate: null,
        languageMode: "ar",
        currency: "SAR",
        taxRateBp: 0,
        discountType: "none",
        discountValue: 0,
        paymentTermsDays: 5,
        bankAccountIds: [],
        autoIssueInvoice: true,
        autoSendEmail: false,
        notesAr: null,
        notesEn: null,
        items: [
          {
            descriptionAr: "خدمة أسبوعية",
            descriptionEn: null,
            quantity: 1,
            unitPriceMinor: 2500,
            taxRateBp: 0,
          },
        ],
      },
      META,
    );

    const listAfter = listSubscriptions({ q: "للبحث" }, "ar");
    expect(listAfter.total).toBe(1);
    expect(listAfter.rows[0].titleAr).toBe("اشتراك للبحث والتصفية");
    expect(listAfter.rows[0].frequency).toBe("weekly");
  });
});

