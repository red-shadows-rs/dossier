import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

const state = vi.hoisted(() => ({ fail: false }));

vi.mock("@/server/services/audit", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/services/audit")>();
  return {
    ...actual,
    audit: (tx: never, entry: never) => {
      if (state.fail) throw new Error("injected audit failure");
      return actual.audit(tx, entry);
    },
  };
});

import { db } from "@/db";
import {
  clients,
  contractSignatories,
  contractVersions,
  emailOutbox,
  projects,
  templates,
  users,
} from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { newId } from "@/lib/ids";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import { seedSystemTemplates } from "@/server/services/templates";
import { updateSettings } from "@/server/services/settings";
import {
  createContractFromTemplate,
  getContract,
  saveContractItems,
  updateContractBasics,
} from "./contracts";
import { sendContract } from "./contracts-send";

const META = { ip: "1.2.3.4", userAgent: "vitest" };
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let user: SessionUser;
let projectId: string;
let templateId: string;

async function ownerUser(): Promise<SessionUser> {
  const created = await createTestUser({ role: "owner" });
  db.update(users)
    .set({ canSignForCompany: true })
    .where(eq(users.id, created.id))
    .run();
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: "owner",
    locale: "ar",
    canSignForCompany: true,
    signerTitleAr: "المالك",
    signerTitleEn: "Owner",
  };
}

beforeEach(async () => {
  state.fail = false;
  user = await ownerUser();
  updateSettings(
    "company",
    { nameAr: "ريد شادوز", nameEn: "RED SHADOWS", email: "hello@example.com" },
    user,
    META,
  );
  updateSettings(
    "signing",
    {
      linkTtlDays: 14,
      requireEmailOtp: true,
      requireProviderSignatureBeforeSend: true,
      consentTextEn: "I consent.",
      consentTextAr: "أوافق.",
    },
    user,
    META,
  );
  seedSystemTemplates();
  const now = nowMs();
  const clientId = newId();
  projectId = newId();
  db.insert(clients)
    .values({
      id: clientId,
      type: "company",
      nameAr: "شركة النور",
      nameEn: "Al-Noor Co.",
      email: "contact@alnoor.example",
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
  const template = db
    .select()
    .from(templates)
    .where(eq(templates.key, "web-development"))
    .get();
  if (!template) throw new Error("missing template");
  templateId = template.id;
});

describe("sendContract rollback", () => {
  it("rolls back every write when the audit insert fails", () => {
    const id = createContractFromTemplate(
      user,
      { projectId, templateId },
      META,
    );
    updateContractBasics(
      user,
      id,
      {
        languageMode: "ar",
        titleAr: "عقد",
        titleEn: "Contract",
        scopeAr: "نطاق",
        scopeEn: "Scope",
        startDate: "2026-11-01",
        endDate: "2027-01-31",
        paymentTermsDays: 14,
        governingLawAr: "السعودية",
        governingLawEn: "KSA",
        jurisdictionAr: "الرياض",
        jurisdictionEn: "Riyadh",
        signingDeadline: null,
        internalNotes: null,
        hasFees: true,
        currency: "SAR",
        milestoneMode: "percent",
      },
      META,
    );
    saveContractItems(
      user,
      id,
      {
        items: [
          {
            descriptionAr: "تصميم",
            descriptionEn: "Design",
            qtyMilli: 1000,
            unitPriceMinor: 1_000_000,
          },
        ],
        discount: { type: "none", value: 0 },
        taxRateBp: 1500,
      },
      META,
    );

    state.fail = true;
    expect(() =>
      sendContract(
        user,
        id,
        {
          providerSignerUserId: user.id,
          providerName: "RED SHADOWS | RS",
          providerTitle: "Owner",
          clientSignatoryName: "Khalid",
          clientSignatoryEmail: "contact@alnoor.example",
          signature: { method: "drawn", dataUrl: PNG },
          consent: true,
          consentText: "I consent.",
        },
        META,
      ),
    ).toThrow(/injected audit failure/);
    state.fail = false;

    const contract = getContract(id);
    expect(contract.status).toBe("draft");
    expect(contract.number).toBeNull();
    expect(contract.currentVersionId).toBeNull();
    expect(contract.contentHash).toBeNull();
    expect(contract.sentAt).toBeNull();

    expect(
      db
        .select()
        .from(contractVersions)
        .where(eq(contractVersions.contractId, id))
        .all(),
    ).toHaveLength(0);
    expect(
      db
        .select()
        .from(contractSignatories)
        .where(eq(contractSignatories.contractId, id))
        .all(),
    ).toHaveLength(0);
    expect(
      db.select().from(emailOutbox).where(eq(emailOutbox.entityId, id)).all(),
    ).toHaveLength(0);
  });
});
