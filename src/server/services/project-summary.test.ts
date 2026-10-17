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
import { newId } from "@/lib/ids";
import { updateSettings } from "@/server/services/settings";
import { createTestUser } from "@/server/auth/test-utils";
import type { SessionUser } from "@/server/auth/session";
import {
  createInvoiceFromMilestone,
  issueInvoice,
} from "@/server/services/invoices";
import { getProjectSummary, listProjectActivity } from "./project-summary";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

let user: SessionUser;
let projectId: string;
let contractId: string;
let milestoneIds: string[];

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

beforeEach(async () => {
  user = await ownerUser();
  updateSettings(
    "company",
    { nameAr: "ريد شادوز", nameEn: "RED SHADOWS", email: "h@example.com" },
    user,
    META,
  );
  const now = nowMs();
  const clientId = newId();
  projectId = newId();
  contractId = newId();
  db.insert(clients)
    .values({
      id: clientId,
      type: "company",
      nameAr: "شركة",
      nameEn: "Client Co",
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
      languageMode: "ar",
      currency: "SAR",
      taxRateBp: 1500,
      subtotalMinor: 1900000,
      netMinor: 1900000,
      taxMinor: 285000,
      totalMinor: 2185000,
      paymentTermsDays: 14,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  milestoneIds = [
    { amount: 760000, tax: 114000, total: 874000 },
    { amount: 570000, tax: 85500, total: 655500 },
    { amount: 570000, tax: 85500, total: 655500 },
  ].map((m, i) => {
    const id = newId();
    db.insert(paymentMilestones)
      .values({
        id,
        contractId,
        position: i + 1,
        titleAr: `دفعة ${i + 1}`,
        titleEn: `Milestone ${i + 1}`,
        percentBp: i === 0 ? 4000 : 3000,
        amountMinor: m.amount,
        taxMinor: m.tax,
        totalMinor: m.total,
      })
      .run();
    return id;
  });
  db.update(contracts)
    .set({
      status: "signed",
      number: `DOS-C-2026-${contractId.slice(0, 4).toUpperCase()}`,
    })
    .where(eq(contracts.id, contractId))
    .run();
});

describe("getProjectSummary (7.11)", () => {
  it("matches the worked example before any invoice", () => {
    const summary = getProjectSummary(projectId);
    expect(summary).toEqual([
      {
        currency: "SAR",
        contractedMinor: 2185000,
        invoicedMinor: 0,
        paidMinor: 0,
        outstandingMinor: 0,
        overdueMinor: 0,
        remainingToInvoiceMinor: 2185000,
      },
    ]);
  });

  it("tracks invoiced/paid/outstanding and remaining after invoicing a milestone", () => {
    const invoiceId = createInvoiceFromMilestone(user, milestoneIds[1], META);
    issueInvoice(user, invoiceId, META);
    db.update(invoices)
      .set({ paidMinor: 100000, status: "partially_paid" })
      .where(eq(invoices.id, invoiceId))
      .run();

    const summary = getProjectSummary(projectId);
    const sar = summary[0];
    expect(sar.contractedMinor).toBe(2185000);
    expect(sar.invoicedMinor).toBe(655500);
    expect(sar.paidMinor).toBe(100000);
    expect(sar.outstandingMinor).toBe(555500);
    expect(sar.remainingToInvoiceMinor).toBe(874000 + 655500);
  });

  it("counts overdue only for past-due unpaid invoices", () => {
    const now = nowMs();
    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();
    const invoiceId = newId();
    db.insert(invoices)
      .values({
        id: invoiceId,
        number: "DOS-I-2026-9999",
        clientId: project?.clientId ?? "",
        projectId,
        status: "issued",
        currency: "SAR",
        issueDate: "2020-01-01",
        dueDate: "2020-01-15",
        totalMinor: 874000,
        paidMinor: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const sar = getProjectSummary(projectId)[0];
    expect(sar.overdueMinor).toBe(874000);
  });

  it("groups amounts per currency", () => {
    const now = nowMs();
    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();
    db.insert(contracts)
      .values({
        id: newId(),
        clientId: project?.clientId ?? "",
        projectId,
        status: "signed",
        languageMode: "en",
        currency: "USD",
        totalMinor: 500000,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const summary = getProjectSummary(projectId);
    expect(summary.map((s) => s.currency).sort()).toEqual(["SAR", "USD"]);
    expect(summary.find((s) => s.currency === "USD")?.contractedMinor).toBe(
      500000,
    );
  });
});

describe("listProjectActivity", () => {
  it("includes contract and project events", () => {
    const invoiceId = createInvoiceFromMilestone(user, milestoneIds[0], META);
    issueInvoice(user, invoiceId, META);
    const actions = listProjectActivity(projectId).map((row) => row.action);
    expect(actions).toContain("invoice.created");
    expect(actions).toContain("invoice.issued");
  });
});
