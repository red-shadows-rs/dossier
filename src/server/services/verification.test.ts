import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  contractVersions,
  contracts,
  invoices,
  projects,
  templates,
  users,
} from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { newId } from "@/lib/ids";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import { updateSettings } from "@/server/services/settings";
import { seedSystemTemplates } from "@/server/services/templates";
import { readFile } from "./files";
import {
  createContractFromTemplate,
  saveContractItems,
  updateContractBasics,
} from "./contracts";
import { sendContract } from "./contracts-send";
import { submitClientSignature } from "./signing";
import {
  createInvoice,
  issueInvoice,
  saveInvoiceLines,
  voidInvoice,
} from "./invoices";
import {
  assertFileCheckRateLimit,
  assertLookupRateLimit,
  checkPdfUpload,
  lookupVerification,
  resetVerificationRateLimits,
} from "./verification";

const META = { ip: "1.2.3.4", userAgent: "vitest" };
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const CLIENT_EMAIL = "secret-contact@alnoor.example";
const CLIENT_PHONE = "+966500000000";

let user: SessionUser;
let clientId: string;
let projectId: string;

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
  resetVerificationRateLimits();
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
  clientId = newId();
  projectId = newId();
  db.insert(clients)
    .values({
      id: clientId,
      type: "company",
      nameAr: "شركة النور",
      nameEn: "Al-Noor Co.",
      email: CLIENT_EMAIL,
      phone: CLIENT_PHONE,
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
});

async function sealedContract(): Promise<{ id: string; code: string; pdf: Buffer }> {
  const template = db
    .select()
    .from(templates)
    .where(eq(templates.key, "web-development"))
    .get();
  if (!template) throw new Error("missing template");
  const id = createContractFromTemplate(
    user,
    { projectId, templateId: template.id },
    META,
  );
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
  const { clientToken } = sendContract(
    user,
    id,
    {
      providerSignerUserId: user.id,
      providerName: "RED SHADOWS | RS",
      providerTitle: "Owner",
      clientSignatoryName: "Khalid Al-Noor",
      clientSignatoryEmail: CLIENT_EMAIL,
      clientSignatoryTitle: "General Manager",
      signature: { method: "drawn", dataUrl: PNG },
      consent: true,
      consentText: "I consent.",
    },
    META,
  );
  await submitClientSignature(
    clientToken,
    {
      fullName: "Khalid Al-Noor",
      signature: { method: "drawn", dataUrl: PNG },
      consent: true,
      consentText: "I consent.",
    },
    META,
  );

  const contract = db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();
  if (!contract?.verificationCode || !contract.finalPdfFileId) {
    throw new Error("contract not finalized");
  }
  const pdf = readFile(contract.finalPdfFileId).buffer;
  return { id, code: contract.verificationCode, pdf };
}

function issuedInvoice(): { id: string; code: string } {
  const id = createInvoice(
    user,
    {
      projectId,
      languageMode: "ar",
      notesAr: null,
      notesEn: null,
    },
    META,
  );
  saveInvoiceLines(
    user,
    id,
    {
      lines: [
        {
          descriptionAr: "خدمة",
          descriptionEn: "Service",
          qtyMilli: 1000,
          unitPriceMinor: 500_000,
        },
      ],
      discount: { type: "none", value: 0 },
      taxRateBp: 1500,
    },
    META,
  );
  issueInvoice(user, id, META);
  const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!invoice?.verificationCode) throw new Error("invoice not issued");
  return { id, code: invoice.verificationCode };
}

