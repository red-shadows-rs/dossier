import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, withTx } from "@/db";
import {
  clients,
  contractSignatories,
  contracts,
  emailOutbox,
  projects,
  templates,
  users,
} from "@/db/schema";
import { sha256Hex } from "@/lib/crypto";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import { seedSystemTemplates } from "@/server/services/templates";
import { updateSettings } from "@/server/services/settings";
import {
  createContractFromTemplate,
  saveContractItems,
  updateContractBasics,
} from "./contracts";
import { sendContract } from "./contracts-send";
import {
  finalizeContractTx,
  generateSealedPdf,
  retryPendingFinalizations,
} from "./contract-finalize";
import { readFile } from "./files";
import { submitClientSignature } from "./signing";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let user: SessionUser;
let projectId: string;
let templateId: string;

async function ownerUser(): Promise<SessionUser> {
  const created = await createTestUser({ role: "owner" });
  db.update(users)
    .set({
      canSignForCompany: true,
      signerTitleAr: "المالك",
      signerTitleEn: "Owner",
    })
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

function createValidDraft(): string {
  const id = createContractFromTemplate(user, { projectId, templateId }, META);
  updateContractBasics(
    user,
    id,
    {
      languageMode: "ar",
      titleAr: "عقد تطوير",
      titleEn: "Development Agreement",
      scopeAr: "نطاق العمل",
      scopeEn: "Scope of work",
      startDate: "2026-11-01",
      endDate: "2027-01-31",
      paymentTermsDays: 14,
      governingLawAr: "المملكة العربية السعودية",
      governingLawEn: "the Kingdom of Saudi Arabia",
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
  return id;
}

function sendAndReturnToken(): { id: string; token: string } {
  const id = createValidDraft();
  const { clientToken } = sendContract(
    user,
    id,
    {
      providerSignerUserId: user.id,
      providerName: "RED SHADOWS | RS",
      providerTitle: "Owner",
      clientSignatoryName: "Khalid Al-Noor",
      clientSignatoryEmail: "contact@alnoor.example",
      clientSignatoryTitle: "General Manager",
      signature: { method: "drawn", dataUrl: PNG },
      consent: true,
      consentText: "I consent.",
    },
    META,
  );
  return { id, token: clientToken };
}

function clientSignInput() {
  return {
    fullName: "Khalid Al-Noor",
    signature: { method: "drawn" as const, dataUrl: PNG },
    consent: true,
    consentText: "I consent.",
  };
}

beforeEach(async () => {
  user = await ownerUser();
  updateSettings(
    "company",
    {
      nameAr: "ريد شادوز",
      nameEn: "RED SHADOWS",
      email: "hello@example.com",
      taxNumber: "300012345600003",
    },
    user,
    META,
  );
  updateSettings(
    "signing",
    {
      linkTtlDays: 14,
      requireEmailOtp: false,
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
      repNameAr: "خالد النور",
      repNameEn: "Khalid Al-Noor",
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
      nameAr: "متجر إلكتروني",
      nameEn: "Online Store",
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

describe("finalization (7.8)", () => {
  it("seals the contract after both signatures: status, code, tokens, PDF, emails", async () => {
    const { id, token } = sendAndReturnToken();

    const result = await submitClientSignature(token, clientSignInput(), META);
    expect(result.finalized).toBe(true);

    const contract = db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .get();
    expect(contract?.status).toBe("signed");
    expect(contract?.verificationCode).not.toBeNull();
    expect(contract?.finalPdfFileId).not.toBeNull();
    expect(contract?.pdfSha256).not.toBeNull();

    const rows = db
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.contractId, id))
      .all();
    expect(rows.every((row) => row.tokenHash === null)).toBe(true);
    expect(rows.every((row) => row.otpHash === null)).toBe(true);

    const file = readFile(contract?.finalPdfFileId ?? "");
    expect(file.buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(sha256Hex(file.buffer)).toBe(contract?.pdfSha256);

    const copies = db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.entityId, id))
      .all()
      .filter((row) => row.templateKey === "contract_signed_copy");
    expect(copies).toHaveLength(3);
    expect(copies.every((row) => row.payloadJson.includes("attachmentFileIds"))).toBe(
      true,
    );
  });

  it("aborts the transaction when the snapshot hash does not match", async () => {
    const { id, token } = sendAndReturnToken();

    db.update(contracts)
      .set({ contentHash: "deadbeef" })
      .where(eq(contracts.id, id))
      .run();

    try {
      await submitClientSignature(token, clientSignInput(), META);
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("INTERNAL");
    }

    const contract = db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .get();
    expect(contract?.status).toBe("sent");
    const client = db
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.contractId, id))
      .all()
      .find((row) => row.role === "client");
    expect(client?.status).toBe("pending");
  });

  it("records a render failure and the worker retry succeeds", async () => {
    const { id, token } = sendAndReturnToken();
    db.update(contractSignatories)
      .set({ status: "signed", signedAt: nowMs() })
      .where(eq(contractSignatories.contractId, id))
      .run();
    void token;
    withTx((tx) => finalizeContractTx(tx, id, nowMs()));

    await generateSealedPdf(id, {
      render: async () => {
        throw new Error("render boom");
      },
    });

    let contract = db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .get();
    expect(contract?.finalPdfFileId).toBeNull();
    expect(contract?.pdfAttempts).toBe(1);

    const retried = await retryPendingFinalizations();
    expect(retried).toBe(1);

    contract = db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .get();
    expect(contract?.finalPdfFileId).not.toBeNull();
    expect(contract?.pdfSha256).not.toBeNull();
  });
});
