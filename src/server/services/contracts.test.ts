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
import { canonicalize } from "@/lib/canonical-json";
import { sha256Hex } from "@/lib/crypto";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import { seedSystemTemplates } from "@/server/services/templates";
import { getSettings, updateSettings } from "@/server/services/settings";
import {
  buildContractSnapshot,
  hashSnapshot,
} from "@/server/services/contract-snapshot";
import {
  cancelContract,
  createContractFromTemplate,
  deleteDraftContract,
  getContractDetail,
  listContracts,
  saveClauses,
  saveContractItems,
  saveMilestones,
  updateContractBasics,
} from "./contracts";
import { validateContractForSend } from "./contracts-validate";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

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

function seedClient(): string {
  const id = newId();
  const now = nowMs();
  db.insert(clients)
    .values({
      id,
      type: "company",
      nameAr: "شركة النور للتجارة",
      nameEn: "Al-Noor Trading Co.",
      email: "contact@alnoor.example",
      phone: "+966555555555",
      country: "SA",
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
  return id;
}

function seedProject(clientId: string): string {
  const id = newId();
  const now = nowMs();
  db.insert(projects)
    .values({
      id,
      code: `P-${id.slice(0, 4)}`,
      clientId,
      nameAr: "متجر إلكتروني",
      nameEn: "Online Store",
      currency: "SAR",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

function templateIdByKey(key: string): string {
  const row = db.select().from(templates).where(eq(templates.key, key)).get();
  if (!row) throw new Error(`missing template ${key}`);
  return row.id;
}

const BASICS = {
  languageMode: "bilingual" as const,
  titleAr: "عقد تطوير موقع أو تطبيق ويب",
  titleEn: "Website / Web Application Development Agreement",
  scopeAr: "تصميم وتطوير متجر إلكتروني كامل.",
  scopeEn: "Design and build a complete online store.",
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
  currency: "SAR" as const,
  milestoneMode: "percent" as const,
};

const ITEMS = {
  items: [
    {
      descriptionAr: "تصميم واجهات المستخدم",
      descriptionEn: "UI/UX design",
      qtyMilli: 1000,
      unitPriceMinor: 800000,
    },
    {
      descriptionAr: "تطوير المتجر",
      descriptionEn: "Store development",
      qtyMilli: 1000,
      unitPriceMinor: 1200000,
    },
  ],
  discount: { type: "percent" as const, value: 500 },
  taxRateBp: 1500,
};

let user: SessionUser;
let clientId: string;
let projectId: string;

beforeEach(async () => {
  // Reset to draft so the immutability/no-delete triggers allow cleanup.
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
    {
      nameAr: "ريد شادوز",
      nameEn: "RED SHADOWS",
      email: "hello@red-shadows-rs.com",
      taxNumber: "300012345600003",
      bank: {
        bankNameAr: "بنك المثال",
        bankNameEn: "Example Bank",
        accountHolder: "RED SHADOWS",
        iban: "SA0000000000000000000000",
        swift: "XXXXSA",
      },
    },
    user,
    META,
  );
  clientId = seedClient();
  projectId = seedProject(clientId);
});

function createFrom(key: string): string {
  return createContractFromTemplate(
    user,
    { projectId, templateId: templateIdByKey(key) },
    META,
  );
}

function createValidContract(): string {
  const id = createFrom("web-development");
  updateContractBasics(user, id, BASICS, META);
  saveContractItems(user, id, ITEMS, META);
  return id;
}

function sendOptions() {
  return {
    providerSignerUserId: user.id,
    clientSignatoryName: "Khalid Al-Noor",
    clientSignatoryEmail: "contact@alnoor.example",
  };
}

describe("createContractFromTemplate", () => {
  it("copies clauses and defaults for every seed template", () => {
    const expectations: Record<string, { clauses: number; hasFees: boolean }> =
      {
        "web-development": { clauses: 21, hasFees: true },
        "automation-bot-development": { clauses: 22, hasFees: true },
        "maintenance-support": { clauses: 19, hasFees: true },
        nda: { clauses: 13, hasFees: false },
      };
    for (const [key, expected] of Object.entries(expectations)) {
      const id = createFrom(key);
      const detail = getContractDetail(id);
      expect(detail.clauses, key).toHaveLength(expected.clauses);
      expect(detail.contract.hasFees, key).toBe(expected.hasFees);
      expect(detail.contract.languageMode, key).toBe("bilingual");
      expect(detail.contract.status, key).toBe("draft");
      expect(detail.contract.number, key).toBeNull();
      expect(detail.contract.currency, key).toBe("SAR");
      if (expected.hasFees) {
        const bps = detail.milestones.reduce(
          (acc, m) => acc + (m.percentBp ?? 0),
          0,
        );
        expect(bps, key).toBe(10000);
      }
    }
  });

  it("re-plans preset milestones to net once items are saved", () => {
    const id = createValidContract();
    const detail = getContractDetail(id);
    expect(detail.contract.subtotalMinor).toBe(2_000_000);
    expect(detail.contract.netMinor).toBe(1_900_000);
    expect(detail.milestones.map((m) => m.amountMinor)).toEqual([
      760000, 570000, 570000,
    ]);
    expect(detail.milestones.map((m) => m.taxMinor)).toEqual([
      114000, 85500, 85500,
    ]);
    const sum = (key: "amountMinor" | "taxMinor" | "totalMinor") =>
      detail.milestones.reduce((acc, m) => acc + m[key], 0);
    expect(sum("amountMinor")).toBe(1_900_000);
    expect(sum("taxMinor")).toBe(285_000);
    expect(sum("totalMinor")).toBe(2_185_000);
  });
});

describe("saveContractItems", () => {
  it("recomputes totals and re-plans milestones when the discount changes", () => {
    const id = createValidContract();
    saveContractItems(
      user,
      id,
      { ...ITEMS, discount: { type: "none", value: 0 } },
      META,
    );
    const detail = getContractDetail(id);
    expect(detail.contract.netMinor).toBe(2_000_000);
    expect(detail.contract.taxMinor).toBe(300_000);
    expect(detail.contract.totalMinor).toBe(2_300_000);
    expect(detail.milestones.map((m) => m.amountMinor)).toEqual([
      800000, 600000, 600000,
    ]);
    const sum = (key: "amountMinor" | "taxMinor" | "totalMinor") =>
      detail.milestones.reduce((acc, m) => acc + m[key], 0);
    expect(sum("amountMinor")).toBe(2_000_000);
    expect(sum("taxMinor")).toBe(300_000);
    expect(sum("totalMinor")).toBe(2_300_000);
  });

  it("persists item descriptions", () => {
    const id = createValidContract();
    const items = getContractDetail(id).items;
    expect(items.map((i) => i.descriptionEn)).toEqual([
      "UI/UX design",
      "Store development",
    ]);
    expect(items.map((i) => i.lineTotalMinor)).toEqual([800000, 1200000]);
  });
});

describe("draft guards and lifecycle", () => {
  it("refuses to mutate a non-draft contract", () => {
    const id = createValidContract();
    db.update(contracts)
      .set({ status: "sent" })
      .where(eq(contracts.id, id))
      .run();
    expect(() =>
      saveMilestones(user, id, { mode: "percent", rows: [] }, META),
    ).toThrow(AppError);
    expect(() => saveClauses(user, id, [], META)).toThrow(AppError);
  });

  it("deletes an unnumbered draft and cancels a draft", () => {
    const draft = createFrom("web-development");
    deleteDraftContract(user, draft, META);
    expect(
      db.select().from(contracts).where(eq(contracts.id, draft)).get(),
    ).toBeUndefined();

    const toCancel = createFrom("web-development");
    cancelContract(user, toCancel, "changed plans", META);
    expect(getContractDetail(toCancel).contract.status).toBe("cancelled");

    const numbered = createFrom("web-development");
    cancelContract(user, numbered, null, META);
    db.update(contracts)
      .set({ number: "DOS-C-2026-0001" })
      .where(eq(contracts.id, numbered))
      .run();
    expect(() => deleteDraftContract(user, numbered, META)).toThrow(AppError);
  });

  it("lists contracts by status", () => {
    createValidContract();
    const draft = createFrom("nda");
    cancelContract(user, draft, null, META);
    expect(listContracts({ status: "draft" }).total).toBe(1);
    expect(listContracts({ status: "cancelled" }).total).toBe(1);
  });
});

describe("saveMilestones / saveClauses", () => {
  it("accepts a valid milestone plan and rejects an invalid one", () => {
    const id = createValidContract();
    saveMilestones(
      user,
      id,
      {
        mode: "percent",
        rows: [{ titleAr: "كامل", titleEn: "Full", percentBp: 10000 }],
      },
      META,
    );
    expect(getContractDetail(id).milestones).toHaveLength(1);

    expect(() =>
      saveMilestones(
        user,
        id,
        {
          mode: "percent",
          rows: [{ titleAr: "أ", titleEn: "A", percentBp: 9000 }],
        },
        META,
      ),
    ).toThrow(AppError);
  });

  it("replaces clauses and rejects invalid ones", () => {
    const id = createValidContract();
    saveClauses(
      user,
      id,
      [
        {
          key: null,
          titleAr: "بند واحد",
          titleEn: "One clause",
          bodyAr: "نص {{project.name}}.",
          bodyEn: "Text {{project.name}}.",
        },
        {
          key: null,
          titleAr: "توقيعات",
          titleEn: "Signatures",
          bodyAr: "{{block.signatures}}",
          bodyEn: "{{block.signatures}}",
        },
      ],
      META,
    );
    expect(getContractDetail(id).clauses).toHaveLength(2);

    expect(() =>
      saveClauses(
        user,
        id,
        [
          {
            key: null,
            titleAr: "بلا توقيع",
            titleEn: "No signatures",
            bodyAr: "نص",
            bodyEn: "text",
          },
        ],
        META,
      ),
    ).toThrow(AppError);
  });
});

describe("buildContractSnapshot", () => {
  it("is deterministic (same input → same canonical hash)", () => {
    const id = createValidContract();
    const first = buildContractSnapshot(id);
    const second = buildContractSnapshot(id);
    expect(hashSnapshot(first)).toBe(hashSnapshot(second));
    expect(hashSnapshot(first)).toBe(sha256Hex(canonicalize(first)));
    expect(hashSnapshot(first)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("validateContractForSend (7.5)", () => {
  it("passes a complete contract with no errors", () => {
    const id = createValidContract();
    const issues = validateContractForSend(id, sendOptions());
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("rule 1: flags a missing language field", () => {
    const id = createValidContract();
    db.update(contracts)
      .set({ titleEn: null })
      .where(eq(contracts.id, id))
      .run();
    const codes = validateContractForSend(id, sendOptions()).map((i) => i.code);
    expect(codes).toContain("titleRequired");
  });

  it("rule 2: flags currency, missing items, zero total and fees on a no-fee contract", () => {
    const id = createValidContract();
    db.update(contracts)
      .set({ currency: "XXX" })
      .where(eq(contracts.id, id))
      .run();
    expect(
      validateContractForSend(id, sendOptions()).some(
        (i) => i.code === "currencyInvalid",
      ),
    ).toBe(true);
    db.update(contracts)
      .set({ currency: "SAR" })
      .where(eq(contracts.id, id))
      .run();

    db.update(contracts)
      .set({ hasFees: false })
      .where(eq(contracts.id, id))
      .run();
    expect(
      validateContractForSend(id, sendOptions()).some(
        (i) => i.code === "feesNotAllowed",
      ),
    ).toBe(true);
    db.update(contracts)
      .set({ hasFees: true })
      .where(eq(contracts.id, id))
      .run();

    saveContractItems(user, id, { ...ITEMS, items: [] }, META);
    const codes = validateContractForSend(id, sendOptions()).map((i) => i.code);
    expect(codes).toContain("noItems");
    expect(codes).toContain("totalZero");
  });

  it("rule 3: flags missing and invalid milestones", () => {
    const id = createValidContract();
    db.delete(paymentMilestones)
      .where(eq(paymentMilestones.contractId, id))
      .run();
    expect(
      validateContractForSend(id, sendOptions()).some(
        (i) => i.code === "noMilestones",
      ),
    ).toBe(true);

    const id2 = createValidContract();
    const milestoneRows = getContractDetail(id2).milestones;
    db.delete(paymentMilestones)
      .where(eq(paymentMilestones.contractId, id2))
      .run();
    db.insert(paymentMilestones)
      .values({
        id: newId(),
        contractId: id2,
        position: 1,
        titleAr: milestoneRows[0].titleAr,
        titleEn: milestoneRows[0].titleEn,
        percentBp: 9000,
        amountMinor: 1_900_000,
        taxMinor: 285_000,
        totalMinor: 2_185_000,
      })
      .run();
    expect(
      validateContractForSend(id2, sendOptions()).some(
        (i) => i.code === "milestonesInvalid",
      ),
    ).toBe(true);
  });

  it("rule 4: flags missing start, inverted dates and a past deadline", () => {
    const id = createValidContract();
    db.update(contracts)
      .set({ startDate: null })
      .where(eq(contracts.id, id))
      .run();
    expect(
      validateContractForSend(id, sendOptions()).some(
        (i) => i.code === "startDateRequired",
      ),
    ).toBe(true);

    db.update(contracts)
      .set({ startDate: "2027-05-01", endDate: "2027-01-01" })
      .where(eq(contracts.id, id))
      .run();
    expect(
      validateContractForSend(id, sendOptions()).some(
        (i) => i.code === "endBeforeStart",
      ),
    ).toBe(true);

    db.update(contracts)
      .set({
        startDate: "2026-11-01",
        endDate: "2027-01-31",
        signingDeadline: "2020-01-01",
      })
      .where(eq(contracts.id, id))
      .run();
    expect(
      validateContractForSend(id, sendOptions()).some(
        (i) => i.code === "signingDeadlinePast",
      ),
    ).toBe(true);
  });

  it("rule 5: flags a contract with no clauses", () => {
    const id = createValidContract();
    db.delete(contractClauses).where(eq(contractClauses.contractId, id)).run();
    expect(
      validateContractForSend(id, sendOptions()).some(
        (i) => i.code === "noClauses",
      ),
    ).toBe(true);
  });

  it("rule 6: flags an empty variable value", () => {
    const id = createValidContract();
    db.update(contracts).set({ scopeAr: "" }).where(eq(contracts.id, id)).run();
    expect(
      validateContractForSend(id, sendOptions()).some(
        (i) => i.code === "missingVariable",
      ),
    ).toBe(true);
  });

  it("rule 7: flags the client signatory name/email", () => {
    const id = createValidContract();
    expect(
      validateContractForSend(id, {
        ...sendOptions(),
        clientSignatoryName: "",
      }).some((i) => i.code === "clientSignatoryRequired"),
    ).toBe(true);
    expect(
      validateContractForSend(id, {
        ...sendOptions(),
        clientSignatoryEmail: "",
      }).some((i) => i.code === "clientEmailRequired"),
    ).toBe(true);
    expect(
      validateContractForSend(id, {
        ...sendOptions(),
        clientSignatoryEmail: "not-an-email",
      }).some((i) => i.code === "clientEmailInvalid"),
    ).toBe(true);
  });

  it("rule 8: flags a provider signer who cannot sign", async () => {
    const id = createValidContract();
    const viewer = await createTestUser({ role: "viewer" });
    expect(
      validateContractForSend(id, {
        ...sendOptions(),
        providerSignerUserId: viewer.id,
      }).some((i) => i.code === "providerSignerRequired"),
    ).toBe(true);
  });

  it("rule 9: flags a missing company name", () => {
    const id = createValidContract();
    updateSettings("company", { ...getCompany(), nameEn: "" }, user, META);
    expect(
      validateContractForSend(id, sendOptions()).some(
        (i) => i.code === "companyNameRequired",
      ),
    ).toBe(true);
  });

  it("rule 10: flags block structure problems", () => {
    const id = createValidContract();
    const clauses = getContractDetail(id).clauses;
    const signaturesClause = clauses.find((c) => c.key === "signatures");
    const feesClause = clauses.find((c) => c.key === "fees");
    expect(signaturesClause && feesClause).toBeTruthy();
    if (signaturesClause) {
      db.delete(contractClauses)
        .where(eq(contractClauses.id, signaturesClause.id))
        .run();
    }
    if (feesClause) {
      db.delete(contractClauses)
        .where(eq(contractClauses.id, feesClause.id))
        .run();
    }
    const codes = validateContractForSend(id, sendOptions()).map((i) => i.code);
    expect(codes).toContain("signaturesBlock");
    expect(codes).toContain("paymentScheduleBlock");

    const id2 = createValidContract();
    const parties = getContractDetail(id2).clauses.find(
      (c) => c.key === "parties",
    );
    expect(parties).toBeTruthy();
    if (parties) {
      db.update(contractClauses)
        .set({ bodyEn: "{{block.signatures}}" })
        .where(eq(contractClauses.id, parties.id))
        .run();
    }
    expect(
      validateContractForSend(id2, sendOptions()).some(
        (i) => i.code === "blockSequenceMismatch",
      ),
    ).toBe(true);
  });

  it("warns (not errors) about a missing company tax number", () => {
    const id = createValidContract();
    updateSettings("company", { ...getCompany(), taxNumber: "" }, user, META);
    const issues = validateContractForSend(id, sendOptions());
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(issues.some((i) => i.code === "companyTaxNumberMissing")).toBe(true);
  });
});

function getCompany() {
  return getSettings("company");
}
