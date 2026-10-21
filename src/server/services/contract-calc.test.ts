// Dossier - Contract Calc Tests
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { calcTotals } from "./contract-calc";

describe("calcTotals (16.1 vectors)", () => {
  it("no discount, tax 1500", () => {
    const out = calcTotals({
      items: [{ unitPriceMinor: 1_000_000, qtyMilli: 1000 }],
      discount: { type: "none", value: 0 },
      taxRateBp: 1500,
    });
    expect(out).toEqual({
      lineTotals: [1_000_000],
      subtotal: 1_000_000,
      discount: 0,
      net: 1_000_000,
      tax: 150_000,
      total: 1_150_000,
    });
  });

  it("percent discount 1000 (10%)", () => {
    const out = calcTotals({
      items: [{ unitPriceMinor: 1_000_000, qtyMilli: 1000 }],
      discount: { type: "percent", value: 1000 },
      taxRateBp: 1500,
    });
    expect(out).toMatchObject({
      subtotal: 1_000_000,
      discount: 100_000,
      net: 900_000,
      tax: 135_000,
      total: 1_035_000,
    });
  });

  it("fixed discount 50000", () => {
    const out = calcTotals({
      items: [{ unitPriceMinor: 1_000_000, qtyMilli: 1000 }],
      discount: { type: "fixed", value: 50_000 },
      taxRateBp: 1500,
    });
    expect(out).toMatchObject({
      discount: 50_000,
      net: 950_000,
      tax: 142_500,
      total: 1_092_500,
    });
  });

  it("rounds a fractional line total (3333 x 333 / 1000)", () => {
    const out = calcTotals({
      items: [{ unitPriceMinor: 3333, qtyMilli: 333 }],
      discount: { type: "none", value: 0 },
      taxRateBp: 0,
    });
    expect(out.lineTotals).toEqual([1110]);
  });

  it("handles a fractional quantity (25000 x 1.5)", () => {
    const out = calcTotals({
      items: [{ unitPriceMinor: 25_000, qtyMilli: 1500 }],
      discount: { type: "none", value: 0 },
      taxRateBp: 0,
    });
    expect(out.lineTotals).toEqual([37_500]);
  });

  it("sums multiple lines", () => {
    const out = calcTotals({
      items: [
        { unitPriceMinor: 800_000, qtyMilli: 1000 },
        { unitPriceMinor: 1_200_000, qtyMilli: 1000 },
      ],
      discount: { type: "percent", value: 500 },
      taxRateBp: 1500,
    });
    expect(out).toEqual({
      lineTotals: [800_000, 1_200_000],
      subtotal: 2_000_000,
      discount: 100_000,
      net: 1_900_000,
      tax: 285_000,
      total: 2_185_000,
    });
  });

  it("handles fractional unit price (10.435 SAR x 1.15 = 12.00 SAR)", () => {
    const out = calcTotals({
      items: [{ unitPriceMinor: 1043.5, qtyMilli: 1000 }],
      discount: { type: "none", value: 0 },
      taxRateBp: 1500,
    });
    expect(out).toEqual({
      lineTotals: [1043],
      subtotal: 1043,
      discount: 0,
      net: 1043,
      tax: 157,
      total: 1200,
    });
  });

  it("handles fractional unit price for 50 SAR target (43.478 SAR x 1.15 = 50.00 SAR)", () => {
    const out = calcTotals({
      items: [{ unitPriceMinor: 4347.8, qtyMilli: 1000 }],
      discount: { type: "none", value: 0 },
      taxRateBp: 1500,
    });
    expect(out).toEqual({
      lineTotals: [4348],
      subtotal: 4348,
      discount: 0,
      net: 4348,
      tax: 652,
      total: 5000,
    });
  });

  it("throws when a fixed discount exceeds the subtotal", () => {
    try {
      calcTotals({
        items: [{ unitPriceMinor: 100, qtyMilli: 1000 }],
        discount: { type: "fixed", value: 101 },
        taxRateBp: 0,
      });
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("VALIDATION_FAILED");
      expect((error as AppError).fieldErrors).toEqual({
        discountValue: "errors.discountExceedsSubtotal",
      });
    }
  });

  it("uses fixedTaxMinor as an override", () => {
    const out = calcTotals({
      items: [{ unitPriceMinor: 300_000, qtyMilli: 1000 }],
      discount: { type: "none", value: 0 },
      taxRateBp: 1500,
      fixedTaxMinor: 45_000,
    });
    expect(out.tax).toBe(45_000);
    expect(out.total).toBe(345_000);
  });

  it("rejects out-of-range tax and percent values", () => {
    const base = {
      items: [{ unitPriceMinor: 1000, qtyMilli: 1000 }],
      discount: { type: "none" as const, value: 0 },
    };
    expect(() => calcTotals({ ...base, taxRateBp: 10001 })).toThrow(AppError);
    expect(() =>
      calcTotals({
        ...base,
        taxRateBp: 0,
        discount: { type: "percent", value: 10001 },
      }),
    ).toThrow(AppError);
  });

  it("throws when a result exceeds MAX_MINOR", () => {
    expect(() =>
      calcTotals({
        items: [{ unitPriceMinor: 9_000_000_000, qtyMilli: 2000 }],
        discount: { type: "none", value: 0 },
        taxRateBp: 1500,
      }),
    ).toThrow(AppError);
  });
});
