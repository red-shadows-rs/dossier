import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { percentOfBp } from "@/lib/money";
import {
  planMilestones,
  validateMilestones,
  type MilestonePlanInput,
} from "./milestones";

function row(overrides: Partial<MilestonePlanInput["rows"][number]> = {}) {
  return {
    titleAr: "دفعة",
    titleEn: "Milestone",
    ...overrides,
  };
}

describe("planMilestones percent mode (16.1 vectors)", () => {
  const input: MilestonePlanInput = {
    net: 1_000_001,
    tax: percentOfBp(1_000_001, 1500),
    mode: "percent",
    rows: [
      row({ percentBp: 3000 }),
      row({ percentBp: 4000 }),
      row({ percentBp: 3000 }),
    ],
  };

  it("allocates amounts, taxes and totals", () => {
    const plan = planMilestones(input);
    expect(plan.map((m) => m.amountMinor)).toEqual([300000, 400001, 300000]);
    expect(plan.map((m) => m.taxMinor)).toEqual([45000, 60000, 45000]);
    expect(plan.map((m) => m.totalMinor)).toEqual([345000, 460001, 345000]);
    expect(plan.map((m) => m.percentBp)).toEqual([3000, 4000, 3000]);
    expect(plan.map((m) => m.position)).toEqual([1, 2, 3]);
  });

  it("holds the invariants", () => {
    const plan = planMilestones(input);
    const sum = (key: "amountMinor" | "taxMinor" | "totalMinor") =>
      plan.reduce((acc, m) => acc + m[key], 0);
    expect(sum("amountMinor")).toBe(input.net);
    expect(sum("taxMinor")).toBe(input.tax);
    expect(sum("totalMinor")).toBe(input.net + input.tax);
  });

  it("supports the pay-in-full single row", () => {
    const plan = planMilestones({
      net: 500_000,
      tax: 75_000,
      mode: "percent",
      rows: [row({ percentBp: 10000 })],
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].amountMinor).toBe(500_000);
    expect(plan[0].taxMinor).toBe(75_000);
    expect(plan[0].totalMinor).toBe(575_000);
  });

  it("throws when percent rows sum to 9999", () => {
    expect(() =>
      planMilestones({
        net: 1_000_000,
        tax: 0,
        mode: "percent",
        rows: [row({ percentBp: 5000 }), row({ percentBp: 4999 })],
      }),
    ).toThrow(AppError);
  });

  it("throws when a percent row is missing or below 1", () => {
    expect(() =>
      planMilestones({
        net: 1_000_000,
        tax: 0,
        mode: "percent",
        rows: [row({ percentBp: 0 }), row({ percentBp: 10000 })],
      }),
    ).toThrow(AppError);
    expect(() =>
      planMilestones({
        net: 1_000_000,
        tax: 0,
        mode: "percent",
        rows: [row()],
      }),
    ).toThrow(AppError);
  });
});

describe("planMilestones fixed mode", () => {
  it("accepts amounts summing to net and stores percentBp null", () => {
    const plan = planMilestones({
      net: 1_000_001,
      tax: 150_000,
      mode: "fixed",
      rows: [row({ amountMinor: 600000 }), row({ amountMinor: 400001 })],
    });
    expect(plan.map((m) => m.amountMinor)).toEqual([600000, 400001]);
    expect(plan.every((m) => m.percentBp === null)).toBe(true);
    expect(plan.reduce((acc, m) => acc + m.totalMinor, 0)).toBe(1_150_001);
  });

  it("throws milestonesSumMismatch when amounts do not sum to net", () => {
    try {
      planMilestones({
        net: 1_000_001,
        tax: 150_000,
        mode: "fixed",
        rows: [row({ amountMinor: 600000 }), row({ amountMinor: 400000 })],
      });
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("VALIDATION_FAILED");
      expect((error as AppError).fieldErrors).toEqual({
        milestones: "errors.milestonesSumMismatch",
      });
    }
  });

  it("throws when a fixed amount is below 1", () => {
    expect(() =>
      planMilestones({
        net: 1,
        tax: 0,
        mode: "fixed",
        rows: [row({ amountMinor: 0 }), row({ amountMinor: 1 })],
      }),
    ).toThrow(AppError);
  });
});

describe("planMilestones edge cases", () => {
  it("returns an empty plan for no rows", () => {
    expect(
      planMilestones({ net: 0, tax: 0, mode: "percent", rows: [] }),
    ).toEqual([]);
    expect(planMilestones({ net: 0, tax: 0, mode: "fixed", rows: [] })).toEqual(
      [],
    );
  });

  it("carries due dates and trigger notes through", () => {
    const plan = planMilestones({
      net: 100,
      tax: 0,
      mode: "percent",
      rows: [
        row({
          percentBp: 10000,
          dueDate: "2026-12-01",
          triggerNoteAr: "عند التوقيع",
          triggerNoteEn: "Upon signing",
        }),
      ],
    });
    expect(plan[0].dueDate).toBe("2026-12-01");
    expect(plan[0].triggerNoteAr).toBe("عند التوقيع");
    expect(plan[0].triggerNoteEn).toBe("Upon signing");
  });

  it("validateMilestones returns no issues for a valid plan and an issue otherwise", () => {
    expect(
      validateMilestones({
        net: 1_000_000,
        tax: 0,
        mode: "percent",
        rows: [row({ percentBp: 10000 })],
      }),
    ).toEqual([]);
    expect(
      validateMilestones({
        net: 1_000_000,
        tax: 0,
        mode: "percent",
        rows: [row({ percentBp: 9000 })],
      }),
    ).toEqual(["errors.milestonesSumMismatch"]);
  });
});
