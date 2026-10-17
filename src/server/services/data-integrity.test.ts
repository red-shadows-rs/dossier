// Dossier - Data Integrity Tests
// https://github.com/red-shadows-rs/dossier

import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, contracts, invoices, paymentMilestones, payments, projects } from "@/db/schema";
import { nowMs, todayInTz } from "@/lib/dates";
import { newId } from "@/lib/ids";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import { saveContractItems, saveMilestones } from "@/server/services/contracts";
import { createInvoiceFromMilestone, issueInvoice } from "@/server/services/invoices";
import { recordPayment, voidPayment } from "@/server/services/payments";
import { updateSettings } from "@/server/services/settings";

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
let contractId: string;

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
  contractId = newId();
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
      languageMode: "ar",
      hasFees: true,
      currency: "SAR",
      taxRateBp: 1500,
      paymentTermsDays: 14,
      milestoneMode: "percent",
      createdAt: now,
      updatedAt: now,
    })
    .run();
});

describe("data integrity invariants (20.5)", () => {
  it("Σ milestone totals equals the contract total for every contract", () => {
    saveContractItems(
      user,
      contractId,
      {
        items: [
          {
            descriptionAr: "تصميم",
            descriptionEn: "Design",
            qtyMilli: 1000,
            unitPriceMinor: 800000,
          },
          {
            descriptionAr: "تطوير",
            descriptionEn: "Development",
            qtyMilli: 1000,
            unitPriceMinor: 1200000,
          },
        ],
        discount: { type: "percent", value: 500 },
        taxRateBp: 1500,
      },
      META,
    );
    saveMilestones(
      user,
      contractId,
      {
        mode: "percent",
        rows: [
          { titleAr: "أولى", titleEn: "First", percentBp: 4000 },
          { titleAr: "ثانية", titleEn: "Second", percentBp: 6000 },
        ],
      },
      META,
    );

    const contractsWithData = db.select().from(contracts).all();
    expect(contractsWithData.length).toBeGreaterThan(0);

    for (const contract of contractsWithData) {
      const milestoneSum = db
        .select()
        .from(paymentMilestones)
        .where(eq(paymentMilestones.contractId, contract.id))
        .all()
        .reduce((acc, m) => acc + m.totalMinor, 0);
      if (milestoneSum > 0 || contract.totalMinor > 0) {
        expect(milestoneSum).toBe(contract.totalMinor);
      }
    }
  });

  it("paid_minor equals the sum of non-voided payments for every invoice", () => {
    saveContractItems(
      user,
      contractId,
      {
        items: [
          {
            descriptionAr: "عمل",
            descriptionEn: "Work",
            qtyMilli: 1000,
            unitPriceMinor: 1000000,
          },
        ],
        discount: { type: "none", value: 0 },
        taxRateBp: 0,
      },
      META,
    );
    saveMilestones(
      user,
      contractId,
      {
        mode: "percent",
        rows: [{ titleAr: "كامل", titleEn: "Full", percentBp: 10000 }],
      },
      META,
    );
    const milestone = db
      .select()
      .from(paymentMilestones)
      .where(eq(paymentMilestones.contractId, contractId))
      .get();
    expect(milestone).toBeDefined();
    if (!milestone) return;

    db.update(contracts)
      .set({ status: "signed", number: "DOS-C-2026-0001" })
      .where(eq(contracts.id, contractId))
      .run();

    const invoiceId = createInvoiceFromMilestone(user, milestone.id, META);
    issueInvoice(user, invoiceId, META);

    const p1 = recordPayment(
      user,
      invoiceId,
      { amountMinor: 400000, paidOn: TODAY, method: "bank_transfer", reference: null, notes: null },
      META,
    );
    recordPayment(
      user,
      invoiceId,
      { amountMinor: 300000, paidOn: TODAY, method: "cash", reference: null, notes: null },
      META,
    );
    voidPayment(user, p1, "duplicate entry", META);

    for (const invoice of db.select().from(invoices).all()) {
      const active = db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, invoice.id))
        .all()
        .filter((p) => p.voidedAt === null)
        .reduce((acc, p) => acc + p.amountMinor, 0);
      expect(invoice.paidMinor).toBe(active);
    }
  });
});