describe("lookupVerification", () => {
  it("returns a minimal public DTO for a signed contract", async () => {
    const { code, id } = await sealedContract();
    const result = lookupVerification(code, "ar");

    expect(result?.kind).toBe("contract");
    if (result?.kind !== "contract") throw new Error("expected contract");
    expect(result.state).toBe("valid");
    expect(result.providerName).toBe("ريد شادوز");
    expect(result.clientName).toBe("شركة النور");
    expect(result.contentHash).not.toBeNull();
    expect(result.number).toContain("DOS-C-");

    const json = JSON.stringify(result);
    expect(json).not.toContain(CLIENT_EMAIL);
    expect(json).not.toContain(CLIENT_PHONE);
    expect(json).not.toContain("totalMinor");
    expect(json).not.toContain("1,150,000");
    void id;
  });

  it("normalizes the code input (dashes, lowercase, O→0)", () => {
    const now = nowMs();
    const contractId = newId();
    const versionId = newId();
    const snapshot = {
      schema: "dossier.contract.v1",
      contract: { number: "DOS-C-2026-9999" },
      provider: { nameAr: null, nameEn: "RED SHADOWS" },
      client: { nameAr: "عميل", nameEn: null },
    };
    db.insert(contracts)
      .values({
        id: contractId,
        clientId,
        projectId,
        status: "signed",
        languageMode: "ar",
        currency: "SAR",
        number: "DOS-C-2026-9999",
        verificationCode: "ABCDEFGH0123",
        contentHash: "x".repeat(64),
        signedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    db.insert(contractVersions)
      .values({
        id: versionId,
        contractId,
        versionNo: 1,
        snapshotJson: JSON.stringify(snapshot),
        contentHash: "x".repeat(64),
        createdBy: user.id,
        createdAt: now,
      })
      .run();
    db.update(contracts)
      .set({ currentVersionId: versionId })
      .where(eq(contracts.id, contractId))
      .run();

    expect(lookupVerification("ABCDEFGH0123")?.kind).toBe("contract");
    expect(lookupVerification("ABCDEFGHO123")?.kind).toBe("contract");
    expect(lookupVerification("abcd-efgh-0123")?.kind).toBe("contract");
  });

  it("returns an invoice DTO and flips to void after voiding", () => {
    const { id, code } = issuedInvoice();

    const valid = lookupVerification(code, "en");
    expect(valid?.kind).toBe("invoice");
    if (valid?.kind !== "invoice") throw new Error("expected invoice");
    expect(valid.state).toBe("valid");
    expect(valid.issuerName).toBe("ريد شادوز");
    expect(valid.totalFormatted).toContain("SAR");

    voidInvoice(user, id, "test", META);
    const voided = lookupVerification(code, "en");
    expect(voided?.kind).toBe("invoice");
    if (voided?.kind !== "invoice") throw new Error("expected invoice");
    expect(voided.state).toBe("void");
  });

  it("returns null for an unknown code with a generic shape", () => {
    expect(lookupVerification("ZZZZZZZZZZZZ")).toBeNull();
    expect(lookupVerification("SHORT")).toBeNull();
    expect(lookupVerification("")).toBeNull();
  });
});

describe("checkPdfUpload", () => {
  it("matches the identical sealed PDF and rejects a modified one", async () => {
    const { code, pdf } = await sealedContract();

    expect(checkPdfUpload(code, pdf)).toBe("match");

    const modified = Buffer.from(pdf);
    modified[modified.length - 20] ^= 0xff;
    expect(checkPdfUpload(code, modified)).toBe("mismatch");
  });

  it("returns unknown for an invoice code (no sealed hash)", () => {
    const { code } = issuedInvoice();
    expect(checkPdfUpload(code, Buffer.from("%PDF-1.4"))).toBe("unknown");
  });
});

describe("rate limits (7.10)", () => {
  it("blocks the 31st lookup and the 11th file check per minute", () => {
    for (let i = 0; i < 30; i += 1) assertLookupRateLimit("7.7.7.7");
    expect(() => assertLookupRateLimit("7.7.7.7")).toThrow();

    for (let i = 0; i < 10; i += 1) assertFileCheckRateLimit("8.8.8.8");
    expect(() => assertFileCheckRateLimit("8.8.8.8")).toThrow();
  });
});
