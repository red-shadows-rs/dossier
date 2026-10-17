import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  contractClauses,
  contractItems,
  contracts,
  paymentMilestones,
  projects,
  templates,
  users,
} from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { allowedDocLangs } from "@/lib/doc-lang";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import { seedSystemTemplates } from "@/server/services/templates";
import { updateSettings } from "@/server/services/settings";
import { createContractFromTemplate, getContract } from "./contracts";
import {
  buildContractHtml,
  resolveContractPdf,
  resolveDocLang,
  safePdfFilename,
} from "./contract-documents";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

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
    signerTitleAr: null,
    signerTitleEn: null,
  };
}

let user: SessionUser;
let projectId: string;

beforeEach(async () => {
  db.update(contracts).set({ status: "draft", number: null }).run();
  db.delete(paymentMilestones).run();
  db.delete(contractClauses).run();
  db.delete(contractItems).run();
  db.delete(contracts).run();
  db.delete(templates).run();
  db.delete(projects).run();
  db.delete(clients).run();
  seedSystemTemplates();
  user = await ownerUser();
  updateSettings(
    "company",
    { nameAr: "ريد شادوز", nameEn: "RED SHADOWS", email: "h@example.com" },
    user,
    META,
  );
  const clientId = newId();
  projectId = newId();
  const now = nowMs();
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
      code: "P-0001",
      clientId,
      nameAr: "مشروع",
      nameEn: "Project",
      currency: "SAR",
      createdAt: now,
      updatedAt: now,
    })
    .run();
});

function templateId(key: string): string {
  const row = db.select().from(templates).where(eq(templates.key, key)).get();
  if (!row) throw new Error("missing template");
  return row.id;
}

function createContract(key: string): string {
  return createContractFromTemplate(
    user,
    { projectId, templateId: templateId(key) },
    META,
  );
}

describe("allowedDocLangs", () => {
  it("restricts single-language contracts", () => {
    expect(allowedDocLangs("ar")).toEqual(["ar"]);
    expect(allowedDocLangs("en")).toEqual(["en"]);
    expect(allowedDocLangs("bilingual")).toEqual(["ar", "en", "bilingual"]);
  });
});

describe("resolveDocLang", () => {
  it("rejects an incompatible language with VALIDATION_FAILED", () => {
    const id = createContract("web-development");
    db.update(contracts)
      .set({ languageMode: "ar" })
      .where(eq(contracts.id, id))
      .run();
    const contract = getContract(id);
    expect(() => resolveDocLang(contract, "en")).toThrow(AppError);
    try {
      resolveDocLang(contract, "en");
    } catch (error) {
      expect((error as AppError).code).toBe("VALIDATION_FAILED");
    }
  });

  it("defaults to the contract mode and allows the compatible ones", () => {
    const id = createContract("web-development");
    const contract = getContract(id);
    expect(resolveDocLang(contract, undefined)).toBe("bilingual");
    expect(resolveDocLang(contract, "ar")).toBe("ar");
    expect(resolveDocLang(contract, "en")).toBe("en");
    expect(resolveDocLang(contract, "bilingual")).toBe("bilingual");
  });
});

describe("safePdfFilename", () => {
  it("uses the number or 'draft' plus the lang, restricted to [A-Za-z0-9._-]", () => {
    expect(safePdfFilename({ number: null }, "ar")).toBe("draft-ar.pdf");
    expect(safePdfFilename({ number: "DOS-C-2026-0001" }, "bilingual")).toBe(
      "DOS-C-2026-0001-bilingual.pdf",
    );
    expect(safePdfFilename({ number: 'bad/../x y"' }, "en")).toBe(
      "bad..xy-en.pdf",
    );
  });
});

describe("buildContractHtml", () => {
  it("renders a draft preview with a watermark", async () => {
    const id = createContract("web-development");
    const html = await buildContractHtml(id, "bilingual", "preview");
    expect(html).toContain("DRAFT / مسودة");
    expect(html).toContain("Article 1");
    expect(html).toContain("المادة (1)");
  });

  it("renders unsigned without a watermark", async () => {
    const id = createContract("web-development");
    const html = await buildContractHtml(id, "en", "unsigned");
    expect(html).not.toContain('class="watermark"');
    expect(html).toContain("UNSIGNED");
  });

  it("renders client email and phone in the contract parties block", async () => {
    const clientId = newId();
    const now = nowMs();
    db.insert(clients)
      .values({
        id: clientId,
        type: "company",
        nameAr: "عميل بريد",
        nameEn: "Mail Client",
        email: "client.test@example.com",
        phone: "+966555123456",
        preferredLanguage: "ar",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const pid = newId();
    db.insert(projects)
      .values({
        id: pid,
        code: "P-0002",
        clientId,
        nameAr: "مشروع 2",
        nameEn: "Project 2",
        currency: "SAR",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const cid = createContractFromTemplate(
      user,
      { projectId: pid, templateId: templateId("web-development") },
      META,
    );
    const html = await buildContractHtml(cid, "bilingual", "preview");
    expect(html).toContain("client.test@example.com");
    expect(html).toContain("+966555123456");
  });
});

describe("resolveContractPdf", () => {
  it("renders from live data for a draft", async () => {
    const id = createContract("web-development");
    const source = await resolveContractPdf(id, "en");
    expect(source.kind).toBe("render");
    expect(source.filename).toBe("draft-en.pdf");
  });

  it("throws VALIDATION_FAILED for an incompatible language", async () => {
    const id = createContract("web-development");
    db.update(contracts)
      .set({ languageMode: "en" })
      .where(eq(contracts.id, id))
      .run();
    await expect(resolveContractPdf(id, "ar")).rejects.toThrow(AppError);
  });
});
