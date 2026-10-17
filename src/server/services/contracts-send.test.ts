import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  contractSignatories,
  contractVersions,
  contracts,
  emailOutbox,
  projects,
  templates,
  users,
} from "@/db/schema";
import { canonicalize } from "@/lib/canonical-json";
import { hmacToken, sha256Hex } from "@/lib/crypto";
import { nowMs } from "@/lib/dates";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
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
import { sendContract, signAsProvider } from "./contracts-send";

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

beforeEach(async () => {
  user = await ownerUser();
  updateSettings(
    "company",
    {
      nameAr: "ريد شادوز",
      nameEn: "RED SHADOWS",
      email: "hello@example.com",
      taxNumber: "300012345600003",
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
      taxNumber: "300099988800003",
      repNameAr: "خالد النور",
      repNameEn: "Khalid Al-Noor",
      repTitleAr: "المدير العام",
      repTitleEn: "General Manager",
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

describe("sendContract (16.1 Send success)", () => {
  it("assigns a number, version+hash, signatories, token hash and outbox row", () => {
    const id = createValidDraft();
    const { clientToken } = sendContract(user, id, sendInput(), META);

    const contract = getContract(id);
    expect(contract.status).toBe("sent");
    expect(contract.number).toMatch(/^DOS-C-\d{4}-\d{4,}$/);
    expect(contract.currentVersionId).not.toBeNull();
    expect(contract.contentHash).not.toBeNull();
    expect(contract.sentAt).not.toBeNull();

    const version = db
      .select()
      .from(contractVersions)
      .where(eq(contractVersions.id, contract.currentVersionId ?? ""))
      .get();
    expect(version).toBeDefined();
    expect(
      sha256Hex(canonicalize(JSON.parse(version?.snapshotJson ?? ""))),
    ).toBe(version?.contentHash);
    expect(JSON.parse(version?.snapshotJson ?? "{}").contract.number).toBe(
      contract.number,
    );

    const signatories = db
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.contractId, id))
      .all();
    const provider = signatories.find((s) => s.role === "provider");
    const client = signatories.find((s) => s.role === "client");
    expect(provider?.status).toBe("signed");
    expect(provider?.signedAt).not.toBeNull();
    expect(provider?.signatureFileId).not.toBeNull();
    expect(provider?.signatureMethod).toBe("drawn");
    expect(client?.status).toBe("pending");
    expect(client?.tokenHash).not.toBeNull();

    expect(client?.tokenHash).toBe(hmacToken(clientToken, env.APP_SECRET));
    expect(client?.tokenHash).not.toBe(clientToken);

    const outbox = db
      .select()
      .from(emailOutbox)
      .where(
        and(
          eq(emailOutbox.templateKey, "contract_signing_link"),
          eq(emailOutbox.entityId, id),
        ),
      )
      .all();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].status).toBe("pending");
    expect(outbox[0].toEmail).toBe("contact@alnoor.example");
  });

  it("leaves the provider pending when requireProviderSignatureBeforeSend=false", () => {
    updateSettings(
      "signing",
      {
        requireProviderSignatureBeforeSend: false,
        consentTextEn: "I consent.",
        consentTextAr: "أوافق.",
      },
      user,
      META,
    );
    const id = createValidDraft();
    const input = sendInput();
    sendContract(
      user,
      id,
      { ...input, signature: undefined, consent: false },
      META,
    );
    const provider = db
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.contractId, id))
      .all()
      .find((s) => s.role === "provider");
    expect(provider?.status).toBe("pending");
    expect(provider?.signatureFileId).toBeNull();
  });

  it("blocks sending a contract with validation errors", () => {
    const id = createValidDraft();
    db.update(contracts)
      .set({ titleAr: null })
      .where(eq(contracts.id, id))
      .run();
    expect(() => sendContract(user, id, sendInput(), META)).toThrow(AppError);
    expect(getContract(id).status).toBe("draft");
    expect(getContract(id).number).toBeNull();
  });

  it("re-send after revise keeps the number but bumps the version hash", () => {
    const id = createValidDraft();
    const first = sendContract(user, id, sendInput(), META);
    const number = getContract(id).number;

    db.update(contractSignatories)
      .set({ tokenHash: null })
      .where(eq(contractSignatories.contractId, id))
      .run();
    db.update(contracts)
      .set({ status: "draft", versionNo: 2 })
      .where(eq(contracts.id, id))
      .run();
    updateContractBasics(
      user,
      id,
      {
        languageMode: "ar",
        titleAr: "عقد تطوير",
        titleEn: "Development Agreement (v2)",
        scopeAr: "نطاق العمل",
        scopeEn: "Scope of work v2",
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
    const second = sendContract(user, id, sendInput(), META);

    expect(getContract(id).number).toBe(number);
    const versions = db
      .select()
      .from(contractVersions)
      .where(eq(contractVersions.contractId, id))
      .all();
    expect(versions).toHaveLength(2);
    expect(versions[0].contentHash).not.toBe(versions[1].contentHash);
    expect(first.clientToken).not.toBe(second.clientToken);
  });
});

describe("signAsProvider", () => {
  it("records evidence for a pending provider signatory", async () => {
    updateSettings(
      "signing",
      {
        requireProviderSignatureBeforeSend: false,
        consentTextEn: "I consent.",
        consentTextAr: "أوافق.",
      },
      user,
      META,
    );
    const id = createValidDraft();
    const input = sendInput();
    sendContract(
      user,
      id,
      { ...input, signature: undefined, consent: false },
      META,
    );
    await signAsProvider(
      user,
      id,
      {
        signature: { method: "typed", typedName: "Owner" },
        consent: true,
        consentText: "I consent.",
      },
      META,
    );
    const provider = db
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.contractId, id))
      .all()
      .find((s) => s.role === "provider");
    expect(provider?.status).toBe("signed");
    expect(provider?.signatureMethod).toBe("typed");
    expect(provider?.typedName).toBe("Owner");
  });
});
