import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, templates } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { assertCan, can } from "@/lib/permissions";
import { templateInputSchema } from "@/lib/validation/template";
import { createTestUser } from "@/server/auth/test-utils";
import type { SessionUser } from "@/server/auth/session";
import { validateTemplateClauses } from "@/server/templating/validate";
import {
  archiveTemplate,
  createTemplate,
  duplicateTemplate,
  getTemplate,
  listTemplates,
  seedSystemTemplates,
  updateTemplate,
} from "./templates";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

async function sessionUser(
  role: "owner" | "member" | "viewer" = "owner",
): Promise<SessionUser> {
  const created = await createTestUser({ role });
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role,
    locale: "ar",
    canSignForCompany: true,
    signerTitleAr: null,
    signerTitleEn: null,
  };
}

function clause(overrides: Record<string, unknown> = {}) {
  return {
    key: null,
    titleAr: "بند",
    titleEn: "Clause",
    bodyAr: "{{block.signatures}}",
    bodyEn: "{{block.signatures}}",
    ...overrides,
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return templateInputSchema.parse({
    type: "contract",
    nameAr: "قالب مخصص",
    nameEn: "Custom Template",
    descriptionAr: "",
    descriptionEn: "",
    defaultLanguageMode: "bilingual",
    defaults: { hasFees: false },
    clauses: [clause()],
    ...overrides,
  });
}

function expectValidationError(fn: () => void, expectedKey: string): void {
  try {
    fn();
    throw new Error("expected an AppError to be thrown");
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    const appError = error as AppError;
    expect(appError.code).toBe("VALIDATION_FAILED");
    expect(Object.values(appError.fieldErrors ?? {})).toContain(expectedKey);
  }
}

describe("createTemplate", () => {
  it("creates a custom template with clauses and an audit entry", async () => {
    const user = await sessionUser();
    const id = createTemplate(user, input(), META);
    const { template, clauses } = getTemplate(id);
    expect(template.isSystem).toBe(false);
    expect(template.key).toBeNull();
    expect(template.nameEn).toBe("Custom Template");
    expect(clauses).toHaveLength(1);
    expect(clauses[0].position).toBe(1);

    const auditRow = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "template.created"))
      .all()
      .find((row) => row.entityId === id);
    expect(auditRow).toBeDefined();
  });
});

describe("updateTemplate", () => {
  it("updates a custom template and replaces its clauses", async () => {
    const user = await sessionUser();
    const id = createTemplate(user, input(), META);
    const next = input({
      nameEn: "Updated Template",
      clauses: [
        clause(),
        clause({ titleEn: "Second", bodyAr: "نص", bodyEn: "Text" }),
      ],
    });
    updateTemplate(user, id, next, META);
    const { template, clauses } = getTemplate(id);
    expect(template.nameEn).toBe("Updated Template");
    expect(clauses.map((c) => c.titleEn)).toEqual(["Clause", "Second"]);
  });

  it("rejects editing a system template with INVALID_STATE", async () => {
    const user = await sessionUser();
    seedSystemTemplates();
    const system = db
      .select()
      .from(templates)
      .where(eq(templates.isSystem, true))
      .get();
    expect(system).toBeDefined();
    if (!system) return;
    try {
      updateTemplate(user, system.id, input(), META);
      throw new Error("expected INVALID_STATE");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("INVALID_STATE");
    }
  });
});

describe("duplicateTemplate", () => {
  it("copies a system template into an editable copy with the same clauses", async () => {
    const user = await sessionUser();
    seedSystemTemplates();
    const source = db
      .select()
      .from(templates)
      .where(eq(templates.key, "web-development"))
      .get();
    expect(source).toBeDefined();
    if (!source) return;
    const newId = duplicateTemplate(user, source.id, META);
    const copy = getTemplate(newId);
    expect(copy.template.isSystem).toBe(false);
    expect(copy.template.key).toBeNull();
    expect(copy.template.nameEn).toBe(source.nameEn);
    expect(copy.clauses).toHaveLength(15);

    const original = getTemplate(source.id);
    expect(original.template.isSystem).toBe(true);
  });

  it("throws NOT_FOUND for a missing source", async () => {
    const user = await sessionUser();
    expect(() => duplicateTemplate(user, "missing", META)).toThrow(AppError);
  });
});

