// Dossier - Seed Templates Tests
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import { CLAUSES, TEMPLATES, clauseDefsFor } from "./seed-templates";
import { extractVariables, specialBlockSequence } from "./render-body";
import { validateTemplateClauses } from "./validate";
import { ALLOWED_VARIABLES } from "./variables";

describe("seed templates", () => {
  it("defines the seven system templates", () => {
    expect(TEMPLATES.map((t) => t.key).sort()).toEqual([
      "api-integrations",
      "automation-bot-development",
      "desktop-development",
      "devops-infrastructure",
      "mobile-development",
      "nda",
      "web-development",
    ]);
  });

  it("every clause key resolves and every referenced variable is whitelisted", () => {
    for (const template of TEMPLATES) {
      const clauses = clauseDefsFor(template);
      expect(clauses).toHaveLength(template.clauseKeys.length);
      for (const clause of clauses) {
        for (const body of [clause.bodyAr, clause.bodyEn]) {
          for (const variable of extractVariables(body)) {
            expect(ALLOWED_VARIABLES, `${template.key} ${variable}`).toContain(
              variable,
            );
          }
        }
      }
    }
  });

  it("passes save-time validation with no errors", () => {
    for (const template of TEMPLATES) {
      const issues = validateTemplateClauses(
        clauseDefsFor(template),
        template.defaults.hasFees,
      );
      expect(issues, template.key).toEqual([]);
    }
  });

  it("has exactly one signatures block per template", () => {
    for (const template of TEMPLATES) {
      const clauses = clauseDefsFor(template);
      const count = clauses.reduce(
        (acc, clause) =>
          acc +
          specialBlockSequence(clause.bodyAr).filter(
            (name) => name === "signatures",
          ).length,
        0,
      );
      expect(count, template.key).toBe(1);
    }
  });

  it("has identical special-block sequences in AR and EN of every clause", () => {
    for (const template of TEMPLATES) {
      for (const clause of clauseDefsFor(template)) {
        expect(
          specialBlockSequence(clause.bodyAr),
          `${template.key} ${clause.titleEn}`,
        ).toEqual(specialBlockSequence(clause.bodyEn));
      }
    }
  });

  it("only uses fee blocks/variables when hasFees", () => {
    const nda = TEMPLATES.find((t) => t.key === "nda");
    expect(nda?.defaults.hasFees).toBe(false);
    if (nda) {
      const bodies = clauseDefsFor(nda).flatMap((c) => [c.bodyAr, c.bodyEn]);
      for (const body of bodies) {
        expect(body).not.toContain("pricing_table");
        expect(body).not.toContain("payment_schedule");
        expect(body).not.toContain("contract.total");
      }
    }
  });

  it("uses all documented clause keys", () => {
    const referenced = new Set(TEMPLATES.flatMap((t) => t.clauseKeys));
    for (const key of referenced) {
      expect(CLAUSES[key], key).toBeDefined();
    }
  });
});

describe("validateTemplateClauses", () => {
  it("rejects an empty template", () => {
    expect(validateTemplateClauses([], true)).toEqual([
      expect.objectContaining({ code: "templates.clauseCount" }),
    ]);
  });

  it("flags incomplete clauses and title variables", () => {
    const issues = validateTemplateClauses(
      [{ titleAr: "{{x}}", titleEn: "", bodyAr: "a", bodyEn: "" }],
      true,
    );
    expect(issues.some((i) => i.code === "templates.clauseIncomplete")).toBe(
      true,
    );
    expect(issues.some((i) => i.code === "templates.titleVariable")).toBe(true);
  });

  it("flags unknown variables and misplaced blocks", () => {
    const issues = validateTemplateClauses(
      [
        {
          titleAr: "ب",
          titleEn: "C",
          bodyAr: "{{nope}} and {{block.signatures}} in a sentence",
          bodyEn: "ok",
        },
      ],
      true,
    );
    expect(issues.some((i) => i.code === "templates.unknownVariable")).toBe(
      true,
    );
    expect(issues.some((i) => i.code === "templates.blockMisplaced")).toBe(
      true,
    );
  });

  it("flags fee variables/blocks in a no-fee contract", () => {
    const issues = validateTemplateClauses(
      [
        {
          titleAr: "ب",
          titleEn: "C",
          bodyAr: "{{contract.total}}",
          bodyEn: "{{block.pricing_table}}",
        },
      ],
      false,
    );
    expect(
      issues.some((i) => i.code === "templates.feeVariableInNoFeeContract"),
    ).toBe(true);
    expect(
      issues.some((i) => i.code === "templates.feeBlockInNoFeeContract"),
    ).toBe(true);
  });

  it("flags a block-sequence mismatch between AR and EN", () => {
    const issues = validateTemplateClauses(
      [
        {
          titleAr: "ب",
          titleEn: "C",
          bodyAr: "{{block.parties}}",
          bodyEn: "{{block.signatures}}",
        },
      ],
      true,
    );
    expect(
      issues.some((i) => i.code === "templates.blockSequenceMismatch"),
    ).toBe(true);
  });

  it("flags a wrong signatures-block count", () => {
    const noSignatures = validateTemplateClauses(
      [
        {
          titleAr: "ب",
          titleEn: "C",
          bodyAr: "text",
          bodyEn: "text",
        },
      ],
      true,
    );
    expect(
      noSignatures.some((i) => i.code === "templates.signaturesBlockCount"),
    ).toBe(true);
  });
});
