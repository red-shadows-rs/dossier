import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  clients,
  contractSignatories,
  contracts,
  emailOutbox,
  projects,
  templates,
  users,
} from "@/db/schema";
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
  assertSigningRateLimit,
  declineContract,
  getSigningContext,
  requestSigningOtp,
  resetSigningRateLimits,
  resolveSignatory,
  submitClientSignature,
  verifySigningOtp,
} from "./signing";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

// 1x1 transparent PNG.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let user: SessionUser;
let projectId: string;
let templateId: string;
let contractId: string;
let clientToken: string;

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
      languageMode: "bilingual",
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

function sendInput() {
  return {
    providerSignerUserId: user.id,
    providerName: "RED SHADOWS | RS",
    providerTitle: "Owner",
    clientSignatoryName: "Khalid Al-Noor",
    clientSignatoryEmail: "contact@alnoor.example",
    clientSignatoryTitle: "General Manager",
    signature: { method: "drawn" as const, dataUrl: PNG },
    consent: true,
    consentText: "I consent.",
  };
}

function readOtp(): string {
  const row = db
    .select()
    .from(emailOutbox)
    .where(eq(emailOutbox.templateKey, "contract_otp"))
    .orderBy(emailOutbox.scheduledAt)
    .all()
    .at(-1);
  const payload = JSON.parse(row?.payloadJson ?? "{}") as { otp?: string };
  if (!payload.otp) throw new Error("no otp in outbox");
  return payload.otp;
}

function signInput() {
  return {
    fullName: "Khalid Al-Noor",
    signature: { method: "drawn" as const, dataUrl: PNG },
    consent: true,
    consentText: "I consent.",
  };
}

beforeEach(async () => {
  resetSigningRateLimits();
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

  contractId = createValidDraft();
  clientToken = sendContract(user, contractId, sendInput(), META).clientToken;
});

describe("resolveSignatory", () => {
  it("rejects an unknown token generically", () => {
    try {
      resolveSignatory("not-a-real-token");
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("TOKEN_INVALID");
    }
  });

  it("rejects an expired token", () => {
    const signatory = db
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.contractId, contractId))
      .all()
      .find((row) => row.role === "client");
    db.update(contractSignatories)
      .set({ tokenExpiresAt: nowMs() - 1000 })
      .where(eq(contractSignatories.id, signatory?.id ?? ""))
      .run();
    try {
      resolveSignatory(clientToken);
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("TOKEN_INVALID");
    }
  });
});

describe("getSigningContext", () => {
  it("returns the context and records viewed_at + audit once", () => {
    const context = getSigningContext(clientToken, META);
    expect(context.contractId).toBe(contractId);
    expect(context.signatoryName).toBe("Khalid Al-Noor");
    expect(context.languageMode).toBe("bilingual");
    expect(context.requiresOtp).toBe(true);
    expect(context.otpVerified).toBe(false);

    const signatory = db
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.contractId, contractId))
      .all()
      .find((row) => row.role === "client");
    expect(signatory?.viewedAt).not.toBeNull();

    const viewed = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "contract.viewed"))
      .all();
    expect(viewed).toHaveLength(1);

    getSigningContext(clientToken, META);
    const viewedAgain = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "contract.viewed"))
      .all();
    expect(viewedAgain).toHaveLength(1);
  });
});

describe("requestSigningOtp / verifySigningOtp", () => {
  it("enqueues a code and enforces the 60s resend cooldown", () => {
    const result = requestSigningOtp(clientToken, META);
    expect(result.expiresAt).toBeGreaterThan(nowMs());

    const outbox = db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.templateKey, "contract_otp"))
      .all();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].locale).toBe("ar");

    try {
      requestSigningOtp(clientToken, META);
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("RATE_LIMITED");
    }
  });

  it("verifies the correct code and records otp_verified", () => {
    requestSigningOtp(clientToken, META);
    const code = readOtp();
    verifySigningOtp(clientToken, code, META);

    const context = getSigningContext(clientToken, META);
    expect(context.otpVerified).toBe(true);

    const verified = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "contract.otp_verified"))
      .all();
    expect(verified).toHaveLength(1);
  });

  it("rejects a wrong code and locks out after 5 attempts", () => {
    requestSigningOtp(clientToken, META);
    const code = readOtp();

    for (let i = 0; i < 5; i += 1) {
      try {
        verifySigningOtp(clientToken, "000000", META);
        throw new Error("expected throw");
      } catch (error) {
        expect((error as AppError).code).toBe("OTP_INVALID");
      }
    }

    // The code is invalidated, so even the correct code fails now.
    try {
      verifySigningOtp(clientToken, code, META);
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("OTP_EXPIRED");
    }
  });
});

describe("submitClientSignature", () => {
  it("requires OTP verification when enabled", async () => {
    try {
      await submitClientSignature(clientToken, signInput(), META);
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("OTP_INVALID");
    }
  });

  it("records the client signature and finalizes the contract (T-032)", async () => {
    requestSigningOtp(clientToken, META);
    verifySigningOtp(clientToken, readOtp(), META);

    const result = await submitClientSignature(clientToken, signInput(), META);
    expect(result.signed).toBe(true);
    expect(result.finalized).toBe(true);

    const signatory = db
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.contractId, contractId))
      .all()
      .find((row) => row.role === "client");
    expect(signatory?.status).toBe("signed");
    expect(signatory?.signedAt).not.toBeNull();
    expect(signatory?.signatureFileId).not.toBeNull();
    expect(signatory?.signatureMethod).toBe("drawn");

    const signed = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "contract.signed"))
      .all();
    expect(signed.some((row) => row.actorType === "signer")).toBe(true);

    // 7.8 — both parties signed, so the contract is finalized.
    const contract = db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .get();
    expect(contract?.status).toBe("signed");
    expect(contract?.verificationCode).not.toBeNull();
    expect(contract?.signedAt).not.toBeNull();

    const rows = db
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.contractId, contractId))
      .all();
    expect(rows.every((row) => row.tokenHash === null)).toBe(true);
  });

  it("rejects a second submission with the same token", async () => {
    requestSigningOtp(clientToken, META);
    verifySigningOtp(clientToken, readOtp(), META);
    await submitClientSignature(clientToken, signInput(), META);

    try {
      await submitClientSignature(clientToken, signInput(), META);
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("TOKEN_INVALID");
    }
  });
});

describe("declineContract", () => {
  it("declines the contract, revokes the token and enqueues a notice", () => {
    declineContract(clientToken, "Not acceptable", META);

    const signatory = db
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.contractId, contractId))
      .all()
      .find((row) => row.role === "client");
    expect(signatory?.status).toBe("declined");
    expect(signatory?.declinedAt).not.toBeNull();
    expect(signatory?.declineReason).toBe("Not acceptable");
    expect(signatory?.tokenHash).toBeNull();

    const contract = db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .get();
    expect(contract?.status).toBe("declined");

    const notice = db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.templateKey, "contract_declined_notice"))
      .all();
    expect(notice).toHaveLength(1);

    try {
      resolveSignatory(clientToken);
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("TOKEN_INVALID");
    }
  });
});

describe("assertSigningRateLimit", () => {
  it("allows 60 requests per minute then blocks", () => {
    for (let i = 0; i < 60; i += 1) {
      assertSigningRateLimit("9.9.9.9");
    }
    try {
      assertSigningRateLimit("9.9.9.9");
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("RATE_LIMITED");
    }
  });
});
