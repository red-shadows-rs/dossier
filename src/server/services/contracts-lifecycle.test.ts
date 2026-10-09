import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  clients,
  contractVersions,
  contracts,
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
  cancelContract,
  createContractFromTemplate,
  getContract,
  saveContractItems,
  updateContractBasics,
} from "./contracts";
import { sendContract } from "./contracts-send";
import { submitClientSignature } from "./signing";
import {
  completeContract,
  expireContracts,
  listContractSignatories,
  regenerateSigningLink,
  reviseContract,
  terminateContract,
} from "./contracts-lifecycle";

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

function createValidDraft(signingDeadline: string | null = null): string {
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
      signingDeadline,
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

function send(id: string): { clientToken: string } {
  return sendContract(
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
}

async function signClient(token: string): Promise<void> {
  await submitClientSignature(
    token,
    {
      fullName: "Khalid Al-Noor",
      signature: { method: "drawn", dataUrl: PNG },
      consent: true,
      consentText: "I consent.",
    },
    META,
  );
}

function clientSignatory(contractId: string) {
  return listContractSignatories(contractId).find(
    (row) => row.role === "client" && row.status === "pending",
  );
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

describe("reviseContract (recall)", () => {
  it("recalls a sent contract to draft, bumps version and revokes tokens", async () => {
    const id = createValidDraft();
    const { clientToken } = send(id);
    const before = getContract(id);
    expect(before.status).toBe("sent");
    expect(before.versionNo).toBe(1);

    reviseContract(user, id, META);

    const after = getContract(id);
    expect(after.status).toBe("draft");
    expect(after.versionNo).toBe(2);
    expect(after.number).toBe(before.number);
    expect(
      listContractSignatories(id).every((row) => row.tokenHash === null),
    ).toBe(true);

    const recalled = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "contract.recalled"))
      .all();
    expect(recalled).toHaveLength(1);

    // Re-send creates version 2 with a different hash and the same number.
    const { clientToken: newToken } = send(id);
    expect(newToken).not.toBe(clientToken);
    const resent = getContract(id);
    expect(resent.status).toBe("sent");
    expect(resent.number).toBe(before.number);

    const versions = db
      .select()
      .from(contractVersions)
      .where(eq(contractVersions.contractId, id))
      .all();
    expect(versions).toHaveLength(2);
    expect(versions[0].contentHash).not.toBe(versions[1].contentHash);
    void clientToken;
  });

  it("rejects revising a draft or signed contract with INVALID_STATE", async () => {
    const draft = createValidDraft();
    expect(() => reviseContract(user, draft, META)).toThrow(AppError);

    const signed = createValidDraft();
    await signClient(send(signed).clientToken);
    expect(() => reviseContract(user, signed, META)).toThrow(AppError);
  });
});

describe("regenerateSigningLink", () => {
  it("issues a fresh token and invalidates the previous one", () => {
    const id = createValidDraft();
    const { clientToken: oldToken } = send(id);

    const { url } = regenerateSigningLink(user, id, {}, META);
    expect(url).toContain("/s/");
    const newToken = url.slice(url.lastIndexOf("/s/") + 3);
    expect(newToken).not.toBe(oldToken);

    const current = clientSignatory(id);
    expect(current?.tokenHash).not.toBeNull();

    const regenerated = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "contract.link_regenerated"))
      .all();
    expect(regenerated).toHaveLength(1);
  });

  it("rejects a draft contract with INVALID_STATE", () => {
    const draft = createValidDraft();
    expect(() => regenerateSigningLink(user, draft, {}, META)).toThrow(
      AppError,
    );
  });
});

describe("expireContracts", () => {
  it("expires a sent contract past its signing deadline and revokes tokens", () => {
    const id = createValidDraft("2027-01-31");
    send(id);
    // Move the deadline into the past directly (validation forbids sending an
    // already-past deadline).
    db.update(contracts)
      .set({ signingDeadline: "2020-01-01" })
      .where(eq(contracts.id, id))
      .run();

    const count = expireContracts();
    expect(count).toBe(1);

    const contract = getContract(id);
    expect(contract.status).toBe("expired");
    expect(
      listContractSignatories(id).every((row) => row.tokenHash === null),
    ).toBe(true);

    const expired = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "contract.expired"))
      .all();
    expect(expired).toHaveLength(1);
  });

  it("leaves a sent contract with a future deadline untouched", () => {
    const id = createValidDraft("2099-12-31");
    send(id);
    expect(expireContracts()).toBe(0);
    expect(getContract(id).status).toBe("sent");
  });
});

describe("completeContract / terminateContract", () => {
  it("completes a signed contract", async () => {
    const id = createValidDraft();
    await signClient(send(id).clientToken);
    expect(getContract(id).status).toBe("signed");

    completeContract(user, id, META);
    const contract = getContract(id);
    expect(contract.status).toBe("completed");
    expect(contract.completedAt).not.toBeNull();

    const done = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "contract.completed"))
      .all();
    expect(done).toHaveLength(1);
  });

  it("terminates a signed contract with a reason", async () => {
    const id = createValidDraft();
    await signClient(send(id).clientToken);

    terminateContract(user, id, "Client breached the terms", META);
    const contract = getContract(id);
    expect(contract.status).toBe("terminated");
    expect(contract.terminatedAt).not.toBeNull();
    expect(contract.terminationReason).toBe("Client breached the terms");

    const terminated = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "contract.terminated"))
      .all();
    expect(terminated).toHaveLength(1);
  });

  it("rejects an empty termination reason", async () => {
    const id = createValidDraft();
    await signClient(send(id).clientToken);
    expect(() => terminateContract(user, id, "  ", META)).toThrow(AppError);
  });

  it("rejects completing or terminating a non-signed contract", () => {
    const sent = createValidDraft();
    send(sent);
    expect(() => completeContract(user, sent, META)).toThrow(AppError);
    expect(() => terminateContract(user, sent, "why", META)).toThrow(AppError);
  });
});

describe("cancelContract", () => {
  it("cancels a sent contract and revokes its tokens", () => {
    const id = createValidDraft();
    send(id);

    cancelContract(user, id, "no longer needed", META);

    const contract = getContract(id);
    expect(contract.status).toBe("cancelled");
    expect(
      listContractSignatories(id).every((row) => row.tokenHash === null),
    ).toBe(true);
  });

  it("rejects cancelling a signed contract with INVALID_STATE", async () => {
    const id = createValidDraft();
    await signClient(send(id).clientToken);
    expect(() => cancelContract(user, id, null, META)).toThrow(AppError);
  });
});
