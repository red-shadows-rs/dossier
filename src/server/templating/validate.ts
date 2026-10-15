import {
  extractVariables,
  findMisplacedBlocks,
  specialBlockSequence,
} from "./render-body";
import { FEE_VARIABLES, isAllowedVariable } from "./variables";

export type TemplateIssue = {
  severity: "error" | "warning";
  code: string;
  messageKey: string;
  clausePosition?: number;
  params?: Record<string, string | number>;
};

export type TemplateClauseInput = {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

const FEE_BLOCKS = new Set(["pricing_table", "payment_schedule"]);

function checkBody(
  body: string,
  clausePosition: number,
  hasFees: boolean,
  issues: TemplateIssue[],
): void {
  for (const name of findMisplacedBlocks(body)) {
    issues.push({
      severity: "error",
      code: "templates.blockMisplaced",
      messageKey: "templates.blockMisplaced",
      clausePosition,
      params: { block: name },
    });
  }

  for (const variable of extractVariables(body)) {
    if (!isAllowedVariable(variable)) {
      issues.push({
        severity: "error",
        code: "templates.unknownVariable",
        messageKey: "templates.unknownVariable",
        clausePosition,
        params: { variable },
      });
      continue;
    }
    if (!hasFees && FEE_VARIABLES.includes(variable)) {
      issues.push({
        severity: "error",
        code: "templates.feeVariableInNoFeeContract",
        messageKey: "templates.feeVariableInNoFeeContract",
        clausePosition,
        params: { variable },
      });
    }
  }

  if (!hasFees) {
    for (const block of specialBlockSequence(body)) {
      if (FEE_BLOCKS.has(block)) {
        issues.push({
          severity: "error",
          code: "templates.feeBlockInNoFeeContract",
          messageKey: "templates.feeBlockInNoFeeContract",
          clausePosition,
          params: { block },
        });
      }
    }
  }
}

export function validateTemplateClauses(
  clauses: TemplateClauseInput[],
  hasFees: boolean,
): TemplateIssue[] {
  const issues: TemplateIssue[] = [];

  if (clauses.length < 1) {
    issues.push({
      severity: "error",
      code: "templates.clauseCount",
      messageKey: "templates.clauseCount",
    });
    return issues;
  }

  let signaturesCount = 0;

  clauses.forEach((clause, index) => {
    const clausePosition = index + 1;
    if (
      !clause.titleAr.trim() ||
      !clause.titleEn.trim() ||
      !clause.bodyAr.trim() ||
      !clause.bodyEn.trim()
    ) {
      issues.push({
        severity: "error",
        code: "templates.clauseIncomplete",
        messageKey: "templates.clauseIncomplete",
        clausePosition,
      });
    }
    if (clause.titleAr.includes("{{") || clause.titleEn.includes("{{")) {
      issues.push({
        severity: "error",
        code: "templates.titleVariable",
        messageKey: "templates.titleVariable",
        clausePosition,
      });
    }

    checkBody(clause.bodyAr, clausePosition, hasFees, issues);
    checkBody(clause.bodyEn, clausePosition, hasFees, issues);

    const arSequence = specialBlockSequence(clause.bodyAr);
    const enSequence = specialBlockSequence(clause.bodyEn);
    if (arSequence.join(",") !== enSequence.join(",")) {
      issues.push({
        severity: "error",
        code: "templates.blockSequenceMismatch",
        messageKey: "templates.blockSequenceMismatch",
        clausePosition,
      });
    }

    signaturesCount += arSequence.filter(
      (name) => name === "signatures",
    ).length;
  });

  if (signaturesCount !== 1) {
    issues.push({
      severity: "error",
      code: "templates.signaturesBlockCount",
      messageKey: "templates.signaturesBlockCount",
      params: { count: signaturesCount },
    });
  }

  return issues;
}
