// Dossier - Milestones Service
// https://github.com/red-shadows-rs/dossier

import { MAX_MINOR } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { allocateByBp, allocateProportional } from "@/lib/money";

export type MilestoneMode = "percent" | "fixed";

export type MilestoneRowInput = {
  titleAr: string;
  titleEn: string;
  percentBp?: number | null;
  amountMinor?: number | null;
  dueDate?: string | null;
  triggerNoteAr?: string | null;
  triggerNoteEn?: string | null;
};

export type MilestonePlanInput = {
  net: number;
  tax: number;
  mode: MilestoneMode;
  rows: MilestoneRowInput[];
};

export type PlannedMilestone = {
  position: number;
  titleAr: string;
  titleEn: string;
  percentBp: number | null;
  amountMinor: number;
  taxMinor: number;
  totalMinor: number;
  dueDate: string | null;
  triggerNoteAr: string | null;
  triggerNoteEn: string | null;
};

const SUM_MISMATCH = "errors.milestonesSumMismatch";

function sumMismatch(): AppError {
  return new AppError("VALIDATION_FAILED", "Milestones do not sum to net", {
    milestones: SUM_MISMATCH,
  });
}

export function validateMilestones(input: MilestonePlanInput): string[] {
  const issues: string[] = [];
  if (input.rows.length === 0) return issues;

  if (input.mode === "percent") {
    let sum = 0;
    for (const row of input.rows) {
      if (
        typeof row.percentBp !== "number" ||
        !Number.isInteger(row.percentBp) ||
        row.percentBp < 1 ||
        row.percentBp > 10000
      ) {
        issues.push(SUM_MISMATCH);
        return issues;
      }
      sum += row.percentBp;
    }
    if (sum !== 10000) issues.push(SUM_MISMATCH);
  } else {
    let sum = 0;
    for (const row of input.rows) {
      if (
        typeof row.amountMinor !== "number" ||
        !Number.isInteger(row.amountMinor) ||
        row.amountMinor < 1
      ) {
        issues.push(SUM_MISMATCH);
        return issues;
      }
      sum += row.amountMinor;
    }
    const total = input.net + input.tax;
    if (sum !== input.net && sum !== total) issues.push(SUM_MISMATCH);
  }
  return issues;
}

export function planMilestones(input: MilestonePlanInput): PlannedMilestone[] {
  if (input.rows.length === 0) return [];

  if (
    !Number.isSafeInteger(input.net) ||
    input.net < 0 ||
    input.net > MAX_MINOR ||
    !Number.isSafeInteger(input.tax) ||
    input.tax < 0 ||
    input.tax > MAX_MINOR
  ) {
    throw new AppError("VALIDATION_FAILED", "Amount out of range");
  }

  const issues = validateMilestones(input);
  if (issues.length > 0) {
    throw sumMismatch();
  }

  let amounts: number[];
  let taxes: number[];
  let totals: number[];
  let percents: (number | null)[];

  if (input.mode === "percent") {
    const bps = input.rows.map((row) => row.percentBp as number);
    amounts = allocateByBp(input.net, bps);
    taxes = allocateProportional(input.tax, amounts);
    totals = amounts.map((a, i) => a + taxes[i]);
    percents = bps;
  } else {
    const rawAmounts = input.rows.map((row) => row.amountMinor as number);
    const sum = rawAmounts.reduce((a, b) => a + b, 0);
    const total = input.net + input.tax;

    if (input.tax > 0 && sum === total) {
      totals = rawAmounts;
      amounts = allocateProportional(input.net, totals);
      taxes = totals.map((tot, i) => tot - amounts[i]);
    } else {
      amounts = rawAmounts;
      taxes = allocateProportional(input.tax, amounts);
      totals = amounts.map((a, i) => a + taxes[i]);
    }
    percents = input.rows.map(() => null);
  }

  const plan = input.rows.map((row, index) => ({
    position: index + 1,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    percentBp: percents[index],
    amountMinor: amounts[index],
    taxMinor: taxes[index],
    totalMinor: totals[index],
    dueDate: row.dueDate ?? null,
    triggerNoteAr: row.triggerNoteAr ?? null,
    triggerNoteEn: row.triggerNoteEn ?? null,
  }));

  const amountSum = plan.reduce((acc, row) => acc + row.amountMinor, 0);
  const taxSum = plan.reduce((acc, row) => acc + row.taxMinor, 0);
  const totalSum = plan.reduce((acc, row) => acc + row.totalMinor, 0);
  if (
    amountSum !== input.net ||
    taxSum !== input.tax ||
    totalSum !== input.net + input.tax
  ) {
    throw new AppError("INTERNAL", "Milestone plan invariant violated");
  }

  return plan;
}