describe("archiveTemplate", () => {
  it("archives a custom template and hides it from the list", async () => {
    const user = await sessionUser();
    const id = createTemplate(user, input(), META);
    archiveTemplate(user, id, META);
    const { rows } = listTemplates();
    expect(rows.some((row) => row.id === id)).toBe(false);
    const { template } = getTemplate(id);
    expect(template.archivedAt).not.toBeNull();
  });

  it("rejects archiving a system template with INVALID_STATE", async () => {
    const user = await sessionUser();
    seedSystemTemplates();
    const system = db
      .select()
      .from(templates)
      .where(eq(templates.isSystem, true))
      .get();
    expect(system).toBeDefined();
    if (!system) return;
    try {
      archiveTemplate(user, system.id, META);
      throw new Error("expected INVALID_STATE");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("INVALID_STATE");
    }
  });
});

describe("validateTemplateClauses", () => {
  const sig = {
    titleAr: "بند",
    titleEn: "Clause",
    bodyAr: "{{block.signatures}}",
    bodyEn: "{{block.signatures}}",
  };

  it("accepts a valid clause set", () => {
    expect(validateTemplateClauses([sig], false)).toEqual([]);
  });

  it("rejects a misplaced special block", () => {
    const issues = validateTemplateClauses(
      [
        {
          ...sig,
          bodyAr: "See {{block.signatures}} here.",
          bodyEn: "See {{block.signatures}} here.",
        },
      ],
      false,
    );
    expect(issues.map((issue) => issue.code)).toContain(
      "templates.blockMisplaced",
    );
  });

  it("rejects more than one signatures block", () => {
    const issues = validateTemplateClauses([sig, sig], false);
    expect(issues.map((issue) => issue.code)).toContain(
      "templates.signaturesBlockCount",
    );
  });

  it("rejects an unknown variable", () => {
    const issues = validateTemplateClauses(
      [
        {
          titleAr: "بند",
          titleEn: "Clause",
          bodyAr: "{{nope.bad}}",
          bodyEn: "{{nope.bad}}",
        },
      ],
      false,
    );
    expect(issues.map((issue) => issue.code)).toContain(
      "templates.unknownVariable",
    );
  });

  it("rejects a block-sequence mismatch between Arabic and English", () => {
    const issues = validateTemplateClauses(
      [
        {
          titleAr: "بند",
          titleEn: "Clause",
          bodyAr: "{{block.signatures}}",
          bodyEn: "Text only",
        },
      ],
      false,
    );
    expect(issues.map((issue) => issue.code)).toContain(
      "templates.blockSequenceMismatch",
    );
  });

  it("rejects fee variables when the contract has no fees", () => {
    const issues = validateTemplateClauses(
      [
        {
          titleAr: "بند",
          titleEn: "Clause",
          bodyAr: "{{contract.total}} {{block.signatures}}",
          bodyEn: "{{contract.total}} {{block.signatures}}",
        },
      ],
      false,
    );
    expect(issues.map((issue) => issue.code)).toContain(
      "templates.feeVariableInNoFeeContract",
    );
  });

  it("surfaces clause validation as VALIDATION_FAILED through the service", async () => {
    const user = await sessionUser();
    expectValidationError(
      () =>
        createTemplate(
          user,
          input({
            clauses: [
              clause({
                bodyAr: "See {{block.signatures}} here.",
                bodyEn: "See {{block.signatures}} here.",
              }),
            ],
          }),
          META,
        ),
      "templates.blockMisplaced",
    );
  });
});

describe("template permissions", () => {
  it("viewers cannot write templates; members and owners can", () => {
    expect(
      can({ role: "viewer", canSignForCompany: false }, "templates.write"),
    ).toBe(false);
    expect(
      can({ role: "member", canSignForCompany: false }, "templates.write"),
    ).toBe(true);
    expect(
      can({ role: "owner", canSignForCompany: false }, "templates.write"),
    ).toBe(true);
    expect(() =>
      assertCan({ role: "viewer", canSignForCompany: false }, "templates.write"),
    ).toThrow(AppError);
  });
});
